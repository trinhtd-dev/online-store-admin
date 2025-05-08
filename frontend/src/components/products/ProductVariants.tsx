import React, { useState, useEffect } from "react";
import { Table, Button, Space, Tag, Popconfirm, Spin } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import productService, {
  ProductDetail,
  ProductVariant,
  VariantAttribute,
  Attribute,
} from "../../services/productService";
import AddVariantModal from "./AddVariantModal";
import EditVariantModal from "./EditVariantModal";
import { useNotification } from "../../context/NotificationContext";

interface ProductVariantsProps {
  product: ProductDetail;
  onVariantsChange?: () => void;
}

const ProductVariants: React.FC<ProductVariantsProps> = ({
  product,
  onVariantsChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null
  );
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const { showNotification } = useNotification();

  // Cập nhật state khi product prop thay đổi
  useEffect(() => {
    if (product && product.variants) {
      setVariants(product.variants);
    }
  }, [product]);

  // Xử lý xóa variant
  const handleDeleteVariant = async (variantId: number) => {
    try {
      setLoading(true);
      await productService.deleteVariant(variantId);
      showNotification("Đã xóa biến thể sản phẩm thành công", "success");
      // Cập nhật lại state hoặc gọi callback để load lại từ cha
      if (onVariantsChange) {
        onVariantsChange();
      } else {
        setVariants(variants.filter((variant) => variant.id !== variantId));
      }
    } catch (error) {
      showNotification("Không thể xóa biến thể sản phẩm", "error");
      console.error("Error deleting variant:", error);
    } finally {
      setLoading(false);
    }
  };

  // Hiển thị giá trị thuộc tính của từng variant
  const renderAttributeValues = (variant: ProductVariant) => {
    if (!variant.attributes || variant.attributes.length === 0) {
      return <Tag>Không có thuộc tính</Tag>;
    }

    return variant.attributes.map((attr: VariantAttribute) => (
      <Tag key={`${variant.id}-${attr.attribute_id}`} color="blue">
        {`${attr.attribute_name}: ${attr.value}`}
      </Tag>
    ));
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return "0";
    return value.toLocaleString("vi-VN"); // Format Vietnamese Dong
  };

  const columns = [
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
    },
    {
      title: "Thuộc tính",
      key: "attributes",
      render: (text: string, record: ProductVariant) => (
        <Space size="small" wrap>
          {renderAttributeValues(record)}
        </Space>
      ),
    },
    {
      title: "Giá gốc (VND)",
      dataIndex: "original_price",
      key: "original_price",
      render: (price: number) => formatCurrency(price),
    },
    {
      title: "Giá bán (VND)",
      dataIndex: "price",
      key: "price",
      render: (price: number) => formatCurrency(price),
    },
    {
      title: "Tồn kho",
      dataIndex: "stock_quantity",
      key: "stock_quantity",
    },
    {
      title: "Đã bán",
      dataIndex: "sold_quantity",
      key: "sold_quantity",
    },
    {
      title: "Trạng thái",
      key: "status",
      render: (text: string, record: ProductVariant) => (
        <Tag color={record.stock_quantity > 0 ? "green" : "red"}>
          {record.stock_quantity > 0 ? "Còn hàng" : "Hết hàng"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      render: (text: string, record: ProductVariant) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedVariant(record);
              setIsEditModalVisible(true);
            }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa biến thể này?"
            onConfirm={() => handleDeleteVariant(record.id)}
            okText="Có"
            cancelText="Không"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Xử lý sau khi thêm/sửa variant thành công
  const handleVariantChange = () => {
    if (onVariantsChange) {
      onVariantsChange(); // Gọi callback để component cha load lại dữ liệu
    }
  };

  return (
    <div style={{ padding: "0 20px 20px 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h3>Biến thể sản phẩm</h3>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsAddModalVisible(true)}
        >
          Thêm biến thể
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <Spin />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={variants.map((v) => ({ ...v, key: v.id }))}
          pagination={false}
          size="small"
        />
      )}

      {/* Modal thêm biến thể */}
      {isAddModalVisible && (
        <AddVariantModal
          visible={isAddModalVisible}
          onCancel={() => setIsAddModalVisible(false)}
          productId={product.id}
          attributes={product.attributes} // Truyền attributes chung của product để tạo form
          onSuccess={handleVariantChange}
        />
      )}

      {/* Modal sửa biến thể */}
      {isEditModalVisible && selectedVariant && (
        <EditVariantModal
          visible={isEditModalVisible}
          onCancel={() => {
            setIsEditModalVisible(false);
            setSelectedVariant(null);
          }}
          variant={selectedVariant} // Chỉ cần truyền variant hiện tại
          // attributes={product.attributes} // Không cần truyền nữa
          onSuccess={handleVariantChange}
        />
      )}
    </div>
  );
};

export default ProductVariants;
