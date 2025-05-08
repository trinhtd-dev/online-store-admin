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
 * @route   GET /api/variants
 * @desc    Get all product variants
 * @access  Public
 */
router.get(
  "/",
  catchAsync(async (req, res) => {
    const query = `
      SELECT 
        pv.*, 
        p.name as product_name,
        p.description as product_description,
        p.image_url as product_image_url,
        p.brand as product_brand,
        p.specification as product_specification
      FROM product_variant pv
      JOIN product p ON pv.product_id = p.id
      ORDER BY pv.price
    `;

    const variants = await executeQuery(query);

    // Fetch attributes for each variant
    const variantsWithAttributes = await Promise.all(
      variants.map(async (variant) => {
        const attributesQuery = `
          SELECT 
            av.attribute_value_id,
            av.attribute_id, 
            a.name as attribute_name,
            av_val.id as value_id,
            av_val.value
          FROM attribute_variant av
          JOIN attribute_value av_val ON av.attribute_value_id = av_val.id
          JOIN attribute a ON av.attribute_id = a.id
          WHERE av.product_variant_id = @variantId
        `;

        const attributes = await executeQuery(attributesQuery, {
          variantId: variant.id,
        });

        return {
          ...variant,
          attributes,
        };
      })
    );

    res.json(variantsWithAttributes);
  })
);

/**
 * @route   GET /api/variants/search
 * @desc    Search product variants by SKU or Product Name (for discount form)
 * @access  Private/Admin
 */
router.get(
  "/search",
  protect,
  // restrictTo('admin', 'manager'),
  catchAsync(async (req, res, next) => {
    const query = req.query.q || "";
    const limit = parseInt(req.query.limit) || 10;

    if (!query) {
      return res.json([]); // Return empty array if no query
    }

    const searchQuery = `
            SELECT TOP (@limit)
                pv.id,
                pv.sku,
                p.name as product_name
            FROM product_variant pv
            JOIN product p ON pv.product_id = p.id
            WHERE pv.sku LIKE @searchQuery OR p.name LIKE @searchQuery
            ORDER BY p.name, pv.sku
        `;

    const params = {
      limit: limit,
      searchQuery: `%${query}%`,
    };

    const results = await executeQuery(searchQuery, params);

    res.json(results || []);
  })
);

/**
 * @route   GET /api/variants/:id
 * @desc    Get variant by ID
 * @access  Public
 */
router.get(
  "/:id",
  catchAsync(async (req, res, next) => {
    const query = `
      SELECT 
        pv.*, 
        p.name as product_name,
        p.description as product_description,
        p.image_url as product_image_url,
        p.brand as product_brand,
        p.specification as product_specification
      FROM product_variant pv
      JOIN product p ON pv.product_id = p.id
      WHERE pv.id = @id
    `;

    const variants = await executeQuery(query, { id: req.params.id });

    if (!variants || variants.length === 0) {
      return next(new AppError("Variant not found", 404));
    }

    // Get attributes for this variant
    const attributesQuery = `
      SELECT 
        av.attribute_value_id,
        av.attribute_id, 
        a.name as attribute_name,
        av_val.id as value_id,
        av_val.value
      FROM attribute_variant av
      JOIN attribute_value av_val ON av.attribute_value_id = av_val.id
      JOIN attribute a ON av.attribute_id = a.id
      WHERE av.product_variant_id = @variantId
    `;

    const attributes = await executeQuery(attributesQuery, {
      variantId: req.params.id,
    });

    const result = {
      ...variants[0],
      attributes,
    };

    res.json(result);
  })
);

/**
 * @route   POST /api/variants
 * @desc    Create a new product variant
 * @access  Private/Admin
 */
