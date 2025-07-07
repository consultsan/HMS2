import { api } from "@/lib/api";
import { Hospital, ApiResponse } from "@/types/types";

export const hospitalApi = {
    getHospitalById: (id: string) => api.get<ApiResponse<Hospital>>(`/api/hospital/get/${id}`).then(res => res.data.data),
}






