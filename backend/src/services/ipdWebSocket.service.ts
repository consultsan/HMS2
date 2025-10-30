import redisClient from "../utils/redisClient";

export interface IPDWebSocketMessage {
	type: string;
	data: any;
	timestamp: Date;
	hospitalId: string;
	wardId?: string;
	doctorId?: string;
	patientId?: string;
	admissionId?: string;
}

export class IPDWebSocketService {
	// Send ward monitoring updates
	static async sendWardUpdate(
		hospitalId: string, 
		wardId: string, 
		message: Partial<IPDWebSocketMessage>
	) {
		try {
			const room = `ipd_ward_${hospitalId}_${wardId}`;
			const fullMessage: IPDWebSocketMessage = {
				type: message.type || 'WARD_UPDATE',
				data: message.data,
				timestamp: new Date(),
				hospitalId,
				wardId,
				...message
			};
			
            await redisClient.lPush(room, JSON.stringify(fullMessage));
            await redisClient.lTrim(room, 0, 199); // keep last 200 messages
			console.log(`📡 IPD Ward update sent to room: ${room}`);
		} catch (error) {
			console.error('Error sending ward update:', error);
		}
	}

	// Send doctor dashboard notifications
	static async sendDoctorNotification(
		hospitalId: string, 
		doctorId: string, 
		message: Partial<IPDWebSocketMessage>
	) {
		try {
			const room = `ipd_doctor_${hospitalId}_${doctorId}`;
			const fullMessage: IPDWebSocketMessage = {
				type: message.type || 'DOCTOR_NOTIFICATION',
				data: message.data,
				timestamp: new Date(),
				hospitalId,
				doctorId,
				...message
			};
			
            await redisClient.lPush(room, JSON.stringify(fullMessage));
            await redisClient.lTrim(room, 0, 199);
			console.log(`📡 IPD Doctor notification sent to room: ${room}`);
		} catch (error) {
			console.error('Error sending doctor notification:', error);
		}
	}

	// Send nurse station updates
	static async sendNurseUpdate(
		hospitalId: string, 
		wardId: string, 
		message: Partial<IPDWebSocketMessage>
	) {
		try {
			const room = `ipd_nurse_${hospitalId}_${wardId}`;
			const fullMessage: IPDWebSocketMessage = {
				type: message.type || 'NURSE_UPDATE',
				data: message.data,
				timestamp: new Date(),
				hospitalId,
				wardId,
				...message
			};
			
            await redisClient.lPush(room, JSON.stringify(fullMessage));
            await redisClient.lTrim(room, 0, 199);
			console.log(`📡 IPD Nurse update sent to room: ${room}`);
		} catch (error) {
			console.error('Error sending nurse update:', error);
		}
	}

	// Send patient status updates to all relevant staff
	static async sendPatientStatusUpdate(
		hospitalId: string,
		patientId: string,
		admissionId: string,
		wardId: string,
		message: Partial<IPDWebSocketMessage>
	) {
		try {
			const fullMessage: IPDWebSocketMessage = {
				type: message.type || 'PATIENT_STATUS_UPDATE',
				data: message.data,
				timestamp: new Date(),
				hospitalId,
				wardId,
				patientId,
				admissionId,
				...message
			};

			// Send to ward staff
			await this.sendWardUpdate(hospitalId, wardId, fullMessage);
			
			// Send to nurse station
			await this.sendNurseUpdate(hospitalId, wardId, fullMessage);
			
			console.log(`📡 IPD Patient status update sent for patient: ${patientId}`);
		} catch (error) {
			console.error('Error sending patient status update:', error);
		}
	}

	// Send bed availability updates
	static async sendBedAvailabilityUpdate(
		hospitalId: string,
		wardId: string,
		availableBeds: number,
		totalBeds: number
	) {
		try {
			const message: Partial<IPDWebSocketMessage> = {
				type: 'BED_AVAILABILITY_CHANGED',
				data: {
					availableBeds,
					totalBeds,
					occupancyRate: ((totalBeds - availableBeds) / totalBeds * 100).toFixed(2)
				}
			};

			await this.sendWardUpdate(hospitalId, wardId, message);
			await this.sendNurseUpdate(hospitalId, wardId, message);
			
			console.log(`📡 IPD Bed availability update sent - Available: ${availableBeds}/${totalBeds}`);
		} catch (error) {
			console.error('Error sending bed availability update:', error);
		}
	}