router.post(
  "/",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    const {
      product_id,
      sku,
      price,
      original_price,
      stock_quantity,
      attributes,
    } = req.body;

    // Validate request
    if (
      !product_id ||
      !sku ||
      price === undefined ||
      original_price === undefined ||
      stock_quantity === undefined
    ) {
      return next(
        new AppError(
          "Please provide product_id, sku, price, original_price, and stock_quantity",
          400
        )
      );
    }

    // Check if product exists
    const productCheckQuery = "SELECT * FROM product WHERE id = @productId";
    const existingProducts = await executeQuery(productCheckQuery, {
      productId: product_id,
    });

    if (!existingProducts || existingProducts.length === 0) {
      return next(new AppError("Product not found", 404));
    }

    // Check if SKU already exists
    const skuCheckQuery = "SELECT * FROM product_variant WHERE sku = @sku";
    const existingVariants = await executeQuery(skuCheckQuery, { sku });

    if (existingVariants && existingVariants.length > 0) {
      return next(new AppError("SKU already exists", 400));
    }

    let transaction;
    try {
      transaction = await beginTransaction();

      // Create variant
      const query = `
        INSERT INTO product_variant (product_id, sku, price, original_price, stock_quantity)
        OUTPUT INSERTED.*
        VALUES (@productId, @sku, @price, @originalPrice, @stockQuantity)
      `;

      const newVariants = await executeTransactionQuery(transaction, query, {
        productId: product_id,
        sku,
        price,
        originalPrice: original_price,
        stockQuantity: stock_quantity,
      });

      if (!newVariants || newVariants.length === 0) {
        throw new Error("Failed to create variant");
      }

      const newVariant = newVariants[0];

      // Add attributes if provided
      if (attributes && attributes.length > 0) {
        // Validate each attribute value exists and get attribute_id
        const attributeValueMap = new Map();
        for (const attrValueId of attributes) {
          const attributeValueCheckQuery = `
            SELECT av.*, a.id as attribute_id 
            FROM attribute_value av
            JOIN attribute a ON av.attribute_id = a.id
            WHERE av.id = @id
          `;
          const attributeValue = await executeTransactionQuery(
            transaction,
            attributeValueCheckQuery,
            {
              id: attrValueId,
            }
          );

          if (!attributeValue || attributeValue.length === 0) {
            throw new Error(`Attribute value with ID ${attrValueId} not found`);
          }

          console.log("Attribute value result:", attributeValue[0]);
          const attrId = parseInt(attributeValue[0].attribute_id);
          console.log(
            `attrValueId=${attrValueId}, attrId=${attrId}, type=${typeof attrId}`
          );

          attributeValueMap.set(attrValueId, attrId);
        }

        // Insert attribute values
        for (const attrValueId of attributes) {
          const attributeId = attributeValueMap.get(attrValueId);

          console.log(
            `Inserting: value_id=${attrValueId}, attribute_id=${attributeId}, variant_id=${newVariant.id}`
          );
          console.log(
            `Types: value_id=${typeof attrValueId}, attribute_id=${typeof attributeId}, variant_id=${typeof newVariant.id}`
          );

          const attrQuery = `
            INSERT INTO attribute_variant (attribute_value_id, attribute_id, product_variant_id)
            VALUES (@attributeValueId, @attributeId, @variantId)
          `;

          await executeTransactionQuery(transaction, attrQuery, {
            attributeValueId: parseInt(attrValueId),
            attributeId: parseInt(attributeId),
            variantId: parseInt(newVariant.id),
          });
        }
      }

      await commitTransaction(transaction);

      // Get the full variant with attributes
      const fullVariantQuery = `
        SELECT 
          pv.*, 
          p.name as product_name,
          p.description as product_description,
          p.image_url as product_image_url,
          p.brand as product_brand,
          p.specification as product_specification
        FROM product_variant pv
        JOIN product p ON pv.product_id = p.id
        WHERE pv.id = @id
      `;

      const fullVariants = await executeQuery(fullVariantQuery, {
        id: newVariant.id,
      });

      // Get attributes for this variant
      const attributesQuery = `
        SELECT 
          av.attribute_value_id,
          av.attribute_id, 
          a.name as attribute_name,
          avl.id as value_id,
          avl.value
        FROM attribute_variant av
        JOIN attribute_value avl ON av.attribute_value_id = avl.id
        JOIN attribute a ON av.attribute_id = a.id
        WHERE av.product_variant_id = @variantId
      `;

      const variantAttributes = await executeQuery(attributesQuery, {
        variantId: newVariant.id,
      });

      const result = {
        ...fullVariants[0],
        attributes: variantAttributes,
      };

      res.status(201).json(result);
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      return next(
        new AppError(`Failed to create variant: ${error.message}`, 500)
      );
    }
  })
);

/**
 * @route   PUT /api/variants/:id
 * @desc    Update a product variant
 * @access  Private/Admin
 */
