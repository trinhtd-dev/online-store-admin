const express = require("express");
const sql = require("mssql"); // Cần sql để định nghĩa kiểu dữ liệu
const { protect, restrictTo } = require("../middlewares/authMiddleware");
const {
  executeQuery,
  beginTransaction,
  executeTransactionQuery,
  commitTransaction,
  rollbackTransaction,
} = require("../config/db");
const { catchAsync, AppError } = require("../utils/errorHandler");

const router = express.Router();

// --- Middleware bảo vệ cho tất cả các route dưới đây ---
router.use(protect);
// Tùy chọn: Chỉ cho phép admin hoặc manager truy cập
// router.use(restrictTo('admin', 'manager'));

// --- Định nghĩa Routes ---

/**
 * @route   GET /api/feedback
 * @desc    Lấy danh sách phản hồi với phân trang, lọc, sắp xếp
 * @access  Private (Manager/Admin)
 */
router.get(
  "/",
  catchAsync(async (req, res, next) => {
    console.log("API_CALL: GET /api/feedback - Invoked");
    console.log(
      "API_CALL: GET /api/feedback - Raw Query Params:",
      JSON.stringify(req.query)
    );

    let {
      page,
      limit,
      sortBy = "feedback_created_at",
      sortOrder = "DESC",
      productId,
      customerId,
      rating,
      hasResponse,
      search,
    } = req.query;

    let currentPage = Math.max(1, parseInt(page, 10) || 1);
    let currentLimit = Math.max(1, parseInt(limit, 10) || 10);
    if (currentLimit > 100) currentLimit = 100; // Giới hạn pageSize
    const offset = (currentPage - 1) * currentLimit;

    console.log(
      `API_CALL: GET /api/feedback - Pagination: page=${currentPage}, limit=${currentLimit}, offset=${offset}`
    );

    let selectQuery = `
      SELECT 
        f.id AS feedback_id,
        f.comment,
        f.rating,
        f.created_at AS feedback_created_at,
        p.name AS product_name,
        p.id AS product_id,
        c_acc.full_name AS customer_name,
        c.id AS customer_id,
        fr.id AS response_id,
        fr.content AS response_content,
        fr.created_at AS response_created_at,
        m_acc.full_name AS manager_name
      FROM feedback f
      JOIN product p ON f.product_id = p.id
      JOIN customer c ON f.customer_id = c.id
      JOIN account c_acc ON c.account_id = c_acc.id
      LEFT JOIN feedback_response fr ON f.id = fr.feedback_id
      LEFT JOIN manager m ON fr.manager_id = m.id
      LEFT JOIN account m_acc ON m.account_id = m_acc.id
    `;

    let countQuery = `
      SELECT COUNT(*) AS totalCount
      FROM feedback f
      JOIN product p ON f.product_id = p.id
      JOIN customer c ON f.customer_id = c.id
      JOIN account c_acc ON c.account_id = c_acc.id
      LEFT JOIN feedback_response fr ON f.id = fr.feedback_id
    `;

    const conditions = [];
    const queryParams = {}; // Params cho cả select và count (phần WHERE)
    const selectOnlyParams = {}; // Params chỉ cho select (OFFSET, LIMIT)

    if (productId) {
      conditions.push(`f.product_id = @productId`);
      const pid = parseInt(productId, 10);
      if (isNaN(pid))
        return next(new AppError("Invalid productId format.", 400));
      queryParams.productId = pid;
    }
    if (customerId) {
      conditions.push(`f.customer_id = @customerId`);
      const cid = parseInt(customerId, 10);
      if (isNaN(cid))
        return next(new AppError("Invalid customerId format.", 400));
      queryParams.customerId = cid;
    }
    if (rating) {
      conditions.push(`f.rating = @rating`);
      const r = parseInt(rating, 10);
      if (isNaN(r) || r < 1 || r > 5)
        return next(new AppError("Invalid rating value (must be 1-5).", 400));
      queryParams.rating = r;
    }
    if (hasResponse === "true") {
      conditions.push(`fr.id IS NOT NULL`);
    }
    if (hasResponse === "false") {
      conditions.push(`fr.id IS NULL`);
    }

    if (search && search.trim() !== "") {
      conditions.push(`(
        p.name LIKE @searchTerm 
        OR c_acc.full_name LIKE @searchTerm 
        OR f.comment LIKE @searchTerm
      )`);
      queryParams.searchTerm = `%${search.trim()}%`;
    }

    if (conditions.length > 0) {
      const whereClause = ` WHERE ${conditions.join(" AND ")}`;
      selectQuery += whereClause;
      countQuery += whereClause;
    }

    const validSortColumns = [
      "feedback_created_at",
      "rating",
      "product_name",
      "customer_name",
    ];
    let sortColumnQuery = validSortColumns.includes(sortBy)
      ? sortBy
      : "feedback_created_at";
    if (sortBy === "created_at") sortColumnQuery = "feedback_created_at"; // Handle common case
    const orderDirection = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    selectQuery += ` ORDER BY ${sortColumnQuery} ${orderDirection} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
    selectOnlyParams.offset = offset;
    selectOnlyParams.limit = currentLimit;

    console.log(
      "API_CALL: GET /api/feedback - Final Select Query:",
      selectQuery
    );
    console.log(
      "API_CALL: GET /api/feedback - Final SQL Params (Select):",
      JSON.stringify({ ...queryParams, ...selectOnlyParams })
    );
    console.log("API_CALL: GET /api/feedback - Final Count Query:", countQuery);
    console.log(
      "API_CALL: GET /api/feedback - Final SQL Params (Count):",
      JSON.stringify(queryParams)
    );

    // Sử dụng executeQuery vì đây là đọc dữ liệu
    const feedbacks = await executeQuery(selectQuery, {
      ...queryParams,
      ...selectOnlyParams,
    });
    const countResult = await executeQuery(countQuery, queryParams);

    const totalCount = countResult[0] ? countResult[0].totalCount : 0;
    console.log(
      "API_CALL: GET /api/feedback - Total Count Result:",
      totalCount
    );

    res.status(200).json({
      status: "success",
      data: feedbacks, // Trả về feedbacks trực tiếp từ query (đã bỏ image_url)
      totalCount: totalCount,
      currentPage: currentPage,
      pageSize: currentLimit,
    });
  })
);

/**
 * @route   GET /api/feedback/:id
 * @desc    Lấy chi tiết một phản hồi
 * @access  Private (Manager/Admin)
 */
router.get(
  "/:id",
  catchAsync(async (req, res, next) => {
    const { id } = req.params;
    console.log("API_CALL: GET /api/feedback/:id - Invoked for ID:", id);

    const feedbackIdInt = parseInt(id, 10);
    if (isNaN(feedbackIdInt)) {
      return next(new AppError("Invalid feedback ID format.", 400));
    }

    const query = `
      SELECT 
        f.id AS feedback_id, f.comment, f.rating, f.created_at AS feedback_created_at,
        p.name AS product_name, p.id AS product_id, pv.id AS product_variant_id,
        c_acc.full_name AS customer_name, c.id AS customer_id,
        c_acc.email AS customer_email, c.phone_number AS customer_phone_number,
        fr.id AS response_id, fr.content AS response_content, fr.created_at AS response_created_at,
        m_acc.full_name AS manager_name, m.id AS manager_id
      FROM feedback f
      JOIN product p ON f.product_id = p.id
      JOIN product_variant pv ON f.product_variant_id = pv.id
      JOIN customer c ON f.customer_id = c.id
      JOIN account c_acc ON c.account_id = c_acc.id
      LEFT JOIN feedback_response fr ON f.id = fr.feedback_id
      LEFT JOIN manager m ON fr.manager_id = m.id
      LEFT JOIN account m_acc ON m.account_id = m_acc.id
      WHERE f.id = @feedbackIdSqlParam
    `;

    const params = { feedbackIdSqlParam: feedbackIdInt };
    console.log("API_CALL: GET /api/feedback/:id - Executing Query:", query);
    console.log(
      "API_CALL: GET /api/feedback/:id - SQL Params:",
      JSON.stringify(params)
    );

    const result = await executeQuery(query, params);

    if (!result || result.length === 0) {
      return next(new AppError("Feedback not found.", 404));
    }

    // Không cần thêm image_url nữa vì query không lấy nó
    const feedbackData = result[0];

    console.log(
      "API_CALL: GET /api/feedback/:id - Feedback found:",
      JSON.stringify(feedbackData)
    );
    res.status(200).json({
      status: "success",
      data: feedbackData, // Trả về dữ liệu trực tiếp
    });
  })
);

/**
 * @route   POST /api/feedback/:feedbackId/responses
 * @desc    Tạo phản hồi của admin cho một feedback
 * @access  Private (Manager/Admin)
 */
router.post(
  "/:feedbackId/responses",
  catchAsync(async (req, res, next) => {
    const { feedbackId } = req.params;
    const { content } = req.body;
    const managerAccountId = req.user.id;

    console.log(
      `API_CALL: POST /api/feedback/:feedbackId/responses - Feedback ID: ${feedbackId}, Manager Account ID: ${managerAccountId}`
    );

    if (!content || content.trim() === "") {
      return next(new AppError("Response content cannot be empty.", 400));
    }

    const feedbackIdInt = parseInt(feedbackId, 10);
    if (isNaN(feedbackIdInt)) {
      return next(new AppError("Invalid feedback ID format.", 400));
    }

    let transaction;
    try {
      transaction = await beginTransaction();
      console.log("API_CALL: POST .../responses - Transaction begun");

      // Lấy actualManagerId từ managerAccountId
      const managerRecordResult = await executeTransactionQuery(
        transaction,
        "SELECT id FROM manager WHERE account_id = @accountId",
        { accountId: managerAccountId }
      );
      if (!managerRecordResult || managerRecordResult.length === 0) {
        await rollbackTransaction(transaction);
        return next(
          new AppError("Manager profile not found for the logged-in user.", 404)
        );
      }
      const actualManagerId = managerRecordResult[0].id;
      console.log(
        `API_CALL: POST .../responses - Actual Manager ID: ${actualManagerId}`
      );

      // Kiểm tra feedback tồn tại
      const feedbackCheckResult = await executeTransactionQuery(
        transaction,
        "SELECT id FROM feedback WHERE id = @feedbackIdSqlParam",
        { feedbackIdSqlParam: feedbackIdInt }
      );
      if (!feedbackCheckResult || feedbackCheckResult.length === 0) {
        await rollbackTransaction(transaction);
        return next(new AppError("Feedback not found.", 404));
      }

      // Kiểm tra response đã tồn tại chưa
      const existingResponseResult = await executeTransactionQuery(
        transaction,
        "SELECT id FROM feedback_response WHERE feedback_id = @feedbackIdSqlParam",
        { feedbackIdSqlParam: feedbackIdInt }
      );
      if (existingResponseResult && existingResponseResult.length > 0) {
        await rollbackTransaction(transaction);
        return next(
          new AppError("A response already exists for this feedback.", 409)
        );
      }

      const insertQuery = `
        INSERT INTO feedback_response (manager_id, feedback_id, content, created_at)
        OUTPUT INSERTED.*
        VALUES (@managerIdParam, @feedbackIdParam, @contentParam, GETDATE())
      `;
      const insertParams = {
        managerIdParam: actualManagerId,
        feedbackIdParam: feedbackIdInt,
        contentParam: content,
      };

      const result = await executeTransactionQuery(
        transaction,
        insertQuery,
        insertParams
      );
      await commitTransaction(transaction);
      console.log("API_CALL: POST .../responses - Transaction committed");

      console.log(
        "API_CALL: POST .../responses - Response created:",
        JSON.stringify(result[0])
      );
      res.status(201).json({
        status: "success",
        data: result[0],
      });
    } catch (error) {
      console.error(
        "API_ERROR: POST .../responses - Transaction Error:",
        error
      );
      if (transaction && transaction.active) {
        // Kiểm tra transaction.active
        try {
          await rollbackTransaction(transaction);
        } catch (rbErr) {
          console.error("Rollback Error", rbErr);
        }
      }
      next(error);
    }
  })
);

/**
 * @route   PUT /api/feedback/responses/:responseId
 * @desc    Cập nhật phản hồi của admin
 * @access  Private (Manager/Admin)
 */
router.put(
  "/responses/:responseId",
  catchAsync(async (req, res, next) => {
    const { responseId } = req.params;
    const { content } = req.body;
    const managerAccountId = req.user.id;

    console.log(
      `API_CALL: PUT /api/feedback/responses/:responseId - Response ID: ${responseId}, Manager Account ID: ${managerAccountId}`
    );

    if (!content || content.trim() === "") {
      return next(new AppError("Response content cannot be empty.", 400));
    }

    const responseIdInt = parseInt(responseId, 10);
    if (isNaN(responseIdInt)) {
      return next(new AppError("Invalid response ID format.", 400));
    }

    let transaction;
    try {
      transaction = await beginTransaction();
      console.log(
        "API_CALL: PUT .../responses/:responseId - Transaction begun"
      );

      // Lấy actualManagerId
      const managerRecordResult = await executeTransactionQuery(
        transaction,
        "SELECT id FROM manager WHERE account_id = @accountId",
        { accountId: managerAccountId }
      );
      if (!managerRecordResult || managerRecordResult.length === 0) {
        await rollbackTransaction(transaction);
        return next(
          new AppError("Manager profile not found for the logged-in user.", 404)
        );
      }
      const actualManagerId = managerRecordResult[0].id;
      console.log(
        `API_CALL: PUT .../responses/:responseId - Actual Manager ID: ${actualManagerId}`
      );

      // Kiểm tra response tồn tại và quyền sở hữu
      const responseCheckResult = await executeTransactionQuery(
        transaction,
        "SELECT id, manager_id FROM feedback_response WHERE id = @responseIdSqlParam",
        { responseIdSqlParam: responseIdInt }
      );
      if (!responseCheckResult || responseCheckResult.length === 0) {
        await rollbackTransaction(transaction);
        return next(new AppError("Feedback response not found.", 404));
      }
      if (responseCheckResult[0].manager_id !== actualManagerId) {
        await rollbackTransaction(transaction);
        return next(
          new AppError("You are not authorized to update this response.", 403)
        );
      }

      // Nên thêm cột updated_at và cập nhật nó
      const updateQuery = `
        UPDATE feedback_response
        SET content = @contentParam,
            updated_at = GETDATE() -- Giả sử đã thêm cột updated_at
        OUTPUT INSERTED.*
        WHERE id = @responseIdParam -- Không cần AND manager_id nữa vì đã check ở trên
      `;
      const updateParams = {
        responseIdParam: responseIdInt,
        contentParam: content,
      };
      const result = await executeTransactionQuery(
        transaction,
        updateQuery,
        updateParams
      );

      // Kiểm tra xem có bản ghi nào được cập nhật không (trường hợp hiếm)
      if (!result || result.length === 0) {
        await rollbackTransaction(transaction);
        console.error(
          "API_ERROR: PUT .../responses/:responseId - Update failed, no rows affected or returned."
        );
        return next(new AppError("Failed to update feedback response.", 500));
      }

      await commitTransaction(transaction);
      console.log(
        "API_CALL: PUT .../responses/:responseId - Transaction committed"
      );

      console.log(
        "API_CALL: PUT .../responses/:responseId - Response updated:",
        JSON.stringify(result[0])
      );
      res.status(200).json({
        status: "success",
        data: result[0],
      });
    } catch (error) {
      console.error(
        "API_ERROR: PUT .../responses/:responseId - Transaction Error:",
        error
      );
      if (transaction && transaction.active) {
        try {
          await rollbackTransaction(transaction);
        } catch (rbErr) {
          console.error("Rollback Error", rbErr);
        }
      }
      next(error);
    }
  })
);

/**
 * @route   DELETE /api/feedback/:feedbackId
 * @desc    Xóa một feedback và các response liên quan
 * @access  Private (Manager/Admin)
 */
router.delete(
  "/:feedbackId",
  catchAsync(async (req, res, next) => {
    const { feedbackId } = req.params;
    console.log(
      `API_CALL: DELETE /api/feedback/:feedbackId - Feedback ID: ${feedbackId}`
    );

    const feedbackIdInt = parseInt(feedbackId, 10);
    if (isNaN(feedbackIdInt)) {
      return next(new AppError("Invalid feedback ID format.", 400));
    }

    let transaction;
    try {
      transaction = await beginTransaction();
      console.log(
        "API_CALL: DELETE /api/feedback/:feedbackId - Transaction begun"
      );

      // Kiểm tra feedback tồn tại
      const feedbackCheck = await executeTransactionQuery(
        transaction,
        "SELECT id FROM feedback WHERE id = @feedbackIdSqlParam",
        { feedbackIdSqlParam: feedbackIdInt }
      );
      if (!feedbackCheck || feedbackCheck.length === 0) {
        await rollbackTransaction(transaction);
        console.log(
          "API_CALL: DELETE /api/feedback/:feedbackId - Feedback not found, rolling back."
        );
        return next(new AppError("Feedback not found.", 404));
      }

      // Xóa responses liên quan
      const deleteResponsesParams = { feedbackIdSqlParam: feedbackIdInt };
      await executeTransactionQuery(
        transaction,
        "DELETE FROM feedback_response WHERE feedback_id = @feedbackIdSqlParam",
        deleteResponsesParams
      );
      console.log(
        "API_CALL: DELETE /api/feedback/:feedbackId - Related responses deleted"
      );

      // Xóa feedback
      const deleteFeedbackParams = { feedbackIdSqlParam: feedbackIdInt };
      // Sử dụng executeTransactionQuery, không có rowsAffected trực tiếp
      await executeTransactionQuery(
        transaction,
        "DELETE FROM feedback WHERE id = @feedbackIdSqlParam",
        deleteFeedbackParams
      );
      // Giả định thành công nếu không có lỗi ở bước này và bước kiểm tra tồn tại

      await commitTransaction(transaction);
      console.log(
        "API_CALL: DELETE /api/feedback/:feedbackId - Transaction committed, feedback deleted"
      );
      res.status(204).json({ status: "success", data: null });
    } catch (error) {
      console.error(
        "API_ERROR: DELETE /api/feedback/:feedbackId - Transaction Error:",
        error
      );
      if (transaction && transaction.active) {
        try {
          await rollbackTransaction(transaction);
        } catch (rbErr) {
          console.error("Rollback Error", rbErr);
        }
      }
      next(error);
    }
  })
);

/**
 * @route   DELETE /api/feedback/responses/:responseId
 * @desc    Xóa một response cụ thể
 * @access  Private (Manager/Admin)
 */
router.delete(
  "/responses/:responseId",
  catchAsync(async (req, res, next) => {
    const { responseId } = req.params;
    const managerAccountId = req.user.id;
    console.log(
      `API_CALL: DELETE /api/feedback/responses/:responseId - Response ID: ${responseId}, Manager Account ID: ${managerAccountId}`
    );

    const responseIdInt = parseInt(responseId, 10);
    if (isNaN(responseIdInt)) {
      return next(new AppError("Invalid response ID format.", 400));
    }

    let transaction;
    try {
      transaction = await beginTransaction();
      console.log(
        "API_CALL: DELETE .../responses/:responseId - Transaction begun"
      );

      // Lấy actualManagerId
      const managerRecordResult = await executeTransactionQuery(
        transaction,
        "SELECT id FROM manager WHERE account_id = @accountId",
        { accountId: managerAccountId }
      );
      if (!managerRecordResult || managerRecordResult.length === 0) {
        await rollbackTransaction(transaction);
        return next(
          new AppError("Manager profile not found for the logged-in user.", 404)
        );
      }
      const actualManagerId = managerRecordResult[0].id;
      console.log(
        `API_CALL: DELETE .../responses/:responseId - Actual Manager ID: ${actualManagerId}`
      );

      // Kiểm tra response tồn tại và quyền sở hữu
      const responseCheckResult = await executeTransactionQuery(
        transaction,
        "SELECT id, manager_id FROM feedback_response WHERE id = @responseIdSqlParam",
        { responseIdSqlParam: responseIdInt }
      );
      if (!responseCheckResult || responseCheckResult.length === 0) {
        await rollbackTransaction(transaction);
        return next(new AppError("Feedback response not found.", 404));
      }
      if (responseCheckResult[0].manager_id !== actualManagerId) {
        await rollbackTransaction(transaction);
        return next(
          new AppError("You are not authorized to delete this response.", 403)
        );
      }

      // Xóa response
      const deleteParams = { responseIdSqlParam: responseIdInt };
      // Sử dụng executeTransactionQuery, không có rowsAffected trực tiếp
      await executeTransactionQuery(
        transaction,
        "DELETE FROM feedback_response WHERE id = @responseIdSqlParam",
        deleteParams
      );
      // Giả định thành công nếu không có lỗi ở bước này và bước kiểm tra tồn tại/quyền

      await commitTransaction(transaction);
      console.log(
        "API_CALL: DELETE .../responses/:responseId - Transaction committed, response deleted"
      );
      res.status(204).json({ status: "success", data: null });
    } catch (error) {
      console.error(
        "API_ERROR: DELETE .../responses/:responseId - Transaction Error:",
        error
      );
      if (transaction && transaction.active) {
        try {
          await rollbackTransaction(transaction);
        } catch (rbErr) {
          console.error("Rollback Error", rbErr);
        }
      }
      next(error);
    }
  })
);

module.exports = router;
