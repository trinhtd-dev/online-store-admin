import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Row,
  Col,
  Card,
  Typography,
  Image,
  Carousel,
  Table,
  Descriptions,
  Spin,
  message,
  Button,
  Breadcrumb,
  Tag,
  Space,
} from "antd";
import { ArrowLeftOutlined, EditOutlined } from "@ant-design/icons";
import EditProductModal from "../../components/products/EditProductModal";
import productService from "../../services/productService";
import {
  ProductDetail,
  ProductVariant,
  VariantAttribute,
  ProductResponse,
} from "../../api/types";
// Assuming you have a currency formatter, otherwise remove or implement it
// import { formatCurrency } from '../../utils/formatter';

const { Title, Paragraph, Text } = Typography;

// Placeholder formatter if needed
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const fetchProduct = async () => {
    if (!productId) {
      setError("No Product ID provided.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setProduct(null);
    try {
      const numericProductId = parseInt(productId, 10);
      if (isNaN(numericProductId)) {
        throw new Error("Invalid Product ID");
      }
      const data = await productService.getProductById(numericProductId);
      setProduct(data);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to fetch product details.";
      setError(errorMessage);
      message.error(`Không thể tải chi tiết sản phẩm: ${errorMessage}`);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const handleEditSuccess = () => {
    setIsEditModalVisible(false);
    fetchProduct();
  };

  // Restore original parseSpecifications logic
  const parseSpecifications = (specString?: string): React.ReactNode => {
    if (!specString) {
      // Return a single item indicating no specs, instead of null
      return <Descriptions.Item label="Thông số">Không có</Descriptions.Item>;
    }
    // Parse the string into Descriptions.Item components
    const items = specString
      .split("\n")
      .map((line, index) => {
        const parts = line.split(":");
        if (parts.length >= 2) {
          const label = parts[0].trim();
          // Join back remaining parts in case value contains ':'
          const value = parts.slice(1).join(":").trim();
          // Render item only if both label and value are non-empty
          if (label && value) {
            return (
              <Descriptions.Item key={index} label={label}>
                {value}
              </Descriptions.Item>
            );
          }
        }
        // Handle lines without a clear key:value pair - skip or log?
        // For now, let's skip them to avoid rendering incomplete items
        console.warn(`Skipping invalid spec line: ${line}`);
        return null; // Skip lines that don't parse correctly
      })
      .filter((item) => item !== null); // Filter out null values

    // Return the array of items, or a default item if array is empty
    return items.length > 0 ? (
      items
    ) : (
      <Descriptions.Item label="Thông số">
        Không có thông tin hợp lệ
      </Descriptions.Item>
    );
  };

  const getImageUrls = (imageUrlString?: string): string[] => {
    if (!imageUrlString) return [];
    // Split by newline, trim whitespace, and filter out empty strings
    return imageUrlString
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => !!url);
  };

  const renderVariantAttributes = (attributes?: VariantAttribute[]) => {
    if (!attributes || attributes.length === 0) return "N/A";
    return attributes.map((attr) => (
      <Tag key={`${attr.attribute_id}-${attr.value_id}`}>
        {`${attr.attribute_name}: ${attr.value}`}
      </Tag>
    ));
  };

  const variantColumns = [
    { title: "SKU", dataIndex: "sku", key: "sku", width: 150 },
    {
      title: "Thuộc tính",
      dataIndex: "attributes",
      key: "attributes",
      render: renderVariantAttributes,
    },
    {
      title: "Giá gốc",
      dataIndex: "original_price",
      key: "original_price",
      render: (price: number) => formatCurrency(price),
      align: "right" as const,
      width: 120,
    },
    {
      title: "Giá bán",
      dataIndex: "price",
      key: "price",
      render: (price: number) => formatCurrency(price),
      align: "right" as const,
      width: 120,
    },
    {
      title: "Tồn kho",
      dataIndex: "stock_quantity",
      key: "stock_quantity",
      align: "right" as const,
      width: 100,
    },
    {
      title: "Đã bán",
      dataIndex: "sold_quantity",
      key: "sold_quantity",
      align: "right" as const,
      width: 100,
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <Card>
        <Title level={3} type="danger">
          Lỗi
        </Title>
        <Paragraph>{error || "Không tìm thấy sản phẩm."}</Paragraph>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/products")}
        >
          Quay lại danh sách
        </Button>
      </Card>
    );
  }

  const images = getImageUrls(product.image_url);

  return (
    <div>
      <Breadcrumb style={{ marginBottom: "16px" }}>
        <Breadcrumb.Item>
          <Link to="/">Trang chủ</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/products">Sản phẩm</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          {product ? product.name : "Loading..."}
        </Breadcrumb.Item>
      </Breadcrumb>

      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/products")}
          >
            Quay lại danh sách
          </Button>
          {product && (
            <Button
              icon={<EditOutlined />}
              onClick={() => setIsEditModalVisible(true)}
              type="primary"
            >
              Sửa sản phẩm
            </Button>
          )}
        </Space>
      </div>

      {product && (
        <Card>
          <Row gutter={[24, 24]}>
            {/* Image Column */}
            <Col xs={24} md={10} lg={8}>
              {images.length > 0 ? (
                <Carousel autoplay dotPosition="bottom">
                  {images.map((url, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        background: "#f0f0f0",
                      }}
                    >
                      <Image
                        style={{ maxHeight: "400px", objectFit: "contain" }} // Constrain image height
                        src={url}
                        alt={`${product.name} - Ảnh ${index + 1}`}
                        preview={{ visible: false }} // Simple preview, can be enabled
                        // Add a real placeholder image path if available
                        fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkqAcAAIUAgUW0RjgAAAAASUVORK5CYII="
                      />
                    </div>
                  ))}
                </Carousel>
              ) : (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    background: "#f0f0f0",
                    height: "400px",
                  }}
                >
                  <Image
                    width="50%"
                    src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCAwaDY0djY0SDB6IiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTU0LjQxOCAzMS40MThoLTYuODI3di02LjgyN2EyLjUgMi41IDAgMCAwLTUgMHY2LjgyN2gtNi44MjdjLTEuMzggMC0yLjUuNzk4LTIuNSAyLjUyMXMyLjUgMi41IDIuNSAyLjVoNi44Mjd2Ni44MjdjMCAxLjQxMyAxLjEyMSAyLjUgMi41IDIuNXMyLjUtMS4xMjYgMi41LTIuNXYtNi44MjdoNi44MjdjMS4zOCAwIDIuNS0uODAyIDIuNS0yLjUyMXMtMS4xMy0yLjUtMi41MS0yLjVoLS4wMDh6TTMyIDU2LjUxOGMtNy41MTUgMC0xMy42MTQtNS4xMDMtMTMuNjE0LTExLjQxOUMxOC4zODYgMzkuNzk2IDI0LjQ4NiAzMiAzMiAzMnMxMy42MTQgNy43OTYgMTMuNjE0IDEzLjA5OUM0NS42MTQgNTEuNDE1IDM5LjUxNCA1Ni41MTggMzIgNTYuNTE4ek0zMiAyOS4zOThjLTEwLjY2IDAtMTkuMyA3LjU5Ni0xOS4zIDE2Ljk4MnMyMS4zMyAxNi45ODIgMjEuMzMgMTYuOTgyUzUxLjMgNTcgNTEuMyA0Ni4zODUgNDIuNjYgMjkuMzk4IDMyIDI5LjM5OHpNMzIgMEMxNC4zMjcgMCAwIDE0LjMyNyAwIDMyczE0LjMyNyAzMiAzMiAzMmMxNy42NzMgMCAzMi0xNC4zMjcgMzItMzJTNDkuNjczIDAgMzIgMHoiIGZpbGw9IiNjY2MiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg==" // Simple placeholder SVG
                    alt="Không có ảnh"
                    preview={false}
                  />
                </div>
              )}
            </Col>

            {/* Info Column */}
            <Col xs={24} md={14} lg={16}>
              <Title level={3} style={{ marginTop: 0 }}>
                {product.name}
              </Title>
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="ID">{product.id}</Descriptions.Item>
                <Descriptions.Item label="Thương hiệu">
                  {product.brand || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Danh mục">
                  {product.category_name || "N/A"}
                </Descriptions.Item>
                {/* Can add status or other key fields here */}
              </Descriptions>

              <Title
                level={5}
                style={{ marginTop: "16px", marginBottom: "8px" }}
              >
                Mô tả sản phẩm:
              </Title>
              <Paragraph
                style={{
                  maxHeight: "300px",
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  background: "#fafafa",
                  padding: "10px",
                  borderRadius: "4px",
                }}
              >
                {product.description?.split("\n").map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    <br />
                  </React.Fragment>
                )) || "Không có mô tả."}
              </Paragraph>
            </Col>
          </Row>

          {/* Description and Specifications */}
          <Row gutter={[24, 24]} style={{ marginTop: "24px" }}>
            <Col span={24}>
              <Card title="Thông số kỹ thuật" size="small">
                <Descriptions
                  bordered
                  column={{ xs: 1, sm: 1, md: 2 }}
                  size="small"
                  layout="vertical"
                >
                  {parseSpecifications(product.specification)}
                </Descriptions>
              </Card>
            </Col>
          </Row>

          {/* Variants Table */}
          <Row style={{ marginTop: "24px" }}>
            <Col span={24}>
              <Title level={4}>Các phiên bản sản phẩm</Title>
              <Table
                columns={variantColumns}
                dataSource={product.variants.map((v) => ({ ...v, key: v.id }))}
                pagination={false}
                size="small"
                bordered
                scroll={{ x: 800 }} // Add horizontal scroll for smaller screens
              />
            </Col>
          </Row>
        </Card>
      )}

      {product && (
        <EditProductModal
          visible={isEditModalVisible}
          onCancel={() => setIsEditModalVisible(false)}
          onSuccess={handleEditSuccess}
          product={product as ProductResponse}
        />
      )}
    </div>
  );
};

export default ProductDetailPage;
