const express = require("express");
const router = express.Router();
const {
  executeQuery,
  beginTransaction,
  executeTransactionQuery,
  commitTransaction,
  rollbackTransaction,
} = require("../config/db");
const { catchAsync, AppError } = require("../utils/errorHandler");
const { protect, restrictTo } = require("../middlewares/authMiddleware");
const bcrypt = require("bcryptjs");

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get(
  "/profile",
  protect,
  catchAsync(async (req, res, next) => {
    const query = `
      SELECT a.id, a.email, a.username, a.full_name, r.name as role 
      FROM account a
      LEFT JOIN manager m ON a.id = m.account_id
      LEFT JOIN [role] r ON m.role_id = r.id
      WHERE a.id = @id
    `;

    const users = await executeQuery(query, { id: req.user.id });

    if (!users || users.length === 0) {
      return next(new AppError("User not found", 404));
    }

    // Remove sensitive fields
    const user = users[0];

    res.json(user);
  })
);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  "/profile",
  protect,
  catchAsync(async (req, res, next) => {
    const { full_name, email, password } = req.body;

    // Get current user
    const getUserQuery = "SELECT * FROM account WHERE id = @id";
    const users = await executeQuery(getUserQuery, { id: req.user.id });

    if (!users || users.length === 0) {
      return next(new AppError("User not found", 404));
    }

    const user = users[0];

    // Check if email already exists (if trying to change email)
    if (email && email !== user.email) {
      const emailCheckQuery = "SELECT * FROM account WHERE email = @email";
      const existingUsers = await executeQuery(emailCheckQuery, { email });

      if (existingUsers && existingUsers.length > 0) {
        return next(new AppError("Email already in use", 400));
      }
    }

    // Set the update fields
    const updateParams = {
      id: req.user.id,
      full_name: full_name || user.full_name,
      username: email ? email.split("@")[0] : user.username,
      email: email || user.email,
    };

    let updateFields =
      "full_name = @full_name, username = @username, email = @email";

    // Handle password update
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateParams.password = hashedPassword;
      updateFields += ", password = @password";
    }

    // Update user profile
    const updateQuery = `
      UPDATE account
      SET ${updateFields}
      OUTPUT INSERTED.id, INSERTED.email, INSERTED.username, INSERTED.full_name
      WHERE id = @id
    `;

    const updatedUsers = await executeQuery(updateQuery, updateParams);

    if (!updatedUsers || updatedUsers.length === 0) {
      return next(new AppError("Failed to update profile", 500));
    }

    res.json(updatedUsers[0]);
  })
);

/**
 * @route   GET /api/users
 * @desc    Get all accounts (managers and customers) with filters, sort, pagination
 * @access  Private/Admin
 */
