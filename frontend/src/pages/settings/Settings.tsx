import React from "react";
import {
  Typography,
  Form,
  Input,
  Button,
  Card,
  Tabs,
  Switch,
  Select,
  Divider,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";

const { Title } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const Settings: React.FC = () => {
  return (
    <div>
      <Title level={2}>Settings</Title>

      <Tabs defaultActiveKey="1">
        <TabPane tab="General" key="1">
          <Card>
            <Form layout="vertical">
              <Form.Item
                label="Store Name"
                name="storeName"
                initialValue="Electronics Store"
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Store Email"
                name="storeEmail"
                initialValue="contact@electronicsstore.com"
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Store Phone"
                name="storePhone"
                initialValue="0123456789"
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Address"
                name="storeAddress"
                initialValue="123 Main Street, Ho Chi Minh City, Vietnam"
              >
                <Input.TextArea rows={3} />
              </Form.Item>

              <Form.Item>
                <Button type="primary" icon={<SaveOutlined />}>
                  Save Changes
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab="Users & Permissions" key="2">
          <Card>
            <p>
              This is a placeholder for user management and permission settings.
            </p>
            <p>
              Here you would see a list of admin users and their
              roles/permissions.
            </p>
          </Card>
        </TabPane>

        <TabPane tab="Email" key="3">
          <Card>
            <Form layout="vertical">
              <Form.Item
                label="SMTP Server"
                name="smtpServer"
                initialValue="smtp.example.com"
              >
                <Input />
              </Form.Item>

              <Form.Item label="SMTP Port" name="smtpPort" initialValue="587">
                <Input />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                initialValue="system@electronicsstore.com"
              >
                <Input />
              </Form.Item>

              <Form.Item label="Password" name="password">
                <Input.Password />
              </Form.Item>

              <Divider />

              <Form.Item
                label="Email Notifications"
                name="emailNotifications"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>

              <Form.Item>
                <Button type="primary" icon={<SaveOutlined />}>
                  Save Changes
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane tab="Payment" key="4">
          <Card>
            <Form layout="vertical">
              <Form.Item label="Currency" name="currency" initialValue="VND">
                <Select>
                  <Option value="VND">VND - Vietnamese Dong</Option>
                  <Option value="USD">USD - US Dollar</Option>
                  <Option value="EUR">EUR - Euro</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="Enable PayPal"
                name="enablePaypal"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="Enable Credit Card"
                name="enableCreditCard"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="Enable COD (Cash On Delivery)"
                name="enableCOD"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>

              <Form.Item>
                <Button type="primary" icon={<SaveOutlined />}>
                  Save Changes
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Settings;
