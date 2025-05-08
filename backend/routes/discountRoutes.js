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
 * @route   GET /api/discounts
 * @desc    Get discounts with server-side pagination, filtering, and sorting
 * @access  Private/Admin
 */
router.get(
  "/",
  protect,
  // restrictTo('admin', 'manager'), // Adjust roles as needed
  catchAsync(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const validSortFields = [
      "id",
      "name",
      "code",
      "type",
      "value",
      "status",
      "start_date",
      "end_date",
      "product_name",
      "variant_sku",
    ];
    const sortBy = validSortFields.includes(req.query.sortBy)
      ? req.query.sortBy
      : "id";
    const sortOrder = req.query.sortOrder === "asc" ? "ASC" : "DESC";

    const search = req.query.search || "";
    const statusFilter = req.query.status || ""; // e.g., 'Active,Inactive'
    const typeFilter = req.query.type || ""; // e.g., 'Percentage,FixedAmount'

    let whereClauses = [];
    const params = {};

    if (search) {
      whereClauses.push(
        "(d.name LIKE @search OR d.code LIKE @search OR p.name LIKE @search OR pv.sku LIKE @search)"
      );
      params.search = `%${search}%`;
    }
    if (statusFilter) {
      const statuses = statusFilter.split(",").map((s) => s.trim());
      if (statuses.length > 0) {
        const statusPlaceholders = statuses
          .map((_, i) => `@status${i}`)
          .join(", ");
        whereClauses.push(`d.status IN (${statusPlaceholders})`);
        statuses.forEach((status, i) => {
          params[`status${i}`] = status;
        });
      }
    }
    if (typeFilter) {
      const types = typeFilter.split(",").map((t) => t.trim());
      if (types.length > 0) {
        const typePlaceholders = types.map((_, i) => `@type${i}`).join(", ");
        whereClauses.push(`d.type IN (${typePlaceholders})`);
        types.forEach((type, i) => {
          params[`type${i}`] = type;
        });
      }
    }

    const whereString = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    const baseQuery = `
            FROM discount d
            JOIN product_variant pv ON d.product_variant_id = pv.id
            JOIN product p ON pv.product_id = p.id
            ${whereString}
        `;

    const totalCountQuery = `SELECT COUNT(d.id) as totalCount ${baseQuery}`;
    const dataQuery = `
            SELECT
                d.id, d.name, d.code, d.type, d.value, d.status,
                d.start_date, d.end_date,
                d.product_variant_id, pv.sku as variant_sku, p.name as product_name
            ${baseQuery}
            ORDER BY
                CASE WHEN @sortBy = 'product_name' THEN p.name END ${sortOrder},
                CASE WHEN @sortBy = 'variant_sku' THEN pv.sku END ${sortOrder},
                CASE WHEN @sortBy = 'id' THEN CAST(d.id AS NVARCHAR(MAX)) END ${sortOrder},
                CASE WHEN @sortBy = 'name' THEN d.name END ${sortOrder},
                CASE WHEN @sortBy = 'code' THEN d.code END ${sortOrder},
                CASE WHEN @sortBy = 'type' THEN d.type END ${sortOrder},
                CASE WHEN @sortBy = 'value' THEN CAST(d.value AS NVARCHAR(MAX)) END ${sortOrder},
                CASE WHEN @sortBy = 'status' THEN d.status END ${sortOrder},
                CASE WHEN @sortBy = 'start_date' THEN d.start_date END ${sortOrder},
                CASE WHEN @sortBy = 'end_date' THEN d.end_date END ${sortOrder}
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
        `;

    const finalParams = {
      ...params,
      sortBy: sortBy,
      offset: offset,
      pageSize: pageSize,
    };

    const totalResult = await executeQuery(totalCountQuery, params);
    const dataResult = await executeQuery(dataQuery, finalParams);

    const totalCount = totalResult[0].totalCount;

    res.json({
      discounts: dataResult || [],
      totalCount: totalCount,
      currentPage: page,
      pageSize: pageSize,
    });
  })
);

/**
 * @route   GET /api/discounts/:id
 * @desc    Get discount details by ID
 * @access  Private/Admin
 */
router.get(
  "/:id",
  protect,
  // restrictTo('admin', 'manager'),
  catchAsync(async (req, res, next) => {
    const discountId = req.params.id;

    const query = `
            SELECT
                d.id, d.name, d.code, d.type, d.value, d.status,
                d.start_date, d.end_date,
                d.product_variant_id, pv.sku as variant_sku, p.name as product_name
            FROM discount d
            JOIN product_variant pv ON d.product_variant_id = pv.id
            JOIN product p ON pv.product_id = p.id
            WHERE d.id = @id
        `;

    const result = await executeQuery(query, { id: discountId });

    if (!result || result.length === 0) {
      return next(new AppError("Discount not found", 404));
    }

    res.json(result[0]);
  })
);

