import React, { useState, useEffect } from "react";
import { Modal, Form, Spin } from "antd";
import RoleForm from "./RoleForm";
import PermissionSelector from "./PermissionSelector";
import roleService from "../../services/roleService";
import { RoleResponse, UpdateRoleRequest } from "../../api/types";
import { useNotification } from "../../context/NotificationContext";

interface EditRoleModalProps {
  visible: boolean;
  onClose: () => void;
  role: RoleResponse | null; // Pass the role to be edited
}

const EditRoleModal: React.FC<EditRoleModalProps> = ({
  visible,
  onClose,
  role,
}) => {
  const [form] = Form.useForm<UpdateRoleRequest>();
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingDetails, setFetchingDetails] = useState<boolean>(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    if (visible && role) {
      setFetchingDetails(true);
      // Fetch full details including permissions when modal opens
      roleService
        .getRoleById(role.id)
        .then((roleDetails) => {
          form.setFieldsValue({
            name: roleDetails.name,
            status: roleDetails.status,
            permissionIds: roleDetails.permissionIds || [],
          });
        })
        .catch((error) => {
          showNotification(
            `Lỗi tải chi tiết role: ${error.message || error}`,
            "error"
          );
          // Optionally close the modal if fetching details fails
          // onClose();
        })
        .finally(() => {
          setFetchingDetails(false);
        });
    } else if (!visible) {
      form.resetFields(); // Reset form when modal is hidden
    }
  }, [visible, role, form, showNotification]);

  const handleUpdateRole = async () => {
    if (!role) return;

    try {
      const values = await form.validateFields();
      setLoading(true);
      // Only send updated fields? Backend handles full replace for permissions
      await roleService.updateRole(role.id, values);
      showNotification("Role đã được cập nhật thành công!", "success");
      onClose(); // Close modal and trigger refetch
    } catch (error: any) {
      console.error("Update role error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Đã xảy ra lỗi khi cập nhật role";
      showNotification(`Lỗi cập nhật role: ${errorMessage}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      title={`Chỉnh sửa Role: ${role?.name || ""}`}
      visible={visible}
      onOk={handleUpdateRole}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Lưu thay đổi"
      cancelText="Hủy"
      width={600}
      destroyOnClose
      maskClosable={false} // Prevent closing by clicking outside while editing
    >
      {fetchingDetails ? (
        <Spin tip="Đang tải chi tiết role..."></Spin>
      ) : (
        <>
          {/* Pass form instance to RoleForm */}
          <RoleForm form={form} />
          {/* Use a separate Form instance linked to the same data for PermissionSelector */}
          <Form form={form} layout="vertical">
            <Form.Item name="permissionIds" label="Chọn Permissions">
              <PermissionSelector />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
};

export default EditRoleModal;
