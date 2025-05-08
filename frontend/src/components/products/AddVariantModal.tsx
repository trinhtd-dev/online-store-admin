import React, { useState } from "react";
import { Modal, Form, Input, InputNumber, Select, Button } from "antd";
import productService, {
  CreateVariantRequest,
  Attribute,
} from "../../services/productService";
import { useNotification } from "../../context/NotificationContext";

const { Option } = Select;

interface AddVariantModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  productId: number;
  attributes: Attribute[];
}

const AddVariantModal: React.FC<AddVariantModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  productId,
  attributes,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  const handleAddVariant = async (values: any) => {
    try {
      setLoading(true);

      // Chuẩn bị dữ liệu attributes theo định dạng API (mảng các value_id)
      const attributeEntries = Object.entries(values.attributes || {});
      const selectedValueIds = attributeEntries.map(([attrId, valueId]) =>
        parseInt(valueId as string)
      );

      if (selectedValueIds.length !== attributes.length) {
        throw new Error("Vui lòng chọn đầy đủ các thuộc tính");
      }

      const variantData: CreateVariantRequest = {
        product_id: productId,
        price: values.price,
        original_price: values.original_price,
        stock_quantity: values.stock_quantity,
        sku: values.sku,
        attributes: selectedValueIds, // Gửi mảng các value_id
      };

      await productService.createVariant(variantData);
      showNotification("Thêm biến thể sản phẩm thành công", "success");
      form.resetFields();
      onSuccess();
      onCancel();
    } catch (error: any) {
      showNotification(
        error?.message || "Không thể thêm biến thể sản phẩm",
        "error"
      );
      console.error("Error adding variant:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Thêm biến thể sản phẩm"
      open={visible}
      onCancel={onCancel}
      footer={null}
    >
      <Form form={form} layout="vertical" onFinish={handleAddVariant}>
        <Form.Item
          name="sku"
          label="SKU"
          rules={[{ required: true, message: "Vui lòng nhập SKU" }]}
        >
          <Input placeholder="VD: IP13-RED-128" />
        </Form.Item>

        <Form.Item
          name="original_price"
          label="Giá gốc (VND)"
          rules={[{ required: true, message: "Vui lòng nhập giá gốc" }]}
        >
          <InputNumber
            min={0}
            style={{ width: "100%" }}
            formatter={(value) =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={
              ((value: string | undefined) => {
                const parsed = parseFloat(value!.replace(/[^\d.]/g, ""));
                return isNaN(parsed) ? 0 : parsed;
              }) as any
            }
          />
        </Form.Item>

        <Form.Item
          name="price"
          label="Giá bán (VND)"
          rules={[{ required: true, message: "Vui lòng nhập giá bán" }]}
        >
          <InputNumber
            min={0}
            style={{ width: "100%" }}
            formatter={(value) =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={
              ((value: string | undefined) => {
                const parsed = parseFloat(value!.replace(/[^\d.]/g, ""));
                return isNaN(parsed) ? 0 : parsed;
              }) as any
            }
          />
        </Form.Item>

        <Form.Item
          name="stock_quantity"
          label="Số lượng tồn kho"
          rules={[{ required: true, message: "Vui lòng nhập số lượng" }]}
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>

        {/* Thuộc tính sản phẩm */}
        {attributes.map((attribute) => (
          <Form.Item
            key={attribute.id}
            label={attribute.name}
            name={["attributes", attribute.id.toString()]}
            rules={[
              { required: true, message: `Vui lòng chọn ${attribute.name}!` },
            ]}
          >
            <Select placeholder={`Chọn ${attribute.name}`}>
              {attribute.values &&
                attribute.values.map((value) => (
                  <Option key={value.id} value={value.id.toString()}>
                    {value.value}
                  </Option>
                ))}
            </Select>
          </Form.Item>
        ))}

        <Form.Item>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={onCancel}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Thêm
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddVariantModal;