/**
 * @route   POST /api/discounts
 * @desc    Create a new discount
 * @access  Private/Admin
 */
router.post(
  "/",
  protect,
  // restrictTo('admin', 'manager'),
  catchAsync(async (req, res, next) => {
    const {
      product_variant_id,
      code,
      name,
      type,
      value,
      status = "Active",
      start_date,
      end_date,
    } = req.body;

    // --- Basic Validation ---
    if (!product_variant_id || !code || !type || value === undefined) {
      return next(
        new AppError(
          "Missing required fields: product_variant_id, code, type, value",
          400
        )
      );
    }

    if (!["Percentage", "FixedAmount"].includes(type)) {
      return next(new AppError("Invalid discount type", 400));
    }

    if (type === "Percentage" && (value < 0 || value > 100)) {
      return next(
        new AppError("Percentage value must be between 0 and 100", 400)
      );
    }
    if (type === "FixedAmount" && value < 0) {
      return next(new AppError("Fixed amount value must be non-negative", 400));
    }

    if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
      return next(new AppError("Start date must be before end date", 400));
    }

    // --- Check if product variant exists ---
    const variantCheckQuery = "SELECT id FROM product_variant WHERE id = @id";
    const variantExists = await executeQuery(variantCheckQuery, {
      id: product_variant_id,
    });
    if (!variantExists || variantExists.length === 0) {
      return next(new AppError("Product variant not found", 404));
    }

    // --- Insert Discount ---
    const insertQuery = `
            INSERT INTO discount (
                product_variant_id, code, name, type, value, status, start_date, end_date
            )
            OUTPUT INSERTED.id, INSERTED.product_variant_id, INSERTED.code, INSERTED.name,
                   INSERTED.type, INSERTED.value, INSERTED.status, INSERTED.start_date, INSERTED.end_date
            VALUES (
                @product_variant_id, @code, @name, @type, @value, @status, @start_date, @end_date
            )
        `;
    const params = {
      product_variant_id,
      code,
      name: name || null,
      type,
      value,
      status,
      start_date: start_date || null,
      end_date: end_date || null,
    };

    try {
      const result = await executeQuery(insertQuery, params);

      if (!result || result.length === 0) {
        throw new Error("Failed to create discount");
      }

      // Fetch additional info (product name, sku) for the response
      const newDiscount = result[0];
      const detailQuery = `
                SELECT pv.sku as variant_sku, p.name as product_name
                FROM product_variant pv
                JOIN product p ON pv.product_id = p.id
                WHERE pv.id = @id
            `;
      const detailResult = await executeQuery(detailQuery, {
        id: newDiscount.product_variant_id,
      });
      const details = detailResult[0] || {};

      res.status(201).json({
        ...newDiscount,
        variant_sku: details.variant_sku,
        product_name: details.product_name,
      });
    } catch (error) {
      if (error.message && error.message.includes("UNIQUE KEY constraint")) {
        return next(
          new AppError(`Discount code '${code}' already exists.`, 409)
        );
      }
      console.error("Error creating discount:", error);
      return next(
        new AppError(`Failed to create discount: ${error.message}`, 500)
      );
    }
  })
);

/**
 * @route   PUT /api/discounts/:id
 * @desc    Update a discount
 * @access  Private/Admin
 */
