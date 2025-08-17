# WhatsApp Notification System

This document describes the implementation of WhatsApp notifications for the Hospital Management System (HMS).

## Overview

The WhatsApp notification system provides automated messaging to patients for:

- Appointment confirmations
- Lab test completion notifications
- Lab report delivery
- Diagnosis record delivery

## Features

### 1. Appointment Scheduling Notifications

- **Trigger**: When a patient's appointment is scheduled
- **Action**: Sends a message containing:
  - Patient Name
  - Doctor Name
  - Appointment Date & Time
  - Hospital Name

### 2. Lab Test Completion Notifications

- **Trigger**: When a lab test is marked as completed
- **Action**: Sends a message notifying the patient of completion

### 3. Lab Report Delivery

- **API Endpoint**: `POST /api/notifications/lab-report/:appointmentLabTestId`
- **Functionality**:
  - Generates PDF lab report
  - Uploads to S3 storage
  - Sends WhatsApp notification with report availability
  - Saves attachment record

### 4. Diagnosis Record Delivery

- **API Endpoint**: `POST /api/notifications/diagnosis-record/:appointmentId`
- **Functionality**:
  - Generates PDF diagnosis record
  - Uploads to S3 storage
  - Sends WhatsApp notification
  - Saves attachment record

## API Endpoints

### Notification Routes

#### Send Lab Report

```http
POST /api/notifications/lab-report/:appointmentLabTestId
Content-Type: application/json

{
  "sendWhatsApp": true
}
```

**Response:**

```json
{
	"success": true,
	"message": "Lab report sent successfully",
	"data": {
		"attachment": {
			"id": "attachment-id",
			"url": "s3-url",
			"type": "REPORT"
		},
		"reportUrl": "s3-url"
	}
}
```

#### Send Diagnosis Record

```http
POST /api/notifications/diagnosis-record/:appointmentId
Content-Type: application/json

{
  "sendWhatsApp": true
}
```

**Response:**

```json
{
	"success": true,
	"message": "Diagnosis record sent successfully",
	"data": {
		"attachment": {
			"id": "attachment-id",
			"url": "s3-url",
			"type": "DIAGNOSIS_RECORD"
		},
		"reportUrl": "s3-url"
	}
}
```

#### Get Notification History

```http
GET /api/notifications/history/:patientId
```

**Response:**

```json
{
  "success": true,
  "message": "Notification history retrieved successfully",
  "data": {
    "labReports": [...],
    "diagnosisRecords": [...]
  }
}
```

#### Resend Notification

```http
POST /api/notifications/resend/:type/:attachmentId
Content-Type: application/json

{
  "phoneNumber": "optional-phone-number"
}
```

**Types:** `LAB_REPORT` or `DIAGNOSIS_RECORD`

### Test Routes (No Authentication Required)

#### Test Basic WhatsApp Message

```http
POST /api/test-whatsapp/send-message
Content-Type: application/json

{
  "to": "phone-number",
  "message": "Test message"
}
```

#### Test Appointment Notification

```http
POST /api/test-whatsapp/test-appointment
Content-Type: application/json

{
  "phoneNumber": "phone-number",
  "patientName": "John Doe",
  "doctorName": "Dr. Smith",
  "appointmentDate": "2024-01-15",
  "appointmentTime": "10:00 AM",
  "hospitalName": "City Hospital"
}
```

#### Test Lab Test Completion

```http
POST /api/test-whatsapp/test-lab-completion
Content-Type: application/json

{
  "phoneNumber": "phone-number",
  "patientName": "John Doe",
  "testName": "Blood Test",
  "completionDate": "2024-01-15",
  "hospitalName": "City Hospital"
}
```

## Environment Variables

Add these environment variables to your `.env` file:

```env
# WhatsApp Cloud API Configuration
WA_PHONE_NUMBER_ID=your_phone_number_id
WA_CLOUD_API_ACCESS_TOKEN=your_access_token

# S3 Configuration (for PDF storage)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_s3_bucket_name
```

## WhatsApp Message Templates

### Appointment Confirmation

```
🏥 *Appointment Confirmation*

Dear *[Patient Name]*,

Your appointment has been successfully scheduled:

👨‍⚕️ *Doctor:* [Doctor Name]
📅 *Date:* [Formatted Date]
⏰ *Time:* [Time]
🏥 *Hospital:* [Hospital Name]

Please arrive 15 minutes before your scheduled time.

For any queries, please contact the hospital.

Thank you for choosing our services!
```

### Lab Test Completion

```
🔬 *Lab Test Completed*

Dear *[Patient Name]*,

Your lab test has been completed:

🧪 *Test:* [Test Name]
✅ *Completed on:* [Date]
🏥 *Hospital:* [Hospital Name]

Your test results are now ready. You can collect them from the hospital or contact us for further assistance.

Thank you for your patience!
```

### Lab Report Ready

```
📋 *Lab Report Ready*

Dear *[Patient Name]*,

Your lab report is now available:

🧪 *Test:* [Test Name]
📅 *Report Date:* [Date]
🏥 *Hospital:* [Hospital Name]

Your detailed report has been generated and is ready for review. Please contact the hospital for any clarification regarding your results.

Thank you!
```

### Diagnosis Record Available

```
📋 *Diagnosis Record Available*

Dear *[Patient Name]*,

Your diagnosis record has been prepared:

👨‍⚕️ *Doctor:* [Doctor Name]
📅 *Date:* [Date]
🏥 *Hospital:* [Hospital Name]

Your diagnosis record is now available. Please contact the hospital to collect your medical documents or for any follow-up appointments.

Take care and follow your doctor's recommendations!
```

## Implementation Details

### Automatic Triggers

1. **Appointment Booking**: When `bookAppointment` is called, it automatically sends a WhatsApp notification to the patient.

2. **Lab Test Completion**: When a lab test status is updated to "COMPLETED", it automatically sends a notification.

### Manual Triggers

1. **Lab Report Sending**: Use the API endpoint to manually send lab reports with PDF generation.

2. **Diagnosis Record Sending**: Use the API endpoint to manually send diagnosis records with PDF generation.

### Error Handling

- WhatsApp failures don't prevent the main operations (appointment booking, lab test updates)
- All errors are logged for debugging
- API endpoints return appropriate error responses

### PDF Generation

- Lab reports use the `lab-report-template.html` template
- Diagnosis records use the existing `diagnosis-template.html` template
- PDFs are generated using Puppeteer and uploaded to S3
- Templates include hospital branding and professional formatting

## Testing

Use the test routes to verify WhatsApp functionality:

1. Test basic message sending
2. Test appointment notification format
3. Test lab test completion notification format
4. Verify phone number format (should be in E.164 format: +1234567890)

## Security Considerations

- All notification routes require authentication
- Phone numbers are validated before sending
- S3 URLs are generated with appropriate permissions
- WhatsApp API credentials are stored securely in environment variables

## Troubleshooting

### Common Issues

1. **WhatsApp API Errors**: Check environment variables and API credentials
2. **PDF Generation Failures**: Verify Puppeteer installation and template files
3. **S3 Upload Errors**: Check AWS credentials and bucket permissions
4. **Phone Number Format**: Ensure numbers are in E.164 format

### Debug Steps

1. Check server logs for error messages
2. Test with the `/api/test-whatsapp` endpoints
3. Verify environment variables are set correctly
4. Check WhatsApp Cloud API dashboard for message status

## Future Enhancements

- Add support for media messages (images, documents)
- Implement message delivery status tracking
- Add notification preferences for patients
- Support for multiple languages
- Integration with email notifications as fallback
