-----------------------------------------------------
-- Indexes for Order Management Module
-----------------------------------------------------

-- Tăng tốc JOIN giữa [order] và customer
CREATE INDEX IX_order_customer_id ON [order](customer_id);

-- Tăng tốc lọc theo trạng thái đơn hàng (WHERE status = ...)
CREATE INDEX IX_order_status ON [order](status);

-- Tăng tốc lọc theo trạng thái thanh toán (WHERE payment_status = ...)
CREATE INDEX IX_order_payment_status ON [order](payment_status);

-- Tăng tốc sắp xếp và phân trang mặc định (ORDER BY order_date DESC, id DESC)
-- Index này rất quan trọng cho hiệu năng trang danh sách đơn hàng
CREATE INDEX IX_order_order_date_id ON [order](order_date DESC, id DESC);

-- (Tùy chọn) Index cho sắp xếp theo tổng tiền (nếu cần thiết)
-- CREATE INDEX IX_order_payment_amount ON [order](payment_amount);

-----------------------------------------------------
-- Indexes for Account Management Module
-----------------------------------------------------

-- === Indexes for JOIN operations ===

-- Tăng tốc JOIN giữa manager và account
CREATE NONCLUSTERED INDEX IX_Manager_AccountID ON manager(account_id);

-- Tăng tốc JOIN giữa manager và role (và lọc theo role_id)
CREATE NONCLUSTERED INDEX IX_Manager_RoleID ON manager(role_id);

-- Tăng tốc JOIN giữa customer và account
CREATE NONCLUSTERED INDEX IX_Customer_AccountID ON customer(account_id);

-- === Indexes for WHERE clause (Filtering and Searching) ===

-- Tăng tốc lọc theo trạng thái tài khoản (WHERE status = ...)
CREATE NONCLUSTERED INDEX IX_Account_Status ON account(status);

-- Tăng tốc tìm kiếm và lọc theo email (WHERE email LIKE ... hoặc email = ...)
CREATE NONCLUSTERED INDEX IX_Account_Email ON account(email);

-- Tăng tốc tìm kiếm và lọc theo tên (WHERE full_name LIKE ...)
-- Lưu ý: LIKE '%search%' có thể không tận dụng tối đa index này, nhưng vẫn tốt hơn không có.
CREATE NONCLUSTERED INDEX IX_Account_FullName ON account(full_name);

-- === Indexes for ORDER BY clause (Sorting) ===

-- Tăng tốc sắp xếp theo ngày tạo (ORDER BY created_at)
CREATE NONCLUSTERED INDEX IX_Account_CreatedAt ON account(created_at);

-- Tăng tốc sắp xếp theo tên vai trò (ORDER BY role.name)
CREATE NONCLUSTERED INDEX IX_Role_Name ON role(name);

-- (Lưu ý: Các cột khóa chính như account.id, order.id, role.id thường đã có Clustered Index hoặc Primary Key Constraint tự động tạo index)

-----------------------------------------------------
-- Indexes for Discount Management Module
-----------------------------------------------------

-- Tăng tốc JOIN giữa discount và product_variant
CREATE NONCLUSTERED INDEX IX_discount_product_variant_id ON discount(product_variant_id);

-- Tăng tốc lọc theo trạng thái discount (WHERE status = ...)
CREATE NONCLUSTERED INDEX IX_discount_status ON discount(status);

-- Tăng tốc lọc theo loại discount (WHERE type = ...)
CREATE NONCLUSTERED INDEX IX_discount_type ON discount(type);

-- Tăng tốc tìm kiếm theo tên discount (WHERE name LIKE ...)
-- Lưu ý: LIKE '%search%' có thể không tận dụng tối đa index này.
CREATE NONCLUSTERED INDEX IX_discount_name ON discount(name);

-- Tăng tốc sắp xếp theo ngày bắt đầu và kết thúc
CREATE NONCLUSTERED INDEX IX_discount_start_date ON discount(start_date);
CREATE NONCLUSTERED INDEX IX_discount_end_date ON discount(end_date);

-- (Lưu ý: Cột discount.code đã có UNIQUE constraint, thường tự động tạo index)
-- (Lưu ý: Cột discount.id là PRIMARY KEY, đã có Clustered Index)


-----------------------------------------------------
-- Indexes for Product and Product Variant (related to Discount queries)
-----------------------------------------------------

-- Tăng tốc JOIN giữa product_variant và product
-- (product_variant.product_id đã là FOREIGN KEY, có thể đã có index, nhưng đảm bảo thêm)
CREATE NONCLUSTERED INDEX IX_product_variant_product_id ON product_variant(product_id);

-- Tăng tốc tìm kiếm theo SKU của product_variant (WHERE sku LIKE ...)
CREATE NONCLUSTERED INDEX IX_product_variant_sku ON product_variant(sku);

-- Tăng tốc tìm kiếm theo tên sản phẩm (WHERE product.name LIKE ...)
CREATE NONCLUSTERED INDEX IX_product_name_for_discount_search ON product(name);
-- (Lưu ý: product.id là PRIMARY KEY, đã có Clustered Index)
-- (Lưu ý: product_variant.id là PRIMARY KEY, đã có Clustered Index)