router.put(
  "/:id",
  protect,
  // restrictTo('admin', 'manager'),
  catchAsync(async (req, res, next) => {
    const discountId = req.params.id;
    const {
      product_variant_id,
      code,
      name,
      type,
      value,
      status,
      start_date,
      end_date,
    } = req.body;

    // --- Check if discount exists ---
    const checkQuery = "SELECT id, type FROM discount WHERE id = @id"; // Also get current type
    const checkResult = await executeQuery(checkQuery, { id: discountId });
    if (!checkResult || checkResult.length === 0) {
      return next(new AppError("Discount not found", 404));
    }
    const currentDiscountType = checkResult[0].type;

    // --- Validate inputs ---
    const updateFields = [];
    const params = { id: discountId };

    if (product_variant_id !== undefined) {
      const variantCheckQuery = "SELECT id FROM product_variant WHERE id = @id";
      const variantExists = await executeQuery(variantCheckQuery, {
        id: product_variant_id,
      });
      if (!variantExists || variantExists.length === 0) {
        return next(new AppError("Product variant not found", 404));
      }
      updateFields.push("product_variant_id = @product_variant_id");
      params.product_variant_id = product_variant_id;
    }
    if (code !== undefined) {
      updateFields.push("code = @code");
      params.code = code;
    }
    if (name !== undefined) {
      updateFields.push("name = @name");
      params.name = name === null ? null : name;
    }

    const finalType = type !== undefined ? type : currentDiscountType;
    const finalValue = value !== undefined ? value : undefined; // Use undefined if not provided

    if (type !== undefined) {
      if (!["Percentage", "FixedAmount"].includes(type)) {
        return next(new AppError("Invalid discount type", 400));
      }
      updateFields.push("type = @type");
      params.type = type;
    }

    if (finalValue !== undefined) {
      if (finalType === "Percentage" && (finalValue < 0 || finalValue > 100)) {
        return next(
          new AppError("Percentage value must be between 0 and 100", 400)
        );
      }
      if (finalType === "FixedAmount" && finalValue < 0) {
        return next(
          new AppError("Fixed amount value must be non-negative", 400)
        );
      }
      updateFields.push("value = @value");
      params.value = finalValue;
    }

    if (status !== undefined) {
      updateFields.push("status = @status");
      params.status = status;
    }

    const finalStartDate = start_date !== undefined ? start_date : undefined;
    const finalEndDate = end_date !== undefined ? end_date : undefined;

    // Need to fetch existing dates if only one is provided for validation
    let existingStartDate = null;
    let existingEndDate = null;
    if (
      (finalStartDate !== undefined && finalEndDate === undefined) ||
      (finalStartDate === undefined && finalEndDate !== undefined)
    ) {
      const dateQuery =
        "SELECT start_date, end_date FROM discount WHERE id = @id";
      const dateResult = await executeQuery(dateQuery, { id: discountId });
      if (dateResult && dateResult.length > 0) {
        existingStartDate = dateResult[0].start_date;
        existingEndDate = dateResult[0].end_date;
      }
    }

    const effectiveStartDate = finalStartDate ?? existingStartDate;
    const effectiveEndDate = finalEndDate ?? existingEndDate;

    if (
      effectiveStartDate &&
      effectiveEndDate &&
      new Date(effectiveStartDate) >= new Date(effectiveEndDate)
    ) {
      return next(new AppError("Start date must be before end date", 400));
    }

    if (start_date !== undefined) {
      updateFields.push("start_date = @start_date");
      params.start_date = start_date === null ? null : start_date;
    }
    if (end_date !== undefined) {
      updateFields.push("end_date = @end_date");
      params.end_date = end_date === null ? null : end_date;
    }

    if (updateFields.length === 0) {
      return next(new AppError("No fields provided for update", 400));
    }

    // --- Update Discount ---
    const updateQuery = `
            UPDATE discount
            SET ${updateFields.join(", ")}
            OUTPUT INSERTED.id, INSERTED.product_variant_id, INSERTED.code, INSERTED.name,
                   INSERTED.type, INSERTED.value, INSERTED.status, INSERTED.start_date, INSERTED.end_date
            WHERE id = @id
        `;

    try {
      const result = await executeQuery(updateQuery, params);

      if (!result || result.length === 0) {
        throw new Error("Failed to update discount");
      }

      // Fetch additional info for the response
      const updatedDiscount = result[0];
      const detailQuery = `
                SELECT pv.sku as variant_sku, p.name as product_name
                FROM product_variant pv
                JOIN product p ON pv.product_id = p.id
                WHERE pv.id = @id
            `;
      const detailResult = await executeQuery(detailQuery, {
        id: updatedDiscount.product_variant_id,
      });
      const details = detailResult[0] || {};

      res.json({
        ...updatedDiscount,
        variant_sku: details.variant_sku,
        product_name: details.product_name,
      });
    } catch (error) {
      if (error.message && error.message.includes("UNIQUE KEY constraint")) {
        return next(
          new AppError(`Discount code '${params.code}' already exists.`, 409)
        );
      }
      console.error("Error updating discount:", error);
      return next(
        new AppError(`Failed to update discount: ${error.message}`, 500)
      );
    }
  })
);

/**
 * @route   DELETE /api/discounts/:id
 * @desc    Delete a discount
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  protect,
  // restrictTo('admin', 'manager'),
  catchAsync(async (req, res, next) => {
    const discountId = req.params.id;

    const deleteQuery = "DELETE FROM discount OUTPUT DELETED.id WHERE id = @id";
    const params = { id: discountId };

    const result = await executeQuery(deleteQuery, params);

    if (!result || result.length === 0) {
      return next(
        new AppError("Discount not found or could not be deleted", 404)
      );
    }

    res.status(200).json({ message: "Discount deleted successfully" });
  })
);

module.exports = router;
