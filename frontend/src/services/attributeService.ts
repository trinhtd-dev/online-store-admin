import axiosClient from "../api/axiosClient";
import {
  Attribute,
  AttributeValue,
  GetAttributesParams,
  GetAttributesResponse,
  CreateAttributeRequest,
  UpdateAttributeRequest,
  CreateAttributeValueRequest,
} from "../api/types";

const attributeService = {
  getAllAttributes: (
    params: GetAttributesParams
  ): Promise<GetAttributesResponse> => {
    return axiosClient.get("/attributes", { params });
  },

  getAttributeById: (id: number): Promise<Attribute> => {
    // This endpoint on the backend returns the attribute with its values
    return axiosClient.get(`/attributes/${id}`);
  },

  createAttribute: (data: CreateAttributeRequest): Promise<Attribute> => {
    return axiosClient.post("/attributes", data);
  },

  updateAttribute: (
    id: number,
    data: UpdateAttributeRequest
  ): Promise<Attribute> => {
    return axiosClient.put(`/attributes/${id}`, data);
  },

  deleteAttribute: (id: number): Promise<{ message: string }> => {
    return axiosClient.delete(`/attributes/${id}`);
  },

  addAttributeValue: (
    attributeId: number,
    data: CreateAttributeValueRequest
  ): Promise<AttributeValue> => {
    return axiosClient.post(`/attributes/${attributeId}/values`, data);
  },

  deleteAttributeValue: (
    attributeId: number,
    valueId: number
  ): Promise<{ message: string }> => {
    return axiosClient.delete(`/attributes/${attributeId}/values/${valueId}`);
  },
};

export default attributeService;
