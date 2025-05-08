import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Typography,
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  Input,
  Select,
  Tooltip,
  Card,
  Row,
  Col,
} from "antd";
import type { TableProps, TablePaginationConfig } from "antd";
import { FilterValue, SorterResult } from "antd/es/table/interface";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { debounce } from "lodash";
import type { DebouncedFunc } from "lodash";
import discountService from "../../services/discountService";
import {
  DiscountResponse,
  GetDiscountsParams,
  GetDiscountsResponse,
  DiscountStatus,
  DiscountType,
} from "../../api/types";
import AddDiscountModal from "../../components/discounts/AddDiscountModal";
import EditDiscountModal from "../../components/discounts/EditDiscountModal";
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

// Map status values to colors
const statusColors: Record<DiscountStatus, string> = {
  Active: "green",
  Inactive: "orange",
  Expired: "red",
};

const statusText: Record<DiscountStatus, string> = {
  Active: "Hoạt động",
  Inactive: "Không hoạt động",
  Expired: "Hết hạn",
};

const typeText: Record<DiscountType, string> = {
  Percentage: "Phần trăm",
  FixedAmount: "Số tiền cố định",
};

const Discounts: React.FC = () => {
  const [discounts, setDiscounts] = useState<DiscountResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedDiscount, setSelectedDiscount] =
    useState<DiscountResponse | null>(null);
  const { showNotification } = useNotification();

  // Server-side state
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
    showTotal: (total, range) =>
      `${range[0]}-${range[1]} của ${total} mã giảm giá`,
    pageSizeOptions: ["10", "20", "50"],
    showSizeChanger: true,
  });
  const [sortInfo, setSortInfo] = useState<SorterResult<DiscountResponse>>({});
  const [filters, setFilters] = useState<Record<string, FilterValue | null>>(
    {}
  );
  const [searchText, setSearchText] = useState("");

  // Ref for debounced search function to prevent stale closures
  const debouncedFetchRef = useRef<DebouncedFunc<
    (params: GetDiscountsParams) => Promise<void>
  > | null>(null);

  // Fetch discounts function
  const fetchDiscounts = useCallback(
    async (currentParams: GetDiscountsParams) => {
      setLoading(true);
      try {
        const response: GetDiscountsResponse =
          await discountService.getAllDiscounts(currentParams);
        setDiscounts(response.discounts);
        setPagination((prev) => ({
          ...prev,
          current: response.currentPage,
          pageSize: response.pageSize,
          total: response.totalCount,
        }));
      } catch (error) {
        showNotification("Không thể tải danh sách mã giảm giá", "error");
        console.error("Error fetching discounts:", error);
      } finally {
        setLoading(false);
      }
    },
    [showNotification]
  );

  // Debounced fetch wrapper
  useEffect(() => {
    debouncedFetchRef.current = debounce(
      (params: GetDiscountsParams) => fetchDiscounts(params),
      500
    );
  }, [fetchDiscounts]);

  // Effect to trigger fetch when state changes
  useEffect(() => {
    const params: GetDiscountsParams = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      search: searchText,
      status: filters.status?.join(",") || "",
      type: filters.type?.join(",") || "",
      sortBy: sortInfo.field?.toString() || "id",
      sortOrder: sortInfo.order === "ascend" ? "asc" : "desc",
    };
    if (debouncedFetchRef.current) {
      debouncedFetchRef.current(params);
    }
  }, [
    pagination.current,
    pagination.pageSize,
    searchText, // Use direct searchText here for debounce
    filters,
    sortInfo,
    fetchDiscounts,
  ]);

  // Handle table changes (pagination, filters, sorter)
  const handleTableChange: TableProps<DiscountResponse>["onChange"] = (
    newPagination,
    newFilters,
    newSorter,
    extra
  ) => {
    const sorter = Array.isArray(newSorter) ? newSorter[0] : newSorter;
    setPagination((prev) => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
    setFilters(newFilters);
    setSortInfo(sorter); // Update sort state immediately

    // Reset to page 1 if filters or sorter change, handled by useEffect dependency
  };

  // Handle search input change
  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination((prev) => ({ ...prev, current: 1 })); // Reset to page 1
  };

  // Handle delete
  const handleDeleteDiscount = async (discountId: number) => {
    try {
      setLoading(true);
      await discountService.deleteDiscount(discountId);
      showNotification("Xóa mã giảm giá thành công", "success");
      // Refetch current page data
      const currentTotal = pagination.total ? pagination.total - 1 : 0;
      const currentPage = pagination.current || 1;
      const pageSize = pagination.pageSize || 10;
      // If it was the last item on the page, go back one page
      const newCurrentPage =
        discounts.length === 1 && currentPage > 1
          ? currentPage - 1
          : currentPage;

      setPagination((prev) => ({
        ...prev,
        current: newCurrentPage,
        total: currentTotal,
      }));
      // Manually trigger refetch if the page number didn't change
      if (newCurrentPage === currentPage) {
        fetchDiscounts({
          page: currentPage,
          pageSize: pageSize,
          search: searchText,
          status: filters.status?.join(",") || "",
          type: filters.type?.join(",") || "",
          sortBy: sortInfo.field?.toString() || "id",
          sortOrder: sortInfo.order === "ascend" ? "asc" : "desc",
        });
      }
      // Otherwise, the useEffect watching pagination.current will trigger the refetch
    } catch (error) {
      showNotification("Không thể xóa mã giảm giá", "error");
      console.error("Error deleting discount:", error);
    } finally {
      setLoading(false);
    }
  };

  // Format date utility
  const formatDate = (dateString?: string | null): string => {
    return dateString ? dayjs(dateString).format("DD/MM/YYYY HH:mm") : "—";
  };

  // Format value utility
  const formatValue = (value: number, type: DiscountType): string => {
    if (type === "Percentage") {
      return `${value}%`;
    }
    return `${value.toLocaleString("vi-VN")} đ`;
  };

  // Render cột có tooltip và ellipsis
  const renderWithTooltip = (text: string | null | undefined, maxLines = 1) => {
    if (!text) return "—";
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

  // Hiển thị thông tin biến thể sản phẩm với tooltip
  const renderVariantInfo = (record: DiscountResponse) => {
    return (
      <Tooltip title={`${record.variant_sku} - ${record.product_name}`}>
        <div className="multiline-ellipsis">
          <strong>{record.variant_sku}</strong>
          <div>{record.product_name}</div>
        </div>
      </Tooltip>
    );
  };

  // Table columns definition
  const columns: TableProps<DiscountResponse>["columns"] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
      sorter: true,
      align: "center",
    },
    {
      title: "Tên",
      dataIndex: "name",
      key: "name",
      sorter: true,
      width: "15%",
      render: (text) => renderWithTooltip(text, 2),
    },
    {
      title: "Mã",
      dataIndex: "code",
      key: "code",
      sorter: true,
      width: 100,
      render: (text) => renderWithTooltip(text),
    },
    {
      title: "Biến thể SP",
      dataIndex: "variant_sku",
      key: "variant_sku",
      sorter: true,
      width: "25%",
      render: (_, record) => renderVariantInfo(record),
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 120,
      filters: [
        { text: "Phần trăm", value: "Percentage" },
        { text: "Số tiền cố định", value: "FixedAmount" },
      ],
      filteredValue: filters.type || null,
      render: (type: DiscountType) => typeText[type],
      align: "center",
    },
    {
      title: "Giá trị",
      dataIndex: "value",
      key: "value",
      sorter: true,
      width: 100,
      align: "right",
      render: (value, record) => formatValue(value, record.type),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      filters: [
        { text: "Hoạt động", value: "Active" },
        { text: "Không hoạt động", value: "Inactive" },
        { text: "Hết hạn", value: "Expired" },
      ],
      filteredValue: filters.status || null,
      render: (status: DiscountStatus) => (
        <Tag color={statusColors[status]}>{statusText[status]}</Tag>
      ),
      align: "center",
    },
    {
      title: "Bắt đầu",
      dataIndex: "start_date",
      key: "start_date",
      sorter: true,
      width: 130,
      render: formatDate,
    },
    {
      title: "Kết thúc",
      dataIndex: "end_date",
      key: "end_date",
      sorter: true,
      width: 130,
      render: formatDate,
    },
    {
      title: "Thao tác",
      key: "action",
      fixed: "right",
      width: 100,
      align: "center",
      render: (_, record) => (
        <ActionButtons
          onEdit={() => {
            setSelectedDiscount(record);
            setIsEditModalVisible(true);
          }}
          onDelete={() => handleDeleteDiscount(record.id)}
          deleteConfirmTitle="Bạn chắc chắn muốn xóa mã này?"
          itemName={record.code}
          editText="Sửa"
          deleteText="Xóa"
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quản lý mã giảm giá"
        onAdd={() => setIsAddModalVisible(true)}
        addButtonText="Thêm mã giảm giá"
      />

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={24} lg={12}>
            <Search
              placeholder="Tìm kiếm tên, mã, SKU, tên SP..."
              onSearch={handleSearch}
              onChange={(e) => handleSearch(e.target.value)} // Trigger search on change for debounce
              style={{ width: "100%" }}
              enterButton={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Select
              placeholder="Lọc theo trạng thái"
              style={{ width: "100%" }}
              allowClear
              onChange={(value) => {
                const newFilters = { ...filters };
                if (value) {
                  newFilters.status = [value];
                } else {
                  delete newFilters.status;
                }
                setFilters(newFilters);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
              value={filters.status?.[0]}
            >
              <Option value="Active">Hoạt động</Option>
              <Option value="Inactive">Không hoạt động</Option>
              <Option value="Expired">Hết hạn</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Select
              placeholder="Lọc theo loại"
              style={{ width: "100%" }}
              allowClear
              onChange={(value) => {
                const newFilters = { ...filters };
                if (value) {
                  newFilters.type = [value];
                } else {
                  delete newFilters.type;
                }
                setFilters(newFilters);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
              value={filters.type?.[0]}
            >
              <Option value="Percentage">Phần trăm</Option>
              <Option value="FixedAmount">Số tiền cố định</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      <Table<DiscountResponse>
        columns={columns}
        dataSource={discounts}
        loading={{ spinning: loading, indicator: <LoadingIndicator /> }}
        pagination={pagination}
        onChange={handleTableChange}
        rowKey="id"
        scroll={{ x: "800px" }}
        bordered
        size="middle"
        className="data-table"
      />

      {/* Styles cho bảng */}
      <style>{tableStyles}</style>

      {/* Modals */}
      {isAddModalVisible && (
        <AddDiscountModal
          visible={isAddModalVisible}
          onCancel={() => setIsAddModalVisible(false)}
          onSuccess={() => {
            setIsAddModalVisible(false);
            // Reset filters/sort and go to first page after adding
            setFilters({});
            setSortInfo({});
            setSearchText(""); // Also clear search text
            setPagination((prev) => ({ ...prev, current: 1 }));
          }}
        />
      )}

      {isEditModalVisible && (
        <EditDiscountModal
          visible={isEditModalVisible}
          discount={selectedDiscount}
          onCancel={() => {
            setIsEditModalVisible(false);
            setSelectedDiscount(null);
          }}
          onSuccess={() => {
            setIsEditModalVisible(false);
            setSelectedDiscount(null);
            // Refetch current page data after editing
            fetchDiscounts({
              page: pagination.current,
              pageSize: pagination.pageSize,
              search: searchText,
              status: filters.status?.join(",") || "",
              type: filters.type?.join(",") || "",
              sortBy: sortInfo.field?.toString() || "id",
              sortOrder: sortInfo.order === "ascend" ? "asc" : "desc",
            });
          }}
        />
      )}
    </div>
  );
};

export default Discounts;
