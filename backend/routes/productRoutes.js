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
 * @route   GET /api/products
 * @desc    Get all products with server-side pagination, filtering, and sorting
 * @access  Public
 */
router.get(
  "/",
  catchAsync(async (req, res) => {
    const {
      page = 1, // Default to page 1
      pageSize = 10, // Default page size
      search = "", // Default search string
      sortBy = "id", // Default sort column
      sortOrder = "desc", // Default sort order ('asc' or 'desc')
      category_id = "", // Filter by category ID(s)
      brand = "", // Filter by brand(s)
    } = req.query;

    // Validate sortOrder
    const validSortOrder = ["asc", "desc"].includes(sortOrder.toLowerCase())
      ? sortOrder.toLowerCase()
      : "desc";
    // Define allowed sort columns to prevent SQL injection (align with selectable columns)
    const allowedSortColumns = [
      "id",
      "name",
      "category_name",
      "brand",
      "total_sold_quantity",
    ];
    const validSortBy = allowedSortColumns.includes(sortBy.toLowerCase())
      ? sortBy.toLowerCase()
      : "id";

    const offset = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);
    const limit = parseInt(pageSize, 10);

    // Base query components
    const selectClause = `
      SELECT
        p.id, p.category_id, p.name, p.description, p.specification, p.image_url, p.brand,
        c.name as category_name,
        ISNULL(pv_agg.total_sold_quantity, 0) AS total_sold_quantity
    `;
    const fromClause = `
      FROM product p
      LEFT JOIN category c ON p.category_id = c.id
      LEFT JOIN (
          SELECT product_id, SUM(ISNULL(sold_quantity, 0)) as total_sold_quantity -- Ensure NULLs are handled
          FROM product_variant
          GROUP BY product_id
      ) pv_agg ON p.id = pv_agg.product_id
    `;

    // Search and filter conditions
    let conditions = [];
    const queryParams = {}; // Use a single object for parameters

    // Text search condition
    if (search) {
      conditions.push(
        `(p.name LIKE @search OR c.name LIKE @search OR p.brand LIKE @search)`
      );
      queryParams.search = `%${search}%`;
    }

    // Category filter
    if (category_id) {
      // Handle multiple category IDs as comma-separated string
      const categoryIds = category_id
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id);

      if (categoryIds.length > 0) {
        const categoryParams = categoryIds
          .map((id, index) => {
            const paramName = `category_id_${index}`;
            queryParams[paramName] = parseInt(id, 10);
            return `@${paramName}`;
          })
          .join(",");

        conditions.push(`p.category_id IN (${categoryParams})`);
      }
    }

    // Brand filter
    if (brand) {
      // Handle multiple brands as comma-separated string
      const brands = brand
        .split(",")
        .map((b) => b.trim())
        .filter((b) => b);

      if (brands.length > 0) {
        const brandConditions = brands
          .map((b, index) => {
            const paramName = `brand_${index}`;
            queryParams[paramName] = b;
            return `p.brand = @${paramName}`;
          })
          .join(" OR ");

        conditions.push(`(${brandConditions})`);
      }
    }

    // Build the WHERE clause
    let whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count query
    const countQuery = `SELECT COUNT(p.id) as totalCount ${fromClause} ${whereClause}`;
    const totalCountResult = await executeQuery(countQuery, queryParams);
    const totalCount = totalCountResult[0].totalCount;

    // Data query with pagination and sorting
    // Use parameterization for OFFSET and FETCH for security and correctness
    queryParams.offset = offset;
    queryParams.limit = limit;
    queryParams.sortBy = validSortBy; // Pass validated sort column
    queryParams.sortOrder = validSortOrder; // Pass validated sort order

    // Build ORDER BY clause dynamically and safely
    let orderByClause = "";
    switch (validSortBy) {
      case "name":
        orderByClause = `ORDER BY p.name ${
          validSortOrder === "asc" ? "ASC" : "DESC"
        }`;
        break;
      case "category_name":
        orderByClause = `ORDER BY c.name ${
          validSortOrder === "asc" ? "ASC" : "DESC"
        }`;
        break;
      case "brand":
        orderByClause = `ORDER BY p.brand ${
          validSortOrder === "asc" ? "ASC" : "DESC"
        }`;
        break;
      case "total_sold_quantity":
        orderByClause = `ORDER BY ISNULL(pv_agg.total_sold_quantity, 0) ${
          validSortOrder === "asc" ? "ASC" : "DESC"
        }`;
        break;
      case "id":
      default: // Default to sorting by ID
        orderByClause = `ORDER BY p.id ${
          validSortOrder === "asc" ? "ASC" : "DESC"
        }`;
        break;
    }

    const dataQuery = `
      ${selectClause}
      ${fromClause}
      ${whereClause}
      ${orderByClause}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const products = await executeQuery(dataQuery, queryParams);

    res.json({
      products,
      totalCount,
      currentPage: parseInt(page, 10),
      pageSize: limit,
    });
  })
);

/**
 * @route   GET /api/products/brands
 * @desc    Get all unique brands for filtering
 * @access  Public
 */
router.get(
  "/brands",
  catchAsync(async (req, res) => {
    const query = `
      SELECT DISTINCT brand
      FROM product
      WHERE brand IS NOT NULL AND brand <> ''
      ORDER BY brand ASC
    `;

    const brands = await executeQuery(query);
    res.json(brands.map((b) => b.brand));
  })
);

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID including variants and their specific attributes
 * @access  Public
 */
router.get(
  "/:id",
  catchAsync(async (req, res, next) => {
    // 1. Get product details
    const productQuery = `
      SELECT p.*, c.name as category_name 
      FROM product p
      LEFT JOIN category c ON p.category_id = c.id
      WHERE p.id = @id
    `;

    const products = await executeQuery(productQuery, { id: req.params.id });

    if (!products || products.length === 0) {
      return next(new AppError("Product not found", 404));
    }

    const product = products[0];

    // 2. Get product variants
    const variantsQuery = `
      SELECT pv.* 
      FROM product_variant pv
      WHERE pv.product_id = @productId
    `;

    const variants = await executeQuery(variantsQuery, {
      productId: req.params.id,
    });

    // 3. Fetch attributes for each variant
    const variantsWithAttributes = await Promise.all(
      variants.map(async (variant) => {
        const variantAttributesQuery = `
          SELECT 
            av.attribute_value_id,  -- ID của giá trị cụ thể (vd: ID của 'Đỏ')
            av.attribute_id,      -- ID của loại thuộc tính (vd: ID của 'Màu sắc')
            a.name as attribute_name, -- Tên loại thuộc tính (vd: 'Màu sắc')
            avl.id as value_id,       -- = attribute_value_id, để nhất quán với các API khác nếu cần
            avl.value                 -- Giá trị cụ thể (vd: 'Đỏ')
          FROM attribute_variant av
          JOIN attribute_value avl ON av.attribute_value_id = avl.id
          JOIN attribute a ON av.attribute_id = a.id
          WHERE av.product_variant_id = @variantId
        `;

        const variantAttributes = await executeQuery(variantAttributesQuery, {
          variantId: variant.id,
        });

        return {
          ...variant,
          attributes: variantAttributes, // Gắn mảng thuộc tính vào từng variant
        };
      })
    );

    // 4. Get overall product attributes and their possible values (for form generation, etc.)
    const productAttributesQuery = `
      SELECT DISTINCT
        a.id, 
        a.name,
        (
          SELECT JSON_QUERY((
            SELECT av.id, av.value
            FROM attribute_value av
            WHERE av.attribute_id = a.id
            AND EXISTS (
              SELECT 1 FROM attribute_variant va
              JOIN product_variant pv ON va.product_variant_id = pv.id
              WHERE pv.product_id = @productId
              AND va.attribute_value_id = av.id
            )
            FOR JSON PATH
          ))
        ) as attr_values
      FROM attribute a
      WHERE EXISTS (
        SELECT 1
        FROM attribute_value av
        JOIN attribute_variant va ON av.id = va.attribute_value_id
        JOIN product_variant pv ON va.product_variant_id = pv.id
        WHERE pv.product_id = @productId
        AND av.attribute_id = a.id
      )
    `;

    const productAttributesRaw = await executeQuery(productAttributesQuery, {
      productId: req.params.id,
    });

    // Process product attributes to convert string JSON to actual objects
    const processedProductAttributes = productAttributesRaw.map((attr) => ({
      ...attr,
      values: JSON.parse(attr.attr_values || "[]"), // Use '[]' as fallback
    }));

    // 5. Send response
    res.json({
      ...product,
      variants: variantsWithAttributes, // Variants đã kèm thuộc tính chi tiết
      attributes: processedProductAttributes, // Attributes chung của sản phẩm
    });
  })
);

/**
 * @route   POST /api/products
 * @desc    Create a new product
 * @access  Private/Admin
 */
router.post(
  "/",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    const { name, description, specification, image_url, brand, category_id } =
      req.body;

    // Validate request
    if (!name) {
      return next(new AppError("Please provide a product name", 400));
    }

    if (!category_id) {
      return next(new AppError("Please provide a category", 400));
    }

    // Check if category exists
    const categoryCheckQuery = "SELECT * FROM category WHERE id = @categoryId";
    const existingCategories = await executeQuery(categoryCheckQuery, {
      categoryId: category_id,
    });

    if (!existingCategories || existingCategories.length === 0) {
      return next(new AppError("Category not found", 404));
    }

    let transaction;
    try {
      transaction = await beginTransaction();

      const query = `
        INSERT INTO product (name, description, specification, image_url, brand, category_id)
        OUTPUT INSERTED.*
        VALUES (@name, @description, @specification, @image_url, @brand, @categoryId)
      `;

      const newProducts = await executeTransactionQuery(transaction, query, {
        name,
        description: description || null,
        specification: specification || null,
        image_url: image_url || null,
        brand: brand || null,
        categoryId: category_id,
      });

      if (!newProducts || newProducts.length === 0) {
        throw new Error("Failed to create product");
      }

      // Get the category name
      const categoryQuery = "SELECT name FROM category WHERE id = @categoryId";
      const categories = await executeTransactionQuery(
        transaction,
        categoryQuery,
        {
          categoryId: category_id,
        }
      );

      let categoryName = null;
      if (categories && categories.length > 0) {
        categoryName = categories[0].name;
      }

      await commitTransaction(transaction);

      const newProduct = {
        ...newProducts[0],
        category_name: categoryName,
        variants: [], // Newly created product has no variants yet
        attributes: [], // Newly created product has no attributes yet
      };

      res.status(201).json(newProduct);
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      return next(
        new AppError(`Failed to create product: ${error.message}`, 500)
      );
    }
  })
);

/**
 * @route   PUT /api/products/:id
 * @desc    Update a product
 * @access  Private/Admin
 */
router.put(
  "/:id",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    const { name, description, specification, image_url, brand, category_id } =
      req.body;

    // Check if product exists
    const checkQuery = "SELECT * FROM product WHERE id = @id";
    const existingProducts = await executeQuery(checkQuery, {
      id: req.params.id,
    });

    if (!existingProducts || existingProducts.length === 0) {
      return next(new AppError("Product not found", 404));
    }

    const existingProduct = existingProducts[0];

    // If category provided, check if it exists
    if (category_id) {
      const categoryCheckQuery =
        "SELECT * FROM category WHERE id = @categoryId";
      const existingCategories = await executeQuery(categoryCheckQuery, {
        categoryId: category_id,
      });

      if (!existingCategories || existingCategories.length === 0) {
        return next(new AppError("Category not found", 404));
      }
    }

    let transaction;
    try {
      transaction = await beginTransaction();

      // Update product
      const updateQuery = `
        UPDATE product
        SET name = @name,
            description = @description,
            specification = @specification,
            image_url = @image_url,
            brand = @brand,
            category_id = @categoryId
        OUTPUT INSERTED.*
        WHERE id = @id
      `;

      const updatedProducts = await executeTransactionQuery(
        transaction,
        updateQuery,
        {
          id: req.params.id,
          name: name !== undefined ? name : existingProduct.name,
          description:
            description !== undefined
              ? description
              : existingProduct.description,
          specification:
            specification !== undefined
              ? specification
              : existingProduct.specification,
          image_url:
            image_url !== undefined ? image_url : existingProduct.image_url,
          brand: brand !== undefined ? brand : existingProduct.brand,
          categoryId:
            category_id !== undefined
              ? category_id
              : existingProduct.category_id,
        }
      );

      if (!updatedProducts || updatedProducts.length === 0) {
        throw new Error("Failed to update product");
      }

      await commitTransaction(transaction);

      // Fetch the updated product with all details again (including variants with attributes)
      const updatedProductDetail =
        await getProductDetailWithVariantsAndAttributes(req.params.id);

      if (!updatedProductDetail) {
        throw new Error("Failed to retrieve updated product details");
      }

      res.json(updatedProductDetail); // Return the full updated product detail
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      return next(
        new AppError(`Failed to update product: ${error.message}`, 500)
      );
    }
  })
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    // Verify product exists
    const checkQuery = "SELECT * FROM product WHERE id = @id";
    const products = await executeQuery(checkQuery, {
      id: req.params.id,
    });

    if (!products || products.length === 0) {
      return next(new AppError("Product not found", 404));
    }

    // Kiểm tra xem sản phẩm có trong đơn hàng không
    const orderQuery = `
      SELECT COUNT(*) as count 
      FROM order_item oi
      JOIN product_variant pv ON oi.product_variant_id = pv.id
      WHERE pv.product_id = @productId
    `;

    const orderResult = await executeQuery(orderQuery, {
      productId: req.params.id,
    });

    if (orderResult[0].count > 0) {
      return next(
        new AppError(
          "Không thể xóa sản phẩm đã có trong đơn hàng. Hãy cân nhắc đánh dấu nó là không hoạt động thay vì xóa.",
          400
        )
      );
    }

    let transaction;
    try {
      transaction = await beginTransaction();

      // First delete all variant attributes for variants of this product
      const deleteVariantAttrsQuery = `
        DELETE av 
        FROM attribute_variant av
        JOIN product_variant pv ON av.product_variant_id = pv.id
        WHERE pv.product_id = @productId
      `;
      await executeTransactionQuery(transaction, deleteVariantAttrsQuery, {
        productId: req.params.id,
      });

      // Delete cart items related to variants of this product
      const deleteCartItemsQuery = `
        DELETE ci
        FROM cart_item ci
        JOIN product_variant pv ON ci.product_variant_id = pv.id
        WHERE pv.product_id = @productId
      `;
      await executeTransactionQuery(transaction, deleteCartItemsQuery, {
        productId: req.params.id,
      });

      // Delete feedback related to variants of this product
      const deleteFeedbackQuery = `
        DELETE FROM feedback_response WHERE feedback_id IN (SELECT id FROM feedback WHERE product_id = @productId);
        DELETE FROM feedback WHERE product_id = @productId;
      `;
      await executeTransactionQuery(transaction, deleteFeedbackQuery, {
        productId: req.params.id,
      });

      // Delete discount related to variants of this product
      const deleteDiscountQuery = `
        DELETE FROM discount WHERE product_variant_id IN (SELECT id FROM product_variant WHERE product_id = @productId);
      `;
      await executeTransactionQuery(transaction, deleteDiscountQuery, {
        productId: req.params.id,
      });

      // Delete all variants
      const deleteVariantsQuery = `
        DELETE FROM product_variant 
        WHERE product_id = @productId
      `;
      await executeTransactionQuery(transaction, deleteVariantsQuery, {
        productId: req.params.id,
      });

      // Delete the product
      const deleteProductQuery = "DELETE FROM product WHERE id = @id";
      await executeTransactionQuery(transaction, deleteProductQuery, {
        id: req.params.id,
      });

      await commitTransaction(transaction);

      res.status(204).json({
        status: "success",
        data: null,
      });
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      return next(
        new AppError(`Failed to delete product: ${error.message}`, 500)
      );
    }
  })
);

/**
 * @route   GET /api/products/category/:categoryId
 * @desc    Get products by category
 * @access  Public
 */
router.get(
  "/category/:categoryId",
  catchAsync(async (req, res, next) => {
    // Check if category exists
    const categoryCheckQuery = "SELECT * FROM category WHERE id = @categoryId";
    const existingCategories = await executeQuery(categoryCheckQuery, {
      categoryId: req.params.categoryId,
    });

    if (!existingCategories || existingCategories.length === 0) {
      return next(new AppError("Category not found", 404));
    }

    const query = `
      SELECT p.*, c.name as category_name 
      FROM product p
      JOIN category c ON p.category_id = c.id
      WHERE p.category_id = @categoryId
      ORDER BY p.id DESC
    `;

    const products = await executeQuery(query, {
      categoryId: req.params.categoryId,
    });

    res.json(products);
  })
);

// Helper function to get full product detail (used after PUT)
async function getProductDetailWithVariantsAndAttributes(productId) {
  // 1. Get product details
  const productQuery = `
    SELECT p.*, c.name as category_name 
    FROM product p
    LEFT JOIN category c ON p.category_id = c.id
    WHERE p.id = @id
  `;
  const products = await executeQuery(productQuery, { id: productId });
  if (!products || products.length === 0) return null;
  const product = products[0];

  // 2. Get product variants
  const variantsQuery = `SELECT pv.* FROM product_variant pv WHERE pv.product_id = @productId`;
  const variants = await executeQuery(variantsQuery, { productId });

  // 3. Fetch attributes for each variant
  const variantsWithAttributes = await Promise.all(
    variants.map(async (variant) => {
      const variantAttributesQuery = `
        SELECT 
          av.attribute_value_id, av.attribute_id, 
          a.name as attribute_name, avl.id as value_id, avl.value
        FROM attribute_variant av
        JOIN attribute_value avl ON av.attribute_value_id = avl.id
        JOIN attribute a ON av.attribute_id = a.id
        WHERE av.product_variant_id = @variantId
      `;
      const variantAttributes = await executeQuery(variantAttributesQuery, {
        variantId: variant.id,
      });
      return { ...variant, attributes: variantAttributes };
    })
  );

  // 4. Get overall product attributes
  const productAttributesQuery = `
    SELECT DISTINCT a.id, a.name,
      (SELECT JSON_QUERY((SELECT av.id, av.value FROM attribute_value av WHERE av.attribute_id = a.id AND EXISTS (SELECT 1 FROM attribute_variant va JOIN product_variant pv ON va.product_variant_id = pv.id WHERE pv.product_id = @productId AND va.attribute_value_id = av.id) FOR JSON PATH))) as attr_values
    FROM attribute a
    WHERE EXISTS (SELECT 1 FROM attribute_value av JOIN attribute_variant va ON av.id = va.attribute_value_id JOIN product_variant pv ON va.product_variant_id = pv.id WHERE pv.product_id = @productId AND av.attribute_id = a.id)
  `;
  const productAttributesRaw = await executeQuery(productAttributesQuery, {
    productId,
  });
  const processedProductAttributes = productAttributesRaw.map((attr) => ({
    ...attr,
    values: JSON.parse(attr.attr_values || "[]"),
  }));

  return {
    ...product,
    variants: variantsWithAttributes,
    attributes: processedProductAttributes,
  };
}

module.exports = router;
