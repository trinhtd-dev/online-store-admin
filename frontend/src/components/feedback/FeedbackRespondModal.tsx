import React, { useEffect, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  Rate,
  Typography,
  Spin,
  Image,
  Row,
  Col,
  Card,
  Divider,
  Popconfirm,
} from "antd";
import { useNotification } from "../../context/NotificationContext";
import feedbackService from "../../services/feedbackService";
import { FeedbackDetail } from "../../api/types";

const { Text, Title } = Typography;
const { TextArea } = Input;

interface FeedbackRespondModalProps {
  visible: boolean;
  feedbackId: number;
  onCancel: () => void;
  onSuccess: () => void;
}

const FeedbackRespondModal: React.FC<FeedbackRespondModalProps> = ({
  visible,
  feedbackId,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackDetail | null>(null);

  const { showNotification } = useNotification();

  useEffect(() => {
    if (visible && feedbackId) {
      fetchFeedbackDetail();
    }
  }, [visible, feedbackId]);

  const fetchFeedbackDetail = async () => {
    setLoading(true);
    try {
      const data = await feedbackService.getFeedbackById(feedbackId);
      setFeedback(data);

      // If a response exists, populate the form
      if (data.response_id && data.response_content) {
        form.setFieldsValue({
          response: data.response_content,
        });
      } else {
        form.resetFields();
      }
    } catch (error) {
      console.error("Error fetching feedback details:", error);
      showNotification(
        "Không thể tải thông tin phản hồi, vui lòng thử lại sau.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (feedback?.response_id) {
        // Update existing response
        await feedbackService.updateFeedbackResponse(feedback.response_id, {
          content: values.response,
        });
        showNotification("Cập nhật phản hồi thành công!", "success");
      } else {
        // Create new response
        await feedbackService.createFeedbackResponse(feedbackId, {
          content: values.response,
        });
        showNotification("Thêm phản hồi thành công!", "success");
      }

      onSuccess();
      onCancel();
    } catch (error: any) {
      if (error.errorFields) {
        // Form validation error
        return;
      }
      console.error("Error submitting response:", error);
      showNotification(
        `Lỗi: ${error.response?.data?.message || error.message}`,
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!feedback?.response_id) return;

    try {
      setSubmitting(true);
      await feedbackService.deleteFeedbackResponse(feedback.response_id);
      showNotification("Xóa phản hồi thành công!", "success");
      onSuccess();
      onCancel();
    } catch (error: any) {
      console.error("Error deleting response:", error);
      showNotification(
        `Lỗi: ${error.response?.data?.message || error.message}`,
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={visible}
      title="Chi tiết & Trả lời phản hồi"
      onCancel={onCancel}
      width={700}
      footer={null}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: "30px" }}>
          <Spin size="large" />
        </div>
      ) : feedback ? (
        <>
          <Card className="feedback-details-card" bordered={false}>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <Title level={5}>{feedback.product_name}</Title>
                    <div>
                      <Rate disabled value={feedback.rating} />
                      <Text type="secondary" style={{ marginLeft: "10px" }}>
                        {new Date(
                          feedback.feedback_created_at
                        ).toLocaleString()}
                      </Text>
                    </div>
                  </div>
                </div>
              </Col>

              <Col span={24}>
                <Text strong>Khách hàng:</Text> {feedback.customer_name} (
                {feedback.customer_email})
                {feedback.customer_phone_number &&
                  ` - ${feedback.customer_phone_number}`}
              </Col>

              <Col span={24}>
                <Text strong>Nhận xét:</Text>
              </Col>

              <Col span={24}>
                <div
                  style={{
                    whiteSpace: "pre-line",
                    background: "#f5f5f5",
                    padding: "12px",
                    borderRadius: "4px",
                    marginTop: "10px",
                  }}
                >
                  {feedback.comment || "(Không có nhận xét)"}
                </div>
              </Col>

              {feedback.response_id && (
                <>
                  <Col span={24}>
                    <Divider>Phản hồi của Admin</Divider>
                  </Col>
                  <Col span={24}>
                    <div
                      style={{
                        whiteSpace: "pre-line",
                        background: "#e6f7ff",
                        padding: "12px",
                        borderRadius: "4px",
                      }}
                    >
                      {feedback.response_content}
                    </div>
                    <div style={{ textAlign: "right", marginTop: "8px" }}>
                      <Text type="secondary">
                        {feedback.response_created_at &&
                          new Date(
                            feedback.response_created_at
                          ).toLocaleString()}
                        {feedback.manager_name && ` - ${feedback.manager_name}`}
                      </Text>
                    </div>
                  </Col>
                </>
              )}
            </Row>
          </Card>

          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              name="response"
              label="Trả lời phản hồi"
              rules={[
                { required: true, message: "Vui lòng nhập nội dung phản hồi" },
              ]}
            >
              <TextArea rows={4} placeholder="Nhập nội dung trả lời..." />
            </Form.Item>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {feedback.response_id && (
                <Popconfirm
                  title="Bạn có chắc chắn muốn xóa phản hồi này?"
                  onConfirm={handleDelete}
                  okText="Xóa"
                  cancelText="Hủy"
                >
                  <Button danger loading={submitting}>
                    Xóa phản hồi
                  </Button>
                </Popconfirm>
              )}
              <div style={{ marginLeft: "auto" }}>
                <Button onClick={onCancel} style={{ marginRight: 8 }}>
                  Hủy
                </Button>
                <Button type="primary" htmlType="submit" loading={submitting}>
                  {feedback.response_id ? "Cập nhật" : "Gửi phản hồi"}
                </Button>
              </div>
            </div>
          </Form>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <Text type="danger">Không thể tải thông tin phản hồi</Text>
        </div>
      )}
    </Modal>
  );
};

export default FeedbackRespondModal;
