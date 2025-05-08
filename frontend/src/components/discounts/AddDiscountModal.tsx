import React, { useState } from "react";
import {
  Modal,
  Form,
  Button, // Import Button for explicit submit
} from "antd";
import DiscountForm from "./DiscountForm";
import discountService from "../../services/discountService";
import {
  CreateDiscountRequest,
  UpdateDiscountRequest, // Use union type for flexibility
} from "../../api/types";
import { useNotification } from "../../context/NotificationContext";

interface AddDiscountModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const AddDiscountModal: React.FC<AddDiscountModalProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm<CreateDiscountRequest>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showNotification } = useNotification();

  const handleAddDiscount = async (
    values: CreateDiscountRequest | UpdateDiscountRequest
  ) => {
    setIsSubmitting(true);
    try {
      await discountService.createDiscount(values as CreateDiscountRequest);
      showNotification("Thêm mã giảm giá thành công!", "success");
      form.resetFields();
      onSuccess(); // Callback to refresh list or close modal
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      showNotification(`Thêm mã giảm giá thất bại: ${msg}`, "error");
      console.error("Failed to add discount:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title="Thêm mã giảm giá mới"
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
          Thêm mã giảm giá
        </Button>,
      ]}
    >
      <DiscountForm
        form={form}
        onFinish={handleAddDiscount}
        isSubmitting={isSubmitting}
      />
    </Modal>
  );
};

export default AddDiscountModal;
