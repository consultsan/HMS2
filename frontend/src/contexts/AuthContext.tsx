import {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode
} from "react";

interface User {
	id: string;
	email: string;
	name: string;
	role:
		| "SUPER_ADMIN"
		| "HOSPITAL_ADMIN"
		| "DOCTOR"
		| "NURSE"
		| "RECEPTIONIST"
		| "TPA"
		| "SALES_PERSON"
		| "LAB_TECHNICIAN"
		| "PHARMACIST"
		| "FINANCE_MANAGER";
	hospitalId?: string;
	specialisation?: string;
}

interface AuthContextType {
	isAuthenticated: boolean;
	user: User | null;
	isLoading: boolean;
	login: (token: string, user: User) => void;
	logout: () => void;
}

// Create a default context value
const defaultContextValue: AuthContextType = {
	isAuthenticated: false,
	user: null,
	isLoading: true,
	login: () => {
		console.warn(
			"AuthContext: login function called before provider was initialized"
		);
	},
	logout: () => {
		console.warn(
			"AuthContext: logout function called before provider was initialized"
		);
	}
};

const AuthContext = createContext<AuthContextType>(defaultContextValue);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const initializeAuth = async () => {
			try {
				const token = localStorage.getItem("token");
				const userData = localStorage.getItem("user");

				if (token && userData) {
					try {
						// Parse user data and check if token is expired
						const parsedUser = JSON.parse(userData);

						// Simple token expiration check (if token contains expiration info)
						// For JWT tokens, we could decode and check exp claim
						// For now, we'll trust the token and let the API handle validation
						setIsAuthenticated(true);
						setUser(parsedUser);
					} catch (parseError) {
						console.error("Error parsing user data:", parseError);
						localStorage.removeItem("token");
						localStorage.removeItem("user");
						setIsAuthenticated(false);
						setUser(null);
					}
				} else {
					setIsAuthenticated(false);
					setUser(null);
				}
			} catch (error) {
				console.error("Error restoring auth state:", error);
				// Clear potentially corrupted data
				localStorage.removeItem("token");
				localStorage.removeItem("user");
				setIsAuthenticated(false);
				setUser(null);
			} finally {
				setIsLoading(false);
			}
		};

		initializeAuth();

		// Listen for localStorage changes from other tabs/windows
		const handleStorageChange = (event: StorageEvent) => {
			if (event.key === "token" || event.key === "user") {
				const token = localStorage.getItem("token");
				const userData = localStorage.getItem("user");

				if (!token || !userData) {
					// Token or user was removed (logout)
					setIsAuthenticated(false);
					setUser(null);
				} else if (event.key === "user" && event.newValue) {
					// User data changed (new user logged in)
					try {
						const newUser = JSON.parse(event.newValue);
						const currentUser = user;

						// If the new user is different from current user, redirect to login
						if (
							currentUser &&
							(newUser.id !== currentUser.id ||
								newUser.role !== currentUser.role)
						) {
							setIsAuthenticated(false);
							setUser(null);
						}
					} catch (parseError) {
						console.error("Error parsing new user data:", parseError);
						setIsAuthenticated(false);
						setUser(null);
					}
				}
			}
		};
		window.addEventListener("storage", handleStorageChange);
		return () => {
			window.removeEventListener("storage", handleStorageChange);
		};
	}, []);

	const login = (token: string, userData: User) => {
		try {
			localStorage.setItem("token", token);
			localStorage.setItem("user", JSON.stringify(userData));
			setIsAuthenticated(true);
			setUser(userData);
		} catch (error) {
			console.error("Error during login:", error);
			throw new Error("Failed to complete login process");
		}
	};

	const logout = () => {
		try {
			localStorage.removeItem("token");
			localStorage.removeItem("user");
			setIsAuthenticated(false);
			setUser(null);
		} catch (error) {
			console.error("Error during logout:", error);
			// Still set the state even if localStorage fails
			setIsAuthenticated(false);
			setUser(null);
		}
	};

	const value = {
		isAuthenticated,
		user,
		isLoading,
		login,
		logout
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
