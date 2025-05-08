import React, { createContext, useState, useContext, ReactNode } from "react";
import CustomNotification from "../components/common/CustomNotification";
import styled from "styled-components";

interface NotificationData {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
}

interface NotificationContextType {
  showNotification: (
    message: string,
    type: "success" | "error" | "info" | "warning",
    duration?: number
  ) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

const NotificationContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999; // Đảm bảo hiển thị trên cùng
  width: 320px; // Hoặc chiều rộng bạn muốn
`;

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const showNotification = (
    message: string,
    type: "success" | "error" | "info" | "warning",
    duration: number = 3000
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <NotificationContainer>
        {notifications.map((n) => (
          <CustomNotification
            key={n.id}
            id={n.id}
            message={n.message}
            type={n.type}
            duration={n.duration}
            onClose={removeNotification}
          />
        ))}
      </NotificationContainer>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};
