import axiosClient from "../api/axiosClient";
// Import all necessary types from the central types file
import {
  ProductResponse,
  CategoryResponse,
  ProductVariant as ApiProductVariant, // Use alias to avoid potential name clashes if needed
  VariantAttribute as ApiVariantAttribute,
  CreateVariantRequest as ApiCreateVariantRequest,
  UpdateVariantRequest as ApiUpdateVariantRequest,
  Attribute as ApiAttribute,
  AttributeValue as ApiAttributeValue,
  ProductDetail as ApiProductDetail,
  CreateProductRequest as ApiCreateProductRequest,
  UpdateProductRequest as ApiUpdateProductRequest,
} from "../api/types";

// --- Types for Server-Side Operations ---
export interface GetProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  category_id?: string | number | (string | number)[]; // Single ID or array of IDs
  brand?: string | string[]; // Single brand or array of brands
}

export interface GetProductsResponse {
  products: ProductResponse[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

// --- Remove duplicate interface definitions ---
// Removed ProductVariant, VariantAttribute, AttributeValue, Attribute, ProductDetail,
// CreateProductRequest, UpdateProductRequest definitions previously here.

// --- Re-export types for components that import from this service ---
export type ProductVariant = ApiProductVariant;
export type VariantAttribute = ApiVariantAttribute;
export type CreateVariantRequest = ApiCreateVariantRequest;
export type UpdateVariantRequest = ApiUpdateVariantRequest;
export type Attribute = ApiAttribute;
export type AttributeValue = ApiAttributeValue;
export type ProductDetail = ApiProductDetail;
export type CreateProductRequest = ApiCreateProductRequest;
export type UpdateProductRequest = ApiUpdateProductRequest;

const productService = {
  // Lấy danh sách tất cả sản phẩm (với phân trang, lọc, sắp xếp phía server)
  getAllProducts: async (
    params: GetProductsParams = {}
  ): Promise<GetProductsResponse> => {
    // Process params to handle arrays
    const processedParams = { ...params };

    // Convert category_id array to comma-separated string if needed
    if (Array.isArray(processedParams.category_id)) {
      processedParams.category_id = processedParams.category_id.join(",");
    }

    // Convert brand array to comma-separated string if needed
    if (Array.isArray(processedParams.brand)) {
      processedParams.brand = processedParams.brand.join(",");
    }

    // Remove undefined or empty params to keep URL clean
    const queryParams = Object.entries(processedParams)
      .filter(([_, value]) => value !== undefined && value !== "")
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    return axiosClient.get("/products", { params: queryParams });
  },

  // Lấy sản phẩm theo ID kèm variants và attributes
  // Note: The return type Promise<ProductDetail> now correctly refers to the re-exported type
  getProductById: async (id: number): Promise<ProductDetail> => {
    return axiosClient.get(`/products/${id}`);
  },

  // Tạo sản phẩm mới
  createProduct: async (
    product: CreateProductRequest // This now refers to the re-exported type
  ): Promise<ProductResponse> => {
    return axiosClient.post("/products", product);
  },

  // Cập nhật sản phẩm
  updateProduct: async (
    id: number,
    product: UpdateProductRequest // This now refers to the re-exported type
  ): Promise<ProductResponse> => {
    // The backend PUT /products/:id was modified to return the full product detail after update.
    // Ensure the frontend type matches this if it's used directly.
    // Currently returns ProductResponse, might need ProductDetail if using the richer response.
    return axiosClient.put(`/products/${id}`, product);
  },

  // Xóa sản phẩm
  deleteProduct: async (id: number): Promise<void> => {
    return axiosClient.delete(`/products/${id}`);
  },

  // Lấy sản phẩm theo danh mục
  getProductsByCategory: async (
    categoryId: number
  ): Promise<ProductResponse[]> => {
    // Consider if this endpoint also needs pagination/sorting
    return axiosClient.get(`/products/category/${categoryId}`);
  },

  // --- Variant APIs ---

  // Lấy variant theo ID (đã bao gồm attributes)
  // Note: The return type Promise<ProductVariant> now correctly refers to the re-exported type
  getVariantById: async (id: number): Promise<ProductVariant> => {
    return axiosClient.get(`/variants/${id}`);
  },

  // Tạo variant mới
  createVariant: async (
    variant: CreateVariantRequest // This uses the type defined in api/types via re-export
  ): Promise<ProductVariant> => {
    // Backend trả về variant đã tạo kèm attributes
    return axiosClient.post(`/variants`, variant);
  },

  // Cập nhật variant (chỉ sku, price, stock, original_price)
  updateVariant: async (
    id: number,
    variant: UpdateVariantRequest // This uses the type defined in api/types via re-export
  ): Promise<ProductVariant> => {
    // Backend trả về variant đã cập nhật kèm attributes
    return axiosClient.put(`/variants/${id}`, variant);
  },

  // Xóa variant
  deleteVariant: async (id: number): Promise<{ message: string }> => {
    // Backend trả về { message: "Variant removed" }
    return axiosClient.delete(`/variants/${id}`);
  },

  // Lấy danh sách tất cả các thương hiệu
  getAllBrands: async (): Promise<string[]> => {
    return axiosClient.get("/products/brands");
  },
};

export default productService;
