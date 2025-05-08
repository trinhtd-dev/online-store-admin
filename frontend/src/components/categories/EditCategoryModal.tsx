import React, { useState, useEffect } from "react";
import { Modal, Form } from "antd";
import CategoryForm from "./CategoryForm";
import categoryService, {
  UpdateCategoryRequest,
} from "../../services/categoryService";
import { CategoryResponse } from "../../api/types";
import { useNotification } from "../../context/NotificationContext";

interface EditCategoryModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  category: CategoryResponse | null; // Category data to edit
}

const EditCategoryModal: React.FC<EditCategoryModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  category,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  // Set form fields when the category prop changes (modal opens)
  useEffect(() => {
    if (category && visible) {
      form.setFieldsValue({
        name: category.name,
        // Set other fields if CategoryForm has them
      });
    } else {
      form.resetFields(); // Reset form when modal closes or no category
    }
  }, [category, form, visible]);

  const handleOk = async () => {
    if (!category) return; // Should not happen, but safeguard

    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload: UpdateCategoryRequest = {
        name: values.name,
        // Thêm các trường khác nếu CategoryForm có
      };

      await categoryService.updateCategory(category.id, payload);
      showNotification("Danh mục đã được cập nhật thành công!", "success");
      onSuccess(); // Callback để đóng modal và refresh danh sách
      // form.resetFields(); // Reset is handled by destroyOnClose and useEffect
    } catch (error: any) {
      const errMsg =
        error.response?.data?.message || "Lỗi khi cập nhật danh mục";
      showNotification(errMsg, "error");
      console.error("Failed to update category:", error);
      // Không đóng modal nếu có lỗi
    } finally {
      setLoading(false);
    }
  };

  // Use the same cancel handler as Add modal might be sufficient
  const handleCancel = () => {
    // form.resetFields(); // Reset is handled by destroyOnClose and useEffect
    onCancel();
  };

  return (
    <Modal
      title={`Sửa Danh mục (ID: ${category?.id})`}
      visible={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Lưu"
      cancelText="Hủy"
      destroyOnClose // Reset form state when modal is closed
    >
      {/* Render form only when category data is available */}
      {category && <CategoryForm form={form} />}
    </Modal>
  );
};

export default EditCategoryModal;
