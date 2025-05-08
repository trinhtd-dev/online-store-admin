import React, { useState } from "react";
import { Modal, Form } from "antd";
import RoleForm from "./RoleForm";
import PermissionSelector from "./PermissionSelector";
import roleService from "../../services/roleService";
import { CreateRoleRequest } from "../../api/types";
import { useNotification } from "../../context/NotificationContext";

interface CreateRoleModalProps {
  visible: boolean;
  onClose: () => void;
}

const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  visible,
  onClose,
}) => {
  const [form] = Form.useForm<CreateRoleRequest>();
  const [loading, setLoading] = useState<boolean>(false);
  const { showNotification } = useNotification();

  const handleCreateRole = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await roleService.createRole(values); // values should match CreateRoleRequest
      showNotification("Role đã được tạo thành công!", "success");
      form.resetFields();
      onClose(); // Close modal and trigger refetch in RolesPage
    } catch (error: any) {
      console.error("Create role error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Đã xảy ra lỗi khi tạo role";
      showNotification(`Lỗi tạo role: ${errorMessage}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Tạo Role mới"
      visible={visible}
      onOk={handleCreateRole}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Tạo"
      cancelText="Hủy"
      width={600} // Adjust width as needed
      destroyOnClose // Reset form state when modal is closed
    >
      <RoleForm form={form} />
      <Form form={form} layout="vertical">
        <Form.Item name="permissionIds" label="Chọn Permissions">
          <PermissionSelector />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateRoleModal;