router.get(
  "/",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status;
    const role_id = parseInt(req.query.role_id) || null;
    const type = req.query.type; // 'manager', 'customer', or 'all' (default to 'all')
    const sortBy = req.query.sortBy || "id";
    const sortOrder = req.query.sortOrder === "desc" ? "DESC" : "ASC";

    // --- Dynamic Query Building --- //
    let selectFields = [
      "a.id",
      "a.email",
      "a.username",
      "a.full_name",
      "a.status",
      "a.created_at",
    ];
    let fromClause = "FROM account a";
    let joins = "";
    let countJoins = ""; // Separate joins for count to avoid selecting unnecessary fields
    const whereClauses = [];
    const params = {};

    // Determine necessary joins and select fields based on type
    if (type === "manager") {
      selectFields.push("r.name as role_name", "r.id as role_id");
      joins += ` LEFT JOIN manager m ON a.id = m.account_id LEFT JOIN [role] r ON m.role_id = r.id`;
      countJoins += ` LEFT JOIN manager m ON a.id = m.account_id`; // Role join not needed for count if only filtering by m.id
      whereClauses.push("m.id IS NOT NULL");
      if (role_id) {
        whereClauses.push("m.role_id = @role_id");
        params.role_id = role_id;
      }
    } else if (type === "customer") {
      selectFields.push("c.phone_number", "c.address");
      joins += ` LEFT JOIN customer c ON a.id = c.account_id`;
      countJoins += ` LEFT JOIN customer c ON a.id = c.account_id`;
      whereClauses.push("c.id IS NOT NULL");
    } else {
      // Default to 'all' - Join everything
      selectFields.push(
        "r.name as role_name",
        "r.id as role_id",
        "c.phone_number",
        "c.address"
      );
      joins += ` LEFT JOIN manager m ON a.id = m.account_id LEFT JOIN [role] r ON m.role_id = r.id`;
      joins += ` LEFT JOIN customer c ON a.id = c.account_id`;
      // Count joins need both if filtering by role is possible for 'all'
      countJoins += ` LEFT JOIN manager m ON a.id = m.account_id LEFT JOIN customer c ON a.id = c.account_id`;
      if (role_id) {
        // Apply role filter only if specifically requested, implicitly filters for managers
        whereClauses.push("m.role_id = @role_id");
        params.role_id = role_id;
      }
    }

    // Add common filters
    if (search) {
      whereClauses.push("(a.full_name LIKE @search OR a.email LIKE @search)");
      params.search = `%${search}%`;
    }
    if (status) {
      whereClauses.push("a.status = @status");
      params.status = status;
    }

    // Construct final WHERE clause
    const whereString =
      whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

    // Construct the main query
    let query = `SELECT ${selectFields.join(
      ", "
    )} ${fromClause} ${joins} ${whereString}`;

    // Construct the count query
    let countQuery = `SELECT COUNT(DISTINCT a.id) AS total ${fromClause} ${countJoins} ${whereString}`;

    // Add Sorting
    const validSortColumns = [
      "id",
      "full_name",
      "email",
      "status",
      "created_at",
    ];
    // Add role sort only if roles are potentially included
    if (type === "manager" || type !== "customer") {
      validSortColumns.push("role"); // Allow sorting by role for managers or 'all'
    }

    let sortColumn = "a.id"; // Default sort
    if (sortBy === "role" && (type === "manager" || type !== "customer")) {
      sortColumn = "r.name"; // Sort by role name
    } else if (validSortColumns.includes(sortBy)) {
      // Check if sortBy is in the base account table columns for safety
      if (
        ["id", "full_name", "email", "status", "created_at"].includes(sortBy)
      ) {
        sortColumn = `a.${sortBy}`;
      }
      // Add handling for other sortable columns if they aren't from 'a'
    }

    // Append the ORDER BY clause
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;
    // Add secondary sort by id ONLY if the primary sort column is not id
    if (sortColumn !== "a.id") {
      query += `, a.id ${sortOrder}`;
    }

    // Add Pagination
    query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
    params.offset = offset;
    params.limit = limit;

    // Execute queries
    const [accounts, countResult] = await Promise.all([
      executeQuery(query, params),
      executeQuery(countQuery, params),
    ]);

    const total = countResult[0].total;

    res.json({
      accounts: accounts,
      currentPage: page,
      totalCount: total,
      pageSize: limit,
    });
  })
);

/**
 * @route   GET /api/users/:id
 * @desc    Get account by ID (manager or customer)
 * @access  Private/Admin
 */
router.get(
  "/:id",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    const query = `
      SELECT 
        a.id, 
        a.email, 
        a.username, 
        a.full_name, 
        a.status, 
        a.created_at,
        r.name as role_name,
        r.id as role_id,
        c.phone_number,
        c.address
      FROM account a
      LEFT JOIN manager m ON a.id = m.account_id
      LEFT JOIN [role] r ON m.role_id = r.id
      LEFT JOIN customer c ON a.id = c.account_id
      WHERE a.id = @id
    `;

    const accounts = await executeQuery(query, { id: req.params.id });

    if (!accounts || accounts.length === 0) {
      return next(new AppError("Account not found", 404));
    }

    res.json(accounts[0]);
  })
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update account (manager or customer)
 * @access  Private/Admin
 */
