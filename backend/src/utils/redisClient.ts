import { createClient } from "redis";

const redisClient = createClient({
	url: process.env.REDIS_URL || "redis://localhost:6379"
});

(async () => {
	try {
		await redisClient.connect();
		console.log("✅ Connected to Redis");
	} catch (error) {
		console.log("⚠️ Redis connection failed, continuing without Redis:", error instanceof Error ? error.message : error);
	}
})();

// Handle Redis errors gracefully
redisClient.on('error', (err) => {
	console.log('Redis Client Error:', err.message);
});

export default redisClient;
