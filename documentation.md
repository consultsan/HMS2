# 🏥 Hospital Management System (HMS2) - Complete Documentation

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [API Documentation](#api-documentation)
6. [Frontend Architecture](#frontend-architecture)
7. [Authentication & Authorization](#authentication--authorization)
8. [Key Features](#key-features)
9. [Installation & Setup](#installation--setup)
10. [Development Guidelines](#development-guidelines)
11. [Known Issues & Fixes](#known-issues--fixes)
12. [Deployment](#deployment)

---

## 🎯 Project Overview

HMS2 is a comprehensive Hospital Management System built with modern web technologies. It provides a complete solution for managing hospital operations including patient management, appointments, billing, lab tests, and administrative functions.

### Core Functionality

- **Multi-role User Management**: Super Admin, Hospital Admin, Doctor, Nurse, Receptionist, Sales Person, Lab Technician, Pharmacist
- **Patient Management**: Registration, medical records, family links, document management
- **Appointment System**: Scheduling, confirmation, diagnosis, follow-ups
- **Billing & Payments**: OPD charges, insurance, discounts, payment processing
- **Lab Management**: Test creation, results, reports
- **Real-time Communication**: WebSocket integration for live updates
- **Document Generation**: PDF reports, bills, medical summaries
- **WhatsApp Integration**: Automated notifications and communications

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React/TS)    │◄──►│   (Node.js/TS)  │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebSocket     │    │   Redis Cache   │    │   File Storage  │
│   (Real-time)   │    │   (Session)     │    │   (S3/Cloudinary)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Directory Structure

```
HMS2/
├── backend/                 # Backend application
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── repositories/    # Data access layer
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Express middleware
│   │   ├── utils/           # Utility functions
│   │   └── templates/       # HTML templates for PDFs
│   ├── prisma/              # Database schema and migrations
│   └── dist/                # Compiled JavaScript
├── frontend/                # Frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── contexts/        # React contexts
│   │   ├── api/             # API client functions
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   └── public/              # Static assets
└── docs/                    # Documentation
```

---

## 🛠️ Technology Stack

### Backend

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with cookie-based storage
- **Real-time**: WebSocket (ws library)
- **File Upload**: Multer, AWS S3, Cloudinary
- **PDF Generation**: Puppeteer, PDFKit, Handlebars
- **Caching**: Redis
- **Communication**: WhatsApp API integration
- **Validation**: Custom validation with TypeScript

### Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with Radix UI components
- **State Management**: React Context API
- **HTTP Client**: Axios with interceptors
- **Routing**: React Router DOM v6
- **Charts**: Chart.js, Recharts
- **Forms**: React Hook Form
- **Notifications**: Sonner, React Hot Toast
- **Date Handling**: date-fns

### Development Tools

- **Package Manager**: npm
- **Type Checking**: TypeScript (strict mode)
- **Linting**: ESLint
- **Code Formatting**: Prettier
- **Database Management**: Prisma Studio

---

## 🗄️ Database Schema

### Core Entities

#### User Management

- **SuperAdmin**: System-wide administrators
- **HospitalAdmin**: Hospital-specific administrators
- **HospitalStaff**: Doctors, nurses, receptionists, etc.
- **Hospital**: Hospital information and configuration

#### Patient Management

- **Patient**: Core patient information
- **PatientFamilyLink**: Family relationships
- **PatientDoc**: Document attachments (photos, ID proofs, etc.)
- **Vital**: Patient vital signs and measurements

#### Appointment System

- **Appointment**: Scheduled appointments
- **AppointmentAttachment**: Related documents
- **Shift**: Doctor availability schedules
- **OpdCharge**: Consultation fees

#### Medical Records

- **Diagnosis**: Patient diagnoses and treatments
- **LabTest**: Laboratory test orders and results
- **LabTestAppointment**: Scheduled lab tests

#### Financial Management

- **Billing**: Patient bills and charges
- **Payment**: Payment records
- **Insurance**: Insurance information
- **Discount**: Discount policies

### Key Enums

```typescript
enum UserRole {
  SUPER_ADMIN | HOSPITAL_ADMIN | DOCTOR | NURSE |
  RECEPTIONIST | SALES_PERSON | LAB_TECHNICIAN | PHARMACIST
}

enum AppointmentStatus {
  SCHEDULED | CONFIRMED | CANCELLED | DIAGNOSED | PENDING
}

enum RegistrationMode {
  OPD | IPD | EMERGENCY
}
```

---

## 🔌 API Documentation

### Authentication Endpoints

```
POST /api/login                    # User login
POST /api/logout                   # User logout
```

### Super Admin Endpoints

```
GET    /api/super-admin/hospitals  # List hospitals
POST   /api/super-admin/hospitals  # Create hospital
PUT    /api/super-admin/hospitals/:id  # Update hospital
DELETE /api/super-admin/hospitals/:id  # Delete hospital

GET    /api/super-admin/admins     # List admins
POST   /api/super-admin/admins     # Create admin
PUT    /api/super-admin/admins/:id # Update admin
DELETE /api/super-admin/admins/:id # Delete admin

GET    /api/super-admin/kpis       # System KPIs
```

### Hospital Admin Endpoints

```
GET    /api/hospital-admin/users   # List hospital users
POST   /api/hospital-admin/users   # Create user
PUT    /api/hospital-admin/users/:id # Update user
DELETE /api/hospital-admin/users/:id # Delete user

GET    /api/hospital-admin/shifts  # List shifts
POST   /api/hospital-admin/shifts  # Create shift
PUT    /api/hospital-admin/shifts/:id # Update shift

GET    /api/hospital-admin/opd-charges # List OPD charges
POST   /api/hospital-admin/opd-charges # Create OPD charge
```

### Patient Management Endpoints

```
GET    /api/patients               # List patients
POST   /api/patients               # Create patient
GET    /api/patients/:id           # Get patient details
PUT    /api/patients/:id           # Update patient
DELETE /api/patients/:id           # Delete patient

POST   /api/patients/:id/documents # Upload patient documents
GET    /api/patients/:id/vitals    # Get patient vitals
POST   /api/patients/:id/vitals    # Add patient vitals
```

### Appointment Endpoints

```
GET    /api/appointments           # List appointments
POST   /api/appointments           # Create appointment
GET    /api/appointments/:id       # Get appointment details
PUT    /api/appointments/:id       # Update appointment
DELETE /api/appointments/:id       # Cancel appointment

POST   /api/appointments/:id/diagnosis # Add diagnosis
GET    /api/appointments/slots     # Get available slots
```

### Lab Management Endpoints

```
GET    /api/lab/tests              # List lab tests
POST   /api/lab/tests              # Create lab test
GET    /api/lab/tests/:id          # Get test details
PUT    /api/lab/tests/:id          # Update test
POST   /api/lab/tests/:id/results  # Add test results
```

### Billing Endpoints

```
GET    /api/billing/bills          # List bills
POST   /api/billing/bills          # Create bill
GET    /api/billing/bills/:id      # Get bill details
PUT    /api/billing/bills/:id      # Update bill

GET    /api/payments               # List payments
POST   /api/payments               # Process payment
```

### WebSocket Endpoints

```
WS /api/dashboard/patient          # Real-time patient updates
```

### Response Format

```typescript
interface ApiResponse {
	message: string;
	data?: any;
	error?: string;
}
```

---

## 🎨 Frontend Architecture

### Component Structure

```
src/
├── components/           # Reusable UI components
│   ├── layout/          # Layout components (Sidebar, Header)
│   ├── forms/           # Form components
│   ├── tables/          # Data table components
│   └── ui/              # Basic UI components
├── pages/               # Page components
│   ├── super-admin/     # Super admin pages
│   ├── hospital-admin/  # Hospital admin pages
│   ├── doctor/          # Doctor pages
│   ├── receptionist/    # Receptionist pages
│   ├── lab/             # Lab technician pages
│   └── consultation/    # Consultation pages
├── contexts/            # React contexts
│   ├── AuthContext.tsx  # Authentication state
│   └── SearchContext.tsx # Search functionality
├── api/                 # API client functions
├── types/               # TypeScript definitions
└── utils/               # Utility functions
```

### State Management

- **Authentication State**: Managed by AuthContext
- **Search State**: Managed by SearchContext
- **Form State**: React Hook Form
- **Server State**: TanStack Query (React Query)

### Routing Structure

```
/                           # Redirect to login
/login                      # Login page
/super-admin/*              # Super admin routes
  ├── dashboard             # System overview
  ├── hospitals             # Hospital management
  └── admins                # Admin management
/hospital-admin/*           # Hospital admin routes
  ├── dashboard             # Hospital overview
  ├── users                 # User management
  ├── shifts                # Shift management
  ├── opd-fees              # OPD charge management
  └── patients              # Patient management
/doctor/*                   # Doctor routes
  ├── dashboard             # Doctor dashboard
  ├── appointments          # Appointment management
  ├── template              # Disease templates
  └── create                # Test creation
/receptionist/*             # Receptionist routes
  ├── dashboard             # Receptionist dashboard
  ├── patients              # Patient management
  ├── appointments          # Appointment management
  ├── follow-ups            # Follow-up management
  └── surgical-appointments # Surgical appointments
/lab/*                      # Lab technician routes
  ├── dashboard             # Lab dashboard
  ├── from-doctors          # Tests from doctors
  ├── from-receptionist     # Tests from receptionist
  ├── completed-tests       # Completed tests
  └── create                # Test creation
```

---

## 🔐 Authentication & Authorization

### Authentication Flow

1. **Login**: User submits credentials via `/api/login`
2. **Token Generation**: Server generates JWT token with user info
3. **Token Storage**: Token stored in HTTP-only cookie and localStorage
4. **Request Authentication**: Token sent with each API request
5. **Token Validation**: Server validates token on protected routes

### Authorization Levels

```typescript
enum UserRole {
	SUPER_ADMIN, // System-wide access
	HOSPITAL_ADMIN, // Hospital-specific admin
	DOCTOR, // Medical staff
	NURSE, // Nursing staff
	RECEPTIONIST, // Front desk
	SALES_PERSON, // Sales and billing
	LAB_TECHNICIAN, // Laboratory staff
	PHARMACIST // Pharmacy staff
}
```

### Route Protection

- **ProtectedRoute Component**: Wraps routes requiring authentication
- **Role-based Access**: Routes restricted by user role
- **Hospital Isolation**: Users can only access their hospital's data

### Security Features

- **JWT Tokens**: Secure token-based authentication
- **HTTP-only Cookies**: Prevents XSS attacks
- **CORS Configuration**: Restricts cross-origin requests
- **Input Validation**: Server-side validation for all inputs
- **Password Hashing**: bcrypt for password security

---

## ✨ Key Features

### 1. Multi-Role User Management

- **Super Admin**: System-wide administration
- **Hospital Admin**: Hospital-specific management
- **Medical Staff**: Doctors, nurses, lab technicians
- **Support Staff**: Receptionists, sales personnel

### 2. Comprehensive Patient Management

- **Patient Registration**: Complete patient profiles
- **Medical Records**: Diagnosis, treatments, vitals
- **Document Management**: Photos, ID proofs, reports
- **Family Links**: Family relationship tracking

### 3. Advanced Appointment System

- **Smart Scheduling**: Doctor availability management
- **Status Tracking**: Scheduled → Confirmed → Diagnosed
- **Follow-ups**: Automated follow-up scheduling
- **Real-time Updates**: WebSocket notifications

### 4. Laboratory Management

- **Test Creation**: Custom lab test definitions
- **Result Management**: Test results and reports
- **Sample Tracking**: Sample collection and processing
- **Report Generation**: Automated PDF reports

### 5. Financial Management

- **Billing System**: Comprehensive billing
- **Payment Processing**: Multiple payment methods
- **Insurance Integration**: Insurance claim processing
- **Discount Management**: Flexible discount policies

### 6. Communication Features

- **WhatsApp Integration**: Automated notifications
- **Real-time Chat**: WebSocket-based communication
- **Email Notifications**: Automated email alerts
- **SMS Integration**: Text message notifications

### 7. Document Generation

- **PDF Reports**: Medical reports, bills, summaries
- **Custom Templates**: Handlebars-based templates
- **Digital Signatures**: Secure document signing
- **Cloud Storage**: S3/Cloudinary integration

### 8. Analytics & Reporting

- **KPI Dashboard**: Key performance indicators
- **Financial Reports**: Revenue and expense tracking
- **Patient Analytics**: Patient demographics and trends
- **Operational Metrics**: Hospital efficiency metrics

---

## 🚀 Installation & Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for caching)
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Environment setup
cp .env.example .env
# Edit .env with your configuration

# Database setup
npm run migrate:dev
npm run generate
npm run seed

# Development
npm run dev

# Production build
npm run build
npm start
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Environment setup
cp .env.example .env
# Edit .env with your configuration

# Development
npm run dev

# Production build
npm run build
npm run preview
```

### Environment Variables

#### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/hms2"

# JWT
JWT_SECRET="your-secret-key"

# Server
HTTP_PORT=3000
FRONTEND_ORIGIN="http://localhost:5173"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# File Storage
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="us-east-1"
AWS_BUCKET_NAME="your-bucket"

# Cloudinary (alternative to S3)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# WhatsApp API
WHATSAPP_API_KEY="your-whatsapp-key"
WHATSAPP_PHONE_NUMBER="your-phone-number"
```

#### Frontend (.env)

```env
VITE_API_BASE_URL="http://localhost:3000/api"
VITE_WS_URL="ws://localhost:3000"
```

---

## 📝 Development Guidelines

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Conventional Commits**: Git commit message format

### Backend Development

```typescript
// Controller pattern
export class PatientController {
	private patientRepository: PatientRepository;

	constructor() {
		this.patientRepository = new PatientRepository();
	}

	async getPatient(req: Request, res: Response) {
		try {
			// Implementation
			res.json(new ApiResponse("Success", data));
		} catch (error: any) {
			res.status(error.code || 500).json(new ApiResponse(error.message));
		}
	}
}

// Repository pattern
export class PatientRepository {
	async findById(id: string) {
		return await prisma.patient.findUnique({
			where: { id },
			include: {
				/* relations */
			}
		});
	}
}
```

### Frontend Development

```typescript
// Component structure
interface ComponentProps {
	// Props interface
}

export default function Component({ prop }: ComponentProps) {
	// Hooks
	const { data, isLoading } = useQuery(["key"], fetchData);

	// Event handlers
	const handleSubmit = async (data: FormData) => {
		// Implementation
	};

	// Render
	return <div className="container">{/* JSX */}</div>;
}
```

### API Development

- **RESTful Design**: Follow REST principles
- **Error Handling**: Consistent error responses
- **Validation**: Input validation on all endpoints
- **Documentation**: JSDoc comments for all functions

### Database Development

- **Migrations**: Use Prisma migrations
- **Seeding**: Database seeding for development
- **Relations**: Proper foreign key relationships
- **Indexing**: Optimize query performance

---

## 🐛 Known Issues & Fixes

### Critical Issues (Fixed)

1. **Environment Variable Typo**: `CLOUDINARY_API_SECRECT` → `CLOUDINARY_API_SECRET`
2. **Hardcoded Empty patientId**: Fixed route parameter usage
3. **Inconsistent Token Storage**: Standardized to use 'token' key
4. **WebSocket Memory Leak**: Added cleanup logic
5. **API Endpoint Mismatch**: Fixed `/auth/login` → `/login`
6. **Missing Authentication**: Added ProtectedRoute wrapper
7. **Poor Error Handling**: Improved validation and logging

### Minor Issues (Identified)

1. **Debug Console.log Statements**: Remove in production
2. **Missing Environment Variables**: Add validation
3. **Type Safety Issues**: Remove `any` types

### Recommendations

1. **Add Environment Variable Validation**
2. **Implement Proper Logging**
3. **Add Input Validation**
4. **Improve Type Safety**
5. **Add Unit Tests**

---

## 🚀 Deployment

### Production Environment

- **Backend**: Node.js on cloud platform (AWS, GCP, Azure)
- **Frontend**: Static hosting (Vercel, Netlify, S3)
- **Database**: Managed PostgreSQL service
- **Cache**: Redis cluster
- **Storage**: S3 or Cloudinary for files
- **CDN**: CloudFront or similar for static assets

### Docker Deployment

```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Configuration

- **Production Variables**: Secure environment variables
- **SSL/TLS**: HTTPS configuration
- **CORS**: Production origins only
- **Rate Limiting**: API rate limiting
- **Monitoring**: Application monitoring

### CI/CD Pipeline

```yaml
# GitHub Actions example
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build
      - name: Deploy
        run: npm run deploy
```

---

## 📞 Support & Contributing

### Getting Help

- **Documentation**: This README and inline code comments
- **Issues**: GitHub issues for bug reports
- **Discussions**: GitHub discussions for questions

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Review Process

- All changes require review
- Tests must pass
- Code style must be consistent
- Documentation must be updated

---

## 📄 License

This project is licensed under the ISC License.

---

## 🏥 About HMS2

HMS2 is a modern, scalable hospital management system designed to streamline healthcare operations. Built with best practices and modern technologies, it provides a comprehensive solution for hospitals of all sizes.

**Key Benefits:**

- 🚀 **High Performance**: Optimized for speed and efficiency
- 🔒 **Secure**: Enterprise-grade security features
- 📱 **Responsive**: Works on all devices
- 🔧 **Scalable**: Handles growing hospital needs
- 💡 **User-Friendly**: Intuitive interface design
- 🔄 **Real-time**: Live updates and notifications

---

_Last Updated: December 2024_
_Version: 2.0.0_
