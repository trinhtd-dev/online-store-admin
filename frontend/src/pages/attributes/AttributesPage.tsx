import React, { useState, useEffect, useCallback } from "react";
import { Table, Button, Space, Popconfirm, Typography } from "antd";
import type { TableProps, TablePaginationConfig } from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { debounce } from "lodash";
import attributeService from "../../services/attributeService";
import {
  Attribute as AttributeResponse, // Renaming to avoid conflict with React.Attribute
  GetAttributesParams,
} from "../../api/types";
import AddAttributeModal from "../../components/attributes/AddAttributeModal";
import EditAttributeModal from "../../components/attributes/EditAttributeModal";
import ManageAttributeValuesModal from "../../components/attributes/ManageAttributeValuesModal";

import {
  PageHeader,
  FilterCard,
  ActionButtons,
  // LoadingIndicator, // Assuming you might have this
} from "../../components/common";
import { useNotification } from "../../context/NotificationContext";

interface AttributesTableDataType {
  key: React.Key;
  id: number;
  name: string;
}

const AttributesPage: React.FC = () => {
  const [attributes, setAttributes] = useState<AttributesTableDataType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ["10", "20", "50", "100"],
    showTotal: (total, range) =>
      `${range[0]}-${range[1]} của ${total} thuộc tính`,
  });
  const [sortInfo, setSortInfo] = useState<{
    columnKey?: string;
    order?: "ascend" | "descend";
  }>({});
  const [searchText, setSearchText] = useState<string>("");
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>("");
  const { showNotification } = useNotification();

  // Modal states
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isManageValuesModalVisible, setIsManageValuesModalVisible] =
    useState(false);
  const [editingAttribute, setEditingAttribute] =
    useState<AttributeResponse | null>(null);
  const [managingValuesForAttribute, setManagingValuesForAttribute] =
    useState<AttributeResponse | null>(null);

  const debouncedSetSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearchText(value);
      setPagination((prev) => ({ ...prev, current: 1 }));
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSetSearch(searchText);
    return () => {
      debouncedSetSearch.cancel();
    };
  }, [searchText, debouncedSetSearch]);

  const fetchAttributes = useCallback(async () => {
    setLoading(true);
    try {
      const params: GetAttributesParams = {
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

      const response = await attributeService.getAllAttributes(params);
      const formattedData: AttributesTableDataType[] = response.attributes.map(
        (attr) => ({
          key: attr.id,
          id: attr.id,
          name: attr.name,
        })
      );

      setAttributes(formattedData);
      setPagination((prev) => ({
        ...prev,
        total: response.totalCount,
        current: response.currentPage,
        pageSize: response.pageSize,
      }));
    } catch (error) {
      showNotification("Lỗi khi tải danh sách thuộc tính!", "error");
      console.error("Failed to fetch attributes:", error);
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
    fetchAttributes();
  }, [fetchAttributes]);

  const handleTableChange: TableProps<AttributesTableDataType>["onChange"] = (
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

  const handleDeleteAttribute = async (id: number) => {
    try {
      await attributeService.deleteAttribute(id);
      showNotification("Thuộc tính đã được xóa thành công!", "success");
      fetchAttributes(); // Refresh list
    } catch (error: any) {
      showNotification(
        `Lỗi khi xóa thuộc tính: ${
          error.response?.data?.message || error.message
        }`,
        "error"
      );
      console.error("Failed to delete attribute:", error);
    }
  };

  // Add Modal Handlers
  const showAddModal = () => setIsAddModalVisible(true);
  const handleAddCancel = () => setIsAddModalVisible(false);
  const handleAddSuccess = () => {
    setIsAddModalVisible(false);
    fetchAttributes(); // Refresh list, potentially reset to page 1 if desired
  };

  // Edit Modal Handlers
  const showEditModal = (record: AttributesTableDataType) => {
    const attrToEdit: AttributeResponse = {
      id: record.id,
      name: record.name, // Assuming AttributeResponse also has name
      // 'values' field is not needed for the edit modal of the attribute itself
    };
    setEditingAttribute(attrToEdit);
    setIsEditModalVisible(true);
  };
  const handleEditCancel = () => {
    setIsEditModalVisible(false);
    setEditingAttribute(null);
  };
  const handleEditSuccess = () => {
    setIsEditModalVisible(false);
    setEditingAttribute(null);
    fetchAttributes(); // Refresh list
  };

  // Manage Values Modal Handlers
  const showManageValuesModal = (record: AttributesTableDataType) => {
    const attrToManage: AttributeResponse = {
      id: record.id,
      name: record.name,
      // 'values' will be fetched inside the modal
    };
    setManagingValuesForAttribute(attrToManage);
    setIsManageValuesModalVisible(true);
  };
  const handleManageValuesCancel = () => {
    setIsManageValuesModalVisible(false);
    setManagingValuesForAttribute(null);
  };
  // Success for manage values modal might just be closing it, as changes are internal
  // Or it could trigger a refetch of the main attributes if values count changes display

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const handleSearchSubmit = (value: string) => {
    // This will trigger the debounced effect
    setSearchText(value);
  };

  const handleResetFilters = () => {
    setSearchText("");
    setDebouncedSearchText(""); // Also clear debounced for immediate effect if needed
    setPagination((prev) => ({ ...prev, current: 1 }));
    // fetchAttributes(); // fetchAttributes is called by useEffect on debouncedSearchText change
  };

  const columns: TableProps<AttributesTableDataType>["columns"] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      sorter: true,
      width: "10%",
    },
    {
      title: "Tên Thuộc tính",
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
      width: "20%", // Adjusted width to accommodate one more button
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<UnorderedListOutlined />}
            onClick={() => showManageValuesModal(record)}
          >
            Giá trị
          </Button>
          <ActionButtons // Using the existing component for Edit/Delete
            onEdit={() => showEditModal(record)}
            onDelete={() => handleDeleteAttribute(record.id)}
            deleteConfirmTitle="Bạn có chắc muốn xóa thuộc tính này?"
            itemName={record.name}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quản lý Thuộc tính"
        onAdd={showAddModal}
        addButtonText="Thêm Thuộc tính"
      />

      <FilterCard
        onSearch={handleSearchSubmit} // Pass the submit function
        searchValue={searchText} // Control the input field
        onSearchChange={handleSearchChange} // Handle input change
        onFilter={fetchAttributes} // Optional: if you have a manual filter button
        onReset={handleResetFilters}
        searchPlaceholder="Tìm kiếm theo tên thuộc tính..."
      />

      {/* {loading && <LoadingIndicator />} */}
      <Table
        columns={columns}
        dataSource={attributes}
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
        <AddAttributeModal
          visible={isAddModalVisible}
          onCancel={handleAddCancel}
          onSuccess={handleAddSuccess}
        />
      )}
      {isEditModalVisible && editingAttribute && (
        <EditAttributeModal
          visible={isEditModalVisible}
          onCancel={handleEditCancel}
          onSuccess={handleEditSuccess}
          attribute={editingAttribute}
        />
      )}
      {isManageValuesModalVisible && managingValuesForAttribute && (
        <ManageAttributeValuesModal
          visible={isManageValuesModalVisible}
          onCancel={handleManageValuesCancel}
          attributeId={managingValuesForAttribute.id}
          attributeName={managingValuesForAttribute.name}
        />
      )}
    </div>
  );
};

export default AttributesPage;
