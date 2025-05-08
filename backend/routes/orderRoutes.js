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
 * @route   GET /api/orders
 * @desc    Get user orders or all orders for admin with filters, sort, pagination
 * @access  Private
 */
router.get(
  "/",
  protect,
  catchAsync(async (req, res, next) => {
    // --- Pagination ---
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Renamed from pageSize for consistency internally
    const offset = (page - 1) * limit;

    // --- Filtering ---
    const search = req.query.search || "";
    const status = req.query.status ? req.query.status.split(",") : []; // Expect comma-separated string
    const paymentStatus = req.query.paymentStatus
      ? req.query.paymentStatus.split(",")
      : []; // Expect comma-separated string

    // --- Sorting ---
    const sortBy = req.query.sortBy || "order_date";
    const sortOrder = req.query.sortOrder === "asc" ? "ASC" : "DESC"; // Default to DESC

    // --- Authorization ---
    const isAdmin = req.user.role === "admin"; // Assuming role is fetched and attached by protect middleware

    // --- Dynamic Query Building --- //
    let selectFields = [
      "o.id",
      "o.customer_id",
      "o.order_date",
      "o.shipping_address",
      "o.status",
      "o.payment_method",
      "o.payment_date",
      "o.payment_status",
      "o.payment_amount",
      "a.full_name as customer_name", // Fetch customer name
      "a.email as customer_email", // Fetch customer email for searching
    ];
    let fromClause = "FROM [order] o";
    let joins = ` JOIN customer c ON o.customer_id = c.id JOIN account a ON c.account_id = a.id`;
    let countJoins = ` JOIN customer c ON o.customer_id = c.id JOIN account a ON c.account_id = a.id`; // Keep joins consistent for count
    const whereClauses = [];
    const params = {};

    // Authorization Filter (Non-admins see only their orders)
    if (!isAdmin) {
      whereClauses.push("a.id = @accountId");
      params.accountId = req.user.id;
    }

    // Search Filter (Order ID, Customer Name, Customer Email)
    if (search) {
      whereClauses.push(
        "(CAST(o.id AS NVARCHAR(20)) LIKE @search OR a.full_name LIKE @search OR a.email LIKE @search)"
      );
      params.search = `%${search}%`;
    }

    // Status Filter
    if (status.length > 0) {
      // Dynamically create parameter names to avoid collision and ensure safety
      const statusParams = status
        .map((s, index) => {
          const paramName = `status${index}`;
          params[paramName] = s;
          return `@${paramName}`;
        })
        .join(",");
      whereClauses.push(`o.status IN (${statusParams})`);
    }

    // Payment Status Filter
    if (paymentStatus.length > 0) {
      // Dynamically create parameter names
      const paymentStatusParams = paymentStatus
        .map((ps, index) => {
          const paramName = `paymentStatus${index}`;
          params[paramName] = ps;
          return `@${paramName}`;
        })
        .join(",");
      whereClauses.push(`o.payment_status IN (${paymentStatusParams})`);
    }

    // Construct final WHERE clause
    const whereString =
      whereClauses.length > 0 ? ` WHERE ${whereClauses.join(" AND ")}` : "";

    // Construct the main query
    let query = `SELECT ${selectFields.join(
      ", "
    )} ${fromClause} ${joins} ${whereString}`;

    // Construct the count query
    let countQuery = `SELECT COUNT(DISTINCT o.id) AS total ${fromClause} ${countJoins} ${whereString}`;

    // --- Add Sorting ---
    const validSortColumns = {
      id: "o.id",
      order_date: "o.order_date",
      payment_amount: "o.payment_amount",
      status: "o.status",
      payment_status: "o.payment_status",
      customer_name: "a.full_name",
    };

    let sortColumn = validSortColumns[sortBy] || "o.order_date"; // Default sort

    // Append the ORDER BY clause
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;
    // Add secondary sort by id ONLY if the primary sort column is not id
    if (sortColumn !== "o.id") {
      query += `, o.id ${sortOrder}`;
    }

    // --- Add Pagination ---
    query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
    params.offset = offset;
    params.limit = limit;

    // --- Execute queries ---
    const [orders, countResult] = await Promise.all([
      executeQuery(query, params),
      executeQuery(countQuery, params), // Use same params for count query WHERE clause
    ]);

    const total = countResult[0].total;

    // --- Send Response ---
    res.json({
      orders: orders,
      totalCount: total,
      currentPage: page,
      pageSize: limit, // Return the actual limit used
    });
  })
);

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID
 * @access  Private
 */
