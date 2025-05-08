import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  List,
  Popconfirm,
  Typography,
  Divider,
  Spin,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import attributeService from "../../services/attributeService";
import {
  AttributeValue as AttributeValueResponse,
  CreateAttributeValueRequest,
} from "../../api/types";
import { useNotification } from "../../context/NotificationContext";

interface ManageAttributeValuesModalProps {
  visible: boolean;
  onCancel: () => void;
  attributeId: number;
  attributeName: string;
}

const ManageAttributeValuesModal: React.FC<ManageAttributeValuesModalProps> = ({
  visible,
  onCancel,
  attributeId,
  attributeName,
}) => {
  const [form] = Form.useForm();
  const { showNotification } = useNotification();
  const [values, setValues] = useState<AttributeValueResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [addValueLoading, setAddValueLoading] = useState(false);

  const fetchAttributeValues = useCallback(async () => {
    if (!attributeId) return;
    setLoading(true);
    try {
      // GetAttributeById returns the attribute with its values populated
      const attributeDetails = await attributeService.getAttributeById(
        attributeId
      );
      setValues(attributeDetails.values || []);
    } catch (error: any) {
      showNotification(
        `Lỗi khi tải giá trị thuộc tính: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
      console.error("Failed to fetch attribute values:", error);
      setValues([]); // Clear values on error
    } finally {
      setLoading(false);
    }
  }, [attributeId, showNotification]);

  useEffect(() => {
    if (visible) {
      fetchAttributeValues();
      form.resetFields(); // Reset add value form
    }
  }, [visible, fetchAttributeValues, form]);

  const handleAddValue = async (formValues: { value: string }) => {
    setAddValueLoading(true);
    try {
      const newValue: CreateAttributeValueRequest = {
        value: formValues.value,
      };
      await attributeService.addAttributeValue(attributeId, newValue);
      showNotification("Giá trị đã được thêm thành công!", "success");
      form.resetFields();
      fetchAttributeValues(); // Refresh list of values
    } catch (error: any) {
      showNotification(
        `Lỗi khi thêm giá trị: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
      console.error("Failed to add attribute value:", error);
    } finally {
      setAddValueLoading(false);
    }
  };

  const handleDeleteValue = async (valueId: number) => {
    // Note: Individual value delete buttons might need their own loading state
    // For simplicity, we'll rely on the main modal loading or just quick UI update.
    try {
      await attributeService.deleteAttributeValue(attributeId, valueId);
      showNotification("Giá trị đã được xóa thành công!", "success");
      fetchAttributeValues(); // Refresh list of values
    } catch (error: any) {
      showNotification(
        `Lỗi khi xóa giá trị: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
      console.error("Failed to delete attribute value:", error);
    }
  };

  return (
    <Modal
      title={`Quản lý Giá trị cho Thuộc tính: ${attributeName}`}
      visible={visible}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          Đóng
        </Button>,
      ]}
      width={600}
    >
      <Form
        form={form}
        layout="inline"
        onFinish={handleAddValue}
        style={{ marginBottom: 20 }}
      >
        <Form.Item
          name="value"
          rules={[{ required: true, message: "Vui lòng nhập giá trị!" }]}
          style={{ flexGrow: 1 }}
        >
          <Input placeholder="Nhập giá trị mới (ví dụ: Đỏ, XL)" />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<PlusOutlined />}
            loading={addValueLoading}
          >
            Thêm Giá trị
          </Button>
        </Form.Item>
      </Form>

      <Divider />

      {loading ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <Spin size="large" />
        </div>
      ) : values.length === 0 ? (
        <Typography.Text type="secondary">
          Chưa có giá trị nào cho thuộc tính này.
        </Typography.Text>
      ) : (
        <List
          bordered
          dataSource={values}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Popconfirm
                  title="Bạn có chắc muốn xóa giá trị này?"
                  onConfirm={() => handleDeleteValue(item.id)}
                  okText="Xóa"
                  cancelText="Hủy"
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              {item.value}
            </List.Item>
          )}
          style={{ maxHeight: 300, overflowY: "auto" }}
        />
      )}
    </Modal>
  );
};

export default ManageAttributeValuesModal;
