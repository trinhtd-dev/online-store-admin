import axiosClient from "../api/axiosClient";
import {
  CategoryResponse,
  GetCategoriesParams,
  GetCategoriesResponse,
  CreateCategoryRequest as ApiCreateCategoryRequest,
  UpdateCategoryRequest as ApiUpdateCategoryRequest,
} from "../api/types";

export type CreateCategoryRequest = ApiCreateCategoryRequest;
export type UpdateCategoryRequest = ApiUpdateCategoryRequest;

const categoryService = {
  // Lấy tất cả danh mục
  getAllCategories: async (
    params?: GetCategoriesParams
  ): Promise<GetCategoriesResponse> => {
    // Filter out undefined or null parameters before sending
    const filteredParams = Object.entries(params || {})
      .filter(
        ([, value]) => value !== undefined && value !== null && value !== ""
      )
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, any>);

    return axiosClient.get("/categories", { params: filteredParams });
  },

  // Lấy danh mục theo ID
  getCategoryById: async (id: number): Promise<CategoryResponse> => {
    return axiosClient.get(`/categories/${id}`);
  },

  // Tạo danh mục mới
  createCategory: async (
    category: CreateCategoryRequest
  ): Promise<CategoryResponse> => {
    return axiosClient.post("/categories", category);
  },

  // Cập nhật danh mục
  updateCategory: async (
    id: number,
    category: UpdateCategoryRequest
  ): Promise<CategoryResponse> => {
    return axiosClient.put(`/categories/${id}`, category);
  },

  // Xóa danh mục
  deleteCategory: async (id: number): Promise<void> => {
    return axiosClient.delete(`/categories/${id}`);
  },

  // Lấy tất cả danh mục mà không phân trang (dùng cho bộ lọc)
  getAllCategoriesNoLimit: async (): Promise<CategoryResponse[]> => {
    return axiosClient.get("/categories/all");
  },
};

export default categoryService;
