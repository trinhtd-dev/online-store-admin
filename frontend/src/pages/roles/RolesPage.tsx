import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  Button,
  Space,
  Typography,
  Modal,
  Tag,
  Input,
  Popconfirm,
  Card,
  Row,
  Col,
  Tooltip,
} from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import roleService from "../../services/roleService";
import { RoleResponse } from "../../api/types";
import CreateRoleModal from "../../components/roles/CreateRoleModal";
import EditRoleModal from "../../components/roles/EditRoleModal";
// Import các component chung
import {
  PageHeader,
  ActionButtons,
  LoadingIndicator,
} from "../../components/common";
import { useNotification } from "../../context/NotificationContext";

const { Title } = Typography;
const { Search } = Input;

// Styles cho bảng
const tableStyles = `
  .data-table .ant-table-cell {
    white-space: normal !important;
    word-break: break-word;
    vertical-align: middle;
  }
  
  .data-table .ant-table-thead > tr > th {
    text-align: center;
    padding: 8px;
  }
  
  .data-table .ant-table-tbody > tr > td {
    padding: 8px;
  }
  
  .ellipsis-cell {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
`;

// Updated to use lowercase keys to match potential API response
const statusColors: { [key: string]: string } = {
  active: "success", // Was "Active": "green" or "success"
  inactive: "warning", // Was "Inactive": "red" or "warning"
};

const statusText: { [key: string]: string } = {
  active: "Hoạt động",
  inactive: "Không hoạt động",
};

const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isCreateModalVisible, setIsCreateModalVisible] =
    useState<boolean>(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [editingRole, setEditingRole] = useState<RoleResponse | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const { showNotification } = useNotification();

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedRoles = await roleService.getRoles();
      setRoles(fetchedRoles);
    } catch (error: any) {
      showNotification(
        `Lỗi tải danh sách roles: ${error.message || error}`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const filteredRoles = useMemo(() => {
    if (!searchText) {
      return roles;
    }
    return roles.filter((role) =>
      role.name.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [roles, searchText]);

  const handleShowCreateModal = () => {
    setIsCreateModalVisible(true);
  };

  const handleShowEditModal = (role: RoleResponse) => {
    setEditingRole(role);
    setIsEditModalVisible(true);
  };

  const handleModalClose = () => {
    setIsCreateModalVisible(false);
    setIsEditModalVisible(false);
    setEditingRole(null);
    fetchRoles();
  };

  const handleDeleteRole = async (roleId: number) => {
    setLoading(true);
    try {
      await roleService.deleteRole(roleId);
      showNotification("Role đã được xóa thành công", "success");
      fetchRoles();
    } catch (error: any) {
      console.error("Delete error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Đã xảy ra lỗi khi xóa role";
      showNotification(`Lỗi xóa role: ${errorMessage}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Render cột có tooltip và ellipsis
  const renderWithTooltip = (text: string) => {
    if (!text) return "—";
    return (
      <Tooltip title={text}>
        <div className="ellipsis-cell">{text}</div>
      </Tooltip>
    );
  };

  const columns: ColumnsType<RoleResponse> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      sorter: (a, b) => a.id - b.id,
      width: 60,
      align: "center",
    },
    {
      title: "Tên Role",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      width: "60%",
      render: (text) => renderWithTooltip(text),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => {
        // console.log("Role Status from API:", status);
        const lowerStatus =
          typeof status === "string" ? status.toLowerCase() : "";
        return (
          <Tag color={statusColors[lowerStatus] || "default"}>
            {statusText[lowerStatus] || status}
          </Tag>
        );
      },
      filters: [
        { text: "Hoạt động", value: "active" }, // Value changed to lowercase
        { text: "Không hoạt động", value: "inactive" }, // Value changed to lowercase
      ],
      onFilter: (value, record) => {
        const recordStatus =
          typeof record.status === "string" ? record.status.toLowerCase() : "";
        return recordStatus === value;
      },
      align: "center",
    },
    {
      title: "Hành động",
      key: "action",
      width: 100,
      align: "center",
      render: (_, record) => (
        <ActionButtons
          onEdit={() => handleShowEditModal(record)}
          onDelete={() => handleDeleteRole(record.id)}
          deleteConfirmTitle={`Bạn có chắc muốn xóa role "${record.name}"? Thao tác này không thể hoàn tác.`}
          itemName={record.name}
          editText="Sửa"
          deleteText="Xóa"
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Quản lý Roles"
        onAdd={handleShowCreateModal}
        addButtonText="Thêm Role mới"
      />

      <Card style={{ marginBottom: 16 }}>
        <Row>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Search
              placeholder="Tìm kiếm theo tên role..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: "100%" }}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={filteredRoles}
        rowKey="id"
        loading={{ spinning: loading, indicator: <LoadingIndicator /> }}
        bordered
        size="middle"
        className="data-table"
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `Tổng cộng ${total} roles`,
          pageSizeOptions: ["10", "20", "50"],
        }}
        scroll={{ x: "500px" }}
      />

      {/* Styles cho bảng */}
      <style>{tableStyles}</style>

      <CreateRoleModal
        visible={isCreateModalVisible}
        onClose={handleModalClose}
      />

      <EditRoleModal
        visible={isEditModalVisible}
        role={editingRole}
        onClose={handleModalClose}
      />
    </>
  );
};

export default RolesPage;
