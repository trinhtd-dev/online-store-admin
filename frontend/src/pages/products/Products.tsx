import React, { useState, useEffect, useCallback } from "react";
import {
  Typography,
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  message,
  Input,
  Spin,
  Tooltip,
  Select,
  Form,
  Row,
  Col,
  Card,
} from "antd";
import type { TableProps, TablePaginationConfig } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  DownOutlined,
  EyeOutlined,
  RightOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import productService, {
  ProductDetail,
  GetProductsParams,
  GetProductsResponse,
} from "../../services/productService";
import { ProductResponse } from "../../api/types";
import AddProductModal from "../../components/products/AddProductModal";
import EditProductModal from "../../components/products/EditProductModal";
import ProductVariants from "../../components/products/ProductVariants";
import { useNavigate } from "react-router-dom";
import categoryService from "../../services/categoryService";
import { CategoryResponse } from "../../api/types";
import { useNotification } from "../../context/NotificationContext";

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

// Define type for sorting info from Ant Table
interface TableSorter {
  field?: React.Key | readonly React.Key[]; // Match Ant Design's SorterResult field type
  order?: "ascend" | "descend" | null; // Match Ant Design's SorterResult order type
}

const Products: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(
    null
  );
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(
    null
  );
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductResponse | null>(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const { showNotification } = useNotification();

  // State cho các bộ lọc
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);

  // --- State for Server-Side Operations ---
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0, // Initial total count
    showTotal: (total, range) =>
      `${range[0]}-${range[1]} của ${total} sản phẩm`,
    pageSizeOptions: ["10", "20", "50"], // Optional: allow page size change
    showSizeChanger: true, // Optional: show page size changer
  });
  const [sortInfo, setSortInfo] = useState<TableSorter>({
    field: "id",
    order: "descend",
  });

  // Lấy danh sách danh mục
  const fetchCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      const categories = await categoryService.getAllCategoriesNoLimit();
      setCategories(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      showNotification("Không thể tải danh sách danh mục", "error");
    } finally {
      setLoadingCategories(false);
    }
  }, [showNotification]);

  // Lấy danh sách thương hiệu
  const fetchBrands = useCallback(async () => {
    try {
      setLoadingBrands(true);
      const response = await productService.getAllBrands();
      setBrands(response);
    } catch (error) {
      console.error("Error fetching brands:", error);
      showNotification("Không thể tải danh sách thương hiệu", "error");
    } finally {
      setLoadingBrands(false);
    }
  }, [showNotification]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchText(searchText);
      setPagination((prev) => ({ ...prev, current: 1 })); // Reset to page 1 on new search
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchText]);

  // Tải danh mục và thương hiệu khi component mount
  useEffect(() => {
    fetchCategories();
    fetchBrands();
  }, [fetchCategories, fetchBrands]);

  // Tải danh sách sản phẩm với params
  const fetchProducts = useCallback(async () => {
    setLoading(true);

    // Convert AntD sorter field/order to API format
    let sortBy = "id"; // Default sort column
    if (sortInfo.field && !Array.isArray(sortInfo.field)) {
      // Handle only single column sort
      sortBy = sortInfo.field.toString();
    }
    const sortOrder = sortInfo.order === "ascend" ? "asc" : "desc"; // Default to desc if null

    const params: GetProductsParams = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      search: debouncedSearchText, // Use debounced search text
      sortBy: sortBy,
      sortOrder: sortOrder,
      category_id:
        selectedCategories.length > 0 ? selectedCategories : undefined,
      brand: selectedBrands.length > 0 ? selectedBrands : undefined,
    };

    try {
      const response: GetProductsResponse = await productService.getAllProducts(
        params
      );
      setProducts(response.products);
      setPagination((prev) => ({
        ...prev,
        current: response.currentPage,
        pageSize: response.pageSize,
        total: response.totalCount,
      }));
    } catch (error) {
      showNotification("Không thể tải danh sách sản phẩm", "error");
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.current,
    pagination.pageSize,
    debouncedSearchText,
    sortInfo.field,
    sortInfo.order,
    selectedCategories,
    selectedBrands,
    showNotification,
  ]); // Dependencies for useCallback

  useEffect(() => {
    fetchProducts(); // Fetch data when dependencies change
  }, [fetchProducts]); // fetchProducts is memoized, safe dependency

  // Tải chi tiết sản phẩm khi expand
  const fetchProductDetail = async (productId: number) => {
    try {
      const data = await productService.getProductById(productId);
      setProductDetail(data);
    } catch (error) {
      showNotification("Không thể tải thông tin chi tiết sản phẩm", "error");
      console.error("Error fetching product detail:", error);
      setProductDetail(null); // Clear detail on error
    }
  };

  // Xử lý xóa sản phẩm
  const handleDeleteProduct = async (productId: number) => {
    try {
      setLoading(true);
      await productService.deleteProduct(productId);
      showNotification("Xóa sản phẩm thành công", "success");
      // Refetch products for the current page after deletion
      // Check if it was the last item on the page
      const newTotal = pagination.total ? pagination.total - 1 : 0;
      const newCurrent =
        products.length === 1 && (pagination.current || 1) > 1
          ? (pagination.current || 1) - 1
          : pagination.current;
      setPagination((prev) => ({
        ...prev,
        current: newCurrent,
        total: newTotal,
      }));
      // The useEffect will trigger refetch due to pagination change if needed
      if (newCurrent === pagination.current) {
        fetchProducts(); // Manually refetch if page didn't change
      }
    } catch (error) {
      showNotification("Không thể xóa sản phẩm", "error");
      console.error("Error deleting product:", error);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý mở rộng hàng để hiển thị variants
  const handleExpandRow = (expanded: boolean, record: ProductResponse) => {
    if (expanded) {
      setExpandedProductId(record.id);
      setProductDetail(null); // Show spinner while loading detail
      fetchProductDetail(record.id);
    } else {
      setExpandedProductId(null);
      setProductDetail(null);
    }
  };

  // Xử lý thay đổi của Table (pagination, sorting)
  const handleTableChange: TableProps<ProductResponse>["onChange"] = (
    newPagination,
    filters, // Not used currently
    sorter,
    extra // Contains action: 'paginate' | 'sort' | 'filter'
  ) => {
    const currentSorter = Array.isArray(sorter) ? sorter[0] : sorter; // Handle single/multi sort

    // Map AntD sorter field to API's expected sortBy field
    let apiSortBy: GetProductsParams["sortBy"] = "id"; // Default
    const antdSortField = currentSorter.field?.toString();
    if (antdSortField) {
      const validSortFields: Array<GetProductsParams["sortBy"]> = [
        "id",
        "name",
        "category_name",
        "brand",
        "total_sold_quantity",
      ];
      if ((validSortFields as string[]).includes(antdSortField)) {
        apiSortBy = antdSortField as GetProductsParams["sortBy"];
      }
    }

    const newSortInfo: TableSorter = {
      field: apiSortBy, // Use the mapped API field
      order: currentSorter.order ?? null,
    };

    // Update pagination state from AntD
    setPagination((prev) => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
      total: newPagination.total, // Ensure total is also updated if provided by antd
    }));

    // Update sort state
    setSortInfo(newSortInfo);

    // useEffect will handle the refetch due to state changes
  };

  // Xử lý tìm kiếm (Input change handled by debounce useEffect)
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  // Xử lý thay đổi category filter
  const handleCategoryChange = (values: number[]) => {
    setSelectedCategories(values);
    setPagination((prev) => ({ ...prev, current: 1 })); // Reset to page 1 when filter changes
  };

  // Xử lý thay đổi brand filter
  const handleBrandChange = (values: string[]) => {
    setSelectedBrands(values);
    setPagination((prev) => ({ ...prev, current: 1 })); // Reset to page 1 when filter changes
  };

  // Xử lý reset filters
  const handleResetFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSearchText("");
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const columns: TableProps<ProductResponse>["columns"] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 50,
      sorter: true, // Enable server-side sorting for this column
      defaultSortOrder: sortInfo.field === "id" ? sortInfo.order : null, // Reflect initial sort
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "name",
      key: "name",
      width: "25%",
      sorter: true, // Enable server-side sorting
      defaultSortOrder: sortInfo.field === "name" ? sortInfo.order : null,
      render: (text: string, record: ProductResponse) => (
        <a
          onClick={() => {
            setSelectedProduct(record);
            setIsEditModalVisible(true);
          }}
          aria-label={`Sửa sản phẩm ${text}`}
          style={{
            display: "block",
            whiteSpace: "pre-line",
            wordBreak: "break-word",
          }}
          title={text}
        >
          {text}
        </a>
      ),
    },
    {
      title: "Danh mục",
      dataIndex: "category_name",
      key: "category_name",
      width: "20%",
      sorter: true, // Enable server-side sorting
      defaultSortOrder:
        sortInfo.field === "category_name" ? sortInfo.order : null,
      render: (text: string) => (
        <span
          style={{
            display: "block",
            whiteSpace: "pre-line",
            wordBreak: "break-word",
          }}
          title={text}
        >
          {text || "—"}
        </span>
      ),
    },
    {
      title: "Thương hiệu",
      dataIndex: "brand",
      key: "brand",
      width: "13%",
      sorter: true, // Enable server-side sorting
      defaultSortOrder: sortInfo.field === "brand" ? sortInfo.order : null,
      render: (text: string) => (
        <span
          style={{
            display: "block",
            whiteSpace: "pre-line",
            wordBreak: "break-word",
          }}
          title={text}
        >
          {text || "—"}
        </span>
      ),
    },
    {
      title: "Đã bán",
      dataIndex: "total_sold_quantity",
      key: "total_sold_quantity",
      width: 70,
      align: "right" as const,
      sorter: true, // Enable server-side sorting
      defaultSortOrder:
        sortInfo.field === "total_sold_quantity" ? sortInfo.order : null,
      render: (quantity: number) => quantity ?? 0,
    },
    {
      title: "Thao tác",
      key: "action",
      fixed: "right" as const,
      width: 200,
      render: (_: any, record: ProductResponse) => (
        <Space size="small" wrap={true}>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/products/${record.id}`)}
            aria-label={`Xem chi tiết sản phẩm ${record.name}`}
            style={{ padding: "0 2px" }}
          >
            Xem
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedProduct(record);
              setIsEditModalVisible(true);
            }}
            aria-label={`Sửa sản phẩm ${record.name}`}
            style={{ padding: "0 2px" }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa sản phẩm này?"
            onConfirm={() => handleDeleteProduct(record.id)}
            okText="Có"
            cancelText="Không"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              aria-label={`Xóa sản phẩm ${record.name}`}
              style={{ padding: "0 2px" }}
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <Title level={2}>Quản lý sản phẩm</Title>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsAddModalVisible(true)}
          >
            Thêm sản phẩm
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Form layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Item label="Tìm kiếm">
                <Search
                  placeholder="Tìm kiếm sản phẩm, danh mục, thương hiệu"
                  onChange={handleSearchInputChange}
                  value={searchText}
                  allowClear
                  enterButton={<SearchOutlined />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Item label="Danh mục">
                <Select
                  mode="multiple"
                  allowClear
                  style={{ width: "100%" }}
                  placeholder="Chọn danh mục"
                  value={selectedCategories}
                  onChange={handleCategoryChange}
                  loading={loadingCategories}
                  maxTagCount={2}
                >
                  {categories.map((category) => (
                    <Option key={category.id} value={category.id}>
                      {category.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Item label="Thương hiệu">
                <Select
                  mode="multiple"
                  allowClear
                  style={{ width: "100%" }}
                  placeholder="Chọn thương hiệu"
                  value={selectedBrands}
                  onChange={handleBrandChange}
                  loading={loadingBrands}
                  maxTagCount={2}
                >
                  {brands.map((brand) => (
                    <Option key={brand} value={brand}>
                      {brand}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24} style={{ textAlign: "right" }}>
              <Button onClick={handleResetFilters} style={{ marginRight: 8 }}>
                Xóa bộ lọc
              </Button>
              <Button
                type="primary"
                icon={<FilterOutlined />}
                onClick={fetchProducts}
              >
                Lọc
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>

      <Table<ProductResponse>
        columns={columns}
        dataSource={products}
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        rowKey="id"
        scroll={{ x: "100%" }}
        expandable={{
          expandedRowRender: (record) => {
            if (!productDetail || productDetail.id !== record.id) {
              return (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <Spin size="small" />
                </div>
              );
            }
            return (
              <ProductVariants
                product={productDetail}
                onVariantsChange={async () => {
                  await fetchProductDetail(record.id);
                }}
              />
            );
          },
          expandedRowKeys: expandedProductId ? [expandedProductId] : [],
          onExpand: handleExpandRow,
          expandIcon: ({ expanded, onExpand, record }) =>
            expanded ? (
              <DownOutlined
                onClick={(e) => onExpand(record, e)}
                style={{ cursor: "pointer" }}
                aria-label={`Thu gọn biến thể của ${record.name}`}
              />
            ) : (
              <Tooltip title="Xem biến thể">
                <RightOutlined
                  onClick={(e) => onExpand(record, e)}
                  style={{ cursor: "pointer" }}
                  aria-label={`Xem biến thể của ${record.name}`}
                />
              </Tooltip>
            ),
        }}
        bordered
        size="middle"
        className="products-table"
        tableLayout="fixed"
      />

      {/* Modal thêm sản phẩm */}
      {isAddModalVisible && (
        <AddProductModal
          visible={isAddModalVisible}
          onCancel={() => setIsAddModalVisible(false)}
          onSuccess={() => {
            setIsAddModalVisible(false);
            setSearchText("");
            setDebouncedSearchText("");
            setSortInfo({ field: "id", order: "descend" });
            setPagination((prev) => ({ ...prev, current: 1 }));
          }}
        />
      )}

      {/* Modal sửa sản phẩm */}
      {isEditModalVisible && selectedProduct && (
        <EditProductModal
          visible={isEditModalVisible}
          onCancel={() => {
            setIsEditModalVisible(false);
            setSelectedProduct(null);
          }}
          onSuccess={() => {
            setIsEditModalVisible(false);
            setSelectedProduct(null);
            fetchProducts();
            if (expandedProductId === selectedProduct.id) {
              fetchProductDetail(selectedProduct.id);
            }
          }}
          product={selectedProduct}
        />
      )}

      {/* Add global styles using standard style element instead of jsx */}
      <style>
        {`
          .ant-table-cell {
            vertical-align: middle !important; 
          }
          
          .products-table .ant-table-row {
            height: auto !important;
          }
          
          .products-table .ant-table-cell {
            padding: 12px 8px;
            height: auto !important;
            overflow-wrap: break-word;
          }
          
          /* Giới hạn độ cao tối đa của ô để bảng không quá cao */
          .products-table .ant-table-cell p, 
          .products-table .ant-table-cell a,
          .products-table .ant-table-cell span {
            max-height: 100px;
            overflow-y: auto;
          }
        `}
      </style>
    </div>
  );
};

export default Products;
