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
 * @route   GET /api/attributes
 * @desc    Get all attributes
 * @access  Public
 */
router.get(
  "/",
  catchAsync(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;
    const search = req.query.search || ""; // Basic search on name
    // sortBy and sortOrder are not implemented in this snippet for brevity, but should be added for full functionality

    let whereClause = "";
    const queryParams = {};

    if (search) {
      whereClause = "WHERE name LIKE @searchTerm";
      queryParams.searchTerm = `%${search}%`;
    }

    const countQuery = `SELECT COUNT(*) as totalCount FROM attribute ${whereClause}`;
    const totalResult = await executeQuery(countQuery, queryParams);
    const totalCount = totalResult[0].totalCount;

    const offset = (page - 1) * pageSize;
    const dataQuery = `
      SELECT *
      FROM attribute
      ${whereClause}
      ORDER BY name -- Add sortBy and sortOrder logic here if implemented
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `;

    const attributes = await executeQuery(dataQuery, {
      ...queryParams,
      offset,
      pageSize,
    });

    res.json({
      attributes: attributes || [], // Ensure attributes is an array
      totalCount,
      currentPage: page,
      pageSize,
    });
  })
);

/**
 * @route   GET /api/attributes/:id
 * @desc    Get attribute by ID
 * @access  Public
 */
router.get(
  "/:id",
  catchAsync(async (req, res, next) => {
    const query = "SELECT * FROM attribute WHERE id = @id";
    const attributes = await executeQuery(query, { id: req.params.id });

    if (!attributes || attributes.length === 0) {
      return next(new AppError("Attribute not found", 404));
    }

    // Get all values for this attribute
    const valuesQuery =
      "SELECT * FROM attribute_value WHERE attribute_id = @attributeId";
    const attributeValues = await executeQuery(valuesQuery, {
      attributeId: req.params.id,
    });

    const result = {
      ...attributes[0],
      values: attributeValues,
    };

    res.json(result);
  })
);

/**
 * @route   POST /api/attributes
 * @desc    Create a new attribute
 * @access  Private/Admin
 */
router.post(
  "/",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    const { name } = req.body;

    // Validate request
    if (!name) {
      return next(new AppError("Please provide attribute name", 400));
    }

    // Check if attribute already exists
    const checkQuery = "SELECT * FROM attribute WHERE name = @name";
    const existingAttributes = await executeQuery(checkQuery, { name });

    if (existingAttributes && existingAttributes.length > 0) {
      return next(new AppError("Attribute already exists", 400));
    }

    // Create attribute
    const query = `
      INSERT INTO attribute (name)
      OUTPUT INSERTED.*
      VALUES (@name)
    `;

    const attributes = await executeQuery(query, {
      name,
    });

    if (!attributes || attributes.length === 0) {
      return next(new AppError("Failed to create attribute", 500));
    }

    res.status(201).json(attributes[0]);
  })
);

/**
 * @route   PUT /api/attributes/:id
 * @desc    Update an attribute
 * @access  Private/Admin
 */
router.put(
  "/:id",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    const { name } = req.body;

    // Check if attribute exists
    const checkQuery = "SELECT * FROM attribute WHERE id = @id";
    const existingAttributes = await executeQuery(checkQuery, {
      id: req.params.id,
    });

    if (!existingAttributes || existingAttributes.length === 0) {
      return next(new AppError("Attribute not found", 404));
    }

    // If name is changing, check if new name already exists
    if (name && name !== existingAttributes[0].name) {
      const nameCheckQuery = "SELECT * FROM attribute WHERE name = @name";
      const nameCheckResult = await executeQuery(nameCheckQuery, { name });

      if (nameCheckResult && nameCheckResult.length > 0) {
        return next(new AppError("Attribute name already exists", 400));
      }
    }

    // Update attribute
    const updateQuery = `
      UPDATE attribute
      SET name = @name
      OUTPUT INSERTED.*
      WHERE id = @id
    `;

    const updatedAttributes = await executeQuery(updateQuery, {
      id: req.params.id,
      name: name || existingAttributes[0].name,
    });

    res.json(updatedAttributes[0]);
  })
);

