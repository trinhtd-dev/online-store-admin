import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Typography,
  Descriptions,
  Table,
  Timeline,
  Alert,
  Card,
  Tag,
  Button,
  Row,
  Col,
  Space,
  Image,
  Empty,
  Modal,
  TableProps,
  Select,
  Input,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  TruckOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
} from "@ant-design/icons";
import * as orderService from "../../services/orderService";
import {
  OrderResponse,
  OrderItemResponse,
  OrderHistoryResponse,
} from "../../api/types";
import { DetailPageHeader, LoadingIndicator } from "../../components/common";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";

const { Title, Text } = Typography;
const { Option } = Select;

const ORDER_STATUSES = [
  "Pending",
  "Processing",
  "Completed",
  "Cancelled",
  "Rejected",
];
const ORDER_STATUS_VI: { [key: string]: string } = {
  Pending: "Chờ xử lý",
  Processing: "Đang xử lý",
  Completed: "Hoàn thành",
  Cancelled: "Đã hủy",
  Rejected: "Từ chối",
};

const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [isUpdateStatusModalVisible, setIsUpdateStatusModalVisible] =
    useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState<string | null>(
    null
  );
  const [updateReason, setUpdateReason] = useState<string>("");
  const [updateStatusLoading, setUpdateStatusLoading] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const id = parseInt(orderId, 10);
      if (isNaN(id)) {
        throw new Error("Mã đơn hàng không hợp lệ");
      }
      const data = await orderService.getOrderById(id);
      setOrder(data);
      setSelectedNewStatus(data.status);
    } catch (err: any) {
      console.error("Failed to fetch order details:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Không thể tải thông tin đơn hàng."
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleAction = async (
    actionFn: (id: number) => Promise<OrderResponse>,
    successMessage: string
  ) => {
    if (!order) return;
    setActionLoading(true);
    try {
      await actionFn(order.id);
      showNotification(successMessage, "success");
      await fetchOrder();
    } catch (err: any) {
      console.error("Order action failed:", err);
      showNotification(
        err.response?.data?.message || err.message || "Thao tác thất bại.",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsPaid = () => {
    handleAction(
      orderService.markOrderAsPaid,
      "Đơn hàng đã được đánh dấu là Đã thanh toán và đang xử lý."
    );
  };

  const handleMarkAsDelivered = () => {
    handleAction(
      orderService.markOrderAsDelivered,
      "Đơn hàng đã được đánh dấu là Đã giao hàng."
    );
  };

  const handleCancelOrder = () => {
    Modal.confirm({
      title: "Bạn có chắc chắn muốn hủy đơn hàng này không?",
      icon: <ExclamationCircleOutlined />,
      content: "Hành động này không thể hoàn tác.",
      okText: "Có, Hủy đơn hàng",
      okType: "danger",
      cancelText: "Không",
      onOk: () => {
        handleAction(
          orderService.cancelOrder,
          "Đơn hàng đã được hủy thành công."
        );
      },
    });
  };

  const getStatusColor = (status: string | undefined) => {
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

  const orderItemColumns: TableProps<OrderItemResponse>["columns"] = [
    {
      title: "Sản phẩm",
      key: "product",
      render: (_: any, item: OrderItemResponse) => {
        const imageUrl =
          item.product_image?.split("\n")[0]?.trim() ||
          "/placeholder-image.png";

        return (
          <Space>
            <Image
              width={50}
              src={imageUrl}
              alt={item.product_name || "Hình ảnh sản phẩm"}
              preview={false}
            />
            <Text>{item.product_name || "N/A"}</Text>
          </Space>
        );
      },
    },
    {
      title: "SKU",
      dataIndex: "variant_sku",
      key: "variant_sku",
      render: (sku: string | null | undefined) => sku || "N/A",
    },
    {
      title: "Đơn giá",
      dataIndex: "unit_price",
      key: "unit_price",
      render: (price: number | null | undefined) =>
        price?.toLocaleString("vi-VN") || "N/A",
      align: "right",
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
    },
    {
      title: "Thành tiền",
      key: "total",
      render: (_: any, item: OrderItemResponse) =>
        (item.unit_price * item.quantity)?.toLocaleString("vi-VN") || "N/A",
      align: "right",
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
    },
  ];

  const handleNewStatusChange = (value: string) => {
    setSelectedNewStatus(value);
  };

  const showUpdateStatusModal = () => {
    setUpdateReason("");
    setIsUpdateStatusModalVisible(true);
  };

  const handleUpdateStatusCancel = () => {
    setIsUpdateStatusModalVisible(false);
  };

  const handleConfirmUpdateStatus = async () => {
    if (!order || !selectedNewStatus) return;

    setUpdateStatusLoading(true);
    try {
      await orderService.updateOrderStatus(
        order.id,
        selectedNewStatus,
        updateReason
      );
      showNotification(
        "Trạng thái đơn hàng đã được cập nhật thành công!",
        "success"
      );
      setIsUpdateStatusModalVisible(false);
      await fetchOrder();
    } catch (err: any) {
      console.error("Failed to update order status:", err);
      showNotification(
        err.response?.data?.message ||
          err.message ||
          "Lỗi khi cập nhật trạng thái đơn hàng.",
        "error"
      );
    } finally {
      setUpdateStatusLoading(false);
    }
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  if (error) {
    return (
      <Alert
        message="Lỗi"
        description={error}
        type="error"
        showIcon
        action={
          <Button onClick={() => navigate(-1)} type="primary">
            Quay lại
          </Button>
        }
      />
    );
  }

  if (!order) {
    return <Empty description="Không tìm thấy đơn hàng." />;
  }

  const renderActionButtons = () => {
    if (!order) return null;

    const canMarkPaid =
      order.status === "Pending" && order.payment_status !== "Paid";
    const canDeliver =
      order.status === "Processing" && order.payment_status === "Paid";
    const canCancel =
      order.status !== "Completed" &&
      order.status !== "Cancelled" &&
      order.status !== "Rejected";

    const isOrderStatusFinal =
      order.status === "Completed" || order.status === "Cancelled";
    const canManuallyUpdateStatus =
      user?.role === "admin" || !isOrderStatusFinal;

    return (
      <Space direction="vertical" style={{ width: "100%" }}>
        <Space wrap>
          {canMarkPaid && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleMarkAsPaid}
              loading={actionLoading}
            >
              Đánh dấu đã thanh toán
            </Button>
          )}
          {canDeliver && (
            <Button
              type="primary"
              icon={<TruckOutlined />}
              onClick={handleMarkAsDelivered}
              loading={actionLoading}
              style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
            >
              Đánh dấu đã giao hàng
            </Button>
          )}
          {canCancel && (
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={handleCancelOrder}
              loading={actionLoading}
            >
              Hủy đơn hàng
            </Button>
          )}
        </Space>

        {user?.role && ["admin", "manager"].includes(user.role) && (
          <Card size="small" title="Cập nhật trạng thái thủ công">
            <Space wrap>
              <Select
                value={selectedNewStatus}
                style={{ width: 200 }}
                onChange={handleNewStatusChange}
                disabled={!canManuallyUpdateStatus || actionLoading}
              >
                {ORDER_STATUSES.map((statusKey) => (
                  <Option key={statusKey} value={statusKey}>
                    {ORDER_STATUS_VI[statusKey] || statusKey}
                  </Option>
                ))}
              </Select>
              <Button
                icon={<EditOutlined />}
                onClick={showUpdateStatusModal}
                disabled={
                  !selectedNewStatus ||
                  selectedNewStatus === order.status ||
                  !canManuallyUpdateStatus ||
                  actionLoading
                }
              >
                Cập nhật trạng thái
              </Button>
            </Space>
            {!canManuallyUpdateStatus && order.status && (
              <Text type="warning" style={{ display: "block", marginTop: 8 }}>
                Không thể thay đổi trạng thái của đơn hàng đã{" "}
                {ORDER_STATUS_VI[order.status]?.toLowerCase() || order.status}.
              </Text>
            )}
          </Card>
        )}
      </Space>
    );
  };

  return (
    <div>
      <DetailPageHeader
        title={`Đơn hàng #${order.id}`}
        moduleName="Đơn hàng"
        moduleUrl="/orders"
        onBack={() => navigate("/orders")}
        showEditButton={false}
        extra={renderActionButtons()}
      />

      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Card title="Thông tin đơn hàng">
          <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
            <Descriptions.Item label="Mã đơn hàng">
              {order.id}
            </Descriptions.Item>
            <Descriptions.Item label="Khách hàng">
              {order.customer_name || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày đặt hàng">
              {order.order_date
                ? new Date(order.order_date).toLocaleString()
                : "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái đơn hàng">
              <Tag color={getStatusColor(order.status)}>
                {order.status?.toUpperCase() || "N/A"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái thanh toán">
              <Tag color={getStatusColor(order.payment_status)}>
                {order.payment_status?.toUpperCase() || "N/A"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Phương thức thanh toán">
              {order.payment_method || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày thanh toán">
              {order.payment_date
                ? new Date(order.payment_date).toLocaleString()
                : "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng tiền">
              {order.payment_amount?.toLocaleString("vi-VN") + " VND" || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Địa chỉ giao hàng" span={3}>
              {order.shipping_address || "N/A"}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Chi tiết đơn hàng">
          <Table<OrderItemResponse>
            columns={orderItemColumns}
            dataSource={order.items || []}
            rowKey="id"
            pagination={false}
            bordered
            size="small"
            className="data-table"
          />
        </Card>

        <Card title="Lịch sử đơn hàng">
          {order.history && order.history.length > 0 ? (
            <Timeline>
              {order.history.map((hist: OrderHistoryResponse) => (
                <Timeline.Item key={hist.id}>
                  <Text strong>Trạng thái:</Text>{" "}
                  <Tag color={getStatusColor(hist.new_status)}>
                    {hist.new_status?.toUpperCase() || "N/A"}
                  </Tag>
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    ({new Date(hist.processing_time).toLocaleString()})
                  </Text>
                  <br />
                  {hist.manager_name && (
                    <Text type="secondary">
                      Người xử lý: {hist.manager_name}
                    </Text>
                  )}
                  {hist.previous_status && (
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      (Trước đó: {hist.previous_status})
                    </Text>
                  )}
                </Timeline.Item>
              ))}
            </Timeline>
          ) : (
            <Empty description="Không có lịch sử đơn hàng." />
          )}
        </Card>
      </Space>

      <Modal
        title="Xác nhận cập nhật trạng thái đơn hàng"
        visible={isUpdateStatusModalVisible}
        onOk={handleConfirmUpdateStatus}
        onCancel={handleUpdateStatusCancel}
        confirmLoading={updateStatusLoading}
        okText="Xác nhận"
        cancelText="Hủy"
      >
        <p>
          Bạn có chắc chắn muốn thay đổi trạng thái đơn hàng từ
          <strong>{ORDER_STATUS_VI[order.status] || order.status}</strong> thành
          <strong>
            {selectedNewStatus
              ? ORDER_STATUS_VI[selectedNewStatus] || selectedNewStatus
              : ""}
          </strong>
          ?
        </p>
        <Input.TextArea
          rows={3}
          placeholder="Lý do thay đổi (tùy chọn)"
          value={updateReason}
          onChange={(e) => setUpdateReason(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default OrderDetailPage;
