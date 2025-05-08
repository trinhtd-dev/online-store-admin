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
 * @route   GET /api/categories
 * @desc    Get all categories with pagination, search, and sort
 * @access  Public
 */
router.get(
  "/",
  catchAsync(async (req, res, next) => {
    const {
      page = 1,
      pageSize = 10,
      search = "",
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    // Validate input
    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return next(new AppError("Invalid page number.", 400));
    }
    if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
      // Limit page size
      return next(
        new AppError("Invalid page size (must be between 1 and 100).", 400)
      );
    }
    if (!["id", "name"].includes(sortBy)) {
      return next(new AppError("Invalid sort field.", 400));
    }
    if (!["asc", "desc"].includes(sortOrder.toLowerCase())) {
      return next(new AppError("Invalid sort order.", 400));
    }

    // Escape special characters for LIKE clause
    const searchTerm = search
      .replace(/%/g, `\%`)
      .replace(/_/g, `\_`)
      .replace(/\[/g, `\[`);

    const offset = (pageNum - 1) * pageSizeNum;

    const params = {
      offset,
      pageSize: pageSizeNum,
      searchTerm: `%${searchTerm}%`, // Add wildcards for LIKE
    };

    // Build WHERE clause
    let whereClause = "";
    if (searchTerm) {
      whereClause = `WHERE name LIKE @searchTerm ESCAPE '\\'`;
    }

    // Build ORDER BY clause safely
    let orderByClause = `ORDER BY ${sortBy === "id" ? "id" : "name"} ${
      sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC"
    }`;

    // Build the main query
    const query = `
      SELECT * FROM category
      ${whereClause}
      ${orderByClause}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    `;

    // Build the count query
    const countQuery = `
      SELECT COUNT(*) as totalCount FROM category
      ${whereClause};
    `;

    let transaction;
    try {
      // Although not strictly necessary for GET, using a transaction ensures consistency
      // if multiple reads were involved or if future modifications add writes.
      transaction = await beginTransaction();

      const categories = await executeTransactionQuery(
        transaction,
        query,
        params
      );
      const countResult = await executeTransactionQuery(
        transaction,
        countQuery,
        { searchTerm: params.searchTerm } // Only need searchTerm for count
      );

      await commitTransaction(transaction);

      const totalCount = countResult[0].totalCount;

      res.json({
        categories,
        totalCount,
        currentPage: pageNum,
        pageSize: pageSizeNum,
      });
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      return next(
        new AppError(`Failed to retrieve categories: ${error.message}`, 500)
      );
    }
  })
);

/**
 * @route   GET /api/categories/all
 * @desc    Get all categories without pagination (for filters/dropdowns)
 * @access  Public
 */
router.get(
  "/all",
  catchAsync(async (req, res, next) => {
    const query = `
      SELECT * FROM category
      ORDER BY name ASC
    `;

    try {
      const categories = await executeQuery(query);
      res.json(categories);
    } catch (error) {
      return next(
        new AppError(`Failed to retrieve all categories: ${error.message}`, 500)
      );
    }
  })
);

/**
 * @route   GET /api/categories/:id
 * @desc    Get category by ID
 * @access  Public
 */
router.get(
  "/:id",
  catchAsync(async (req, res, next) => {
    const query = "SELECT * FROM category WHERE id = @id";

    const categories = await executeQuery(query, { id: req.params.id });

    if (!categories || categories.length === 0) {
      return next(new AppError("Category not found", 404));
    }

    res.json(categories[0]);
  })
);

/**
 * @route   POST /api/categories
 * @desc    Create a new category
 * @access  Private/Admin
 */
router.post(
  "/",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    const { name } = req.body;

    if (!name) {
      return next(new AppError("Please provide category name", 400));
    }

    // Check if category already exists
    const checkQuery = "SELECT * FROM category WHERE name = @name";
    const existingCategories = await executeQuery(checkQuery, { name });

    if (existingCategories && existingCategories.length > 0) {
      return next(new AppError("Category with this name already exists", 400));
    }

    let transaction;
    try {
      transaction = await beginTransaction();

      const query = `
        INSERT INTO category (name)
        OUTPUT INSERTED.*
        VALUES (@name)
      `;

      const newCategories = await executeTransactionQuery(transaction, query, {
        name,
      });

      if (!newCategories || newCategories.length === 0) {
        throw new Error("Failed to create category");
      }

      await commitTransaction(transaction);
      res.status(201).json(newCategories[0]);
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      return next(
        new AppError(`Failed to create category: ${error.message}`, 500)
      );
    }
  })
);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update a category
 * @access  Private/Admin
 */
router.put(
  "/:id",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    const { name } = req.body;

    // Check if category exists
    const checkQuery = "SELECT * FROM category WHERE id = @id";
    const existingCategories = await executeQuery(checkQuery, {
      id: req.params.id,
    });

    if (!existingCategories || existingCategories.length === 0) {
      return next(new AppError("Category not found", 404));
    }

    const existingCategory = existingCategories[0];

    // If name is being changed, check if new name already exists
    if (name && name !== existingCategory.name) {
      const nameCheckQuery =
        "SELECT * FROM category WHERE name = @name AND id != @id";
      const nameCheck = await executeQuery(nameCheckQuery, {
        name,
        id: req.params.id,
      });

      if (nameCheck && nameCheck.length > 0) {
        return next(
          new AppError("Category with this name already exists", 400)
        );
      }
    }

    let transaction;
    try {
      transaction = await beginTransaction();

      const query = `
        UPDATE category
        SET name = @name
        OUTPUT INSERTED.*
        WHERE id = @id
      `;

      const updatedCategories = await executeTransactionQuery(
        transaction,
        query,
        {
          id: req.params.id,
          name: name || existingCategory.name,
        }
      );

      if (!updatedCategories || updatedCategories.length === 0) {
        throw new Error("Failed to update category");
      }

      await commitTransaction(transaction);
      res.json(updatedCategories[0]);
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      return next(
        new AppError(`Failed to update category: ${error.message}`, 500)
      );
    }
  })
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete a category
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    // Check if category exists
    const checkQuery = "SELECT * FROM category WHERE id = @id";
    const existingCategories = await executeQuery(checkQuery, {
      id: req.params.id,
    });

    if (!existingCategories || existingCategories.length === 0) {
      return next(new AppError("Category not found", 404));
    }

    // Check if any products are using this category
    const productsQuery =
      "SELECT COUNT(*) as count FROM product WHERE category_id = @categoryId";
    const productCheck = await executeQuery(productsQuery, {
      categoryId: req.params.id,
    });

    if (productCheck[0].count > 0) {
      return next(
        new AppError(
          "Cannot delete category that has products. Remove or reassign products first.",
          400
        )
      );
    }

    let transaction;
    try {
      transaction = await beginTransaction();

      const query = "DELETE FROM category WHERE id = @id";
      await executeTransactionQuery(transaction, query, { id: req.params.id });

      await commitTransaction(transaction);
      res.json({ message: "Category removed successfully" });
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      return next(
        new AppError(`Failed to delete category: ${error.message}`, 500)
      );
    }
  })
);

module.exports = router;
