import React, { useState, useEffect, useCallback } from "react";
import { Table, Select, Rate, Typography, Space, Popconfirm } from "antd";
import type { TableProps, TablePaginationConfig } from "antd";
import { debounce } from "lodash";
import { EyeOutlined, DeleteOutlined } from "@ant-design/icons";
import feedbackService from "../../services/feedbackService";
import productService from "../../services/productService";
import { FeedbackResponse, GetFeedbackParams } from "../../api/types";
import FeedbackRespondModal from "../../components/feedback/FeedbackRespondModal";
import {
  PageHeader,
  FilterCard,
  LoadingIndicator,
} from "../../components/common";
import { useNotification } from "../../context/NotificationContext";

const { Text } = Typography;
const { Option } = Select;

interface FeedbackTableDataType {
  key: React.Key;
  feedbackId: number;
  productId: number;
  productName: string;
  customerId: number;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  hasResponse: boolean;
  responseBy: string | null;
}

const FeedbackPage: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackTableDataType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ["10", "20", "50", "100"],
    showTotal: (total, range) =>
      `${range[0]}-${range[1]} của ${total} phản hồi`,
  });
  const [sortInfo, setSortInfo] = useState<{
    columnKey?: string;
    order?: "ascend" | "descend";
  }>({});

  // Filters
  const [searchText, setSearchText] = useState<string>("");
  const [productId, setProductId] = useState<number | undefined>(undefined);
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [hasResponse, setHasResponse] = useState<"true" | "false" | undefined>(
    undefined
  );

  // Modal state
  const [isRespondModalVisible, setIsRespondModalVisible] = useState(false);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<
    number | undefined
  >(undefined);

  // Products for filter
  const [products, setProducts] = useState<{ id: number; name: string }[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const { showNotification } = useNotification();

  // Fetch products for filter dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        // Adjust this to use appropriate API if you have one for fetching all product names/IDs
        const response = await productService.getAllProducts({
          pageSize: 100, // Get a reasonable number of products for the dropdown
        });
        setProducts(
          response.products.map((product) => ({
            id: product.id,
            name: product.name,
          }))
        );
      } catch (error) {
        console.error("Failed to fetch products:", error);
        showNotification("Không thể tải danh sách sản phẩm để lọc", "error");
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [showNotification]);

  // Fetch feedbacks with filters, pagination, and sorting
  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const params: GetFeedbackParams = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        sortBy: sortInfo.columnKey as any,
        sortOrder: sortInfo.order === "ascend" ? "asc" : "desc",
        productId,
        rating,
        hasResponse: hasResponse as "true" | "false" | undefined,
        search: searchText,
      };
      console.log(
        "[FeedbackPage] fetchFeedbacks PARAMS:",
        JSON.stringify(params)
      );

      const serviceResponse = await feedbackService.getAllFeedback(params);
      console.log("[FeedbackPage] Service Response:", serviceResponse);

      if (serviceResponse && serviceResponse.data) {
        const formattedData: FeedbackTableDataType[] = serviceResponse.data.map(
          (feedback) => ({
            key: feedback.feedback_id,
            feedbackId: feedback.feedback_id,
            productId: feedback.product_id,
            productName: feedback.product_name,
            customerId: feedback.customer_id,
            customerName: feedback.customer_name,
            rating: feedback.rating,
            comment: feedback.comment || "",
            createdAt: feedback.feedback_created_at,
            hasResponse: !!feedback.response_id,
            responseBy: feedback.manager_name,
          })
        );
        console.log("[FeedbackPage] Formatted Data:", formattedData);
        setFeedbacks(formattedData);
        setPagination((prev) => ({
          ...prev,
          total: serviceResponse.totalCount,
          current: serviceResponse.currentPage,
          pageSize: serviceResponse.pageSize,
        }));
      } else {
        console.warn(
          "[FeedbackPage] Service response or serviceResponse.data is undefined/null. Setting empty feedbacks."
        );
        setFeedbacks([]);
        setPagination((prev) => ({
          ...prev,
          total: 0,
          current: 1, // Reset to page 1
        }));
      }
    } catch (error) {
      showNotification("Lỗi khi tải danh sách phản hồi!", "error");
      console.error("[FeedbackPage] Failed to fetch feedbacks:", error);
      setFeedbacks([]); // Đặt feedbacks thành mảng rỗng khi có lỗi
    } finally {
      setLoading(false);
    }
  }, [
    pagination.current,
    pagination.pageSize,
    sortInfo.columnKey,
    sortInfo.order,
    productId,
    rating,
    hasResponse,
    searchText,
    showNotification,
  ]);

  // Debounce search input
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setPagination((prev) => ({ ...prev, current: 1 }));
      fetchFeedbacks();
    }, 500),
    [fetchFeedbacks]
  );

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleTableChange: TableProps<FeedbackTableDataType>["onChange"] = (
    pagination,
    filters,
    sorter
  ) => {
    const newPagination = pagination ?? {};
    const current = newPagination.current ?? 1;
    const pageSize = newPagination.pageSize ?? 10;

    setPagination((prev) => ({
      ...prev,
      current: current,
      pageSize: pageSize,
    }));

    if (sorter && !Array.isArray(sorter) && sorter.columnKey) {
      setSortInfo({
        columnKey: sorter.columnKey.toString(),
        order: sorter.order === null ? undefined : sorter.order,
      });
    } else {
      setSortInfo({});
    }
  };

  const handleDelete = async (feedbackId: number) => {
    try {
      await feedbackService.deleteFeedback(feedbackId);
      showNotification("Phản hồi đã được xóa thành công!", "success");
      fetchFeedbacks();
    } catch (error: any) {
      showNotification(
        `Lỗi khi xóa phản hồi: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
      console.error("Failed to delete feedback:", error);
    }
  };

  const showRespondModal = (feedbackId: number) => {
    setSelectedFeedbackId(feedbackId);
    setIsRespondModalVisible(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    debouncedSearch(value);
  };

  const handleResetFilters = () => {
    setProductId(undefined);
    setRating(undefined);
    setHasResponse(undefined);
    setSearchText("");
    setPagination((prev) => ({ ...prev, current: 1 }));
    setSortInfo({});
    fetchFeedbacks();
  };

  const renderResponseStatus = (
    hasResponse: boolean,
    responseBy: string | null
  ) => {
    if (hasResponse && responseBy) {
      return <Text type="success">Đã trả lời bởi {responseBy}</Text>;
    }
    return <Text type="warning">Chưa trả lời</Text>;
  };

  const columns: TableProps<FeedbackTableDataType>["columns"] = [
    {
      title: "ID",
      dataIndex: "feedbackId",
      key: "feedback_id",
      width: "7%",
      sorter: true,
    },
    {
      title: "Khách hàng",
      dataIndex: "customerName",
      key: "customer_name",
      width: "13%",
      sorter: true,
      render: (text) => (
        <div
          style={{
            whiteSpace: "pre-line",
            wordBreak: "break-word",
          }}
        >
          {text}
        </div>
      ),
    },
    {
      title: "Sản phẩm",
      dataIndex: "productName",
      key: "product_name",
      width: "20%",
      sorter: true,
      render: (text) => (
        <div
          style={{
            whiteSpace: "pre-line",
            wordBreak: "break-word",
          }}
        >
          {text}
        </div>
      ),
    },
    {
      title: "Đánh giá",
      dataIndex: "rating",
      key: "rating",
      width: "10%",
      sorter: true,
      render: (rating: number) => <Rate disabled defaultValue={rating} />,
    },
    {
      title: "Nhận xét",
      dataIndex: "comment",
      key: "comment",
      width: "20%",
      render: (text) => (
        <div
          style={{
            whiteSpace: "pre-line",
            wordBreak: "break-word",
            maxHeight: "80px",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {text
            ? text.length > 100
              ? `${text.substring(0, 100)}...`
              : text
            : ""}
        </div>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "feedback_created_at",
      width: "10%",
      sorter: true,
      render: (date) => new Date(date).toLocaleDateString("vi-VN"),
    },
    {
      title: "Trạng thái",
      key: "hasResponse",
      width: "13%",
      render: (_, record) =>
        renderResponseStatus(record.hasResponse, record.responseBy),
    },
    {
      title: "Hành động",
      key: "action",
      width: "12%",
      render: (_, record) => (
        <Space size="middle">
          <a
            onClick={() => showRespondModal(record.feedbackId)}
            style={{ color: "#1890ff" }}
          >
            <EyeOutlined /> Xem / Trả lời
          </a>
          <Popconfirm
            title={`Bạn có chắc muốn xóa phản hồi này?`}
            onConfirm={() => handleDelete(record.feedbackId)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <a style={{ color: "#ff4d4f" }}>
              <DeleteOutlined /> Xóa
            </a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Quản lý Phản hồi" />

      <FilterCard
        onSearch={() => {}}
        searchValue={searchText}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Tìm kiếm..."
        onReset={handleResetFilters}
        onFilter={() => {}}
      >
        <Space size="middle" wrap>
          <div>
            <Text strong style={{ marginRight: 8 }}>
              Sản phẩm:
            </Text>
            <Select
              placeholder="Chọn sản phẩm"
              style={{ width: 200 }}
              allowClear
              loading={loadingProducts}
              value={productId}
              onChange={(value) => {
                setProductId(value);
                setPagination((prev) => ({ ...prev, current: 1 }));
                fetchFeedbacks();
              }}
            >
              {products.map((product) => (
                <Option key={product.id} value={product.id}>
                  {product.name}
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <Text strong style={{ marginRight: 8 }}>
              Đánh giá:
            </Text>
            <Select
              placeholder="Chọn đánh giá"
              style={{ width: 150 }}
              allowClear
              value={rating}
              onChange={(value) => {
                setRating(value);
                setPagination((prev) => ({ ...prev, current: 1 }));
                fetchFeedbacks();
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <Option key={star} value={star}>
                  {star} sao
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <Text strong style={{ marginRight: 8 }}>
              Trạng thái:
            </Text>
            <Select
              placeholder="Trạng thái phản hồi"
              style={{ width: 180 }}
              allowClear
              value={hasResponse}
              onChange={(value) => {
                setHasResponse(value as "true" | "false" | undefined);
                setPagination((prev) => ({ ...prev, current: 1 }));
                fetchFeedbacks();
              }}
            >
              <Option value="true">Đã trả lời</Option>
              <Option value="false">Chưa trả lời</Option>
            </Select>
          </div>
        </Space>
      </FilterCard>

      <Table
        columns={columns}
        dataSource={feedbacks}
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        rowKey="key"
        bordered
        tableLayout="fixed"
        scroll={{ x: "100%" }}
        className="data-table"
        size="middle"
      />

      {isRespondModalVisible && selectedFeedbackId && (
        <FeedbackRespondModal
          visible={isRespondModalVisible}
          feedbackId={selectedFeedbackId}
          onCancel={() => {
            setIsRespondModalVisible(false);
            setSelectedFeedbackId(undefined);
          }}
          onSuccess={() => {
            setIsRespondModalVisible(false);
            setSelectedFeedbackId(undefined);
            fetchFeedbacks();
          }}
        />
      )}
    </div>
  );
};

export default FeedbackPage;
