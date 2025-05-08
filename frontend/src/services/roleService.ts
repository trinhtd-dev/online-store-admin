import axiosClient from "../api/axiosClient";
import {
  RoleResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
} from "../api/types";

// Define Params type if we add pagination/filtering later
// interface GetRolesParams { ... }

const roleService = {
  // Get all roles (no pagination for now)
  getRoles: async (): Promise<RoleResponse[]> => {
    const response = await axiosClient.get("/roles");
    return response as unknown as RoleResponse[];
  },

  // Get a single role by ID, including its permissions
  getRoleById: async (id: number): Promise<RoleResponse> => {
    const response = await axiosClient.get(`/roles/${id}`);
    return response as unknown as RoleResponse;
  },

  // Create a new role
  createRole: async (data: CreateRoleRequest): Promise<RoleResponse> => {
    const response = await axiosClient.post("/roles", data);
    return response as unknown as RoleResponse;
  },

  // Update a role
  updateRole: async (
    id: number,
    data: UpdateRoleRequest
  ): Promise<RoleResponse> => {
    const response = await axiosClient.put(`/roles/${id}`, data);
    return response as unknown as RoleResponse;
  },

  // Delete a role
  deleteRole: async (id: number): Promise<{ message: string }> => {
    // Backend returns { message: "..." } on successful delete
    const response = await axiosClient.delete(`/roles/${id}`);
    return response as unknown as { message: string };
  },
};

export default roleService;
