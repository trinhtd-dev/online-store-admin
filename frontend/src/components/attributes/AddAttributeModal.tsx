import React, { useEffect } from "react";
import { Modal, Form, Input, Button } from "antd";
import attributeService from "../../services/attributeService";
import { CreateAttributeRequest } from "../../api/types";
import { useNotification } from "../../context/NotificationContext";

interface AddAttributeModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const AddAttributeModal: React.FC<AddAttributeModalProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const { showNotification } = useNotification();
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (visible) {
      form.resetFields();
    }
  }, [visible, form]);

  const handleFinish = async (values: CreateAttributeRequest) => {
    setLoading(true);
    try {
      await attributeService.createAttribute(values);
      showNotification("Thuộc tính đã được thêm thành công!", "success");
      onSuccess();
    } catch (error: any) {
      showNotification(
        `Lỗi khi thêm thuộc tính: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
      console.error("Failed to add attribute:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Thêm Thuộc tính Mới"
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
          Thêm
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

export default AddAttributeModal;
