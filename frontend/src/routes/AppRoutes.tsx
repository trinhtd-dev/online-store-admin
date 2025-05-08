import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/AuthContext";
import { Spin } from "antd";
import Categories from "../pages/categories/Categories";
import Accounts from "../pages/accounts/Accounts";
import RolesPage from "../pages/roles/RolesPage";
import Discounts from "../pages/discounts/Discounts";
import AttributesPage from "../pages/attributes/AttributesPage";

// Lazy load components
const Login = React.lazy(() => import("../pages/auth/Login"));
const Dashboard = React.lazy(() => import("../pages/dashboard/Dashboard"));
const Products = React.lazy(() => import("../pages/products/Products"));
const ProductDetailPage = React.lazy(
  () => import("../pages/products/ProductDetailPage")
);
const Orders = React.lazy(() => import("../pages/orders/Orders"));
const OrderDetailPage = React.lazy(
  () => import("../pages/orders/OrderDetailPage")
);
const Customers = React.lazy(() => import("../pages/customers/Customers"));
const Reports = React.lazy(() => import("../pages/reports/Reports"));
const Settings = React.lazy(() => import("../pages/settings/Settings"));
const Profile = React.lazy(() => import("../pages/profile/Profile"));
const FeedbackPage = React.lazy(() => import("../pages/feedback/FeedbackPage"));

// Loading component
const LoadingFallback = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
    }}
  >
    <Spin size="large" />
  </div>
);

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return <LoadingFallback />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading while checking initial authentication
  if (isLoading) {
    return <LoadingFallback />;
  }

  return (
    <React.Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Redirect to dashboard if already logged in */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          }
        />

        <Route
          path="/products/:productId"
          element={
            <ProtectedRoute>
              <ProductDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders/:orderId"
          element={
            <ProtectedRoute>
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers/*"
          element={
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/*"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/*"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/categories"
          element={
            <ProtectedRoute>
              <Categories />
            </ProtectedRoute>
          }
        />

        <Route
          path="/accounts"
          element={
            <ProtectedRoute>
              <Accounts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/roles"
          element={
            <ProtectedRoute>
              <RolesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/discounts"
          element={
            <ProtectedRoute>
              <Discounts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/attributes"
          element={
            <ProtectedRoute>
              <AttributesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/feedback"
          element={
            <ProtectedRoute>
              <FeedbackPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
  );
};

export default AppRoutes;
