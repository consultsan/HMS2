import { api } from "@/lib/api";
import { Hospital, ApiResponse } from "@/types/types";
import { HospitalAdminKpis} from "@/types/kpis";

export const hospitalApi = {
    getHospitalById: (id: string) => api.get<ApiResponse<Hospital>>(`/api/hospital/get/${id}`).then(res => res.data.data),
    getHospitalKpis: () => api.get<ApiResponse<HospitalAdminKpis>>("/api/hospital/kpis").then(res => res.data.data),
}