router.put(
  "/:id",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    const { sku, price, original_price, stock_quantity } = req.body;

    // Check if variant exists
    const checkQuery = "SELECT * FROM product_variant WHERE id = @id";
    const existingVariants = await executeQuery(checkQuery, {
      id: req.params.id,
    });

    if (!existingVariants || existingVariants.length === 0) {
      return next(new AppError("Variant not found", 404));
    }

    const existingVariant = existingVariants[0];

    // If SKU is changing, check if new SKU already exists
    if (sku && sku !== existingVariant.sku) {
      const skuCheckQuery =
        "SELECT * FROM product_variant WHERE sku = @sku AND id != @id";
      const skuCheckResult = await executeQuery(skuCheckQuery, {
        sku,
        id: req.params.id,
      });

      if (skuCheckResult && skuCheckResult.length > 0) {
        return next(new AppError("SKU already exists", 400));
      }
    }

    // Update variant
    const updateQuery = `
      UPDATE product_variant
      SET sku = @sku,
          price = @price,
          original_price = @originalPrice,
          stock_quantity = @stockQuantity
      OUTPUT INSERTED.*
      WHERE id = @id
    `;

    const updatedVariants = await executeQuery(updateQuery, {
      id: req.params.id,
      sku: sku !== undefined ? sku : existingVariant.sku,
      price: price !== undefined ? price : existingVariant.price,
      originalPrice:
        original_price !== undefined
          ? original_price
          : existingVariant.original_price,
      stockQuantity:
        stock_quantity !== undefined
          ? stock_quantity
          : existingVariant.stock_quantity,
    });

    // Get the full variant with attributes
    const fullVariantQuery = `
      SELECT 
        pv.*, 
        p.name as product_name,
        p.description as product_description,
        p.image_url as product_image_url,
        p.brand as product_brand,
        p.specification as product_specification
      FROM product_variant pv
      JOIN product p ON pv.product_id = p.id
      WHERE pv.id = @id
    `;

    const fullVariants = await executeQuery(fullVariantQuery, {
      id: req.params.id,
    });

    // Get attributes for this variant
    const attributesQuery = `
      SELECT 
        av.attribute_value_id,
        av.attribute_id, 
        a.name as attribute_name,
        av_val.id as value_id,
        av_val.value
      FROM attribute_variant av
      JOIN attribute_value av_val ON av.attribute_value_id = av_val.id
      JOIN attribute a ON av.attribute_id = a.id
      WHERE av.product_variant_id = @variantId
    `;

    const attributes = await executeQuery(attributesQuery, {
      variantId: req.params.id,
    });

    const result = {
      ...fullVariants[0],
      attributes,
    };

    res.json(result);
  })
);

/**
 * @route   DELETE /api/variants/:id
 * @desc    Delete a product variant
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    // Check if variant exists
    const checkQuery = "SELECT * FROM product_variant WHERE id = @id";
    const existingVariants = await executeQuery(checkQuery, {
      id: req.params.id,
    });

    if (!existingVariants || existingVariants.length === 0) {
      return next(new AppError("Variant not found", 404));
    }

    // Check if variant is part of any order
    const orderQuery =
      "SELECT COUNT(*) as count FROM order_item WHERE product_variant_id = @variantId";
    const orderResult = await executeQuery(orderQuery, {
      variantId: req.params.id,
    });

    if (orderResult[0].count > 0) {
      return next(
        new AppError(
          "Cannot delete variant that is part of an order. Consider marking it as out of stock instead.",
          400
        )
      );
    }

    let transaction;
    try {
      transaction = await beginTransaction();

      // Delete variant attributes
      const deleteAttributesQuery =
        "DELETE FROM attribute_variant WHERE product_variant_id = @variantId";
      await executeTransactionQuery(transaction, deleteAttributesQuery, {
        variantId: req.params.id,
      });

      // Delete from cart items
      const deleteCartItemsQuery =
        "DELETE FROM cart_item WHERE product_variant_id = @variantId";
      await executeTransactionQuery(transaction, deleteCartItemsQuery, {
        variantId: req.params.id,
      });

      // Delete variant
      const deleteQuery = "DELETE FROM product_variant WHERE id = @id";
      await executeTransactionQuery(transaction, deleteQuery, {
        id: req.params.id,
      });

      await commitTransaction(transaction);

      res.json({ message: "Variant removed" });
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      next(error);
    }
  })
);

/**
 * @route   POST /api/variants/:id/attributes
 * @desc    Add an attribute to a variant
 * @access  Private/Admin
 */
