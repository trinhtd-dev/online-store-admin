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

/**
 * @route   GET /api/roles
 * @desc    Get all roles (active and inactive)
 * @access  Private/Admin
 */
router.get(
  "/",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    // Consider adding pagination, search, sort in the future if needed
    const query = "SELECT id, name, status FROM [role] ORDER BY name";
    const roles = await executeQuery(query);

    if (!roles) {
      return next(new AppError("Failed to fetch roles", 500));
    }

    res.json(roles);
  })
);

/**
 * @route   GET /api/roles/:id
 * @desc    Get role details including assigned permissions
 * @access  Private/Admin
 */
router.get(
  "/:id",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    const roleId = req.params.id;

    // Fetch role details
    const roleQuery = "SELECT id, name, status FROM [role] WHERE id = @id";
    const roleResult = await executeQuery(roleQuery, { id: roleId });

    if (!roleResult || roleResult.length === 0) {
      return next(new AppError("Role not found", 404));
    }
    const role = roleResult[0];

    // Fetch assigned permission IDs
    const permissionQuery =
      "SELECT permission_id FROM role_permission WHERE role_id = @role_id";
    const permissionResult = await executeQuery(permissionQuery, {
      role_id: roleId,
    });

    // Extract permission IDs into an array
    role.permissionIds = permissionResult
      ? permissionResult.map((p) => p.permission_id)
      : [];

    res.json(role);
  })
);

/**
 * @route   POST /api/roles
 * @desc    Create a new role with assigned permissions
 * @access  Private/Admin
 */
router.post(
  "/",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    const { name, status = "Active", permissionIds = [] } = req.body;

    if (!name) {
      return next(new AppError("Role name is required", 400));
    }

    let transaction;
    try {
      transaction = await beginTransaction();

      // 1. Create the role
      const createRoleQuery =
        "INSERT INTO [role] (name, status) OUTPUT INSERTED.id, INSERTED.name, INSERTED.status VALUES (@name, @status)";
      const roleResult = await executeTransactionQuery(
        transaction,
        createRoleQuery,
        { name, status }
      );

      if (!roleResult || roleResult.length === 0) {
        throw new Error("Failed to create role");
      }
      const newRole = roleResult[0];
      const newRoleId = newRole.id;

      // 2. Assign permissions if any provided
      if (permissionIds && permissionIds.length > 0) {
        const assignPermissionsQuery =
          "INSERT INTO role_permission (role_id, permission_id) VALUES ";
        const values = permissionIds
          .map((pid, index) => `(@role_id, @permission_id_${index})`)
          .join(", ");
        const params = { role_id: newRoleId };
        permissionIds.forEach((pid, index) => {
          params[`permission_id_${index}`] = pid;
        });

        await executeTransactionQuery(
          transaction,
          assignPermissionsQuery + values,
          params
        );
      }

      await commitTransaction(transaction);

      // Include assigned permission IDs in the response
      newRole.permissionIds = permissionIds;

      res.status(201).json(newRole);
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      // Check for unique constraint violation (or other specific errors)
      if (error.message.includes("UNIQUE KEY")) {
        return next(new AppError(`Role name '${name}' already exists.`, 409));
      }
      return next(new AppError(`Failed to create role: ${error.message}`, 500));
    }
  })
);

/**
 * @route   PUT /api/roles/:id
 * @desc    Update a role's details and assigned permissions
 * @access  Private/Admin
 */
