import axiosClient from "../api/axiosClient";
import { PermissionResponse } from "../api/types";

const permissionService = {
  getPermissions: async (): Promise<PermissionResponse[]> => {
    const response = await axiosClient.get("/permissions");
    return response as unknown as PermissionResponse[];
  },
};

export default permissionService;
