import React from "react";
import { Spin } from "antd";

interface LoadingIndicatorProps {
  height?: string | number;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  height = "50vh",
}) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: height,
      }}
    >
      <Spin size="large" />
    </div>
  );
};

export default LoadingIndicator; 