import axiosClient from "../api/axiosClient";
import {
  GetOrdersParams,
  GetOrdersResponse,
  OrderResponse,
} from "../api/types";

/**
 * Get a paginated, filtered, and sorted list of orders.
 * @param params - Parameters for pagination, filtering, and sorting.
 */
export const getAllOrders = async (
  params: GetOrdersParams
): Promise<GetOrdersResponse> => {
  // Clean up undefined or null parameters before sending
  const cleanedParams = Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      acc[key] = value;
    }
    return acc;
  }, {} as any);

  // The response.data is automatically returned by axiosClient interceptor
  // Use 'as any' to bypass TS incorrect type inference due to interceptor
  return axiosClient.get<GetOrdersResponse>("/orders", {
    params: cleanedParams,
  }) as any;
};

/**
 * Get a single order by its ID, including items and history.
 * @param id - The ID of the order.
 */
export const getOrderById = async (id: number): Promise<OrderResponse> => {
  // Use 'as any' to bypass TS incorrect type inference due to interceptor
  return axiosClient.get<OrderResponse>(`/orders/${id}`) as any;
};

/**
 * Mark an order as paid and update its status (typically to Processing).
 * @param id - The ID of the order.
 */
export const markOrderAsPaid = async (id: number): Promise<OrderResponse> => {
  // Use 'as any' to bypass TS incorrect type inference due to interceptor
  return axiosClient.put<OrderResponse>(`/orders/${id}/pay`, {}) as any;
};

/**
 * Mark an order as delivered (Completed).
 * Requires order to be paid first.
 * @param id - The ID of the order.
 */
export const markOrderAsDelivered = async (
  id: number
): Promise<OrderResponse> => {
  // Use 'as any' to bypass TS incorrect type inference due to interceptor
  return axiosClient.put<OrderResponse>(`/orders/${id}/deliver`, {}) as any;
};

/**
 * Cancel an order.
 * @param id - The ID of the order.
 */
export const cancelOrder = async (id: number): Promise<OrderResponse> => {
  // Use 'as any' to bypass TS incorrect type inference due to interceptor
  return axiosClient.put<OrderResponse>(`/orders/${id}/cancel`, {}) as any;
};

export const updateOrderStatus = async (
  orderId: number,
  newStatus: string,
  reason?: string
): Promise<OrderResponse> => {
  return axiosClient.put(`/orders/${orderId}/update-status`, {
    newStatus,
    reason,
  });
};

// Add other order-related service functions here as needed (e.g., updateOrderStatus, etc.)
