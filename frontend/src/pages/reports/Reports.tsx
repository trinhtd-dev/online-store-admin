import React, { useState, useRef, useEffect } from "react";
import { Typography, Card, Tabs, Spin, Space, Button } from "antd";
import {
  FullscreenOutlined,
  ReloadOutlined,
  FullscreenExitOutlined,
} from "@ant-design/icons";

const { Title } = Typography;

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState("1");
  const [loading, setLoading] = useState({
    products: true,
    orders: true,
    customers: true,
  });
  const [expanded, setExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const cardRefs = {
    orders: useRef<HTMLDivElement>(null),
    products: useRef<HTMLDivElement>(null),
    customers: useRef<HTMLDivElement>(null),
  };

  const iframeRefs = {
    orders: useRef<HTMLIFrameElement>(null),
    products: useRef<HTMLIFrameElement>(null),
    customers: useRef<HTMLIFrameElement>(null),
  };

  // Get current active card and iframe refs
  const getActiveRefs = () => {
    const type =
      activeTab === "1"
        ? "orders"
        : activeTab === "2"
        ? "products"
        : "customers";
    return {
      cardRef: cardRefs[type],
      iframeRef: iframeRefs[type],
      type,
    };
  };

  // Handle iframe load events
  const handleIframeLoad = (
    reportType: "products" | "orders" | "customers"
  ) => {
    setLoading((prev) => ({
      ...prev,
      [reportType]: false,
    }));
  };

  // Handle refresh of Power BI report
  const handleRefresh = () => {
    const { iframeRef, type } = getActiveRefs();

    setLoading((prev) => ({
      ...prev,
      [type]: true,
    }));

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
    const { cardRef } = getActiveRefs();

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
  useEffect(() => {
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
          Reports & Analytics
        </Title>
        <Space>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            disabled={
              loading[
                activeTab === "1"
                  ? "orders"
                  : activeTab === "2"
                  ? "products"
                  : "customers"
              ]
            }
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

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "1",
            label: "Sales",
            children: (
              <Card
                ref={cardRefs.orders}
                title={!isFullscreen && "Sales Overview"}
                style={{
                  marginTop: 16,
                  height: expanded ? "calc(100vh - 166px)" : "auto",
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
                  padding: loading.orders ? 24 : 0,
                  height:
                    expanded || isFullscreen
                      ? "calc(100vh - 226px)"
                      : loading.orders
                      ? "541px"
                      : "auto",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  ...(isFullscreen && { height: "100vh" }),
                }}
              >
                {loading.orders && <Spin size="large" />}
                <iframe
                  ref={iframeRefs.orders}
                  title="Order"
                  width="100%"
                  height={expanded || isFullscreen ? "100%" : "541.25"}
                  src="https://app.powerbi.com/reportEmbed?reportId=9f63be6d-d67f-47ad-a63f-32a0f30264f0&autoAuth=true&ctid=e7572e92-7aee-4713-a3c4-ba64888ad45f"
                  style={{
                    border: "none",
                    display: loading.orders ? "none" : "block",
                  }}
                  frameBorder="0"
                  allowFullScreen={true}
                  onLoad={() => handleIframeLoad("orders")}
                ></iframe>
              </Card>
            ),
          },
          {
            key: "2",
            label: "Products",
            children: (
              <Card
                ref={cardRefs.products}
                title={!isFullscreen && "Product Performance"}
                style={{
                  marginTop: 16,
                  height: expanded ? "calc(100vh - 166px)" : "auto",
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
                  padding: loading.products ? 24 : 0,
                  height:
                    expanded || isFullscreen
                      ? "calc(100vh - 226px)"
                      : loading.products
                      ? "541px"
                      : "auto",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  ...(isFullscreen && { height: "100vh" }),
                }}
              >
                {loading.products && <Spin size="large" />}
                <iframe
                  ref={iframeRefs.products}
                  title="Product"
                  width="100%"
                  height={expanded || isFullscreen ? "100%" : "541.25"}
                  src="https://app.powerbi.com/reportEmbed?reportId=b979d43a-2e5c-4f12-b0b2-ee0147f0f81c&autoAuth=true&ctid=e7572e92-7aee-4713-a3c4-ba64888ad45f"
                  style={{
                    border: "none",
                    display: loading.products ? "none" : "block",
                  }}
                  frameBorder="0"
                  allowFullScreen={true}
                  onLoad={() => handleIframeLoad("products")}
                ></iframe>
              </Card>
            ),
          },
          {
            key: "3",
            label: "Customers",
            children: (
              <Card
                ref={cardRefs.customers}
                title={!isFullscreen && "Customer Analytics"}
                style={{
                  marginTop: 16,
                  height: expanded ? "calc(100vh - 166px)" : "auto",
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
                  padding: loading.customers ? 24 : 0,
                  height:
                    expanded || isFullscreen
                      ? "calc(100vh - 226px)"
                      : loading.customers
                      ? "541px"
                      : "auto",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  ...(isFullscreen && { height: "100vh" }),
                }}
              >
                {loading.customers && <Spin size="large" />}
                <iframe
                  ref={iframeRefs.customers}
                  title="Customer"
                  width="100%"
                  height={expanded || isFullscreen ? "100%" : "541.25"}
                  src="https://app.powerbi.com/reportEmbed?reportId=ab38efa0-b93d-422a-83e4-6ef0604f3...888ad45f"
                  style={{
                    border: "none",
                    display: loading.customers ? "none" : "block",
                  }}
                  frameBorder="0"
                  allowFullScreen={true}
                  onLoad={() => handleIframeLoad("customers")}
                ></iframe>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};

export default Reports;