router.put(
  "/:id",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    const {
      full_name,
      email,
      status,
      role_id, // For managers
      phone_number, // For customers
      address, // For customers
    } = req.body;
    const accountId = req.params.id;

    // Begin transaction
    let transaction;
    try {
      transaction = await beginTransaction();

      // 1. Get current account and type
      const getAccountQuery = `
              SELECT 
                a.*, 
                m.id as manager_id, 
                c.id as customer_id,
                CASE 
                  WHEN m.id IS NOT NULL THEN 'manager'
                  WHEN c.id IS NOT NULL THEN 'customer'
                  ELSE 'unknown'
                END as account_type
              FROM account a
              LEFT JOIN manager m ON a.id = m.account_id
              LEFT JOIN customer c ON a.id = c.account_id
              WHERE a.id = @id
            `;
      const accountResult = await executeTransactionQuery(
        transaction,
        getAccountQuery,
        { id: accountId }
      );

      if (!accountResult || accountResult.length === 0) {
        await rollbackTransaction(transaction);
        return next(new AppError("Account not found", 404));
      }
      const account = accountResult[0];
      const accountType = account.account_type;

      // 2. Check email uniqueness if changed
      if (email && email !== account.email) {
        const emailCheckQuery =
          "SELECT id FROM account WHERE email = @email AND id != @id";
        const existingUsers = await executeTransactionQuery(
          transaction,
          emailCheckQuery,
          { email, id: accountId }
        );
        if (existingUsers && existingUsers.length > 0) {
          await rollbackTransaction(transaction);
          return next(new AppError("Email already in use", 400));
        }
      }

      // 3. Update account table
      const updateAccountParams = {
        id: accountId,
        full_name: full_name !== undefined ? full_name : account.full_name,
        username: email ? email.split("@")[0] : account.username,
        email: email !== undefined ? email : account.email,
        status: status !== undefined ? status : account.status,
        updated_at: new Date(), // Update timestamp
      };

      const updateAccountQuery = `
              UPDATE account
              SET full_name = @full_name, 
                  username = @username, 
                  email = @email, 
                  status = @status,
                  updated_at = @updated_at
              OUTPUT INSERTED.* 
              WHERE id = @id
            `;
      const updatedAccounts = await executeTransactionQuery(
        transaction,
        updateAccountQuery,
        updateAccountParams
      );

      if (!updatedAccounts || updatedAccounts.length === 0) {
        throw new Error("Failed to update account table");
      }

      // 4. Update manager or customer table if applicable
      if (accountType === "manager") {
        if (role_id !== undefined) {
          // If manager exists, update role.
          if (account.manager_id) {
            await executeTransactionQuery(
              transaction,
              "UPDATE manager SET role_id = @role_id WHERE account_id = @account_id",
              { role_id, account_id: accountId }
            );
          } else {
            console.warn(
              `Inconsistency: Account ${accountId} typed as manager but no manager record found during update.`
            );
            // Optionally create manager record here if desired
          }
        }
      } else if (accountType === "customer") {
        const updateCustomerParams = {};
        const customerUpdateFields = [];
        if (phone_number !== undefined) {
          updateCustomerParams.phone_number = phone_number;
          customerUpdateFields.push("phone_number = @phone_number");
        }
        if (address !== undefined) {
          updateCustomerParams.address = address;
          customerUpdateFields.push("address = @address");
        }

        if (customerUpdateFields.length > 0) {
          updateCustomerParams.account_id = accountId;
          // If customer exists, update. If not, create.
          if (account.customer_id) {
            const updateCustomerQuery = `UPDATE customer SET ${customerUpdateFields.join(
              ", "
            )} WHERE account_id = @account_id`;
            await executeTransactionQuery(
              transaction,
              updateCustomerQuery,
              updateCustomerParams
            );
          } else {
            // This case implies data inconsistency - account marked as customer but no customer record found
            console.warn(
              `Inconsistency: Account ${accountId} typed as customer but no customer record found during update.`
            );
            // Optionally create customer record here
            // await executeTransactionQuery(
            //   transaction,
            //   "INSERT INTO customer (account_id, phone_number, address) VALUES (@account_id, @phone_number, @address)",
            //   { account_id: accountId, phone_number: updateCustomerParams.phone_number, address: updateCustomerParams.address }
            // );
          }
        }
      }

      // 5. Commit transaction
      await commitTransaction(transaction);

      // 6. Fetch the final updated account details to return
      const finalAccount = await executeQuery(getAccountQuery, {
        id: accountId,
      }); // Use executeQuery as transaction is committed
      res.json(finalAccount[0]);
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      return next(
        new AppError(`Failed to update account: ${error.message}`, 500)
      );
    }
  })
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete account (manager or customer)
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    const accountId = req.params.id;

    if (accountId === req.user.id.toString()) {
      return next(new AppError("You cannot delete your own account", 400));
    }

    let transaction;
    try {
      transaction = await beginTransaction();

      const checkQuery = `
        SELECT 
          a.id, 
          m.id as manager_id, 
          c.id as customer_id 
        FROM account a
        LEFT JOIN manager m ON a.id = m.account_id
        LEFT JOIN customer c ON a.id = c.account_id
        WHERE a.id = @id
      `;
      const accountCheckResult = await executeTransactionQuery(
        transaction,
        checkQuery,
        { id: accountId }
      );

      if (!accountCheckResult || accountCheckResult.length === 0) {
        await rollbackTransaction(transaction);
        return next(new AppError("Account not found", 404));
      }
      const accountDetails = accountCheckResult[0];
      const managerId = accountDetails.manager_id; // Get the actual manager ID
      const customerId = accountDetails.customer_id; // Get the actual customer ID

      if (customerId) {
        // Check customer orders before deleting customer
        const orderQuery =
          "SELECT COUNT(*) as count FROM [order] WHERE customer_id = @customer_id";
        const orderResult = await executeTransactionQuery(
          transaction,
          orderQuery,
          { customer_id: customerId }
        );

        if (orderResult[0].count > 0) {
          await rollbackTransaction(transaction);
          return next(
            new AppError(
              "Cannot delete account associated with a customer who has existing orders. Consider deactivating the account instead.",
              400
            )
          );
        }
        // Delete from customer table FIRST if checks pass
        await executeTransactionQuery(
          transaction,
          "DELETE FROM customer WHERE account_id = @id",
          { id: accountId }
        );
      }

      if (managerId) {
        // Add check for feedback responses
        const feedbackQuery =
          "SELECT COUNT(*) as count FROM feedback_response WHERE manager_id = @manager_id";
        const feedbackResult = await executeTransactionQuery(
          transaction,
          feedbackQuery,
          { manager_id: managerId } // Use the actual manager ID
        );

        if (feedbackResult[0].count > 0) {
          await rollbackTransaction(transaction);
          return next(
            new AppError(
              "Cannot delete this manager as they have existing feedback responses. Please reassign or resolve the responses first.",
              400 // Return 400 Bad Request for clearer user feedback
            )
          );
        }

        // Delete from manager table FIRST if checks pass
        await executeTransactionQuery(
          transaction,
          "DELETE FROM manager WHERE account_id = @id",
          { id: accountId }
        );
      }

      // Delete from account table (only if related records are handled/deleted)
      await executeTransactionQuery(
        transaction,
        "DELETE FROM account WHERE id = @id",
        { id: accountId }
      );

      await commitTransaction(transaction);

      res.json({ message: "Account removed successfully" });
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      // Log the original error for debugging
      console.error("Error during account deletion:", error);
      // Return a more generic server error, but the specific 400 error should be caught before this
      return next(new AppError("Failed to delete account.", 500));
    }
  })
);

