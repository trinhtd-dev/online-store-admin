// API Response types
// Note: All responses are returned directly as data from axiosClient,
// not wrapped in AxiosResponse due to the response interceptor

export interface UserResponse {
  id: number;
  full_name: string;
  email: string;
  role?: string;
  username?: string;
  status?: string;
}

export interface ProfileResponse {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  token: string;
  refreshToken: string;
}

export interface ProductResponse {
  id: number;
  name: string;
  description: string;
  specification?: string;
  price: number;
  sku: string;
  status: string;
  category_id: number;
  category_name?: string;
  stock_quantity?: number;
  total_sold_quantity?: number;
  created_at?: string;
  updated_at?: string;
  image_url?: string;
  brand?: string;
}

export interface CategoryResponse {
  id: number;
  name: string;
  description?: string;
  parent_id?: number;
  image_url?: string;
  status?: string;
}

// Order Types
export interface OrderResponse {
  id: number;
  customer_id: number;
  customer_name?: string; // Added from JOIN
  customer_email?: string; // Added from JOIN
  order_date: string;
  shipping_address?: string;
  status: string; // 'Pending', 'Processing', 'Completed', 'Cancelled', 'Rejected'
  payment_method?: string;
  payment_date?: string;
  payment_status: string; // 'Pending', 'Paid', 'Refunded', 'Partially Paid'
  payment_amount: number;
  // Optional fields for detail view
  items?: OrderItemResponse[];
  history?: OrderHistoryResponse[];
}

export interface OrderItemResponse {
  id: number;
  order_id: number;
  product_variant_id: number;
  quantity: number;
  unit_price: number;
  note?: string;
  // Joined fields for display
  product_name?: string;
  product_image?: string;
  variant_sku?: string;
  variant_price?: number; // Price at time of order item creation (unit_price)
}

export interface OrderHistoryResponse {
  id: number;
  manager_id: number;
  order_id: number;
  processing_time: string;
  previous_status?: string;
  new_status: string;
  manager_name?: string; // Joined field
}

export interface GetOrdersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string; // Comma-separated list of statuses
  paymentStatus?: string; // Comma-separated list of payment statuses
  sortBy?: keyof OrderResponse | string; // Allow string for joined fields like customer_name
  sortOrder?: "asc" | "desc";
}

