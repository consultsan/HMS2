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
// WebSocket removed. We'll use Redis-backed REST polling instead.
import redisService from "./utils/redisClient";
import { authMiddleware } from "./middleware/auth.middleware";
import login from "./services/login.service";
import diagnosisRoute from "./routes/diagnosis.route";
import labRoute from "./routes/lab.route";
import billingRoute from "./routes/billing.route";
import paymentRoute from "./routes/payment.route";
import insuranceRoute from "./routes/insurance.route";
import discountRoute from "./routes/discount.route";
import testPdfRoute from "./routes/test-pdf.route";
import testWhatsAppRoute from "./routes/test-whatsapp.route";
import notificationRoute from "./routes/notification.route";
import ipdRoute from "./routes/ipd.route";
import insuranceProcessingRoute from "./routes/insuranceProcessing.route";
import patientDocumentRoute from "./routes/patientDocument.route";
import prescriptionRoute from "./routes/prescription.route";
import reminderRoute from "./routes/reminder.route";
import testReminderRoute from "./routes/test-reminder.route";
import testPublicAppointmentRoute from "./routes/test-public-appointment.route";
import publicAppointmentRoute from "./routes/publicAppointment.route";
import sendWhatsAppMessage from "./services/whatsapp.service";
import IPDWebSocketService from "./services/ipdWebSocket.service";
import { ReminderService } from "./services/reminder.service";
const frontendOrigin: string = process.env.FRONTEND_ORIGIN || "";
const app = express();
const http_port = Number(process.env.HTTP_PORT) || 3001;

// CORS configuration - Allow all origins with credentials
app.use(
	cors({
		origin: true, // Allow all origins dynamically
		methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: [
			"Content-Type",
			"Authorization",
			"X-Requested-With",
			"Accept",
			"Origin"
		],
		exposedHeaders: ["Set-Cookie", "Access-Control-Allow-Origin"],
		credentials: true, // Allow credentials
		preflightContinue: false,
		optionsSuccessStatus: 204
	})
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// No WebSocket socket types needed

// HTTP server setup
const server = createServer(app);

// All WebSocket code removed; Redis remains for REST polling consumers

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

// Notification routes
app.use("/api/notifications", authMiddleware, notificationRoute);

// Billing module routes
app.use("/api/billing", authMiddleware, billingRoute);
app.use("/api/payment", authMiddleware, paymentRoute);
app.use("/api/insurance", authMiddleware, insuranceRoute);
app.use("/api/discount", authMiddleware, discountRoute);

// IPD module routes
app.use("/api/ipd", ipdRoute);

// Insurance Processing module routes
app.use("/api/insurance-processing", insuranceProcessingRoute);

// Patient Document Management module routes
app.use("/api/patient-documents", patientDocumentRoute);
app.use("/api/prescription", prescriptionRoute);
app.use("/api/reminder", reminderRoute);

// Test routes (no auth for testing)
app.use("/api/test", testPdfRoute);
app.use("/api/test-whatsapp", testWhatsAppRoute);
app.use("/api/test-reminder", testReminderRoute);
app.use("/api/test-public", testPublicAppointmentRoute);

// Public routes (no authentication required)
app.use("/api/public", publicAppointmentRoute);

app.post("/api/whatsapp", async (req, res) => {
	try {
		const { to, message } = req.body;
		if (!to || !message) {
			return res
				.status(400)
				.json({ message: "Missing required fields: to and message" });
		}
		const result = await sendWhatsAppMessage(to, message);
		if (result.success) {
			res.status(200).json({ message: "WhatsApp message sent successfully" });
		} else {
			res
				.status(500)
				.json({
					message: "Failed to send WhatsApp message",
					error: result.error
				});
		}
	} catch (error: any) {
		console.error("WhatsApp message error:", error);
		res.status(500).json({ message: "Failed to send WhatsApp message" });
	}
});

// Start server
server.listen(http_port, () => {
	console.log(`Server is running on port ${http_port}`);
	
	// Start the appointment reminder service
	ReminderService.start();
});
