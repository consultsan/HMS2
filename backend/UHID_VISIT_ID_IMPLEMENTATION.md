# UHID and Visit ID Implementation

This document describes the implementation of Universal Health ID (UHID) and Visit ID system for the TRUE Hospital Management System.

## Overview

The UHID and Visit ID system provides:

- **Universal Health ID (UHID)**: A unique identifier for each patient across the entire TRUE ecosystem
- **Visit ID**: A unique identifier for each patient visit (OPD/IPD) linked to the UHID

## UHID Format

**Pattern**: `TR + [First 2 letters of hospital name] + [Year code] + [Sequential number]`

**Example**: `TRAV25001`

- `TR` = First 2 letters of "TRUE"
- `AV` = First 2 letters of hospital name "AVISE"
- `25` = Year code for 2025
- `001` = Sequential number (3 digits with leading zeros)

## Visit ID Format

**Pattern**: `[Visit Type] + [UHID without sequence] + [Visit sequence]`

**Examples**:

- `OPDTRAV251` = OPD visit #1 for patient TRAV25001
- `IPDTRAV251` = IPD visit #1 for patient TRAV25001
- `OPDTRAV252` = OPD visit #2 for patient TRAV25001

## Database Schema Changes

### New Fields Added

1. **Patient Model**:

   - `uhid` (String, unique) - Universal Health ID

2. **Appointment Model**:

   - `visitId` (String, unique) - Visit ID for this appointment

3. **New Model - UhidSequence**:
   - `id` (String, primary key)
   - `yearCode` (String, unique) - Year code (e.g., "25")
   - `sequence` (Int) - Current sequence number for the year
   - `createdAt`, `updatedAt` (DateTime)

### Indexes Added

- `Patient.uhid` - For fast UHID lookups
- `Appointment.visitId` - For fast Visit ID lookups
- `UhidSequence.yearCode` - For sequence management

## API Endpoints

### Patient Endpoints

#### Get Patient by UHID

```
GET /api/patients/get-by-uhid?uhid=TRAV25001
```

**Response**:

```json
{
  "success": true,
  "message": "Patient fetched successfully",
  "data": {
    "id": "...",
    "name": "John Doe",
    "uhid": "TRAV25001",
    "patientUniqueId": "...",
    "appointments": [...]
  }
}
```

### Appointment Endpoints

#### Get Appointment by Visit ID

```
GET /api/appointments/visit/OPDTRAV251
```

**Response**:

```json
{
	"success": true,
	"message": "Appointment fetched successfully",
	"data": {
		"id": "...",
		"visitId": "OPDTRAV251",
		"patient": {
			"uhid": "TRAV25001",
			"name": "John Doe"
		},
		"visitType": "OPD",
		"scheduledAt": "..."
	}
}
```

## Billing Integration

### Bill Template Updates

The bill template now includes:

- **UHID**: Displayed in patient information section
- **Visit ID**: Displayed in patient information section (if appointment-linked)

### Bill API Updates

The bill creation and retrieval APIs now include:

- Patient UHID in bill data
- Appointment Visit ID in bill data (if appointment-linked)

## Implementation Details

### UHID Generation

1. **Hospital Prefix**: Extract first 2 letters of hospital name
2. **Year Code**: Current year's last 2 digits
3. **Sequence**: Atomic increment using `UhidSequence` table
4. **Format**: Combine with leading zeros for 3-digit sequence

### Visit ID Generation

1. **UHID Prefix**: Extract UHID without sequence (e.g., "TRAV25" from "TRAV25001")
2. **Visit Count**: Count existing visits for this patient and visit type
3. **Sequence**: Visit count + 1
4. **Format**: `[OPD/IPD] + [UHID Prefix] + [Visit Sequence]`

### Validation

- **UHID Validation**: Regex `/^TR[A-Z]{2}\d{2}\d{3}$/`
- **Visit ID Validation**: Regex `/^(OPD|IPD)TR[A-Z]{2}\d{2}\d+$/`

## Migration

### For Existing Data

Run the migration script to add UHID and Visit ID to existing records:

```bash
cd backend
npx ts-node src/utils/migrateUHID.ts
```

This script will:

1. Generate UHID for all patients without UHID
2. Generate Visit ID for all appointments without Visit ID
3. Handle errors gracefully and report progress

### Database Migration

```bash
cd backend
npx prisma migrate dev --name add_uhid_visit_id
npx prisma generate
```

## Usage Examples

### Creating a New Patient

```typescript
// UHID is automatically generated when creating a patient
const patient = await prisma.patient.create({
	data: {
		name: "John Doe",
		hospitalId: "hospital-id"
		// ... other fields
	}
});
// patient.uhid will be automatically set (e.g., "TRAV25001")
```

### Creating a New Appointment

```typescript
// Visit ID is automatically generated when creating an appointment
const appointment = await prisma.appointment.create({
	data: {
		patientId: "patient-id",
		visitType: "OPD"
		// ... other fields
	}
});
// appointment.visitId will be automatically set (e.g., "OPDTRAV251")
```

### Finding Patient by UHID

```typescript
const patient = await prisma.patient.findUnique({
	where: { uhid: "TRAV25001" }
});
```

### Finding Appointment by Visit ID

```typescript
const appointment = await prisma.appointment.findUnique({
	where: { visitId: "OPDTRAV251" }
});
```

## Benefits

1. **Universal Identification**: UHID works across all TRUE hospitals
2. **Visit Tracking**: Easy tracking of patient visits with Visit ID
3. **Billing Integration**: Visit ID appears on bills for easy reference
4. **Scalable**: Sequence management ensures no conflicts
5. **Backward Compatible**: Existing functionality remains unchanged

## Error Handling

- **Missing UHID**: Appointments cannot be created without patient UHID
- **Duplicate UHID**: Database constraints prevent duplicates
- **Invalid Format**: Validation ensures proper format
- **Migration Errors**: Graceful handling with detailed error reporting

## Future Enhancements

1. **UHID Search**: Global search across all hospitals
2. **Visit History**: Complete visit history by UHID
3. **Analytics**: Visit patterns and trends
4. **Integration**: External system integration using UHID
