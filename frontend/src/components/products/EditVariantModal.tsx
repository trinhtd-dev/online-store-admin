import React, { useState, useEffect } from "react";
import { Modal, Form, Input, InputNumber, Select, Button } from "antd";
import productService, {
  UpdateVariantRequest,
  Attribute,
  ProductVariant,
} from "../../services/productService";
import { useNotification } from "../../context/NotificationContext";

const { Option } = Select;

interface EditVariantModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  variant: ProductVariant;
  // attributes: Attribute[]; // Không cần truyền attributes nữa vì không sửa được
}

const EditVariantModal: React.FC<EditVariantModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  variant,
  // attributes, // Bỏ attributes
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  // Bỏ state liên quan đến initial attributes
  // const [initialAttributeValues, setInitialAttributeValues] = useState<
  //   Record<string, string>
  // >({});

  // Bỏ useEffect liên quan đến fetch attributes
  useEffect(() => {
    if (variant) {
      form.setFieldsValue({
        sku: variant.sku,
        original_price: variant.original_price,
        price: variant.price,
        stock_quantity: variant.stock_quantity,
      });
    }
  }, [variant, form]);

  const handleEditVariant = async (values: any) => {
    try {
      setLoading(true);

      // Chỉ lấy các trường có thể cập nhật
      const variantData: UpdateVariantRequest = {
        price: values.price,
        original_price: values.original_price,
        stock_quantity: values.stock_quantity,
        sku: values.sku,
        // Bỏ phần attributes
      };

      await productService.updateVariant(variant.id, variantData);
      showNotification("Cập nhật biến thể sản phẩm thành công", "success");
      onSuccess();
      onCancel();
    } catch (error) {
      showNotification("Không thể cập nhật biến thể sản phẩm", "error");
      console.error("Error updating variant:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Cập nhật biến thể sản phẩm"
      open={visible}
      onCancel={onCancel}
      footer={null}
    >
      <Form form={form} layout="vertical" onFinish={handleEditVariant}>
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

        {/* Bỏ phần hiển thị thuộc tính vì không sửa được */}
        {/* {attributes.map((attribute) => (
          <Form.Item
            key={attribute.id}
            name={["attributes", attribute.id.toString()]}
            label={attribute.name}
            rules={[
              { required: true, message: `Vui lòng chọn ${attribute.name}` },
            ]}
            initialValue={initialAttributeValues[attribute.id.toString()]}
          >
            <Select placeholder={`Chọn ${attribute.name}`}>
              {attribute.values.map((value) => (
                <Option key={value.id} value={value.id.toString()}>
                  {value.value}
                </Option>
              ))}
            </Select>
          </Form.Item>
        ))} */}

        <Form.Item>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={onCancel}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Cập nhật
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditVariantModal;
