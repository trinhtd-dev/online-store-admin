import React from "react";
import { Form, Input, Button, Card, Spin } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";

const LoginContainer = styled.div`
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f0f2f5;
`;

const LoginCard = styled(Card)`
  width: 100%;
  max-width: 400px;
`;

const LoginTitle = styled.h2`
  text-align: center;
  margin-bottom: 24px;
`;

const SpinContainer = styled.div`
  text-align: center;
  margin-bottom: 16px;
`;

interface LoginForm {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const { showNotification } = useNotification();
  const [form] = Form.useForm();

  const onFinish = async (values: LoginForm) => {
    try {
      await login(values.email, values.password);
      showNotification("Login successful!", "success");
    } catch (error) {
      showNotification("Invalid email or password", "error");
      form.resetFields(["password"]);
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <LoginTitle>Admin Login</LoginTitle>
        {isLoading && (
          <SpinContainer>
            <Spin size="large" />
          </SpinContainer>
        )}
        <Form
          form={form}
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Please input your email!" },
              { type: "email", message: "Please enter a valid email address" },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={isLoading}
            >
              Log in
            </Button>
          </Form.Item>
        </Form>
      </LoginCard>
    </LoginContainer>
  );
};

export default Login;