router.put(
  "/:id",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    const roleId = req.params.id;
    const { name, status, permissionIds } = req.body;

    if (
      name === undefined &&
      status === undefined &&
      permissionIds === undefined
    ) {
      return next(new AppError("No fields provided for update", 400));
    }

    let transaction;
    try {
      transaction = await beginTransaction();

      // 1. Update role details (if provided)
      let updatedRoleData = {};
      if (name !== undefined || status !== undefined) {
        const updateFields = [];
        const params = { id: roleId };
        if (name !== undefined) {
          updateFields.push("name = @name");
          params.name = name;
        }
        if (status !== undefined) {
          updateFields.push("status = @status");
          params.status = status;
        }

        const updateRoleQuery = `UPDATE [role] SET ${updateFields.join(
          ", "
        )} OUTPUT INSERTED.id, INSERTED.name, INSERTED.status WHERE id = @id`;
        const roleResult = await executeTransactionQuery(
          transaction,
          updateRoleQuery,
          params
        );
        if (!roleResult || roleResult.length === 0) {
          // Check if the role actually exists
          const checkRole = await executeTransactionQuery(
            transaction,
            "SELECT id FROM [role] WHERE id = @id",
            { id: roleId }
          );
          if (!checkRole || checkRole.length === 0) {
            throw new AppError("Role not found", 404); // Throw AppError to be caught below
          }
          throw new Error("Failed to update role details");
        }
        updatedRoleData = roleResult[0];
      } else {
        // If only permissions are updated, fetch current role data
        const currentRoleQuery =
          "SELECT id, name, status FROM [role] WHERE id = @id";
        const currentRoleResult = await executeTransactionQuery(
          transaction,
          currentRoleQuery,
          { id: roleId }
        );
        if (!currentRoleResult || currentRoleResult.length === 0) {
          throw new AppError("Role not found", 404);
        }
        updatedRoleData = currentRoleResult[0];
      }

      // 2. Update permissions (if provided)
      if (permissionIds !== undefined) {
        // Delete existing permissions for this role
        const deletePermissionsQuery =
          "DELETE FROM role_permission WHERE role_id = @role_id";
        await executeTransactionQuery(transaction, deletePermissionsQuery, {
          role_id: roleId,
        });

        // Insert new permissions if any
        if (permissionIds.length > 0) {
          const assignPermissionsQuery =
            "INSERT INTO role_permission (role_id, permission_id) VALUES ";
          const values = permissionIds
            .map((pid, index) => `(@role_id, @permission_id_${index})`)
            .join(", ");
          const params = { role_id: roleId };
          permissionIds.forEach((pid, index) => {
            params[`permission_id_${index}`] = pid;
          });
          await executeTransactionQuery(
            transaction,
            assignPermissionsQuery + values,
            params
          );
        }
      }

      await commitTransaction(transaction);

      // Fetch the final assigned permissions to include in the response
      const finalPermissionQuery =
        "SELECT permission_id FROM role_permission WHERE role_id = @role_id";
      // Use executeQuery here as the transaction is committed
      const finalPermissionsResult = await executeQuery(finalPermissionQuery, {
        role_id: roleId,
      });
      updatedRoleData.permissionIds = finalPermissionsResult
        ? finalPermissionsResult.map((p) => p.permission_id)
        : [];

      res.json(updatedRoleData);
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      // Handle specific errors like not found or unique constraint
      if (error instanceof AppError && error.statusCode === 404) {
        return next(error);
      }
      if (error.message.includes("UNIQUE KEY")) {
        return next(new AppError(`Role name '${name}' already exists.`, 409));
      }
      return next(new AppError(`Failed to update role: ${error.message}`, 500));
    }
  })
);

/**
 * @route   DELETE /api/roles/:id
 * @desc    Delete a role
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    const roleId = req.params.id;

    let transaction;
    try {
      transaction = await beginTransaction();

      // 1. Check if the role exists first
      const checkRoleQuery = "SELECT id FROM [role] WHERE id = @id";
      const roleExists = await executeTransactionQuery(
        transaction,
        checkRoleQuery,
        { id: roleId }
      );
      if (!roleExists || roleExists.length === 0) {
        await rollbackTransaction(transaction);
        return next(new AppError("Role not found", 404));
      }

      // 2. Check if any managers are assigned to this role
      const checkManagerQuery =
        "SELECT COUNT(*) as count FROM manager WHERE role_id = @role_id";
      const managerResult = await executeTransactionQuery(
        transaction,
        checkManagerQuery,
        { role_id: roleId }
      );

      if (managerResult && managerResult[0].count > 0) {
        await rollbackTransaction(transaction); // No need to proceed
        return next(
          new AppError(
            `Cannot delete role: ${managerResult[0].count} manager(s) are currently assigned this role.`,
            400 // Bad Request - User action required
          )
        );
      }

      // 3. Delete associated permissions from role_permission
      const deletePermissionsQuery =
        "DELETE FROM role_permission WHERE role_id = @role_id";
      await executeTransactionQuery(transaction, deletePermissionsQuery, {
        role_id: roleId,
      });
      console.log(`Deleted permissions for role ${roleId}`); // Add log

      // 4. Delete the role itself
      const deleteRoleQuery = "DELETE FROM [role] WHERE id = @id";
      await executeTransactionQuery(transaction, deleteRoleQuery, {
        id: roleId,
      });
      console.log(`Deleted role ${roleId} itself`); // Add log

      // 5. Commit transaction
      await commitTransaction(transaction);

      res.status(200).json({ message: "Role deleted successfully" });
    } catch (error) {
      console.error(
        `Error during delete transaction for role ${roleId}:`,
        error
      );
      if (transaction) {
        console.log(`Rolling back transaction for role ${roleId}`);
        try {
          await rollbackTransaction(transaction);
        } catch (rollbackError) {
          console.error(
            `Error rolling back transaction for role ${roleId}:`,
            rollbackError
          );
        }
      }
      if (error instanceof AppError) {
        return next(error);
      }
      return next(
        new AppError(
          `Failed to delete role: ${error.message || "Unknown error"}`,
          500
        )
      );
    }
  })
);

module.exports = router;
