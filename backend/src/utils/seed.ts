import prisma from "./dbConfig";
import encryptPassword from "./hashPassword";

async function main() {
	// Create super admin user
	const hashedPassword = await encryptPassword(
		process.env.SUPER_ADMIN_PASSWORD || ""
	);

	const superAdmin = await prisma.superAdmin.upsert({
		where: { email: process.env.SUPER_ADMIN_EMAIL },
		update: {},
		create: {
			email: process.env.SUPER_ADMIN_EMAIL || "",
			password: hashedPassword,
			name: "Super Admin",
			status: "ACTIVE"
		}
	});

	console.log("Super admin user created:", superAdmin);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