/**
 * @route   POST /api/users
 * @desc    Create a new account (manager or customer)
 * @access  Private/Admin
 */
router.post(
  "/",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    const {
      full_name,
      email,
      password,
      status = "Active", // Default status
      account_type, // 'manager' or 'customer'
      role_id, // Required if type is 'manager'
      phone_number, // Optional if type is 'customer'
      address, // Optional if type is 'customer'
    } = req.body;

    // Validate request
    if (!email || !password || !full_name || !account_type) {
      return next(
        new AppError(
          "Please provide full name, email, password, and account type",
          400
        )
      );
    }
    if (account_type === "manager" && !role_id) {
      return next(
        new AppError("Please provide role_id for manager accounts", 400)
      );
    }
    if (account_type !== "manager" && account_type !== "customer") {
      return next(new AppError("Invalid account type specified", 400));
    }

    // Check if user already exists
    const emailCheckQuery = "SELECT id FROM account WHERE email = @email";
    const existingUsers = await executeQuery(emailCheckQuery, { email });
    if (existingUsers && existingUsers.length > 0) {
      return next(new AppError("Account with this email already exists", 400));
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Begin transaction
    let transaction;
    try {
      transaction = await beginTransaction();

      // 1. Create user in account table
      const createAccountQuery = `
              INSERT INTO account (
                username, email, password, full_name, status, created_at, updated_at
              )
              OUTPUT INSERTED.id, INSERTED.email, INSERTED.username, INSERTED.full_name, INSERTED.status, INSERTED.created_at
              VALUES (
                @username, @email, @password, @full_name, @status, GETDATE(), GETDATE()
              )
            `;
      const accountParams = {
        username: email.split("@")[0],
        email,
        password: hashedPassword,
        full_name,
        status,
      };
      const createdAccounts = await executeTransactionQuery(
        transaction,
        createAccountQuery,
        accountParams
      );

      if (!createdAccounts || createdAccounts.length === 0) {
        throw new Error("Failed to create account");
      }
      const newAccountId = createdAccounts[0].id;
      let newAccountData = { ...createdAccounts[0] };

      // 2. Create entry in manager or customer table
      if (account_type === "manager") {
        const managerQuery = `
                INSERT INTO manager (account_id, role_id) 
                OUTPUT INSERTED.role_id
                VALUES (@account_id, @role_id)
              `;
        const managerResult = await executeTransactionQuery(
          transaction,
          managerQuery,
          {
            account_id: newAccountId,
            role_id,
          }
        );
        if (!managerResult || managerResult.length === 0) {
          throw new Error("Failed to create manager record");
        }
        newAccountData.role_id = managerResult[0].role_id;

        // Fetch role name
        const roleNameResult = await executeTransactionQuery(
          transaction,
          "SELECT name FROM role WHERE id = @role_id",
          { role_id }
        );
        newAccountData.role_name = roleNameResult[0]?.name;
      } else if (account_type === "customer") {
        const customerQuery = `
                INSERT INTO customer (account_id, phone_number, address) 
                OUTPUT INSERTED.phone_number, INSERTED.address
                VALUES (@account_id, @phone_number, @address)
              `;
        const customerResult = await executeTransactionQuery(
          transaction,
          customerQuery,
          {
            account_id: newAccountId,
            phone_number: phone_number || null, // Handle optional fields
            address: address || null,
          }
        );
        if (!customerResult || customerResult.length === 0) {
          throw new Error("Failed to create customer record");
        }
        newAccountData.phone_number = customerResult[0].phone_number;
        newAccountData.address = customerResult[0].address;
      }

      // 3. Commit transaction
      await commitTransaction(transaction);

      // Add account type to response
      newAccountData.account_type = account_type;

      res.status(201).json(newAccountData);
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      return next(
        new AppError(`Failed to create account: ${error.message}`, 500)
      );
    }
  })
);

module.exports = router;
