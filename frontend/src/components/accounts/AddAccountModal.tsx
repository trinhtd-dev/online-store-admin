import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Spin,
  Typography,
  Alert,
} from "antd";
import {
  CreateAccountRequest,
  RoleResponse,
  AccountType,
} from "../../api/types";
import { createAccount } from "../../services/accountService";
import { useNotification } from "../../context/NotificationContext";

const { Option } = Select;

interface AddAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roles: RoleResponse[];
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({
  visible,
  onClose,
  onSuccess,
  roles,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("manager");
  const [error, setError] = useState<string | null>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setAccountType("manager");
      setError(null);
    }
  }, [visible, form]);

  const handleAccountTypeChange = (value: AccountType) => {
    setAccountType(value);
    form.setFieldsValue({ role_id: undefined });
  };

  const handleFinish = async (values: any) => {
    setLoading(true);
    setError(null);
    try {
      const requestData: CreateAccountRequest = {
        ...values,
        account_type: accountType,
        status: values.status || "Active",
      };
      await createAccount(requestData);
      showNotification("Thêm tài khoản thành công!", "success");
      onSuccess();
    } catch (err: any) {
      console.error("Failed to add account:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Lỗi không xác định khi thêm tài khoản.";
      setError(errorMessage);
      showNotification(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Thêm Tài khoản Mới"
      visible={visible}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose} disabled={loading}>
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
      width={600}
    >
      <Spin spinning={loading}>
        {error && (
          <Alert
            message="Lỗi"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16 }}
          />
        )}
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item
            name="full_name"
            label="Họ và tên"
            rules={[{ required: true, message: "Vui lòng nhập họ tên!" }]}
          >
            <Input placeholder="Nhập họ và tên đầy đủ" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Vui lòng nhập email!" },
              { type: "email", message: "Email không hợp lệ!" },
            ]}
          >
            <Input placeholder="Nhập địa chỉ email" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
          >
            <Input.Password placeholder="Nhập mật khẩu" />
          </Form.Item>

          <Form.Item
            name="account_type"
            label="Loại tài khoản"
            initialValue="manager"
          >
            <Select onChange={handleAccountTypeChange}>
              <Option value="manager">Quản trị viên</Option>
              <Option value="customer">Khách hàng</Option>
            </Select>
          </Form.Item>

          {accountType === "manager" && (
            <Form.Item
              name="role_id"
              label="Vai trò"
              rules={[{ required: true, message: "Vui lòng chọn vai trò!" }]}
            >
              <Select
                placeholder="Chọn vai trò cho quản trị viên"
                loading={!roles.length}
              >
                {roles.map((role) => (
                  <Option key={role.id} value={role.id}>
                    {role.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {accountType === "customer" && (
            <>
              <Form.Item name="phone_number" label="Số điện thoại">
                <Input placeholder="Nhập số điện thoại (tùy chọn)" />
              </Form.Item>
              <Form.Item name="address" label="Địa chỉ">
                <Input.TextArea
                  rows={2}
                  placeholder="Nhập địa chỉ (tùy chọn)"
                />
              </Form.Item>
            </>
          )}

          <Form.Item name="status" label="Trạng thái" initialValue="Active">
            <Select>
              <Option value="Active">Hoạt động</Option>
              <Option value="Inactive">Không hoạt động</Option>
              <Option value="Banned">Bị cấm</Option>
            </Select>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default AddAccountModal;
