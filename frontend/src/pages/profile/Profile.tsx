import React, { useState, useEffect } from "react";
import {
  Card,
  Avatar,
  Typography,
  Tabs,
  Form,
  Input,
  Button,
  Row,
  Col,
} from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import axiosClient from "../../api/axiosClient";
import { useNotification } from "../../context/NotificationContext";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 24px;
  margin-bottom: 24px;
  background: #f9f9f9;
  border-radius: 8px;
`;

const UserAvatar = styled(Avatar)`
  margin-right: 24px;
  background-color: #1890ff;
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const UserInfo = styled.div`
  flex: 1;
`;

const StyledCard = styled(Card)`
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileFormValues {
  fullName: string;
  email: string;
}

interface ProfileResponse {
  id: number;
  name: string;
  email: string;
  role: string;
}

const Profile: React.FC = () => {
  const { user, updateUserInfo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const { showNotification } = useNotification();

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        fullName: user.name,
        email: user.email,
      });
    }
  }, [user, profileForm]);

  const handleProfileUpdate = async (values: ProfileFormValues) => {
    try {
      setLoading(true);
      const response = (await axiosClient.put("/auth/profile", {
        fullName: values.fullName,
      })) as ProfileResponse;

      updateUserInfo({
        name: response.name,
        email: user?.email || "",
      });

      showNotification(
        "Thông tin cá nhân của bạn đã được cập nhật.",
        "success"
      );

      profileForm.setFieldsValue({
        fullName: response.name,
      });
    } catch (error: any) {
      console.error("Profile update error:", error);
      const errorMessage =
        error.response?.data?.message ||
        (error.response ? "Đã xảy ra lỗi" : "Lỗi kết nối đến máy chủ");
      showNotification(
        `Không thể cập nhật thông tin: ${errorMessage}`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (values: PasswordFormValues) => {
    try {
      setLoading(true);

      if (values.newPassword !== values.confirmPassword) {
        showNotification("Mật khẩu xác nhận không khớp", "error");
        setLoading(false);
        return;
      }

      await axiosClient.put("/auth/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      showNotification(
        "Mật khẩu của bạn đã được cập nhật thành công.",
        "success"
      );

      passwordForm.resetFields();
    } catch (error: any) {
      console.error("Password update error:", error);
      let errorMessage = "Lỗi kết nối đến máy chủ";
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = "Mật khẩu hiện tại không chính xác";
        } else {
          errorMessage = error.response.data?.message || "Đã xảy ra lỗi";
        }
      }
      showNotification(`Không thể cập nhật mật khẩu: ${errorMessage}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={2}>Thông tin cá nhân</Title>

      <ProfileHeader>
        <UserAvatar size={80} icon={<UserOutlined />} />
        <UserInfo>
          <Title level={3}>{user?.name}</Title>
          <Text type="secondary">{user?.email}</Text>
          <div style={{ marginTop: 8 }}>
            <Text
              type="secondary"
              style={{
                background: "#e6f7ff",
                padding: "4px 8px",
                borderRadius: 4,
                color: "#1890ff",
              }}
            >
              {user?.role}
            </Text>
          </div>
        </UserInfo>
      </ProfileHeader>

      <Tabs defaultActiveKey="info">
        <TabPane tab="Thông tin cá nhân" key="info">
          <StyledCard title="Chi tiết tài khoản">
            <Form
              form={profileForm}
              layout="vertical"
              initialValues={{
                fullName: user?.name,
                email: user?.email,
              }}
              onFinish={handleProfileUpdate}
            >
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    name="fullName"
                    label="Họ và tên"
                    rules={[
                      { required: true, message: "Vui lòng nhập họ và tên" },
                    ]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Họ và tên" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { required: true, message: "Vui lòng nhập email" },
                      { type: "email", message: "Email không hợp lệ" },
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined />}
                      placeholder="Email"
                      disabled
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Cập nhật thông tin
                </Button>
              </Form.Item>
            </Form>
          </StyledCard>
        </TabPane>

        <TabPane tab="Đổi mật khẩu" key="password">
          <StyledCard title="Đổi mật khẩu">
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordUpdate}
            >
              <Form.Item
                name="currentPassword"
                label="Mật khẩu hiện tại"
                rules={[
                  {
                    required: true,
                    message: "Vui lòng nhập mật khẩu hiện tại",
                  },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Mật khẩu hiện tại"
                />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="Mật khẩu mới"
                rules={[
                  { required: true, message: "Vui lòng nhập mật khẩu mới" },
                  { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Mật khẩu mới"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Xác nhận mật khẩu mới"
                rules={[
                  { required: true, message: "Vui lòng xác nhận mật khẩu mới" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("newPassword") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error(
                          "Mật khẩu xác nhận không khớp với mật khẩu mới"
                        )
                      );
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Xác nhận mật khẩu mới"
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Cập nhật mật khẩu
                </Button>
              </Form.Item>
            </Form>
          </StyledCard>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Profile;
