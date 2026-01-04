# Surgery Flow Implementation Summary

## Overview
Implemented a complete surgery workflow that automatically moves patients from OPD surgery confirmation to IPD queue and auto-converts surgeries upon admission.

## Changes Made

### 1. Database Schema Updates (`backend/prisma/schema.prisma`)

#### Added to `SurgicalStatus` enum:
- `CONVERTED_TO_IPD` - Status for OPD surgeries that have been converted to IPD

#### Updated `Surgery` model:
- Added `ipdQueues` relation to track IPD queue entries created from this surgery

#### Updated `IPDQueue` model:
- Added `admissionReason` field (optional string) - e.g., "SURGERY", "EMERGENCY", "OBSERVATION"
- Added `surgery` relation linking to the OPD surgery that triggered admission
- Added `surgeryId` field (optional) with index

#### Updated `IPDSurgery` model:
- Added `originalOpdSurgeryId` field to track the original OPD surgery

### 2. Backend Logic Changes

#### `backend/src/controllers/Appointment.controller.ts`
**Location:** `updateSurgeryStatus` method (lines 1171-1211)

When receptionist confirms surgery:
- Creates IPD queue entry with `surgeryId` and `admissionReason: "SURGERY"`
- Links the confirmed surgery to the queue

#### `backend/src/repositories/IPD.repository.ts`

**Updated `createIPDQueue` method:**
- Added `surgeryId?: string` parameter
- Added `admissionReason?: string` parameter
- Includes surgery data in response

**Updated `getIPDQueues` method:**
- Includes surgery data when fetching queues

**Updated `getIPDQueueById` method:**
- Includes surgery data in detailed queue view

**Updated `createIPDAdmission` method:**
- Checks if queue has associated surgery
- If surgery exists:
  - Auto-creates IPD surgery from OPD surgery data
  - Links back to original OPD surgery via `originalOpdSurgeryId`
  - Updates OPD surgery status to `CONVERTED_TO_IPD`
  - Assigns surgery to admitting doctor

### 3. Frontend Type Updates

#### `frontend/src/types/ipd.ts`
Updated `IPDQueueEntry` interface:
- Added `admissionReason?: string`
- Added `surgery?` object with:
  - `id`, `category`, `description`, `scheduledAt`, `status`

### 4. Frontend UI Changes

#### `frontend/src/pages/ipd/IPDQueuePage.tsx`
**Queued Patients Table:**
- Added "Admission Reason" column
- Displays surgery badge and details when `admissionReason === "SURGERY"`
- Shows surgery category and scheduled date/time
- Shows generic badge for non-surgery admissions

#### `frontend/src/pages/doctor/IPDPatientDetail.tsx`
**Removed OPD Data:**
- Removed "OPD Tests" tab
- Removed "OPD Surgeries" tab
- Simplified tab navigation from 7 tabs to 5 tabs

**Updated Overview Cards:**
- Changed "Tests" to "Lab Tests" showing only IPD tests
- Changed "Surgeries" to show only IPD surgeries
- Removed OPD vs IPD breakdown

## Workflow

### Complete Flow:
```
1. Doctor prescribes surgery in OPD appointment
   ↓
2. Receptionist confirms surgery + sets scheduled date
   ↓
3. Backend AUTOMATICALLY:
   - Creates IPD Queue entry
   - Links surgery to queue entry
   - Sets admissionReason = "SURGERY"
   ↓
4. Receptionist views IPD Queue
   - Sees patient with "Surgery Scheduled" badge
   - Sees surgery details and date
   ↓
5. Receptionist admits patient from queue
   ↓
6. Backend AUTOMATICALLY:
   - Creates IPD Surgery from OPD surgery data
   - Links IPD surgery back to original OPD surgery
   - Updates OPD surgery status to "CONVERTED_TO_IPD"
   ↓
7. Doctor views IPD patient
   - Sees surgery in "IPD Surgeries" tab
   - No clutter from OPD history
```

## Benefits

1. **No Duplicate Entry:** Surgery data flows automatically from OPD to IPD
2. **Clear Tracking:** Can trace IPD surgery back to original OPD prescription
3. **Better UX:** Receptionist sees WHY patient needs admission
4. **Cleaner UI:** IPD view focuses only on IPD data, not historical OPD data
5. **Audit Trail:** Original OPD surgery status shows "CONVERTED_TO_IPD"

## Migration Required

Run the following command to apply schema changes:
```bash
cd backend
npx prisma migrate dev --name add_surgery_ipd_flow
```

This will:
- Add new fields to database
- Create necessary indexes
- Apply all schema changes

## Testing Checklist

- [ ] Confirm surgery in OPD → Check IPD queue created with surgery link
- [ ] View IPD queue → Verify surgery details displayed
- [ ] Admit patient from queue → Check IPD surgery auto-created
- [ ] View IPD patient detail → Verify surgery appears in IPD Surgeries tab
- [ ] Check OPD surgery status → Should show "CONVERTED_TO_IPD"
- [ ] Verify IPD surgery has `originalOpdSurgeryId` populated
- [ ] Test non-surgery admissions → Should show "General Admission" badge

## Files Modified

### Backend:
1. `backend/prisma/schema.prisma`
2. `backend/src/controllers/Appointment.controller.ts`
3. `backend/src/repositories/IPD.repository.ts`

### Frontend:
1. `frontend/src/types/ipd.ts`
2. `frontend/src/pages/ipd/IPDQueuePage.tsx`
3. `frontend/src/pages/doctor/IPDPatientDetail.tsx`

## Notes

- OPD tests and surgeries are still fetched from backend but not displayed in IPD view
- This maintains backward compatibility while cleaning up the UI
- The original OPD surgery is preserved for historical records
- Surgeries can still be manually added to IPD if needed (not all surgeries come from OPD)

