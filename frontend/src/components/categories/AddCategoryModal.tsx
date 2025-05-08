import React, { useState } from "react";
import { Modal, Form } from "antd";
import CategoryForm from "./CategoryForm";
import categoryService, {
  CreateCategoryRequest,
} from "../../services/categoryService";
import { useNotification } from "../../context/NotificationContext";

interface AddCategoryModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload: CreateCategoryRequest = {
        name: values.name,
        // Thêm các trường khác nếu CategoryForm có
      };

      await categoryService.createCategory(payload);
      showNotification("Danh mục đã được thêm thành công!", "success");
      onSuccess(); // Callback để đóng modal và refresh danh sách
      form.resetFields();
    } catch (error: any) {
      // Hiển thị lỗi từ server nếu có, nếu không thì hiển thị lỗi chung
      const errMsg = error.response?.data?.message || "Lỗi khi thêm danh mục";
      showNotification(errMsg, "error");
      console.error("Failed to add category:", error);
      // Không đóng modal nếu có lỗi
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Thêm Danh mục mới"
      visible={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Thêm"
      cancelText="Hủy"
      destroyOnClose // Reset form state when modal is closed
    >
      <CategoryForm form={form} />
    </Modal>
  );
};

export default AddCategoryModal;
