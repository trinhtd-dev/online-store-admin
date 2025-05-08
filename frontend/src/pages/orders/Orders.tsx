import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Input,
  Select,
  Tag,
  Button,
  Space,
  Typography,
  message,
  Row,
  Col,
  Card,
  Tooltip,
  Modal,
} from "antd";
import type { TableProps, TablePaginationConfig } from "antd";
import type { SorterResult } from "antd/es/table/interface";
import { useDebounce } from "use-debounce";
import { useNavigate } from "react-router-dom";
import { EyeOutlined, EditOutlined } from "@ant-design/icons";

import * as orderService from "../../services/orderService";
import {
  OrderResponse,
  GetOrdersParams,
  GetOrdersResponse,
} from "../../api/types";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";

// Import các component chung
import {
  PageHeader,
  ActionButtons,
  LoadingIndicator,
} from "../../components/common";

const { Title } = Typography;
const { Option } = Select;
const { Search } = Input;

// Order Statuses from database/backend
const ORDER_STATUSES = [
  "Pending",
  "Processing",
  "Completed",
  "Cancelled",
  "Rejected",
];
// Payment Statuses from database/backend
const PAYMENT_STATUSES = ["Pending", "Paid", "Refunded", "Partially Paid"];

// Tiếng Việt cho các trạng thái
const ORDER_STATUS_VI = {
  Pending: "Chờ xử lý",
  Processing: "Đang xử lý",
  Completed: "Hoàn thành",
  Cancelled: "Đã hủy",
  Rejected: "Từ chối",
};