router.get(
  "/:id",
  protect,
  catchAsync(async (req, res, next) => {
    // Get the order details
    const orderQuery = `
      SELECT o.*, c.phone_number as customer_phone, c.address as customer_address
      FROM [order] o
      JOIN customer c ON o.customer_id = c.id
      WHERE o.id = @orderId
    `;

    const orders = await executeQuery(orderQuery, { orderId: req.params.id });

    if (!orders || orders.length === 0) {
      return next(new AppError("Order not found", 404));
    }

    const order = orders[0];

    // Check if the user is authorized to view this order
    if (req.user.role !== "admin") {
      const customerQuery = `
        SELECT c.* FROM customer c
        WHERE c.id = @customerId AND c.account_id = @accountId
      `;

      const customers = await executeQuery(customerQuery, {
        customerId: order.customer_id,
        accountId: req.user.id,
      });

      if (!customers || customers.length === 0) {
        return next(new AppError("Not authorized to access this order", 403));
      }
    }

    // Get order items
    const itemsQuery = `
      SELECT oi.*, p.name as product_name, p.image_url as product_image,
             pv.sku as variant_sku, pv.price as variant_price
      FROM order_item oi
      JOIN product_variant pv ON oi.product_variant_id = pv.id
      JOIN product p ON pv.product_id = p.id
      WHERE oi.order_id = @orderId
    `;

    const orderItems = await executeQuery(itemsQuery, {
      orderId: req.params.id,
    });

    // Get order history
    const historyQuery = `
      SELECT oh.*, a.full_name as manager_name
      FROM order_history oh
      JOIN manager m ON oh.manager_id = m.id
      JOIN account a ON m.account_id = a.id
      WHERE oh.order_id = @orderId
      ORDER BY oh.processing_time DESC
    `;

    const orderHistory = await executeQuery(historyQuery, {
      orderId: req.params.id,
    });

    res.json({
      ...order,
      items: orderItems,
      history: orderHistory,
    });
  })
);

/**
 * @route   POST /api/orders
 * @desc    Create a new order
 * @access  Private
 */