export interface GetOrdersResponse {
  orders: OrderResponse[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

// End Order Types

export interface CustomerResponse {
  id: number;
  account_id: number;
  full_name: string;
  email: string;
  phone_number?: string;
  address?: string;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  sku: string;
  original_price: number;
  price: number;
  stock_quantity: number;
  sold_quantity: number;
  attributes?: VariantAttribute[];
  product_name?: string;
  product_image_url?: string;
}

export interface VariantAttribute {
  attribute_id: number;
  attribute_name: string;
  attribute_value_id: number;
  value_id: number;
  value: string;
}

export interface CreateVariantRequest {
  product_id: number;
  sku: string;
  original_price: number;
  price: number;
  stock_quantity: number;
  attributes: number[];
}

export interface UpdateVariantRequest {
  sku?: string;
  original_price?: number;
  price?: number;
  stock_quantity?: number;
}

export interface Attribute {
  id: number;
  name: string;
  values?: AttributeValue[]; // Populated when fetching a single attribute by ID
}

export interface AttributeValue {
  id: number; // This is attribute_value.id
  attribute_id?: number; // Foreign key
  value: string;
}

// Combined product detail including variants and attributes
export interface ProductDetail extends ProductResponse {
  category_name: string;
  variants: ProductVariant[];
  attributes: Attribute[]; // Overall attributes available for this product's variants
}

// Request types for Product CRUD
export interface CreateProductRequest {
  name: string;
  description?: string;
  specification?: string;
  image_url?: string;
  brand?: string;
  category_id: number;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  specification?: string;
  image_url?: string;
  brand?: string;
  category_id?: number;
}

// Request types for Category CRUD
export interface CreateCategoryRequest {
  name: string;
  parent_id?: number;
  image_url?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  parent_id?: number;
  image_url?: string;
}

// Params for getting categories with pagination/sort/filter
export interface GetCategoriesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: "id" | "name";
  sortOrder?: "asc" | "desc";
}

// Response for getting categories with pagination
export interface GetCategoriesResponse {
  categories: CategoryResponse[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

// Role types
export interface RoleResponse {
  id: number;
  name: string;
  status: string; // Added status
  permissionIds?: number[]; // Added permission IDs (optional in list view, present in detail view)
}

// Permission types
export interface PermissionResponse {
  id: number;
  name: string;
}

// Role CRUD Request types
export interface CreateRoleRequest {
  name: string;
  status?: string; // Optional, defaults to 'Active' on backend
  permissionIds?: number[]; // Optional array of permission IDs
}

export interface UpdateRoleRequest {
  name?: string;
  status?: string;
  permissionIds?: number[]; // Send the full list of desired IDs, backend replaces
}

// Account (User) Management Types
export type AccountType = "manager" | "customer";
export type AccountStatus = "Active" | "Inactive" | "Banned";

export interface AccountResponse {
  id: number;
  email: string;
  username: string;
  full_name: string;
  status: AccountStatus;
  created_at: string;
  updated_at?: string;
  // Manager specific
  role_name?: string;
  role_id?: number;
  // Customer specific
  phone_number?: string | null;
  address?: string | null;
}

export interface GetAccountsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AccountStatus;
  role_id?: number;
  type?: AccountType;
  sortBy?: "id" | "full_name" | "email" | "status" | "created_at" | "role";
  sortOrder?: "asc" | "desc";
}

export interface GetAccountsResponse {
  accounts: AccountResponse[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

export interface CreateAccountRequest {
  email: string;
  password?: string; // Required on create
  full_name: string;
  status?: AccountStatus;
  account_type: AccountType;
  role_id?: number; // Required if type is manager
  phone_number?: string;
  address?: string;
}

export interface UpdateAccountRequest {
  email?: string;
  full_name?: string;
  status?: AccountStatus;
  role_id?: number; // For managers
  phone_number?: string; // For customers
  address?: string; // For customers
  // Note: Password update might need a separate endpoint/flow
}

// Discount Types
export type DiscountStatus = "Active" | "Inactive" | "Expired";
export type DiscountType = "Percentage" | "FixedAmount";

export interface DiscountResponse {
  id: number;
  product_variant_id: number;
  code: string;
  name?: string | null;
  type: DiscountType;
  value: number;
  status: DiscountStatus;
  start_date?: string | null;
  end_date?: string | null;
  // Joined fields
  variant_sku: string;
  product_name: string;
}

export interface GetDiscountsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string; // Comma-separated e.g., "Active,Inactive"
  type?: string; // Comma-separated e.g., "Percentage,FixedAmount"
  sortBy?: keyof DiscountResponse | string; // Allow string for joined fields
  sortOrder?: "asc" | "desc";
}

export interface GetDiscountsResponse {
  discounts: DiscountResponse[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

export interface CreateDiscountRequest {
  product_variant_id: number;
  code: string;
  name?: string | null;
  type: DiscountType;
  value: number;
  status?: DiscountStatus;
  start_date?: string | null;
  end_date?: string | null;
}

export interface UpdateDiscountRequest {
  product_variant_id?: number;
  code?: string;
  name?: string | null;
  type?: DiscountType;
  value?: number;
  status?: DiscountStatus;
  start_date?: string | null;
  end_date?: string | null;
}

// Type for Variant Search (for Select dropdown)
export interface VariantOption {
  id: number;
  sku: string;
  product_name: string;
}

// Attribute Management Types
export interface GetAttributesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: "id" | "name";
  sortOrder?: "asc" | "desc";
}

export interface GetAttributesResponse {
  attributes: Attribute[]; // In this list, 'values' might not be populated
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

export interface CreateAttributeRequest {
  name: string;
}

export interface UpdateAttributeRequest {
  name?: string;
}

export interface CreateAttributeValueRequest {
  value: string; // attribute_id will be part of the URL path
}

// Feedback Management Types
export interface FeedbackResponse {
  feedback_id: number;
  comment: string;
  rating: number;
  feedback_created_at: string;
  product_name: string;
  product_id: number;
  customer_name: string;
  customer_id: number;
  response_id: number | null;
  response_content: string | null;
  response_created_at: string | null;
  manager_name: string | null;
}

export interface FeedbackDetail extends FeedbackResponse {
  product_variant_id: number;
  customer_email: string;
  customer_phone_number: string | null;
  manager_id: number | null;
}

export interface FeedbackResponsePayload {
  content: string;
}

export interface GetFeedbackParams {
  page?: number;
  pageSize?: number;
  sortBy?: "feedback_created_at" | "rating" | "product_name" | "customer_name";
  sortOrder?: "asc" | "desc";
  productId?: number;
  customerId?: number;
  rating?: number;
  hasResponse?: "true" | "false";
  search?: string;
}

export interface PaginatedFeedbackResponse {
  data: FeedbackResponse[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}
