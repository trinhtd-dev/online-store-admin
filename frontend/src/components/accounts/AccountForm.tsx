import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  Select,
  Radio,
  Row,
  Col,
  InputNumber,
  AutoComplete,
} from "antd";
import type { FormInstance } from "antd";
import {
  AccountResponse,
  RoleResponse,
  AccountType,
  AccountStatus,
} from "../../api/types";

const { Option } = Select;

interface AccountFormProps {
  form: FormInstance;
  initialValues?: Partial<AccountResponse> | null;
  roles: RoleResponse[];
  isEditMode?: boolean;
}

const AccountForm: React.FC<AccountFormProps> = ({
  form,
  initialValues,
  roles,
  isEditMode = false,
}) => {
  // Infer account type based on role_id existence in initialValues for edit mode
  const [accountType, setAccountType] = useState<AccountType | undefined>(
    initialValues?.role_id != null ? "manager" : "customer" // Check role_id
  );

  // Update accountType state when initialValues change (for edit mode)
  useEffect(() => {
    // Infer type again when initialValues change
    const type = initialValues?.role_id != null ? "manager" : "customer";
    setAccountType(type);

    // Reset form fields when initialValues change (useful when reusing modal)
    // Also set the account_type field in the form if it exists (only for create mode)
    if (!isEditMode) {
      form.setFieldsValue({ account_type: type });
    }
    // form.resetFields(); // resetFields might clear the inferred type, setFieldsValue used instead for defaults
  }, [initialValues, form, isEditMode]); // Added isEditMode dependency

  const handleAccountTypeChange = (e: any) => {
    const newType = e.target.value;
    setAccountType(newType);
    // Reset dependent fields when type changes
    form.setFieldsValue({
      role_id: undefined,
      phone_number: undefined,
      address: undefined,
    });
  };

  return (
    <Form form={form} layout="vertical" initialValues={initialValues || {}}>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="full_name"
            label="Full Name"
            rules={[{ required: true, message: "Please enter the full name" }]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Please enter the email" },
              { type: "email", message: "Please enter a valid email" },
            ]}
          >
            <Input disabled={isEditMode} />
          </Form.Item>
        </Col>
      </Row>

      {!isEditMode && (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: !isEditMode, message: "Please enter a password" },
                {
                  min: 6,
                  message: "Password must be at least 6 characters long",
                },
              ]}
              hasFeedback
            >
              <Input.Password />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="confirmPassword"
              label="Confirm Password"
              dependencies={["password"]}
              hasFeedback
              rules={[
                { required: !isEditMode, message: "Please confirm password" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("The two passwords do not match!")
                    );
                  },
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>
          </Col>
        </Row>
      )}

      <Row gutter={16}>
        <Col span={12}>
          {!isEditMode && (
            <Form.Item
              name="account_type"
              label="Account Type"
              rules={[
                { required: true, message: "Please select account type" },
              ]}
              initialValue={accountType} // Set initial value for create mode
            >
              <Radio.Group onChange={handleAccountTypeChange}>
                <Radio value="customer">Customer</Radio>
                <Radio value="manager">Manager</Radio>
              </Radio.Group>
            </Form.Item>
          )}
        </Col>
        <Col span={12}>
          <Form.Item name="status" label="Status" initialValue="Active">
            <Select>
              <Option value="Active">Active</Option>
              <Option value="Inactive">Inactive</Option>
              <Option value="Banned">Banned</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      {/* Conditional Fields based on Account Type */}
      {accountType === "manager" && (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="role_id"
              label="Role"
              rules={[
                {
                  required: accountType === "manager",
                  message: "Please select a role for the manager",
                },
              ]}
            >
              <Select placeholder="Select Role">
                {roles.map((role) => (
                  <Option key={role.id} value={role.id}>
                    {role.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      )}

      {accountType === "customer" && (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="phone_number" label="Phone Number">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="address" label="Address">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Col>
        </Row>
      )}
    </Form>
  );
};

export default AccountForm;