router.post(
  "/",
  protect,
  catchAsync(async (req, res, next) => {
    const { customer_id, shipping_address, payment_method, items } = req.body;

    if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
      return next(
        new AppError("Please provide customer ID and order items", 400)
      );
    }

    // Verify the customer belongs to the logged-in user
    const customerQuery = `
      SELECT * FROM customer
      WHERE id = @customerId
    `;

    const customers = await executeQuery(customerQuery, {
      customerId: customer_id,
    });

    if (!customers || customers.length === 0) {
      return next(new AppError("Customer not found or not authorized", 403));
    }

    let transaction;
    try {
      transaction = await beginTransaction();

      // Calculate order total and verify items
      let orderTotal = 0;
      const verifiedItems = [];

      for (const item of items) {
        const { product_variant_id, quantity } = item;

        if (!product_variant_id || !quantity || quantity <= 0) {
          await rollbackTransaction(transaction);
          return next(
            new AppError(
              "Invalid item data. Provide product_variant_id and quantity > 0",
              400
            )
          );
        }

        // Get product variant details to verify it exists and get price
        const variantQuery = `
          SELECT pv.*, p.name as product_name
          FROM product_variant pv
          JOIN product p ON pv.product_id = p.id
          WHERE pv.id = @variantId
        `;

        const variants = await executeTransactionQuery(
          transaction,
          variantQuery,
          {
            variantId: product_variant_id,
          }
        );

        if (!variants || variants.length === 0) {
          await rollbackTransaction(transaction);
          return next(new AppError("Product variant not found", 404));
        }

        const variant = variants[0];
        const itemTotal = variant.price * quantity;
        orderTotal += itemTotal;

        verifiedItems.push({
          ...item,
          price: variant.price,
          total_price: itemTotal,
        });
      }

      // Create order
      const createOrderQuery = `
        INSERT INTO [order] (
          customer_id,
          order_date,
          shipping_address,
          status,
          payment_method,
          payment_status,
          payment_amount
        )
        OUTPUT INSERTED.*
        VALUES (
          @customerId,
          GETDATE(),
          @shippingAddress,
          'Pending',
          @paymentMethod,
          'Pending',
          @paymentAmount
        )
      `;

      const newOrder = await executeTransactionQuery(
        transaction,
        createOrderQuery,
        {
          customerId: customer_id,
          shippingAddress: shipping_address || customers[0].address,
          paymentMethod: payment_method || "Credit Card",
          paymentAmount: orderTotal,
        }
      );

      if (!newOrder || newOrder.length === 0) {
        await rollbackTransaction(transaction);
        return next(new AppError("Failed to create order", 500));
      }

      // Create order items
      for (const item of verifiedItems) {
        const createItemQuery = `
          INSERT INTO order_item (
            order_id,
            product_variant_id,
            quantity,
            unit_price,
            note
          )
          VALUES (
            @orderId,
            @variantId,
            @quantity,
            @unitPrice,
            @note
          )
        `;

        await executeTransactionQuery(transaction, createItemQuery, {
          orderId: newOrder[0].id,
          variantId: item.product_variant_id,
          quantity: item.quantity,
          unitPrice: item.price,
          note: item.note || null,
        });
      }

      // Create initial order history record
      const historyQuery = `
        INSERT INTO order_history (
          manager_id,
          order_id,
          processing_time,
          previous_status,
          new_status
        )
        VALUES (
          @managerId,
          @orderId,
          GETDATE(),
          NULL,
          'Pending'
        )
      `;

      await executeTransactionQuery(transaction, historyQuery, {
        managerId: 1, // Mặc định quản lý đầu tiên
        orderId: newOrder[0].id,
      });

      await commitTransaction(transaction);

      // Get the complete order with items
      const completeOrderQuery = `
        SELECT o.*, c.phone_number as customer_phone
        FROM [order] o
        JOIN customer c ON o.customer_id = c.id
        WHERE o.id = @orderId
      `;

      const orders = await executeQuery(completeOrderQuery, {
        orderId: newOrder[0].id,
      });

      // Get order items
      const itemsQuery = `
        SELECT oi.*, p.name as product_name, p.image_url as product_image,
               pv.sku as variant_sku
        FROM order_item oi
        JOIN product_variant pv ON oi.product_variant_id = pv.id
        JOIN product p ON pv.product_id = p.id
        WHERE oi.order_id = @orderId
      `;

      const orderItems = await executeQuery(itemsQuery, {
        orderId: newOrder[0].id,
      });

      res.status(201).json({
        ...orders[0],
        items: orderItems,
      });
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      return next(new AppError(error.message || "Failed to create order", 500));
    }
  })
);

/**
 * @route   PUT /api/orders/:id/pay
 * @desc    Update order to paid
 * @access  Private/Admin
 */
router.put(
  "/:id/pay",
  protect,
  restrictTo("admin", "manager"),
  catchAsync(async (req, res, next) => {
    const { payment_method } = req.body;

    // Check if order exists
    const orderQuery = "SELECT * FROM [order] WHERE id = @orderId";
    const orders = await executeQuery(orderQuery, {
      orderId: req.params.id,
    });

    if (!orders || orders.length === 0) {
      return next(new AppError("Order not found", 404));
    }

    const order = orders[0];

    if (order.payment_status === "Paid") {
      return next(new AppError("Order already paid", 400));
    }

    let transaction;
    try {
      transaction = await beginTransaction();

      // Update order payment status
      const updateQuery = `
        UPDATE [order]
        SET 
          payment_status = 'Paid',
          payment_date = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @orderId
      `;

      const updatedOrder = await executeTransactionQuery(
        transaction,
        updateQuery,
        {
          orderId: req.params.id,
        }
      );

      if (!updatedOrder || updatedOrder.length === 0) {
        await rollbackTransaction(transaction);
        return next(new AppError("Failed to update order payment status", 500));
      }

      // Create order history record
      const historyQuery = `
        INSERT INTO order_history (
          manager_id,
          order_id,
          processing_time,
          previous_status,
          new_status
        )
        VALUES (
          @managerId,
          @orderId,
          GETDATE(),
          @previousStatus,
          @newStatus
        )
      `;

      await executeTransactionQuery(transaction, historyQuery, {
        managerId: req.user.manager_id || 1, // Assume req.user has manager_id if admin
        orderId: req.params.id,
        previousStatus: order.status,
        newStatus: "Processing",
      });

      // Update order status to Processing
      const updateStatusQuery = `
        UPDATE [order]
        SET 
          status = 'Processing'
        WHERE id = @orderId
      `;

      await executeTransactionQuery(transaction, updateStatusQuery, {
        orderId: req.params.id,
      });

      await commitTransaction(transaction);

      // Return the updated order
      res.json(updatedOrder[0]);
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      return next(
        new AppError(error.message || "Failed to update payment status", 500)
      );
    }
  })
);

