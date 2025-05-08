import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  message,
  Button,
  FormInstance,
  Space,
  Spin,
  Alert,
  Input,
  Select,
} from "antd";
import AccountForm from "./AccountForm";
import { updateAccount } from "../../services/accountService";
import {
  AccountResponse,
  RoleResponse,
  UpdateAccountRequest,
  AccountType,
} from "../../api/types";
import { useNotification } from "../../context/NotificationContext";

const { Option } = Select;

interface EditAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account: AccountResponse | null;
  roles: RoleResponse[];
}

const EditAccountModal: React.FC<EditAccountModalProps> = ({
  visible,
  onClose,
  onSuccess,
  account,
  roles,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    if (visible && account) {
      const type = account.role_id ? "manager" : "customer";
      setAccountType(type);
      form.setFieldsValue({
        full_name: account.full_name,
        email: account.email,
        status: account.status,
        role_id: account.role_id,
        phone_number: account.phone_number ?? undefined,
        address: account.address ?? undefined,
      });
      setError(null);
    } else {
      form.resetFields();
      setAccountType(null);
    }
  }, [visible, account, form]);

  const handleFinish = async (values: any) => {
    if (!account) return;
    setLoading(true);
    setError(null);
    try {
      const requestData: UpdateAccountRequest = {
        ...values,
      };
      if (accountType === "manager") {
        delete (requestData as any).phone_number;
        delete (requestData as any).address;
      } else if (accountType === "customer") {
        delete (requestData as any).role_id;
      }

      await updateAccount(account.id, requestData);
      showNotification("Cập nhật tài khoản thành công!", "success");
      onSuccess();
    } catch (err: any) {
      console.error("Failed to update account:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Lỗi không xác định khi cập nhật tài khoản.";
      setError(errorMessage);
      showNotification(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      title={`Chỉnh sửa Tài khoản: ${account?.full_name || ""}`}
      open={visible}
      onCancel={handleCancel}
      width={600}
      confirmLoading={loading}
      footer={[
        <Button key="back" onClick={handleCancel} disabled={loading}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={() => form.submit()}
        >
          Lưu thay đổi
        </Button>,
      ]}
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

          <Form.Item label="Loại tài khoản">
            <Input
              value={accountType === "manager" ? "Quản trị viên" : "Khách hàng"}
              disabled
            />
          </Form.Item>

          {accountType === "manager" && (
            <Form.Item
              name="role_id"
              label="Vai trò"
              rules={[{ required: true, message: "Vui lòng chọn vai trò!" }]}
            >
              <Select placeholder="Chọn vai trò" loading={!roles.length}>
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

          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true }]}
          >
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

export default EditAccountModal;
