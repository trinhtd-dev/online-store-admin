import React, { ReactNode } from "react";
import { Breadcrumb, Button, Space } from "antd";
import { Link } from "react-router-dom";
import { ArrowLeftOutlined, EditOutlined } from "@ant-design/icons";

interface DetailPageHeaderProps {
  title: string;
  moduleName: string;
  moduleUrl: string;
  onBack: () => void;
  onEdit?: () => void;
  editText?: string;
  showEditButton?: boolean;
  extra?: ReactNode;
}

const DetailPageHeader: React.FC<DetailPageHeaderProps> = ({
  title,
  moduleName,
  moduleUrl,
  onBack,
  onEdit,
  editText = "Sửa",
  showEditButton = true,
  extra,
}) => {
  return (
    <>
      <Breadcrumb style={{ marginBottom: "16px" }}>
        <Breadcrumb.Item>
          <Link to="/">Trang chủ</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to={moduleUrl}>{moduleName}</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{title || "Loading..."}</Breadcrumb.Item>
      </Breadcrumb>

      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            Quay lại danh sách
          </Button>
          {showEditButton && onEdit && (
            <Button icon={<EditOutlined />} onClick={onEdit} type="primary">
              {editText}
            </Button>
          )}
          {extra}
        </Space>
      </div>
    </>
  );
};

export default DetailPageHeader;
