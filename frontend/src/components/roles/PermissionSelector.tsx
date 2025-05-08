import React, { useState, useEffect } from "react";
import { Transfer, Spin } from "antd";
import type { TransferDirection } from "antd/es/transfer";
import permissionService from "../../services/permissionService";
import { PermissionResponse } from "../../api/types";
import { useNotification } from "../../context/NotificationContext";

interface PermissionSelectorProps {
  value?: number[]; // Selected permission IDs (controlled by Form.Item)
  onChange?: (targetKeys: number[]) => void; // Function to call when selection changes
}

interface PermissionRecord {
  key: string;
  title: string;
  description?: string; // Optional description if available
}

const PermissionSelector: React.FC<PermissionSelectorProps> = ({
  value = [], // Default to empty array if no value provided
  onChange,
}) => {
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [targetKeys, setTargetKeys] = useState<string[]>(value.map(String)); // Transfer uses string keys
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchPermissions = async () => {
      setLoading(true);
      try {
        const fetchedData = await permissionService.getPermissions();
        const formattedPermissions: PermissionRecord[] = fetchedData.map(
          (p: PermissionResponse) => ({
            key: String(p.id),
            title: p.name,
            // description: `Permission ID: ${p.id}` // Example description
          })
        );
        setPermissions(formattedPermissions);
      } catch (error: any) {
        showNotification(
          `Lỗi tải danh sách permissions: ${error.message || error}`,
          "error"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [showNotification]);

  // Update internal state when the value prop changes (e.g., when Form resets or loads data)
  useEffect(() => {
    setTargetKeys(Array.isArray(value) ? value.map(String) : []);
  }, [value]);

  const handleChange = (
    newTargetKeys: React.Key[],
    direction: TransferDirection,
    moveKeys: React.Key[]
  ) => {
    const stringTargetKeys = newTargetKeys.map(String);
    setTargetKeys(stringTargetKeys);
    // Convert back to number array for the Form.Item value
    if (onChange) {
      onChange(stringTargetKeys.map(Number));
    }
  };

  if (loading) {
    return <Spin tip="Đang tải permissions..." />;
  }

  return (
    <Transfer
      dataSource={permissions}
      targetKeys={targetKeys}
      onChange={handleChange}
      render={(item) => item.title}
      titles={["Quyền chưa gán", "Quyền đã gán"]}
      listStyle={{
        width: "100%",
        height: 300,
      }}
      showSearch={{ placeholder: "Tìm kiếm quyền..." }}
    />
  );
};

export default PermissionSelector;
