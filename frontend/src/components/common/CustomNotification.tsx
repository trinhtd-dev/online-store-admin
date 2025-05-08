import React, { useState, useEffect } from "react";
import styled, { keyframes, css } from "styled-components";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  InfoCircleFilled,
  WarningFilled,
  CloseOutlined,
} from "@ant-design/icons";

interface NotificationProps {
  id: string; // Để xử lý việc xóa thông báo cụ thể
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
  onClose: (id: string) => void; // Callback khi thông báo đóng
}

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const fadeOut = keyframes`
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-20px);
  }
`;

const typeColors = {
  success: "#52c41a",
  error: "#ff4d4f",
  info: "#1890ff",
  warning: "#faad14",
};

const getBackgroundColor = (type: string) => {
  // Sử dụng phiên bản nhạt hơn của màu chính cho nền
  switch (type) {
    case "success":
      return "#f6ffed";
    case "error":
      return "#fff2f0";
    case "info":
      return "#e6f7ff";
    case "warning":
      return "#fffbe6";
    default:
      return "#fff";
  }
};

const getTextColor = (type: string) => {
  switch (type) {
    case "success":
      return "#52c41a";
    case "error":
      return "#ff4d4f";
    case "info":
      return "#1890ff";
    case "warning":
      return "#faad14";
    default:
      return "#000";
  }
};

const NotificationWrapper = styled.div<{
  type: "success" | "error" | "info" | "warning";
  isClosing: boolean;
}>`
  padding: 16px 20px;
  margin-bottom: 12px;
  border-radius: 8px;
  background-color: ${(props) => getBackgroundColor(props.type)};
  color: ${(props) => getTextColor(props.type)};
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  animation: ${(props) => (props.isClosing ? fadeOut : fadeIn)} 0.3s ease-out
    forwards;
  display: flex;
  align-items: center;
  border-left: 4px solid ${(props) => typeColors[props.type]};
  width: 100%;
  max-width: 380px;
`;

const IconWrapper = styled.span`
  font-size: 18px;
  margin-right: 12px;
  display: flex;
  align-items: center;
`;

const MessageContent = styled.span`
  flex-grow: 1;
  line-height: 1.5;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #8c8c8c;
  font-size: 14px;
  margin-left: 15px;
  cursor: pointer;
  opacity: 0.7;
  padding: 0;
  display: flex;
  align-items: center;
  &:hover {
    opacity: 1;
    color: #595959;
  }
`;

const CustomNotification: React.FC<NotificationProps> = ({
  id,
  message,
  type,
  duration = 4000, // Tăng thời gian hiển thị lên 4 giây
  onClose,
}) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => onClose(id), 300); // Đợi animation fadeOut hoàn thành
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, id, onClose]);

  const handleManualClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(id), 300);
  };

  const renderIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircleFilled style={{ color: typeColors.success }} />;
      case "error":
        return <CloseCircleFilled style={{ color: typeColors.error }} />;
      case "info":
        return <InfoCircleFilled style={{ color: typeColors.info }} />;
      case "warning":
        return <WarningFilled style={{ color: typeColors.warning }} />;
      default:
        return null;
    }
  };

  return (
    <NotificationWrapper type={type} isClosing={isClosing}>
      <IconWrapper>{renderIcon()}</IconWrapper>
      <MessageContent>{message}</MessageContent>
      <CloseButton onClick={handleManualClose}>
        <CloseOutlined />
      </CloseButton>
    </NotificationWrapper>
  );
};

export default CustomNotification;
