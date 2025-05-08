import React, { ReactNode } from "react";
import { Card, Form, Row, Col, Button, Input } from "antd";
import { SearchOutlined, FilterOutlined } from "@ant-design/icons";

const { Search } = Input;

interface FilterCardProps {
  onSearch: (value: string) => void;
  searchValue: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFilter: () => void;
  onReset: () => void;
  children?: ReactNode;
  searchPlaceholder?: string;
}

const FilterCard: React.FC<FilterCardProps> = ({
  onSearch,
  searchValue,
  onSearchChange,
  onFilter,
  onReset,
  children,
  searchPlaceholder = "Tìm kiếm...",
}) => {
  return (
    <Card style={{ marginBottom: 16 }}>
      <Form layout="vertical">
        <Row gutter={16}>
          <Col xs={24} sm={24} md={8} lg={8} xl={8}>
            <Form.Item label="Tìm kiếm">
              <Search
                placeholder={searchPlaceholder}
                onChange={onSearchChange}
                value={searchValue}
                allowClear
                enterButton={<SearchOutlined />}
                onSearch={onSearch}
              />
            </Form.Item>
          </Col>
          {/* Các trường lọc bổ sung được truyền vào từ component cha */}
          {children}
        </Row>
        <Row>
          <Col span={24} style={{ textAlign: "right" }}>
            <Button onClick={onReset} style={{ marginRight: 8 }}>
              Xóa bộ lọc
            </Button>
            <Button type="primary" icon={<FilterOutlined />} onClick={onFilter}>
              Lọc
            </Button>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default FilterCard;
