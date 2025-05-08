import React from "react";
import { Button, Space, Popconfirm } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";

interface ActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  viewText?: string;
  editText?: string;
  deleteText?: string;
  deleteConfirmTitle?: string;
  itemName?: string;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onView,
  onEdit,
  onDelete,
  viewText = "Xem",
  editText = "Sửa",
  deleteText = "Xóa",
  deleteConfirmTitle = "Bạn có chắc chắn muốn xóa?",
  itemName,
}) => {
  return (
    <Space size="small" wrap={true}>
      {onView && (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={onView}
          style={{ padding: "0 2px" }}
        >
          {viewText}
        </Button>
      )}
      {onEdit && (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={onEdit}
          style={{ padding: "0 2px" }}
        >
          {editText}
        </Button>
      )}
      {onDelete && (
        <Popconfirm
          title={
            itemName ? `${deleteConfirmTitle} ${itemName}?` : deleteConfirmTitle
          }
          onConfirm={onDelete}
          okText="Có"
          cancelText="Không"
        >
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            style={{ padding: "0 2px" }}
          >
            {deleteText}
          </Button>
        </Popconfirm>
      )}
    </Space>
  );
};

export default ActionButtons;
