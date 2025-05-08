import React, { useState } from "react";
import { Modal } from "antd";
import ProductForm from "./ProductForm";
import productService, {
  UpdateProductRequest,
} from "../../services/productService";
import { ProductResponse } from "../../api/types";
import { useNotification } from "../../context/NotificationContext";

interface EditProductModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  product: ProductResponse;
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  product,
}) => {
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  const handleEditProduct = async (values: UpdateProductRequest) => {
    try {
      setLoading(true);
      await productService.updateProduct(product.id, values);
      showNotification("Cập nhật sản phẩm thành công", "success");
      onSuccess();
      onCancel();
    } catch (error) {
      showNotification("Không thể cập nhật sản phẩm", "error");
      console.error("Error updating product:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Cập nhật sản phẩm"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
    >
      <ProductForm
        initialValues={product}
        onFinish={handleEditProduct}
        onCancel={onCancel}
        loading={loading}
      />
    </Modal>
  );
};

export default EditProductModal;
