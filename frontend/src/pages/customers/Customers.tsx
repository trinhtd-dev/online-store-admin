import React from "react";
import { Typography, Table, Button, Space } from "antd";
import { UserAddOutlined } from "@ant-design/icons";

const { Title } = Typography;

interface Customer {
  key: string;
  id: number;
  name: string;
  email: string;
  phone: string;
  orders: number;
  totalSpent: number;
}

const mockData: Customer[] = [
  {
    key: "1",
    id: 1,
    name: "Nguyen Van A",
    email: "nguyenvana@example.com",
    phone: "0912345678",
    orders: 8,
    totalSpent: 12500000,
  },
  {
    key: "2",
    id: 2,
    name: "Tran Thi B",
    email: "tranthib@example.com",
    phone: "0923456789",
    orders: 3,
    totalSpent: 5600000,
  },
  {
    key: "3",
    id: 3,
    name: "Le Van C",
    email: "levanc@example.com",
    phone: "0934567890",
    orders: 12,
    totalSpent: 28750000,
  },
  {
    key: "4",
    id: 4,
    name: "Pham Thi D",
    email: "phamthid@example.com",
    phone: "0945678901",
    orders: 1,
    totalSpent: 750000,
  },
  {
    key: "5",
    id: 5,
    name: "Hoang Van E",
    email: "hoangvane@example.com",
    phone: "0956789012",
    orders: 5,
    totalSpent: 8900000,
  },
];

const Customers: React.FC = () => {
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <a>{text}</a>,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "Orders",
      dataIndex: "orders",
      key: "orders",
    },
    {
      title: "Total Spent (VND)",
      dataIndex: "totalSpent",
      key: "totalSpent",
      render: (totalSpent: number) => totalSpent.toLocaleString(),
    },
    {
      title: "Action",
      key: "action",
      render: (_: any, record: Customer) => (
        <Space size="middle">
          <a>View Orders</a>
          <a>Edit</a>
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
        }}
      >
        <Title level={2}>Customers</Title>
        <Button type="primary" icon={<UserAddOutlined />}>
          Add Customer
        </Button>
      </div>
      <Table columns={columns} dataSource={mockData} />
    </div>
  );
};

export default Customers;