/**
 * @route   DELETE /api/attributes/:id
 * @desc    Delete an attribute
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    // Check if attribute exists
    const checkQuery = "SELECT * FROM attribute WHERE id = @id";
    const existingAttributes = await executeQuery(checkQuery, {
      id: req.params.id,
    });

    if (!existingAttributes || existingAttributes.length === 0) {
      return next(new AppError("Attribute not found", 404));
    }

    // Check if any attribute values are using this attribute
    const valueQuery =
      "SELECT COUNT(*) as count FROM attribute_value WHERE attribute_id = @attributeId";
    const valueResult = await executeQuery(valueQuery, {
      attributeId: req.params.id,
    });

    if (valueResult[0].count > 0) {
      return next(
        new AppError(
          "Cannot delete attribute with associated values. Delete values first.",
          400
        )
      );
    }

    // Delete attribute
    const deleteQuery = "DELETE FROM attribute WHERE id = @id";
    await executeQuery(deleteQuery, { id: req.params.id });

    res.json({ message: "Attribute removed" });
  })
);

/**
 * @route   POST /api/attributes/:id/values
 * @desc    Add a value to an attribute
 * @access  Private/Admin
 */
router.post(
  "/:id/values",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    const { value } = req.body;

    // Validate request
    if (!value) {
      return next(new AppError("Please provide attribute value", 400));
    }

    // Check if attribute exists
    const checkQuery = "SELECT * FROM attribute WHERE id = @id";
    const existingAttributes = await executeQuery(checkQuery, {
      id: req.params.id,
    });

    if (!existingAttributes || existingAttributes.length === 0) {
      return next(new AppError("Attribute not found", 404));
    }

    // Check if value already exists for this attribute
    const valueCheckQuery =
      "SELECT * FROM attribute_value WHERE attribute_id = @attributeId AND value = @value";
    const existingValues = await executeQuery(valueCheckQuery, {
      attributeId: req.params.id,
      value,
    });

    if (existingValues && existingValues.length > 0) {
      return next(new AppError("Value already exists for this attribute", 400));
    }

    // Add value
    const query = `
      INSERT INTO attribute_value (attribute_id, value)
      OUTPUT INSERTED.*
      VALUES (@attributeId, @value)
    `;

    const addedValues = await executeQuery(query, {
      attributeId: req.params.id,
      value,
    });

    if (!addedValues || addedValues.length === 0) {
      return next(new AppError("Failed to add attribute value", 500));
    }

    res.status(201).json(addedValues[0]);
  })
);

/**
 * @route   DELETE /api/attributes/:id/values/:valueId
 * @desc    Delete a value from an attribute
 * @access  Private/Admin
 */
router.delete(
  "/:id/values/:valueId",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    // Check if attribute exists
    const checkQuery = "SELECT * FROM attribute WHERE id = @id";
    const existingAttributes = await executeQuery(checkQuery, {
      id: req.params.id,
    });

    if (!existingAttributes || existingAttributes.length === 0) {
      return next(new AppError("Attribute not found", 404));
    }

    // Check if value exists
    const valueCheckQuery =
      "SELECT * FROM attribute_value WHERE id = @valueId AND attribute_id = @attributeId";
    const existingValues = await executeQuery(valueCheckQuery, {
      valueId: req.params.valueId,
      attributeId: req.params.id,
    });

    if (!existingValues || existingValues.length === 0) {
      return next(new AppError("Attribute value not found", 404));
    }

    // Check if any variant attributes are using this value
    const variantAttributeQuery =
      "SELECT COUNT(*) as count FROM attribute_variant WHERE attribute_value_id = @valueId";
    const variantResult = await executeQuery(variantAttributeQuery, {
      valueId: req.params.valueId,
    });

    if (variantResult[0].count > 0) {
      return next(
        new AppError(
          "Cannot delete attribute value that is in use by product variants.",
          400
        )
      );
    }

    // Delete value
    const deleteQuery = "DELETE FROM attribute_value WHERE id = @valueId";
    await executeQuery(deleteQuery, { valueId: req.params.valueId });

    res.json({ message: "Attribute value removed" });
  })
);

module.exports = router;
