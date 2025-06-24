import { createClient } from "redis";

const redisClient = createClient();
(async () => {
	await redisClient.connect();
	console.log("Connected to Redis");
})();

export default redisClient;