const PAYMENT_STATUS_VI = {
  Pending: "Chờ thanh toán",
  Paid: "Đã thanh toán",
  Refunded: "Đã hoàn tiền",
  "Partially Paid": "Thanh toán một phần",
};

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
`;

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ["10", "20", "50"],
    showTotal: (total, range) =>
      `${range[0]}-${range[1]} của ${total} đơn hàng`,
  });
  const [sortInfo, setSortInfo] = useState<SorterResult<OrderResponse>>({
    field: "order_date", // Default sort field
    order: "descend", // Default sort order
  });
  const [filters, setFilters] = useState<{
    status?: string[];
    payment_status?: string[];
  }>({});
  const [searchText, setSearchText] = useState<string>("");
  const [debouncedSearchText] = useDebounce(searchText, 500);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  // State for inline status update modal
  const [isUpdateStatusModalVisible, setIsUpdateStatusModalVisible] =
    useState(false);
  const [updatingOrder, setUpdatingOrder] = useState<OrderResponse | null>(
    null
  );
  const [selectedNewStatusForList, setSelectedNewStatusForList] = useState<
    string | null
  >(null);
  const [updateReasonForList, setUpdateReasonForList] = useState<string>("");
  const [updateStatusLoadingForList, setUpdateStatusLoadingForList] =
    useState(false);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "processing":
        return "blue";
      case "completed":
        return "green";
      case "cancelled":
      case "rejected":
        return "red";
      case "pending":
        return "orange";
      case "paid":
        return "success";
      case "refunded":
        return "magenta";
      case "partially paid":
        return "warning";
      default:
        return "default";
    }
  };

  const fetchOrders = useCallback(
    async (params: GetOrdersParams) => {
      setLoading(true);
      try {
        const response: GetOrdersResponse = await orderService.getAllOrders(
          params
        );
        setOrders(response.orders);
        setPagination((prev) => ({
          ...prev,
          total: response.totalCount,
          current: response.currentPage,
          pageSize: response.pageSize,
        }));
      } catch (error: any) {
        showNotification(
          `Không thể tải danh sách đơn hàng: ${
            error.response?.data?.message || error.message
          }`,
          "error"
        );
        console.error("Failed to fetch orders:", error);
      } finally {
        setLoading(false);
      }
    },
    [showNotification]
  );

  useEffect(() => {
    const params: GetOrdersParams = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      search: debouncedSearchText || undefined,
      // Ensure field is a string key of OrderResponse or a valid custom key
      sortBy:
        typeof sortInfo.field === "string" ? sortInfo.field : "order_date",
      sortOrder:
        sortInfo.order === "ascend"
          ? "asc"
          : sortInfo.order === "descend"
          ? "desc"
          : undefined,
      status: filters.status?.join(","), // Backend expects comma-separated string
      paymentStatus: filters.payment_status?.join(","), // Backend expects comma-separated string
    };
    fetchOrders(params);
  }, [
    fetchOrders,
    pagination.current,
    pagination.pageSize,
    debouncedSearchText,
    sortInfo,
    filters,
  ]);

  const handleTableChange: TableProps<OrderResponse>["onChange"] = (
    newPagination,
    newFilters, // Table filters (we use external Selects, but could use this)
    newSorter
  ) => {
    const sorter = newSorter as SorterResult<OrderResponse>;

    // Update pagination state (current, pageSize)
    // total is updated via fetchOrders response
    setPagination({
      ...pagination, // Keep existing total and pageSizeOptions
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });

    // Update sorting state
    setSortInfo({
      field: sorter.field,
      order: sorter.order,
    });

    // No need to call fetchOrders here, useEffect handles it
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    // Reset pagination to first page when search text changes
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleStatusFilterChange = (value: string[]) => {
    setFilters((prev) => ({ ...prev, status: value }));
    setPagination((prev) => ({ ...prev, current: 1 })); // Reset page on filter change
  };

  const handlePaymentStatusFilterChange = (value: string[]) => {
    setFilters((prev) => ({ ...prev, payment_status: value }));
    setPagination((prev) => ({ ...prev, current: 1 })); // Reset page on filter change
  };

  // Định dạng ngày tháng với định dạng Việt Nam
  const formatDate = (date: string) => {
    if (!date) return "N/A";
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Handlers for inline status update modal
  const showUpdateStatusModal = (order: OrderResponse, newStatus: string) => {
    setUpdatingOrder(order);
    setSelectedNewStatusForList(newStatus);
    setUpdateReasonForList(""); // Reset reason
    setIsUpdateStatusModalVisible(true);
  };

  const handleUpdateStatusCancel = () => {
    setIsUpdateStatusModalVisible(false);
    setUpdatingOrder(null);
    setSelectedNewStatusForList(null);
  };

  const handleConfirmUpdateStatus = async () => {
    if (!updatingOrder || !selectedNewStatusForList) return;

    setUpdateStatusLoadingForList(true);
    try {
      await orderService.updateOrderStatus(
        updatingOrder.id,
        selectedNewStatusForList,
        updateReasonForList
      );
      showNotification(
        `Trạng thái đơn hàng #${updatingOrder.id} đã được cập nhật.`,
        "success"
      );
      setIsUpdateStatusModalVisible(false);
      // Refetch orders to reflect the change
      // fetchOrders will be triggered by one of its dependencies changing if we reset pagination or filters
      // Or call it directly: (ensure fetchOrders has its params correctly derived or passed)
      const currentParams: GetOrdersParams = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        search: debouncedSearchText || undefined,
        sortBy:
          typeof sortInfo.field === "string" ? sortInfo.field : "order_date",
        sortOrder:
          sortInfo.order === "ascend"
            ? "asc"
            : sortInfo.order === "descend"
            ? "desc"
            : undefined,
        status: filters.status?.join(","),
        paymentStatus: filters.payment_status?.join(","),
      };
      fetchOrders(currentParams); // Explicitly call fetch to refresh the list
    } catch (err: any) {
      console.error("Failed to update order status from list:", err);
      showNotification(
        err.response?.data?.message ||
          err.message ||
          "Lỗi khi cập nhật trạng thái đơn hàng.",
        "error"
      );
    } finally {
      setUpdateStatusLoadingForList(false);
      setUpdatingOrder(null);
      setSelectedNewStatusForList(null);
    }
  };

  const columns: TableProps<OrderResponse>["columns"] = [
    {
      title: "Mã ĐH",
      dataIndex: "id",
      key: "id",
      sorter: true,
      width: 80,
      align: "center",
    },
    {
      title: "Khách hàng",
      dataIndex: "customer_name",
      key: "customer_name",
      sorter: true,
      width: "20%",
      render: (name) => {
        if (!name) return "N/A";
        return (
          <Tooltip title={name}>
            <div
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                wordBreak: "break-word",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {name}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: "Ngày đặt",
      dataIndex: "order_date",
      key: "order_date",
      sorter: true,
      width: 110,
      render: (date) => formatDate(date),
    },
    {
      title: "Tổng tiền",
      dataIndex: "payment_amount",
      key: "payment_amount",
      sorter: true,
      width: 140,
      render: (amount) =>
        amount != null ? `${amount.toLocaleString("vi-VN")} đ` : "N/A",
      align: "right",
    },
    {
      title: "Trạng thái đơn",
      dataIndex: "status",
      key: "status",
      sorter: true,
      width: 150,
      render: (status: string, record: OrderResponse) => (
        <Tag color={getStatusColor(status)} key={status}>
          {ORDER_STATUS_VI[status as keyof typeof ORDER_STATUS_VI] ||
            status ||
            "N/A"}
        </Tag>
      ),
    },
    {
      title: "Trạng thái TT",
      dataIndex: "payment_status",
      key: "payment_status",
      sorter: true,
      width: 140,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} key={status}>
          {PAYMENT_STATUS_VI[status as keyof typeof PAYMENT_STATUS_VI] ||
            status ||
            "N/A"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 150,
      align: "center",
      render: (_, record: OrderResponse) => {
        const isOrderStatusFinal =
          record.status === "Completed" || record.status === "Cancelled";
        const canUpdate = user?.role === "admin" || !isOrderStatusFinal;
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/orders/${record.id}`)}
            >
              Chi tiết
            </Button>
            {user?.role && ["admin", "manager"].includes(user.role) && (
              <Tooltip title="Cập nhật trạng thái">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => showUpdateStatusModal(record, record.status)}
                  disabled={!canUpdate || loading || updateStatusLoadingForList}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
      fixed: "right",
    },
  ];

  return (
    <div>
      <PageHeader title="Quản lý Đơn hàng" />

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Search
              placeholder="Tìm kiếm đơn hàng (ID, Khách hàng...)"
              value={searchText}
              onChange={handleSearch}
              allowClear
              style={{ width: "100%" }}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              mode="multiple"
              allowClear
              style={{ width: "100%" }}
              placeholder="Lọc theo trạng thái đơn"
              onChange={handleStatusFilterChange}
              value={filters.status}
              maxTagCount="responsive"
            >
              {ORDER_STATUSES.map((status) => (
                <Option key={status} value={status}>
                  {ORDER_STATUS_VI[status as keyof typeof ORDER_STATUS_VI] ||
                    status}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              mode="multiple"
              allowClear
              style={{ width: "100%" }}
              placeholder="Lọc theo trạng thái thanh toán"
              onChange={handlePaymentStatusFilterChange}
              value={filters.payment_status}
              maxTagCount="responsive"
            >
              {PAYMENT_STATUSES.map((status) => (
                <Option key={status} value={status}>
                  {PAYMENT_STATUS_VI[
                    status as keyof typeof PAYMENT_STATUS_VI
                  ] || status}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      <Table<OrderResponse>
        columns={columns}
        rowKey="id"
        dataSource={orders}
        pagination={pagination}
        loading={{
          spinning: loading || updateStatusLoadingForList,
          indicator: <LoadingIndicator />,
        }}
        onChange={handleTableChange}
        scroll={{ x: "max-content" }}
        bordered
        size="middle"
        className="data-table"
      />

      <style>{tableStyles}</style>

      <Modal
        title={`Cập nhật trạng thái ĐH #${updatingOrder?.id}`}
        visible={isUpdateStatusModalVisible}
        onCancel={handleUpdateStatusCancel}
        onOk={handleConfirmUpdateStatus}
        confirmLoading={updateStatusLoadingForList}
        okText="Xác nhận"
        cancelText="Hủy"
      >
        <p>
          Bạn có chắc chắn muốn cập nhật trạng thái đơn hàng từ
          <strong>
            {" "}
            {updatingOrder?.status
              ? ORDER_STATUS_VI[
                  updatingOrder.status as keyof typeof ORDER_STATUS_VI
                ] || updatingOrder.status
              : ""}{" "}
          </strong>
          thành
          <strong>
            {" "}
            {selectedNewStatusForList
              ? ORDER_STATUS_VI[
                  selectedNewStatusForList as keyof typeof ORDER_STATUS_VI
                ] || selectedNewStatusForList
              : ""}
          </strong>
          ?
        </p>
        <Select
          value={selectedNewStatusForList}
          onChange={(value) => setSelectedNewStatusForList(value)}
          style={{ width: "100%", marginBottom: 10 }}
          disabled={updateStatusLoadingForList}
        >
          {ORDER_STATUSES.map((statusKey) => (
            <Option key={statusKey} value={statusKey}>
              {ORDER_STATUS_VI[statusKey as keyof typeof ORDER_STATUS_VI] ||
                statusKey}
            </Option>
          ))}
        </Select>
        <Input.TextArea
          rows={3}
          value={updateReasonForList}
          onChange={(e) => setUpdateReasonForList(e.target.value)}
          placeholder="Nhập lý do cập nhật (tùy chọn)"
        />
      </Modal>
    </div>
  );
};

export default Orders;