/**
 * @route   PUT /api/orders/:id/deliver
 * @desc    Update order to delivered
 * @access  Private/Admin
 */
router.put(
  "/:id/deliver",
  protect,
  restrictTo("admin", "manager"),
  catchAsync(async (req, res, next) => {
    // Check if order exists
    const orderQuery = "SELECT * FROM [order] WHERE id = @orderId";
    const orders = await executeQuery(orderQuery, {
      orderId: req.params.id,
    });

    if (!orders || orders.length === 0) {
      return next(new AppError("Order not found", 404));
    }

    const order = orders[0];

    if (order.status === "Completed") {
      return next(new AppError("Order already delivered", 400));
    }

    if (order.payment_status !== "Paid") {
      return next(new AppError("Order must be paid before delivery", 400));
    }

    let transaction;
    try {
      transaction = await beginTransaction();

      // Update order delivery status
      const updateQuery = `
        UPDATE [order]
        SET 
          status = 'Completed'
        OUTPUT INSERTED.*
        WHERE id = @orderId
      `;

      const updatedOrder = await executeTransactionQuery(
        transaction,
        updateQuery,
        {
          orderId: req.params.id,
        }
      );

      if (!updatedOrder || updatedOrder.length === 0) {
        await rollbackTransaction(transaction);
        return next(
          new AppError("Failed to update order delivery status", 500)
        );
      }

      // Create order history record
      const historyQuery = `
        INSERT INTO order_history (
          manager_id,
          order_id,
          processing_time,
          previous_status,
          new_status
        )
        VALUES (
          @managerId,
          @orderId,
          GETDATE(),
          @previousStatus,
          @newStatus
        )
      `;

      await executeTransactionQuery(transaction, historyQuery, {
        managerId: req.user.manager_id || 1,
        orderId: req.params.id,
        previousStatus: "Processing",
        newStatus: "Completed",
      });

      await commitTransaction(transaction);

      // Return the updated order
      res.json(updatedOrder[0]);
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      return next(
        new AppError(error.message || "Failed to update delivery status", 500)
      );
    }
  })
);

/**
 * @route   PUT /api/orders/:id/cancel
 * @desc    Cancel an order
 * @access  Private
 */
