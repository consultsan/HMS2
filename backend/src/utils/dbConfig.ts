import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
	log: ['query', 'info', 'warn', 'error'],
});

// Test database connection
(async () => {
	try {
		await prisma.$connect();
		console.log("✅ Connected to PostgreSQL database");
	} catch (error) {
		console.error("❌ Database connection failed:", error instanceof Error ? error.message : error);
		process.exit(1);
	}
})();

export default prisma;