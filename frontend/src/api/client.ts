import axios from "axios";

const API_BASE_URL = "http://localhost:3000/api";

const apiClient = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		"Content-Type": "application/json"
	}
});

// Add request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
	const token = localStorage.getItem("token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// Add response interceptor to handle errors
apiClient.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			localStorage.removeItem("token");
			window.location.href = "/login";
		}
		return Promise.reject(error);
	}
);

export const authApi = {
	login: (credentials: { email: string; password: string }) =>
		apiClient.post("/login", credentials)
};

export const superAdminApi = {
	// Hospital Management
	getHospitals: () => apiClient.get("/super-admin/hospitals"),
	createHospital: (data: {
		name: string;
		address: string;
		contactNumber: string;
		email: string;
	}) => apiClient.post("/super-admin/hospitals", data),
	updateHospital: (
		id: string,
		data: {
			name?: string;
			address?: string;
			contactNumber?: string;
			email?: string;
		}
	) => apiClient.put(`/super-admin/hospitals/${id}`, data),
	deleteHospital: (id: string) =>
		apiClient.delete(`/super-admin/hospitals/${id}`),

	// Admin Management
	getAdmins: () => apiClient.get("/super-admin/admins"),
	createAdmin: (data: {
		name: string;
		email: string;
		password: string;
		hospitalId: string;
	}) => apiClient.post("/super-admin/admins", data),
	updateAdmin: (
		id: string,
		data: {
			name?: string;
			email?: string;
			password?: string;
			hospitalId?: string;
		}
	) => apiClient.put(`/super-admin/admins/${id}`, data),
	deleteAdmin: (id: string) => apiClient.delete(`/super-admin/admins/${id}`),

	// KPI Endpoints
	getKPIs: () => apiClient.get("/super-admin/kpis")
};

export default apiClient;
