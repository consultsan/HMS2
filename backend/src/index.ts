import "dotenv/config";
import express from "express";
import cors from "cors";
import superAdminRouter from "./routes/superAdmin.route";
import hospitalAdminRoutes from "./routes/hospitalAdmin.route";
import hospitalRouter from "./routes/hospital.route";
import patientRouter from "./routes/patient.route";
import opdRouter from "./routes/appointment.route";
import appointmentRouter from "./routes/appointment.route";
import doctorRouter from "./routes/doctor.route";
import { createServer } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { v4 as uuid } from "uuid";
import redisService from "./utils/redisClient";
import { authMiddleware } from "./middleware/auth.middleware";
import cookieParser from "cookie-parser";
import login from "./services/login.service";
import diagnosisRoute from "./routes/diagnosis.route";
import labRoute from "./routes/lab.route";
import billingRoute from "./routes/billing.route";
import paymentRoute from "./routes/payment.route";
import insuranceRoute from "./routes/insurance.route";
import discountRoute from "./routes/discount.route";
import sendWhatsAppMessage from "./services/whatsapp.service";
const frontendOrigin: string = process.env.FRONTEND_ORIGIN || "";
const app = express();
const http_port = Number(process.env.HTTP_PORT);

// CORS configuration
const allowedOrigins = [
	frontendOrigin,
	`http://localhost:${http_port}`,
	"http://localhost:5173" // Add Vite's default development server port
];

app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin || allowedOrigins.includes(origin)) {
				callback(null, true);
			} else {
				callback(new Error("Not allowed by CORS"));
			}
		},
		methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: [
			"Content-Type",
			"Authorization",
			"X-Requested-With",
			"Accept",
			"Origin"
		],
		exposedHeaders: ["Set-Cookie", "Access-Control-Allow-Origin"],
		credentials: true,
		preflightContinue: false,
		optionsSuccessStatus: 204
	})
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

interface Socket extends WebSocket {
	id: string;
	room: string;
}
interface Doctor {
	hospital_id: string;
	doctor_id: string;
}

// Websocket server setup
const server = createServer(app);

const wss = new WebSocketServer({
	server,
	path: "/api/dashboard/patient"
});

const doctorRooms = new Array<string>();

wss.on("connection", (socket: Socket) => {
	socket.id = uuid();
	console.log(`${Array.from(wss.clients).length} clients connected`);
	socket.on("message", (msg) => {
		const data = JSON.parse(msg.toString()) as Doctor;
		const room = `${data.hospital_id}_${data.doctor_id}`;
		doctorRooms.push(room);
		socket.room = room;
		console.log(`${socket.id} Joined room ${room}`);
	});
	socket.on("close", () => {
		console.log(
			`Client with connection ID ${socket.id} has closed its connection`
		);
	});
});

setInterval(() => {
	doctorRooms.forEach(async (q) => {
		const product = await redisService.rPop(q);
		wss.clients.forEach((client: any) => {
			if (client.room == q && client.readyState == WebSocket.OPEN && product)
				client.send(product);
		});
	}, 1000);
});

// routes
app.post("/api/login", login);
app.use("/api/super-admin", authMiddleware, superAdminRouter);
app.use("/api/hospital-admin", authMiddleware, hospitalAdminRoutes);
app.use("/api/hospital", authMiddleware, hospitalRouter);
app.use("/api/opd/", authMiddleware, opdRouter);
app.use("/api/patient", authMiddleware, patientRouter);
app.use("/api/doctor", authMiddleware, doctorRouter);
app.use("/api/appointment", authMiddleware, appointmentRouter);
app.use("/api/diagnosis", authMiddleware, diagnosisRoute);
app.use("/api/lab", authMiddleware, labRoute);

// Billing module routes
app.use("/api/billing", authMiddleware, billingRoute);
app.use("/api/payment", authMiddleware, paymentRoute);
app.use("/api/insurance", authMiddleware, insuranceRoute);
app.use("/api/discount", authMiddleware, discountRoute);

app.post("/api/whatsapp", (req, res) => {
	try {
		const { to, message } = req.body;
		sendWhatsAppMessage(to, message);
		res.status(200).json({ message: "WhatsApp message sent successfully" });
	} catch (error: any) {
		res.status(500).json({ message: "Failed to send WhatsApp message" });
	}
});

// Start server
server.listen(http_port, () => {
	console.log(`Server is running on port ${http_port}`);
});
