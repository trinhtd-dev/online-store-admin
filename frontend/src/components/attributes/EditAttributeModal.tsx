import React, { useEffect } from "react";
import { Modal, Form, Input, Button } from "antd";
import attributeService from "../../services/attributeService";
import {
  Attribute as AttributeResponse,
  UpdateAttributeRequest,
} from "../../api/types";
import { useNotification } from "../../context/NotificationContext";

interface EditAttributeModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  attribute: AttributeResponse | null;
}

const EditAttributeModal: React.FC<EditAttributeModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  attribute,
}) => {
  const [form] = Form.useForm();
  const { showNotification } = useNotification();
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (visible && attribute) {
      form.setFieldsValue({ name: attribute.name });
    } else {
      form.resetFields();
    }
  }, [visible, attribute, form]);

  const handleFinish = async (values: UpdateAttributeRequest) => {
    if (!attribute) return;
    setLoading(true);
    try {
      await attributeService.updateAttribute(attribute.id, values);
      showNotification("Thuộc tính đã được cập nhật thành công!", "success");
      onSuccess();
    } catch (error: any) {
      showNotification(
        `Lỗi khi cập nhật thuộc tính: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
      console.error("Failed to update attribute:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Sửa Thuộc tính"
      visible={visible}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel} disabled={loading}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={() => form.submit()}
        >
          Lưu
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="name"
          label="Tên Thuộc tính"
          rules={[
            {
              required: true,
              message: "Vui lòng nhập tên thuộc tính!",
            },
          ]}
        >
          <Input placeholder="Ví dụ: Màu sắc, Kích thước" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditAttributeModal;
