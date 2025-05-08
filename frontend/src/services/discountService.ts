import axiosClient from "../api/axiosClient";
import {
  ApiResponse,
  DiscountResponse,
  GetDiscountsParams,
  GetDiscountsResponse,
  CreateDiscountRequest,
  UpdateDiscountRequest,
  VariantOption,
} from "../api/types";

const discountService = {
  getAllDiscounts: async (
    params: GetDiscountsParams
  ): Promise<GetDiscountsResponse> => {
    // Ensure default values if not provided, although backend handles this too
    const queryParams = {
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      search: params.search || "",
      status: params.status || "",
      type: params.type || "",
      sortBy: params.sortBy || "id",
      sortOrder: params.sortOrder || "desc",
    };
    // Type assertion is needed here because axiosClient interceptor returns data directly
    return axiosClient.get<GetDiscountsResponse>("/discounts", {
      params: queryParams,
    }) as unknown as GetDiscountsResponse;
  },

  getDiscountById: async (id: number): Promise<DiscountResponse> => {
    return axiosClient.get<DiscountResponse>(
      `/discounts/${id}`
    ) as unknown as DiscountResponse;
  },

  createDiscount: async (
    data: CreateDiscountRequest
  ): Promise<DiscountResponse> => {
    return axiosClient.post<DiscountResponse>(
      "/discounts",
      data
    ) as unknown as DiscountResponse;
  },

  updateDiscount: async (
    id: number,
    data: UpdateDiscountRequest
  ): Promise<DiscountResponse> => {
    return axiosClient.put<DiscountResponse>(
      `/discounts/${id}`,
      data
    ) as unknown as DiscountResponse;
  },

  deleteDiscount: async (id: number): Promise<{ message: string }> => {
    return axiosClient.delete<{ message: string }>(
      `/discounts/${id}`
    ) as unknown as { message: string };
  },

  searchVariants: async (query: string): Promise<VariantOption[]> => {
    if (!query) {
      return Promise.resolve([]); // Return empty array if query is empty
    }
    // Add a limit to prevent too many results
    return axiosClient.get<VariantOption[]>("/variants/search", {
      params: { q: query, limit: 20 }, // Fetch up to 20 variants
    }) as unknown as VariantOption[];
  },
};

export default discountService;
