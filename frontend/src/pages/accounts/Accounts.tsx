import React, { useState, useEffect, useRef } from "react";
import {
  Table,
  Input,
  Button,
  Space,
  Modal,
  message,
  Tag,
  Select,
  Row,
  Col,
  Typography,
  Popconfirm,
  Tabs,
  Card,
  Tooltip,
} from "antd";
import type { TableProps, TablePaginationConfig } from "antd";
import type { FilterValue, SorterResult } from "antd/es/table/interface";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import debounce from "lodash/debounce";
import {
  getAllAccounts,
  deleteAccount,
  getAllRoles,
} from "../../services/accountService";
import {
  AccountResponse,
  GetAccountsParams,
  RoleResponse,
  AccountStatus,
  AccountType,
} from "../../api/types";
import AddAccountModal from "../../components/accounts/AddAccountModal";
import EditAccountModal from "../../components/accounts/EditAccountModal";
// Import các component chung
import {
  PageHeader,
  ActionButtons,
  LoadingIndicator,
} from "../../components/common";
import { useNotification } from "../../context/NotificationContext";

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

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
  
  .multiline-ellipsis {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

type ActiveView = "manager" | "customer";

const Accounts: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<ActiveView>("manager");
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ["10", "20", "50"],
    showTotal: (total, range) =>
      `${range[0]}-${range[1]} của ${total} tài khoản`,
  });
  const [sortInfo, setSortInfo] = useState<{
    field: GetAccountsParams["sortBy"] | null;
    order: "ascend" | "descend" | null;
  }>({ field: "id", order: "ascend" });
  const [filters, setFilters] = useState<{
    status?: AccountStatus;
    role_id?: number;
  }>({});

  // State for the input value
  const [searchText, setSearchText] = useState<string>("");
  // State for the final query value used in API calls
  const [finalSearchQuery, setFinalSearchQuery] = useState<string>("");

  // State for Modals
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountResponse | null>(
    null
  );

  const { showNotification } = useNotification();

  // --- Debounce Logic ---
  // useRef to hold the debounced function
  const debouncedSetFinalQuery = useRef(
    debounce((value: string) => {
      setFinalSearchQuery(value);
      // Reset to page 1 when the final search query changes
      setPagination((prev) => ({ ...prev, current: 1 }));
    }, 500) // 500ms delay
  ).current; // .current gets the function

  // Update searchText and trigger debounce on input change
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value); // Update input value immediately
    debouncedSetFinalQuery(value); // Schedule final query update
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSetFinalQuery.cancel();
    };
  }, [debouncedSetFinalQuery]);
  // --- End Debounce Logic ---

  // Fetch Roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const fetchedRoles = await getAllRoles();
        setRoles(fetchedRoles);
      } catch (error) {
        showNotification("Không thể tải danh sách vai trò", "error");
      }
    };
    fetchRoles();
  }, [showNotification]);

  // Reset state and cancel debounce on tab change
  useEffect(() => {
    setFilters({});
    setSearchText(""); // Clear the input field
    setFinalSearchQuery(""); // Clear the query used for API immediately
    debouncedSetFinalQuery.cancel(); // Cancel any pending debounce
    setPagination((prev) => ({ ...prev, current: 1, total: 0 }));
    setSortInfo({ field: "id", order: "ascend" });
  }, [activeView]);

  // Fetch data based on finalSearchQuery and other states
  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true);
      try {
        const params: GetAccountsParams = {
          page: pagination.current ?? 1,
          pageSize: pagination.pageSize ?? 10,
          search: finalSearchQuery || undefined, // Use finalSearchQuery
          status: filters.status,
          type: activeView,
          role_id: activeView === "manager" ? filters.role_id : undefined,
          sortBy: sortInfo.field || "id",
          sortOrder: sortInfo.order
            ? sortInfo.order === "ascend"
              ? "asc"
              : "desc"
            : "asc",
        };
        const data = await getAllAccounts(params);
        setAccounts(data.accounts);
        setPagination((prev) => ({
          ...prev,
          total: data.totalCount,
          current: data.currentPage ?? 1,
          pageSize: data.pageSize ?? 10,
        }));
      } catch (error) {
        console.error(`Failed to fetch ${activeView}s:`, error);
        showNotification(
          `Không thể tải danh sách ${
            activeView === "manager" ? "quản trị viên" : "khách hàng"
          }`,
          "error"
        );
        setAccounts([]);
        setPagination((prev) => ({ ...prev, total: 0, current: 1 }));
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [
    pagination.current,
    pagination.pageSize,
    finalSearchQuery,
    filters,
    sortInfo,
    activeView,
    showNotification,
  ]);

  // Table Change Handler
  const handleTableChange: TableProps<AccountResponse>["onChange"] = (
    newPagination,
    tableFilters,
    sorter
  ) => {
    const currentSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    const validSortKeys: ReadonlyArray<
      NonNullable<GetAccountsParams["sortBy"]>
    > = ["id", "full_name", "email", "status", "created_at", "role"];
    let newSortField: GetAccountsParams["sortBy"] | null = "id";
    let requestedSortField = currentSorter.field;

    if (requestedSortField === "role_name") {
      // Map frontend key to backend key
      requestedSortField = "role";
    }

    if (
      typeof requestedSortField === "string" &&
      (validSortKeys as ReadonlyArray<string>).includes(requestedSortField)
    ) {
      newSortField = requestedSortField as NonNullable<
        GetAccountsParams["sortBy"]
      >;
    } else {
      console.warn("Invalid or unhandled sort field:", currentSorter.field);
      newSortField = "id";
    }

    setSortInfo({
      field: newSortField,
      order: currentSorter.order || null,
    });

    // Update pagination with AntD's new pagination object, which has the user-selected values
    setPagination((prev) => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));

    // API fetching is triggered via useEffect dependencies
  };

  const handleFilterChange = (
    filterName: keyof typeof filters,
    value: string | number | undefined
  ) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  // CRUD Handlers
  const handleAdd = () => {
    setIsAddModalVisible(true);
  };

  const handleEdit = (record: AccountResponse) => {
    setEditingAccount(record);
    setIsEditModalVisible(true);
  };

  // Function to trigger refetch manually
  const triggerRefetch = async (goToFirstPage = false) => {
    const nextPage = goToFirstPage ? 1 : pagination.current;
    setPagination((prev) => ({ ...prev, current: nextPage }));

    setLoading(true);
    try {
      const params: GetAccountsParams = {
        page: nextPage,
        pageSize: pagination.pageSize,
        search: finalSearchQuery || undefined,
        status: filters.status,
        type: activeView,
        role_id: activeView === "manager" ? filters.role_id : undefined,
        sortBy: sortInfo.field || "id",
        sortOrder: sortInfo.order
          ? sortInfo.order === "ascend"
            ? "asc"
            : "desc"
          : "asc",
      };
      const data = await getAllAccounts(params);
      setAccounts(data.accounts);
      setPagination((prev) => ({
        ...prev,
        total: data.totalCount,
        current: data.currentPage ?? 1,
        pageSize: data.pageSize ?? 10,
      }));
    } catch (error) {
      console.error(`Failed to refetch ${activeView}s:`, error);
      showNotification(`Không thể làm mới dữ liệu`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setLoading(true);
    try {
      await deleteAccount(id);
      showNotification("Xóa tài khoản thành công", "success");
      const currentPage = pagination.current ?? 1;
      const goToPreviousPage = accounts.length === 1 && currentPage > 1;
      await triggerRefetch(goToPreviousPage);
    } catch (error: any) {
      console.error("Delete error:", error);
      showNotification(
        error.response?.data?.message || "Không thể xóa tài khoản",
        "error"
      );
      setLoading(false); // Ensure loading stops on error
    }
  };

  // Định dạng ngày tháng
  const formatDate = (date: string | null | undefined) => {
    if (!date) return "N/A";
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Render cột có tooltip và ellipsis
  const renderWithTooltip = (text: string | null | undefined, maxLines = 1) => {
    if (!text) return "-";
    return (
      <Tooltip title={text}>
        <div
          className={maxLines > 1 ? "multiline-ellipsis" : "ellipsis-cell"}
          style={{ WebkitLineClamp: maxLines }}
        >
          {text}
        </div>
      </Tooltip>
    );
  };

  // --- Define Table Columns --- //
  const commonColumns: TableProps<AccountResponse>["columns"] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      sorter: true,
      width: 70,
      align: "center",
    },
    {
      title: "Họ và tên",
      dataIndex: "full_name",
      key: "full_name",
      sorter: true,
      width: "20%",
      render: (text) => renderWithTooltip(text, 2),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      sorter: true,
      width: "25%",
      render: (text) => renderWithTooltip(text),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      sorter: true,
      width: 110,
      align: "center",
      render: (status: AccountStatus) => {
        // console.log("Account Status from API:", status);
        let color;
        let text;
        // Assuming status from API might be lowercase, e.g., "active", "inactive", "banned"
        const lowerStatus =
          typeof status === "string" ? status.toLowerCase() : "";

        switch (lowerStatus) {
          case "active": // Changed from "Active"
            color = "success";
            text = "Hoạt động";
            break;
          case "inactive": // Changed from "Inactive"
            color = "warning";
            text = "Không hoạt động";
            break;
          case "banned": // Changed from "Banned"
            color = "error";
            text = "Bị cấm";
            break;
          default:
            color = "default";
            text = status; // Show original status if not matched
        }
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      sorter: true,
      width: 120,
      render: formatDate,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      fixed: "right",
      align: "center",
      render: (_, record) => (
        <ActionButtons
          onEdit={() => handleEdit(record)}
          onDelete={() => handleDelete(record.id)}
          deleteConfirmTitle="Bạn có chắc muốn xóa tài khoản"
          itemName={record.full_name}
          editText="Sửa"
          deleteText="Xóa"
        />
      ),
    },
  ];

  const managerColumns: TableProps<AccountResponse>["columns"] = [
    ...commonColumns.filter(
      (col) => col.key !== "actions" && col.key !== "status"
    ),
    {
      title: "Vai trò",
      dataIndex: "role_name",
      key: "role_name",
      sorter: true,
      render: (role: string | undefined) => renderWithTooltip(role || "N/A"),
      width: 150,
    },
    commonColumns.find((col) => col.key === "status")!,
    commonColumns.find((col) => col.key === "actions")!,
  ].filter(Boolean); // Filter out undefined results from .find

  const customerColumns: TableProps<AccountResponse>["columns"] = [
    ...commonColumns.filter((col) => col.key !== "actions"),
    {
      title: "Số điện thoại",
      dataIndex: "phone_number",
      key: "phone_number",
      render: (phone: string | null | undefined) => phone || "-",
      width: 130,
    },
    {
      title: "Địa chỉ",
      dataIndex: "address",
      key: "address",
      render: (address: string | null | undefined) =>
        renderWithTooltip(address, 2),
      width: "20%",
    },
    commonColumns.find((col) => col.key === "actions")!,
  ].filter(Boolean); // Filter out undefined results from .find

  const handleTabChange = (key: string) => {
    setActiveView(key as ActiveView);
  };

  return (
    <div>
      <PageHeader
        title="Quản lý Tài khoản"
        onAdd={handleAdd}
        addButtonText="Thêm Tài khoản"
      />

      <Tabs
        defaultActiveKey="manager"
        onChange={handleTabChange}
        destroyInactiveTabPane
      >
        <TabPane tab="Quản trị viên" key="manager">
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Search
                  placeholder="Tìm kiếm quản trị viên..."
                  onChange={handleSearchInputChange}
                  allowClear
                  style={{ width: "100%" }}
                  value={searchText}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Select
                  placeholder="Lọc theo trạng thái"
                  allowClear
                  style={{ width: "100%" }}
                  onChange={(value) => handleFilterChange("status", value)}
                  value={filters.status}
                >
                  <Option value="Active">Hoạt động</Option>
                  <Option value="Inactive">Ngừng hoạt động</Option>
                  <Option value="Banned">Cấm</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Select
                  placeholder="Lọc theo vai trò"
                  allowClear
                  style={{ width: "100%" }}
                  onChange={(value) => handleFilterChange("role_id", value)}
                  value={filters.role_id}
                  loading={!roles.length}
                >
                  {roles.map((role) => (
                    <Option key={role.id} value={role.id}>
                      {role.name}
                    </Option>
                  ))}
                </Select>
              </Col>
            </Row>
          </Card>
          <Table
            columns={managerColumns}
            dataSource={accounts}
            rowKey="id"
            loading={{ spinning: loading, indicator: <LoadingIndicator /> }}
            pagination={pagination}
            onChange={handleTableChange}
            scroll={{ x: "800px" }}
            className="data-table"
            bordered
            size="middle"
          />
        </TabPane>
        <TabPane tab="Khách hàng" key="customer">
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={12}>
                <Search
                  placeholder="Tìm kiếm khách hàng..."
                  onChange={handleSearchInputChange}
                  allowClear
                  style={{ width: "100%" }}
                  value={searchText}
                />
              </Col>
              <Col xs={24} sm={12} md={12}>
                <Select
                  placeholder="Lọc theo trạng thái"
                  allowClear
                  style={{ width: "100%" }}
                  onChange={(value) => handleFilterChange("status", value)}
                  value={filters.status}
                >
                  <Option value="Active">Hoạt động</Option>
                  <Option value="Inactive">Ngừng hoạt động</Option>
                  <Option value="Banned">Cấm</Option>
                </Select>
              </Col>
            </Row>
          </Card>
          <Table
            columns={customerColumns}
            dataSource={accounts}
            rowKey="id"
            loading={{ spinning: loading, indicator: <LoadingIndicator /> }}
            pagination={pagination}
            onChange={handleTableChange}
            scroll={{ x: "800px" }}
            className="data-table"
            bordered
            size="middle"
          />
        </TabPane>
      </Tabs>

      <AddAccountModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onSuccess={() => {
          setIsAddModalVisible(false);
          triggerRefetch(true); // Go to first page after adding
        }}
        roles={roles}
      />
      {editingAccount && (
        <EditAccountModal
          visible={isEditModalVisible}
          onClose={() => {
            setIsEditModalVisible(false);
            setEditingAccount(null);
          }}
          onSuccess={() => {
            setIsEditModalVisible(false);
            setEditingAccount(null);
            triggerRefetch(); // Refetch current page after editing
          }}
          account={editingAccount}
          roles={roles}
        />
      )}

      {/* Thêm styles cho bảng */}
      <style>{tableStyles}</style>
    </div>
  );
};

export default Accounts;