router.post(
  "/:id/attributes",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    const { attribute_value_id } = req.body;

    // Validate request
    if (!attribute_value_id) {
      return next(new AppError("Please provide attribute_value_id", 400));
    }

    // Check if variant exists
    const variantCheckQuery = "SELECT * FROM product_variant WHERE id = @id";
    const existingVariants = await executeQuery(variantCheckQuery, {
      id: req.params.id,
    });

    if (!existingVariants || existingVariants.length === 0) {
      return next(new AppError("Variant not found", 404));
    }

    // Check if attribute value exists and get attribute_id
    const attributeValueCheckQuery = `
      SELECT av.*, a.id as attribute_id 
      FROM attribute_value av
      JOIN attribute a ON av.attribute_id = a.id
      WHERE av.id = @id
    `;
    const attributeValues = await executeQuery(attributeValueCheckQuery, {
      id: attribute_value_id,
    });

    if (!attributeValues || attributeValues.length === 0) {
      return next(new AppError("Attribute value not found", 404));
    }

    const attributeValue = attributeValues[0];
    const attributeId = parseInt(attributeValue.attribute_id);

    // Check if this attribute is already assigned to this variant
    const existingAttributeQuery = `
      SELECT * FROM attribute_variant 
      WHERE product_variant_id = @variantId 
      AND attribute_value_id = @attributeValueId
    `;

    const existingAttribute = await executeQuery(existingAttributeQuery, {
      variantId: parseInt(req.params.id),
      attributeValueId: parseInt(attribute_value_id),
    });

    if (existingAttribute && existingAttribute.length > 0) {
      return next(
        new AppError(
          "This attribute value is already assigned to this variant",
          400
        )
      );
    }

    // Check if variant already has a value for this attribute type
    const attributeTypeCheckQuery = `
      SELECT av.* 
      FROM attribute_variant av
      WHERE av.product_variant_id = @variantId 
      AND av.attribute_id = @attributeId
    `;

    const attributeTypeCheck = await executeQuery(attributeTypeCheckQuery, {
      variantId: parseInt(req.params.id),
      attributeId: attributeId,
    });

    if (attributeTypeCheck && attributeTypeCheck.length > 0) {
      return next(
        new AppError(
          "This variant already has a value for this attribute type. Update the existing value instead.",
          400
        )
      );
    }

    let transaction;
    try {
      transaction = await beginTransaction();

      // Add attribute to variant
      const query = `
        INSERT INTO attribute_variant (attribute_value_id, attribute_id, product_variant_id)
        VALUES (@attributeValueId, @attributeId, @variantId)
      `;

      await executeTransactionQuery(transaction, query, {
        attributeValueId: parseInt(attribute_value_id),
        attributeId: attributeId,
        variantId: parseInt(req.params.id),
      });

      await commitTransaction(transaction);

      // Get full attribute details
      const fullAttributeQuery = `
        SELECT 
          av.attribute_value_id,
          av.attribute_id, 
          a.name as attribute_name,
          avl.id as value_id,
          avl.value
        FROM attribute_variant av
        JOIN attribute_value avl ON av.attribute_value_id = avl.id
        JOIN attribute a ON av.attribute_id = a.id
        WHERE av.attribute_value_id = @attributeValueId
        AND av.product_variant_id = @variantId
      `;

      const fullAttribute = await executeQuery(fullAttributeQuery, {
        attributeValueId: parseInt(attribute_value_id),
        variantId: parseInt(req.params.id),
      });

      res.status(201).json(fullAttribute[0]);
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      return next(
        new AppError(`Failed to add attribute: ${error.message}`, 500)
      );
    }
  })
);

/**
 * @route   DELETE /api/variants/:id/attributes/:attributeId/:valueId
 * @desc    Remove an attribute from a variant
 * @access  Private/Admin
 */
router.delete(
  "/:id/attributes/:attributeId/:valueId",
  protect,
  restrictTo("admin"),
  catchAsync(async (req, res, next) => {
    const variantId = parseInt(req.params.id);
    const attributeId = parseInt(req.params.attributeId);
    const valueId = parseInt(req.params.valueId);

    // Check if variant exists
    const variantCheckQuery = "SELECT * FROM product_variant WHERE id = @id";
    const existingVariants = await executeQuery(variantCheckQuery, {
      id: variantId,
    });

    if (!existingVariants || existingVariants.length === 0) {
      return next(new AppError("Variant not found", 404));
    }

    // Check if variant attribute exists
    const attributeCheckQuery = `
      SELECT * FROM attribute_variant 
      WHERE product_variant_id = @variantId 
      AND attribute_id = @attributeId
      AND attribute_value_id = @valueId
    `;

    const existingAttribute = await executeQuery(attributeCheckQuery, {
      variantId,
      attributeId,
      valueId,
    });

    if (!existingAttribute || existingAttribute.length === 0) {
      return next(new AppError("Variant attribute not found", 404));
    }

    let transaction;
    try {
      transaction = await beginTransaction();

      // Delete attribute from variant
      const deleteQuery = `
        DELETE FROM attribute_variant 
        WHERE product_variant_id = @variantId 
        AND attribute_id = @attributeId 
        AND attribute_value_id = @valueId
      `;

      await executeTransactionQuery(transaction, deleteQuery, {
        variantId,
        attributeId,
        valueId,
      });

      await commitTransaction(transaction);

      res.json({ message: "Attribute removed from variant" });
    } catch (error) {
      if (transaction) {
        await rollbackTransaction(transaction);
      }
      return next(
        new AppError(`Failed to remove attribute: ${error.message}`, 500)
      );
    }
  })
);

module.exports = router;
