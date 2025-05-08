import React, { useState } from "react";
import { Modal } from "antd";
import ProductForm from "./ProductForm";
import productService, {
  CreateProductRequest,
} from "../../services/productService";
import { useNotification } from "../../context/NotificationContext";

interface AddProductModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const AddProductModal: React.FC<AddProductModalProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  const handleAddProduct = async (values: CreateProductRequest) => {
    try {
      setLoading(true);
      await productService.createProduct(values);
      showNotification("Thêm sản phẩm thành công", "success");
      onSuccess();
      onCancel();
    } catch (error) {
      showNotification("Không thể thêm sản phẩm", "error");
      console.error("Error adding product:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Thêm sản phẩm mới"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
    >
      <ProductForm
        onFinish={handleAddProduct}
        onCancel={onCancel}
        loading={loading}
      />
    </Modal>
  );
};

export default AddProductModal;