	// Send visit completion notifications
	static async sendVisitCompletionNotification(
		hospitalId: string,
		doctorId: string,
		patientId: string,
		admissionId: string,
		wardId: string,
		visitData: any
	) {
		try {
			// Send to doctor dashboard
			await this.sendDoctorNotification(hospitalId, doctorId, {
				type: 'VISIT_COMPLETED',
				data: {
					patientId,
					admissionId,
					visitId: visitData.id,
					visitNotes: visitData.visitNotes,
					clinicalObservations: visitData.clinicalObservations
				}
			});

			// Send to ward staff
			await this.sendWardUpdate(hospitalId, wardId, {
				type: 'VISIT_COMPLETED',
				data: {
					patientId,
					admissionId,
					doctorId,
					visitNotes: visitData.visitNotes,
					clinicalObservations: visitData.clinicalObservations
				}
			});

			// Send to nurse station
			await this.sendNurseUpdate(hospitalId, wardId, {
				type: 'VISIT_COMPLETED',
				data: {
					patientId,
					admissionId,
					doctorId,
					visitNotes: visitData.visitNotes,
					nextVisitPlan: visitData.nextVisitPlan
				}
			});

			console.log(`📡 IPD Visit completion notification sent for patient: ${patientId}`);
		} catch (error) {
			console.error('Error sending visit completion notification:', error);
		}
	}

	// Send admission notifications
	static async sendAdmissionNotification(
		hospitalId: string,
		patientId: string,
		admissionId: string,
		wardId: string,
		admissionData: any
	) {
		try {
			const message: Partial<IPDWebSocketMessage> = {
				type: 'PATIENT_ADMITTED',
				data: {
					patientId,
					admissionId,
					patientName: admissionData.patient?.name,
					ipdNumber: admissionData.ipdNumber,
					wardId,
					bedNumber: admissionData.bedNumber,
					admissionDate: admissionData.admissionDate,
					admissionReason: admissionData.admissionReason
				}
			};

			await this.sendWardUpdate(hospitalId, wardId, message);
			await this.sendNurseUpdate(hospitalId, wardId, message);
			
			console.log(`📡 IPD Admission notification sent for patient: ${patientId}`);
		} catch (error) {
			console.error('Error sending admission notification:', error);
		}
	}

	// Send discharge notifications
	static async sendDischargeNotification(
		hospitalId: string,
		patientId: string,
		admissionId: string,
		wardId: string,
		dischargeData: any
	) {
		try {
			const message: Partial<IPDWebSocketMessage> = {
				type: 'PATIENT_DISCHARGED',
				data: {
					patientId,
					admissionId,
					patientName: dischargeData.patient?.name,
					ipdNumber: dischargeData.ipdNumber,
					wardId,
					bedNumber: dischargeData.bedNumber,
					dischargeDate: dischargeData.dischargeDate,
					dischargeSummary: dischargeData.dischargeSummary
				}
			};

			await this.sendWardUpdate(hospitalId, wardId, message);
			await this.sendNurseUpdate(hospitalId, wardId, message);
			
			console.log(`📡 IPD Discharge notification sent for patient: ${patientId}`);
		} catch (error) {
			console.error('Error sending discharge notification:', error);
		}
	}

	// Send critical patient alerts
	static async sendCriticalAlert(
		hospitalId: string,
		patientId: string,
		admissionId: string,
		wardId: string,
		alertData: any
	) {
		try {
			const message: Partial<IPDWebSocketMessage> = {
				type: 'CRITICAL_PATIENT_ALERT',
				data: {
					patientId,
					admissionId,
					patientName: alertData.patientName,
					wardId,
					bedNumber: alertData.bedNumber,
					alertType: alertData.alertType,
					severity: alertData.severity,
					message: alertData.message,
					vitals: alertData.vitals
				}
			};

			// Send to all ward staff
			await this.sendWardUpdate(hospitalId, wardId, message);
			await this.sendNurseUpdate(hospitalId, wardId, message);
			
			// Send to all doctors in the hospital
			await this.sendDoctorNotification(hospitalId, 'ALL', message);
			
			console.log(`🚨 IPD Critical alert sent for patient: ${patientId}`);
		} catch (error) {
			console.error('Error sending critical alert:', error);
		}
	}
}

export default IPDWebSocketService;
