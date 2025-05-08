import React from "react";
import { Form, Input } from "antd";

interface CategoryFormProps {
  form: any; // Ant Design Form instance
}

const CategoryForm: React.FC<CategoryFormProps> = ({ form }) => {
  return (
    <Form form={form} layout="vertical" name="category_form">
      <Form.Item
        name="name"
        label="Tên Danh mục"
        rules={[
          {
            required: true,
            message: "Vui lòng nhập tên danh mục!",
          },
          {
            max: 255,
            message: "Tên danh mục không được vượt quá 255 ký tự!",
          },
        ]}
      >
        <Input placeholder="Nhập tên danh mục" />
      </Form.Item>
      {/* Có thể thêm các trường khác nếu cần, ví dụ: mô tả, danh mục cha, ảnh... */}
    </Form>
  );
};

export default CategoryForm;