router.put(
  "/:id/cancel",
  protect,
  catchAsync(async (req, res, next) => {
    const { reason } = req.body;

    // Check if order exists
    const orderQuery = `
      SELECT o.*, c.account_id
      FROM [order] o
      JOIN customer c ON o.customer_id = c.id
      WHERE o.id = @orderId
    `;

    const orders = await executeQuery(orderQuery, {
      orderId: req.params.id,
    });

    if (!orders || orders.length === 0) {
      return next(new AppError("Order not found", 404));
    }

    const order = orders[0];

    // Check if the user is authorized to cancel this order
    if (req.user.role !== "admin" && order.account_id !== req.user.id) {
      return next(new AppError("Not authorized to cancel this order", 403));
    }

    if (order.status === "Cancelled") {
      return next(new AppError("Order already cancelled", 400));
    }

    if (order.status === "Completed") {
      return next(new AppError("Cannot cancel a delivered order", 400));
    }

    let transaction;
    try {
      transaction = await beginTransaction();

      // Update order status
      const updateQuery = `
        UPDATE [order]
        SET 
          status = 'Cancelled'
        OUTPUT INSERTED.*
        WHERE id = @orderId
      `;

      const updatedOrder = await executeTransactionQuery(
        transaction,
        updateQuery,
        {
          orderId: req.params.id,
        }
      );

      if (!updatedOrder || updatedOrder.length === 0) {
        await rollbackTransaction(transaction);
        return next(new AppError("Failed to cancel order", 500));
      }

      // Get manager ID (if admin) or use a default manager
      let managerId = 1; // Default
      if (req.user.role === "admin" && req.user.manager_id) {
        managerId = req.user.manager_id;
      }

      // Create order history record
      const historyQuery = `
        INSERT INTO order_history (
          manager_id,
          order_id,
          processing_time,
          previous_status,
          new_status
        )
        VALUES (
          @managerId,
          @orderId,
          GETDATE(),
          @previousStatus,
          @newStatus
        )
      `;

      await executeTransactionQuery(transaction, historyQuery, {
        managerId: managerId,
        orderId: req.params.id,
        previousStatus: order.status,
        newStatus: "Cancelled",
      });

      await commitTransaction(transaction);

      // Return the updated order
      res.json(updatedOrder[0]);
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      return next(new AppError(error.message || "Failed to cancel order", 500));
    }
  })
);

/**
 * @route   PUT /api/orders/:id/update-status
 * @desc    Admin/Manager manually updates order status
 * @access  Private/Admin or Manager
 */
router.put(
  "/:id/update-status",
  protect,
  restrictTo("admin", "manager"),
  catchAsync(async (req, res, next) => {
    const { newStatus /*, reason*/ } = req.body; // reason is no longer used from req.body for DB insert
    const orderId = req.params.id;
    const managerId = req.user.manager_id || 1;

    const validOrderStatuses = [
      "Pending",
      "Processing",
      "Completed",
      "Cancelled",
      "Rejected",
    ];

    if (!newStatus || !validOrderStatuses.includes(newStatus)) {
      return next(new AppError("Invalid new status provided", 400));
    }

    const orderQuery = "SELECT * FROM [order] WHERE id = @orderId";
    const orders = await executeQuery(orderQuery, { orderId });

    if (!orders || orders.length === 0) {
      return next(new AppError("Order not found", 404));
    }
    const currentOrder = orders[0];

    if (currentOrder.status === newStatus) {
      return next(
        new AppError(`Order is already in '${newStatus}' status`, 400)
      );
    }

    if (
      (currentOrder.status === "Completed" ||
        currentOrder.status === "Cancelled") &&
      req.user.role !== "admin"
    ) {
      return next(
        new AppError(
          `Cannot change status of a ${currentOrder.status} order.`,
          403
        )
      );
    }
    if (
      newStatus === "Completed" &&
      currentOrder.payment_status !== "Paid" &&
      req.user.role !== "admin"
    ) {
      return next(
        new AppError(
          "Order must be paid before it can be marked as Completed.",
          400
        )
      );
    }

    let transaction;
    try {
      transaction = await beginTransaction();

      const updateOrderStatusQuery = `
        UPDATE [order]
        SET status = @newStatus
        OUTPUT INSERTED.*
        WHERE id = @orderId
      `;
      const updatedOrderResult = await executeTransactionQuery(
        transaction,
        updateOrderStatusQuery,
        { newStatus, orderId }
      );

      if (!updatedOrderResult || updatedOrderResult.length === 0) {
        await rollbackTransaction(transaction);
        return next(new AppError("Failed to update order status", 500));
      }

      const historyQuery = `
        INSERT INTO order_history (
          manager_id,
          order_id,
          processing_time,
          previous_status,
          new_status
        )
        VALUES (
          @managerId,
          @orderId,
          GETDATE(),
          @previousStatus,
          @newStatus
        )
      `;
      await executeTransactionQuery(transaction, historyQuery, {
        managerId,
        orderId,
        previousStatus: currentOrder.status,
        newStatus,
      });

      await commitTransaction(transaction);
      res.json(updatedOrderResult[0]);
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      return next(
        new AppError(error.message || "Failed to update order status", 500)
      );
    }
  })
);

module.exports = router;
