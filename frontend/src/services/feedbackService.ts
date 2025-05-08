import axiosClient from "../api/axiosClient";
import {
  FeedbackResponse,
  FeedbackDetail,
  FeedbackResponsePayload,
  GetFeedbackParams,
  PaginatedFeedbackResponse,
} from "../api/types";

// Phản hồi từ backend API sau khi đã được xử lý bởi axios interceptor
interface FeedbackApiResponse {
  status: string;
  data: FeedbackResponse[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

const feedbackService = {
  /**
   * Lấy danh sách phản hồi với các tùy chọn lọc và phân trang
   */
  getAllFeedback: async (
    params: GetFeedbackParams = {}
  ): Promise<PaginatedFeedbackResponse> => {
    console.log(
      "[feedbackService] getAllFeedback PARAMS:",
      JSON.stringify(params)
    );
    try {
      // Gọi API lấy dữ liệu từ backend
      const response = await axiosClient.get("/feedback", { params });
      console.log("[feedbackService] API Response:", response);

      // Sau khi xem xét cẩn thận log, response trả về từ backend có dạng:
      // { status: 'success', data: [...], totalCount: 1940, currentPage: 1, pageSize: 10 }
      // Nhưng đã được axiosClient.interceptors.response xử lý để trả về trực tiếp

      // @ts-ignore - Bỏ qua TypeScript kiểm tra vì chúng ta biết cấu trúc thực tế
      const result: PaginatedFeedbackResponse = {
        // @ts-ignore - Bỏ qua TypeScript kiểm tra
        data: response.data || [],
        // @ts-ignore - Bỏ qua TypeScript kiểm tra
        totalCount: response.totalCount || 0,
        // @ts-ignore - Bỏ qua TypeScript kiểm tra
        currentPage: response.currentPage || 1,
        // @ts-ignore - Bỏ qua TypeScript kiểm tra
        pageSize: response.pageSize || 10,
      };

      console.log("[feedbackService] Result to return:", result);
      return result;
    } catch (error) {
      console.error("[feedbackService] Error in getAllFeedback:", error);
      // Trả về cấu trúc dữ liệu rỗng khi có lỗi
      return {
        data: [],
        totalCount: 0,
        currentPage: 1,
        pageSize: 10,
      };
    }
  },

  /**
   * Lấy chi tiết một phản hồi dựa trên ID
   */
  getFeedbackById: async (id: number): Promise<FeedbackDetail> => {
    try {
      const response = await axiosClient.get(`/feedback/${id}`);
      console.log("[feedbackService] getFeedbackById Response:", response);
      // @ts-ignore - Bỏ qua TypeScript kiểm tra
      return response.data;
    } catch (error) {
      console.error("[feedbackService] Error in getFeedbackById:", error);
      throw error;
    }
  },

  /**
   * Tạo một phản hồi mới từ quản trị viên cho một feedback
   */
  createFeedbackResponse: async (
    feedbackId: number,
    payload: FeedbackResponsePayload
  ): Promise<any> => {
    try {
      const response = await axiosClient.post(
        `/feedback/${feedbackId}/responses`,
        payload
      );
      console.log(
        "[feedbackService] createFeedbackResponse Response:",
        response
      );
      // @ts-ignore - Bỏ qua TypeScript kiểm tra
      return response.data;
    } catch (error) {
      console.error(
        "[feedbackService] Error in createFeedbackResponse:",
        error
      );
      throw error;
    }
  },

  /**
   * Cập nhật nội dung phản hồi hiện có
   */
  updateFeedbackResponse: async (
    responseId: number,
    payload: FeedbackResponsePayload
  ): Promise<any> => {
    try {
      const response = await axiosClient.put(
        `/feedback/responses/${responseId}`,
        payload
      );
      console.log(
        "[feedbackService] updateFeedbackResponse Response:",
        response
      );
      // @ts-ignore - Bỏ qua TypeScript kiểm tra
      return response.data;
    } catch (error) {
      console.error(
        "[feedbackService] Error in updateFeedbackResponse:",
        error
      );
      throw error;
    }
  },

  /**
   * Xóa một phản hồi và tất cả các câu trả lời liên quan
   */
  deleteFeedback: async (feedbackId: number): Promise<void> => {
    try {
      await axiosClient.delete(`/feedback/${feedbackId}`);
    } catch (error) {
      console.error("[feedbackService] Error in deleteFeedback:", error);
      throw error;
    }
  },

  /**
   * Xóa một câu trả lời cụ thể
   */
  deleteFeedbackResponse: async (responseId: number): Promise<void> => {
    try {
      await axiosClient.delete(`/feedback/responses/${responseId}`);
    } catch (error) {
      console.error(
        "[feedbackService] Error in deleteFeedbackResponse:",
        error
      );
      throw error;
    }
  },
};

export default feedbackService;
