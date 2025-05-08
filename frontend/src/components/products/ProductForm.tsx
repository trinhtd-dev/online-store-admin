import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Upload,
  message,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd/es/upload/interface";
import { ProductResponse } from "../../api/types";
import categoryService from "../../services/categoryService";
import { CategoryResponse } from "../../api/types";

const { Option } = Select;
const { TextArea } = Input;

interface ProductFormProps {
  initialValues?: Partial<ProductResponse>;
  onFinish: (values: any) => void;
  onCancel: () => void;
  loading: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({
  initialValues,
  onFinish,
  onCancel,
  loading,
}) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    // Tải danh sách danh mục
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await categoryService.getAllCategories();
        setCategories(response.categories);
      } catch (error) {
        message.error("Không thể tải danh sách danh mục");
        console.error("Error fetching categories:", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    // Khởi tạo fileList nếu có image_url
    if (initialValues?.image_url) {
      // Split the string by newline, filter out empty strings, and take the first one
      const firstImageUrl = initialValues.image_url
        .split("\n")
        .map((url) => url.trim())
        .filter((url) => !!url)[0];

      if (firstImageUrl) {
        // Extract filename or use a default
        const fileName =
          firstImageUrl.substring(firstImageUrl.lastIndexOf("/") + 1) ||
          "image.png";
        const file: UploadFile = {
          uid: "-1", // Static UID for the initial file
          name: fileName,
          status: "done",
          url: firstImageUrl, // Use the first valid URL for preview
        };
        setFileList([file]);
        // Optionally set the form field value if needed, though initialValues should handle it
        // form.setFieldsValue({ image_url: firstImageUrl });
      } else {
        setFileList([]); // Ensure file list is empty if no valid URL found
      }
    } else {
      setFileList([]); // Ensure file list is empty if no initial URL
    }
    // Reset fields when initialValues change (e.g., opening modal for different product)
    form.resetFields();
  }, [initialValues, form]); // Add form dependency because we use resetFields

  const uploadProps: UploadProps = {
    onRemove: (file) => {
      setFileList([]);
      // Clear the image_url field in the form
      form.setFieldsValue({ image_url: undefined });
    },
    beforeUpload: (file) => {
      // Check file type
      const isImage = file.type.startsWith("image/");
      if (!isImage) {
        message.error("Chỉ có thể tải lên file hình ảnh!");
        return false;
      }

      // Check file size (2MB limit)
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error("Hình ảnh phải nhỏ hơn 2MB!");
        return false;
      }

      // Update fileList
      setFileList([file]);

      // In real application, you would upload the file to a server here
      // and get the image URL to set in the form
      // For now, we'll use a fake URL for demonstration

      // Create a temporary URL for preview
      const fakeUrl = URL.createObjectURL(file);
      form.setFieldsValue({ image_url: fakeUrl });

      // Prevent default upload behavior
      return false;
    },
    fileList,
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={onFinish}
    >
      <Form.Item
        name="name"
        label="Tên sản phẩm"
        rules={[{ required: true, message: "Vui lòng nhập tên sản phẩm" }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="category_id"
        label="Danh mục"
        rules={[{ required: true, message: "Vui lòng chọn danh mục" }]}
      >
        <Select loading={loadingCategories} placeholder="Chọn danh mục">
          {categories.map((category) => (
            <Option key={category.id} value={category.id}>
              {category.name}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item name="brand" label="Thương hiệu">
        <Input />
      </Form.Item>

      <Form.Item name="description" label="Mô tả">
        <TextArea rows={4} />
      </Form.Item>

      <Form.Item name="specification" label="Thông số kỹ thuật">
        <TextArea rows={4} />
      </Form.Item>

      <Form.Item name="image_url" label="Hình ảnh sản phẩm">
        <Upload listType="picture" maxCount={1} {...uploadProps}>
          <Button icon={<UploadOutlined />}>Tải ảnh lên</Button>
        </Upload>
      </Form.Item>

      <Form.Item>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {initialValues ? "Cập nhật" : "Tạo mới"}
          </Button>
        </div>
      </Form.Item>
    </Form>
  );
};

export default ProductForm;
