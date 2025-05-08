import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { ConfigProvider, App as AntApp } from "antd";
import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import "antd/dist/reset.css";
import "./App.css";
import "./styles/GlobalTableStyles.css";

const App: React.FC = () => {
  return (
    <ConfigProvider>
      <AntApp>
        <NotificationProvider>
          <Router>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </Router>
        </NotificationProvider>
      </AntApp>
    </ConfigProvider>
  );
};

export default App;
