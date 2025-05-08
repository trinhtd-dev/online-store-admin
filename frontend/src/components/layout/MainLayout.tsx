import React, { useState } from "react";
import {
  Layout,
  Menu,
  Dropdown,
  Avatar,
  Space,
  Divider,
  Button,
  Typography,
} from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  BarChartOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UserSwitchOutlined,
  DownOutlined,
  TeamOutlined,
  TagsOutlined,
  AppstoreOutlined,
  GoldOutlined,
  CommentOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const SIDER_WIDTH = 200;
const SIDER_COLLAPSED_WIDTH = 80;

const StyledLayout = styled(Layout)`
  min-height: 100vh;
`;

const FixedSider = styled(Sider)`
  overflow: auto;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 1000;

  .ant-menu-item:hover {
    background-color: rgba(255, 255, 255, 0.08) !important;
  }

  .ant-menu-item-selected {
    background-color: #1677ff !important;
  }

  .ant-menu-item-selected .ant-menu-title-content,
  .ant-menu-item-selected .anticon {
  }
`;

const StyledLogo = styled.div`
  height: 64px;
  padding: 0 16px;
  background: linear-gradient(135deg, #001529 0%, #002140 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  font-weight: bold;
`;

const InnerLayout = styled(Layout)<{ collapsed: boolean }>`
  margin-left: ${(props) =>
    props.collapsed ? `${SIDER_COLLAPSED_WIDTH}px` : `${SIDER_WIDTH}px`};
  transition: margin-left 0.2s;
  min-height: 100vh;
`;

const StyledHeader = styled(Header)<{ collapsed: boolean }>`
  padding: 0 24px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const CollapseButton = styled.div`
  font-size: 18px;
  cursor: pointer;
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
`;

const UserInfo = styled.div`
  margin-right: 8px;
  text-align: right;
`;

const UserName = styled(Text)`
  font-weight: 500;
`;

const UserRole = styled(Text)`
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  display: block;
`;

const StyledContent = styled(Content)`
  margin: 24px 16px;
  padding: 24px;
  background: #fff;
`;

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      key: "/",
      icon: <DashboardOutlined />,
      label: "Tổng quan",
    },
    {
      key: "/products",
      icon: <ShoppingOutlined />,
      label: "Sản phẩm",
    },
    {
      key: "/categories",
      icon: <AppstoreOutlined />,
      label: "Danh mục",
    },
    {
      key: "/attributes",
      icon: <GoldOutlined />,
      label: "Thuộc tính",
    },
    {
      key: "/orders",
      icon: <ShoppingCartOutlined />,
      label: "Đơn hàng",
    },
    {
      key: "/accounts",
      icon: <UserOutlined />,
      label: "Tài khoản",
    },
    {
      key: "/roles",
      icon: <TeamOutlined />,
      label: "Vai trò",
    },
    {
      key: "/discounts",
      icon: <TagsOutlined />,
      label: "Khuyến mãi",
    },
    {
      key: "/feedback",
      icon: <CommentOutlined />,
      label: "Phản hồi",
    },
    {
      key: "/reports",
      icon: <BarChartOutlined />,
      label: "Báo cáo",
    },
    {
      key: "/settings",
      icon: <SettingOutlined />,
      label: "Cài đặt",
    },
  ];

  const handleLogout = () => {
    logout();
  };

  const handleProfile = () => {
    navigate("/profile");
  };

  const userDropdownItems: MenuProps["items"] = [
    {
      key: "1",
      label: "Thông tin cá nhân",
      icon: <UserOutlined />,
      onClick: handleProfile,
    },
    {
      key: "2",
      type: "divider",
    },
    {
      key: "3",
      label: "Đăng xuất",
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  return (
    <StyledLayout>
      <FixedSider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={SIDER_WIDTH}
        collapsedWidth={SIDER_COLLAPSED_WIDTH}
      >
        <StyledLogo>{collapsed ? "AS" : "Quản trị hệ thống"}</StyledLogo>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </FixedSider>
      <InnerLayout collapsed={collapsed}>
        <StyledHeader collapsed={collapsed}>
          <CollapseButton onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </CollapseButton>

          <UserSection>
            {user && (
              <Dropdown
                menu={{ items: userDropdownItems }}
                placement="bottomRight"
              >
                <Space style={{ cursor: "pointer" }}>
                  <UserInfo>
                    <UserName>{user.name}</UserName>
                  </UserInfo>
                  <Avatar
                    style={{ backgroundColor: "#1890ff" }}
                    icon={<UserOutlined />}
                  />
                  <DownOutlined style={{ fontSize: "12px" }} />
                </Space>
              </Dropdown>
            )}
          </UserSection>
        </StyledHeader>
        <StyledContent>{children}</StyledContent>
      </InnerLayout>
    </StyledLayout>
  );
};

export default MainLayout;
