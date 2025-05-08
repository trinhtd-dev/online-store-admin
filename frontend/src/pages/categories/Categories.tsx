import React, { useState, useEffect, useCallback } from "react";
import { Table, Button, Space, Popconfirm, Typography } from "antd";
import type { TableProps, TablePaginationConfig } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { debounce } from "lodash";
import categoryService from "../../services/categoryService";
import { CategoryResponse, GetCategoriesParams } from "../../api/types";
import AddCategoryModal from "../../components/categories/AddCategoryModal";
import EditCategoryModal from "../../components/categories/EditCategoryModal";
// Import các component chung
import {
  PageHeader,
  FilterCard,
  ActionButtons,
  LoadingIndicator,
} from "../../components/common";
import { useNotification } from "../../context/NotificationContext";

interface CategoriesTableDataType {
  key: React.Key;
  id: number;
  name: string;
}

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<CategoriesTableDataType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ["10", "20", "50", "100"],
    showTotal: (total, range) =>
      `${range[0]}-${range[1]} của ${total} danh mục`,
  });
  const [sortInfo, setSortInfo] = useState<{
    columnKey?: string;
    order?: "ascend" | "descend";
  }>({});
  const [searchText, setSearchText] = useState<string>("");
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>("");
  const { showNotification } = useNotification();

  // Modal state and handlers
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<CategoryResponse | null>(null);

  // Debounce search input
  const debouncedSetSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearchText(value);
      // Reset to page 1 when searching
      setPagination((prev) => ({ ...prev, current: 1 }));
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSetSearch(searchText);
    // Cleanup debounce on unmount
    return () => {
      debouncedSetSearch.cancel();
    };
  }, [searchText, debouncedSetSearch]);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const params: GetCategoriesParams = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        search: debouncedSearchText || undefined,
        sortBy: sortInfo.columnKey
          ? (sortInfo.columnKey as "id" | "name")
          : undefined,
        sortOrder: sortInfo.order
          ? sortInfo.order === "ascend"
            ? "asc"
            : "desc"
          : undefined,
      };

      const response = await categoryService.getAllCategories(params);

      const formattedData: CategoriesTableDataType[] = response.categories.map(
        (cat) => ({
          key: cat.id,
          id: cat.id,
          name: cat.name,
        })
      );

      setCategories(formattedData);
      setPagination((prev) => ({
        ...prev,
        total: response.totalCount,
        current: response.currentPage,
        pageSize: response.pageSize,
      }));
    } catch (error) {
      showNotification("Lỗi khi tải danh sách danh mục!", "error");
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.current,
    pagination.pageSize,
    debouncedSearchText,
    sortInfo.columnKey,
    sortInfo.order,
    showNotification,
  ]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleTableChange: TableProps<CategoriesTableDataType>["onChange"] = (
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

  const handleDelete = async (id: number) => {
    try {
      await categoryService.deleteCategory(id);
      showNotification("Danh mục đã được xóa thành công!", "success");
      fetchCategories();
    } catch (error: any) {
      showNotification(
        `Lỗi khi xóa danh mục: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
      console.error("Failed to delete category:", error);
    }
  };

  const showAddModal = () => setIsAddModalVisible(true);
  const handleAddCancel = () => setIsAddModalVisible(false);
  const handleAddSuccess = () => {
    setIsAddModalVisible(false);
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchCategories();
  };

  const showEditModal = (record: CategoriesTableDataType) => {
    const categoryToEdit: CategoryResponse = {
      id: record.id,
      name: record.name,
    };
    setEditingCategory(categoryToEdit);
    setIsEditModalVisible(true);
  };

  const handleEditCancel = () => {
    setIsEditModalVisible(false);
    setEditingCategory(null);
  };

  const handleEditSuccess = () => {
    setIsEditModalVisible(false);
    setEditingCategory(null);
    fetchCategories();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const handleSearchSubmit = (value: string) => {
    setSearchText(value);
  };

  const handleResetFilters = () => {
    setSearchText("");
    setDebouncedSearchText("");
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const columns: TableProps<CategoriesTableDataType>["columns"] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      sorter: true,
      width: "10%",
    },
    {
      title: "Tên danh mục",
      dataIndex: "name",
      key: "name",
      sorter: true,
      render: (text) => (
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
      title: "Hành động",
      key: "action",
      width: "15%",
      render: (_, record) => (
        <ActionButtons
          onEdit={() => showEditModal(record)}
          onDelete={() => handleDelete(record.id)}
          deleteConfirmTitle="Bạn có chắc muốn xóa danh mục"
          itemName={record.name}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quản lý Danh mục"
        onAdd={showAddModal}
        addButtonText="Thêm Danh mục"
      />

      <FilterCard
        onSearch={handleSearchSubmit}
        searchValue={searchText}
        onSearchChange={handleSearchChange}
        onFilter={fetchCategories}
        onReset={handleResetFilters}
        searchPlaceholder="Tìm kiếm theo tên danh mục..."
      />

      <Table
        columns={columns}
        dataSource={categories}
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

      {isAddModalVisible && (
        <AddCategoryModal
          visible={isAddModalVisible}
          onCancel={handleAddCancel}
          onSuccess={handleAddSuccess}
        />
      )}
      {isEditModalVisible && editingCategory && (
        <EditCategoryModal
          visible={isEditModalVisible}
          onCancel={handleEditCancel}
          onSuccess={handleEditSuccess}
          category={editingCategory}
        />
      )}
    </div>
  );
};

export default Categories;
