import React from "react";
import { Form, Input, Select } from "antd";
import type { FormInstance } from "antd/es/form";

const { Option } = Select;

interface RoleFormProps {
  form: FormInstance; // Pass form instance from the modal
}

const RoleForm: React.FC<RoleFormProps> = ({ form }) => {
  return (
    <Form form={form} layout="vertical" name="role_form">
      <Form.Item
        name="name"
        label="Tên Role"
        rules={[
          {
            required: true,
            message: "Vui lòng nhập tên role!",
          },
          {
            whitespace: true,
            message: "Tên role không được chỉ chứa khoảng trắng!",
          },
        ]}
      >
        <Input placeholder="Nhập tên role" />
      </Form.Item>

      <Form.Item
        name="status"
        label="Trạng thái"
        initialValue="Active" // Default to Active
        rules={[{ required: true, message: "Vui lòng chọn trạng thái!" }]}
      >
        <Select placeholder="Chọn trạng thái">
          <Option value="Active">Active</Option>
          <Option value="Inactive">Inactive</Option>
        </Select>
      </Form.Item>
    </Form>
  );
};

export default RoleForm;

export {};
