import React, { useRef } from "react";
import { Typography, Card, Spin, Space, Button } from "antd";
import {
  FullscreenOutlined,
  ReloadOutlined,
  FullscreenExitOutlined,
} from "@ant-design/icons";

const { Title } = Typography;

const Dashboard: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Handle iframe load event
  const handleIframeLoad = () => {
    setLoading(false);
  };

  // Handle refresh of Power BI report
  const handleRefresh = () => {
    setLoading(true);
    if (iframeRef.current) {
      const src = iframeRef.current.src;
      iframeRef.current.src = "";
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = src;
        }
      }, 100);
    }
  };

  // Toggle expanded view (larger but not fullscreen)
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Handle true fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      if (cardRef.current?.requestFullscreen) {
        cardRef.current
          .requestFullscreen()
          .then(() => {
            setIsFullscreen(true);
          })
          .catch((err) => {
            console.error(
              `Error attempting to enable fullscreen: ${err.message}`
            );
          });
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document
          .exitFullscreen()
          .then(() => {
            setIsFullscreen(false);
          })
          .catch((err) => {
            console.error(
              `Error attempting to exit fullscreen: ${err.message}`
            );
          });
      }
    }
  };

  // Listen for fullscreen change events
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Dashboard Overview
        </Title>
        <Space>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            type="default"
            icon={<FullscreenOutlined />}
            onClick={toggleExpanded}
          >
            {expanded ? "Normal View" : "Expanded View"}
          </Button>
          <Button
            type="default"
            icon={
              isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />
            }
            onClick={toggleFullscreen}
          >
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </Button>
        </Space>
      </div>

      <Card
        ref={cardRef}
        title={!isFullscreen && "Business Performance Overview"}
        style={{
          marginBottom: 24,
          height: expanded ? "calc(100vh - 120px)" : "auto",
          ...(isFullscreen && {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            margin: 0,
            zIndex: 1000,
            borderRadius: 0,
          }),
        }}
        bodyStyle={{
          padding: loading ? 24 : 0,
          height:
            expanded || isFullscreen
              ? "calc(100vh - 180px)"
              : loading
              ? "541px"
              : "auto",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          ...(isFullscreen && { height: "100vh" }),
        }}
      >
        {loading && <Spin size="large" />}
        <iframe
          ref={iframeRef}
          title="Overview"
          width="100%"
          height={expanded || isFullscreen ? "100%" : "541.25"}
          src="https://app.powerbi.com/reportEmbed?reportId=75f14c57-2da1-4b1c-84cd-accd38d3a9d0&autoAuth=true&ctid=e7572e92-7aee-4713-a3c4-ba64888ad45f"
          style={{
            border: "none",
            display: loading ? "none" : "block",
          }}
          frameBorder="0"
          allowFullScreen={true}
          onLoad={handleIframeLoad}
        ></iframe>
      </Card>
    </div>
  );
};

export default Dashboard;
