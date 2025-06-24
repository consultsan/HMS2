import bcrypt from "bcryptjs";

const isCorrectPassword = async (
	inputPassword: string,
	actualPassword: string
) => {
	return await bcrypt.compare(inputPassword, actualPassword);
};

export default isCorrectPassword;
