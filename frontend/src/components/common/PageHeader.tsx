import React, { ReactNode } from "react";
import { Typography, Space, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";

const { Title } = Typography;

interface PageHeaderProps {
  title: string;
  onAdd?: () => void;
  addButtonText?: string;
  extra?: ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  onAdd,
  addButtonText = "Thêm mới",
  extra,
}) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 16,
        alignItems: "center",
      }}
    >
      <Title level={2}>{title}</Title>
      <Space>
        {onAdd && (
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
            {addButtonText}
          </Button>
        )}
        {extra}
      </Space>
    </div>
  );
};

export default PageHeader;
