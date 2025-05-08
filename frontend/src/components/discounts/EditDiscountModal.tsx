import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Button, // Import Button for explicit submit
} from "antd";
import DiscountForm from "./DiscountForm";
import discountService from "../../services/discountService";
import {
  DiscountResponse,
  UpdateDiscountRequest,
  CreateDiscountRequest, // Use union type for flexibility
} from "../../api/types";
import { useNotification } from "../../context/NotificationContext";

interface EditDiscountModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  discount: DiscountResponse | null; // Pass the discount to edit
}

const EditDiscountModal: React.FC<EditDiscountModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  discount,
}) => {
  const [form] = Form.useForm<UpdateDiscountRequest>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showNotification } = useNotification();

  // Reset form when discount or visibility changes
  useEffect(() => {
    if (visible && discount) {
      form.setFieldsValue(discount);
    } else {
      form.resetFields();
    }
  }, [visible, discount, form]);

  const handleEditDiscount = async (
    values: UpdateDiscountRequest | CreateDiscountRequest
  ) => {
    if (!discount) return;

    setIsSubmitting(true);
    try {
      await discountService.updateDiscount(
        discount.id,
        values as UpdateDiscountRequest
      );
      showNotification("Cập nhật mã giảm giá thành công!", "success");
      onSuccess(); // Callback to refresh list or close modal
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      showNotification(`Cập nhật mã giảm giá thất bại: ${msg}`, "error");
      console.error("Failed to update discount:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title="Sửa thông tin mã giảm giá"
      visible={visible}
      onCancel={onCancel}
      confirmLoading={isSubmitting}
      width={800}
      footer={[
        <Button key="back" onClick={onCancel} disabled={isSubmitting}>
          Hủy bỏ
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={isSubmitting}
          onClick={() => form.submit()} // Trigger form submission
        >
          Lưu thay đổi
        </Button>,
      ]}
    >
      {discount && (
        <DiscountForm
          form={form}
          initialValues={discount}
          onFinish={handleEditDiscount}
          isSubmitting={isSubmitting}
        />
      )}
    </Modal>
  );
};

export default EditDiscountModal;
