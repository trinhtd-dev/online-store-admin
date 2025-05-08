import axiosClient from "../api/axiosClient";
import {
  AccountResponse,
  GetAccountsParams,
  GetAccountsResponse,
  CreateAccountRequest,
  UpdateAccountRequest,
  RoleResponse,
} from "../api/types";

const ENDPOINT = "/users"; // API endpoint prefix for accounts
const ROLE_ENDPOINT = "/roles"; // API endpoint for roles

/**
 * Fetch a paginated list of accounts with filtering and sorting.
 */
export const getAllAccounts = async (
  params: GetAccountsParams
): Promise<GetAccountsResponse> => {
  // Clean up params: remove undefined or null values
  const cleanedParams = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {} as Record<string, any>);

  return axiosClient.get(ENDPOINT, { params: cleanedParams });
};

/**
 * Fetch a single account by its ID.
 */
export const getAccountById = async (id: number): Promise<AccountResponse> => {
  return axiosClient.get(`${ENDPOINT}/${id}`);
};

/**
 * Create a new account (manager or customer).
 */
export const createAccount = async (
  data: CreateAccountRequest
): Promise<AccountResponse> => {
  return axiosClient.post(ENDPOINT, data);
};

/**
 * Update an existing account by ID.
 */
export const updateAccount = async (
  id: number,
  data: UpdateAccountRequest
): Promise<AccountResponse> => {
  return axiosClient.put(`${ENDPOINT}/${id}`, data);
};

/**
 * Delete an account by ID.
 */
export const deleteAccount = async (
  id: number
): Promise<{ message: string }> => {
  return axiosClient.delete(`${ENDPOINT}/${id}`);
};

/**
 * Fetch all active roles.
 */
export const getAllRoles = async (): Promise<RoleResponse[]> => {
  return axiosClient.get(ROLE_ENDPOINT);
};
