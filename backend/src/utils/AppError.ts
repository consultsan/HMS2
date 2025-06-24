class AppError extends Error {
	status: string;

	constructor(message: string, public code: number = 500) {
		super(message);
		this.status = `${code}`.startsWith("4") ? "fail" : "error";
		Error.captureStackTrace(this, this.constructor);
	}
}

export default AppError;
