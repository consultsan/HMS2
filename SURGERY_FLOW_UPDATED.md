# Updated Surgery Flow Implementation

## Changes from Original Implementation

### Original Flow (Auto-Create):
```
1. Doctor prescribes surgery in OPD
   ↓
2. Receptionist confirms surgery + schedules
   ↓
3. IPD Queue entry created (with surgery link)
   ↓
4. Receptionist admits patient
   ↓
5. **Surgery AUTOMATICALLY created in IPD**  ← OLD
   ↓
6. Doctor manages surgery
```

### New Flow (Manual Form):
```
1. Doctor prescribes surgery in OPD
   ↓
2. Receptionist confirms surgery + schedules
   ↓
3. IPD Queue entry created (with surgery link)
   ↓
4. Receptionist admits patient
   ↓
5. **Receptionist sees "Surgery" button in admitted tab**  ← NEW
   ↓
6. Receptionist clicks button → Surgery form opens
   ↓
7. **Form pre-filled with OPD surgery data**
   ↓
8. Receptionist reviews/updates and submits
   ↓
9. IPD Surgery created + OPD surgery marked as CONVERTED_TO_IPD
   ↓
10. Doctor can now manage the surgery
```

## Why This Change?

### Benefits:
1. ✅ **Receptionist Control**: Receptionist can review surgery details before creating
2. ✅ **Add Missing Info**: Can add scheduling, team, costs during admission
3. ✅ **Verification Step**: Ensures all details are correct before surgery is scheduled
4. ✅ **Flexibility**: Can modify OPD surgeon's notes if needed
5. ✅ **Better Workflow**: Natural part of the admission process

## Implementation Details

### Backend Changes

#### 1. Repository (`backend/src/repositories/IPD.repository.ts`)
**Removed** auto-surgery creation from `createIPDAdmission`:
```typescript
// OLD: Auto-created surgery
if (queue?.surgery && queue.surgeryId) {
  await prisma.iPDSurgery.create({...});
}

// NEW: No auto-creation, just include surgery for reference
include: {
  queue: {
    include: {
      patient: true,
      surgery: true // Include for pre-filling form
    }
  }
}
```

**Added** `originalOpdSurgeryId` parameter to `createIPDSurgery`:
```typescript
async createIPDSurgery(data: {
  // ... existing fields ...
  originalOpdSurgeryId?: string; // NEW
})
```

#### 2. Controller (`backend/src/controllers/IPD.controller.ts`)
**Added** OPD surgery status update in `createIPDSurgery`:
```typescript
// If this surgery is converted from OPD, update the OPD surgery status
if (originalOpdSurgeryId) {
  await prisma.surgery.update({
    where: { id: originalOpdSurgeryId },
    data: { status: 'CONVERTED_TO_IPD' as any }
  });
}
```

### Frontend Changes

#### 1. API Types (`frontend/src/api/ipd.ts`)
**Added** `originalOpdSurgeryId` to `createIPDSurgery` parameters:
```typescript
createIPDSurgery: (data: {
  // ... existing fields ...
  originalOpdSurgeryId?: string; // NEW
})
```

#### 2. IPD Queue Page (`frontend/src/pages/ipd/IPDQueuePage.tsx`)

**Added Surgery Button** (shows only for surgery admissions):
```tsx
{entry.admissionReason === 'SURGERY' && (
  <Button onClick={() => handleManageSurgery(entry)}>
    <Scissors className="h-4 w-4 mr-1" />
    Surgery
  </Button>
)}
```

**Smart Button Logic**:
- If IPD surgery exists → Shows view dialog
- If no IPD surgery → Opens creation form (pre-filled with OPD data)

**Added Surgery Form Component**:
- Pre-fills from OPD surgery data (name, category, scheduled date, description)
- Shows blue indicator: "Pre-filled from OPD Surgery"
- Allows receptionist to review/update all fields
- Submits with `originalOpdSurgeryId` for tracking

### Form Pre-Fill Mapping

| OPD Surgery Field | → | IPD Surgery Field |
|-------------------|---|-------------------|
| `category` | → | `surgeryName` & `category` |
| `description` | → | `procedureDescription` |
| `scheduledAt` | → | `scheduledAt` |
| `status` | → | (Inherited, usually CONFIRMED) |
| `id` | → | `originalOpdSurgeryId` (for tracking) |

### User Experience

#### For Receptionist:
1. **In Queue Tab**: Patient shows "Surgery Scheduled" badge
2. **Admit Patient**: Normal admission process (no change)
3. **In Admitted Tab**: See orange "Surgery" button for surgery patients
4. **Click Surgery Button**:
   - First time: Opens form with OPD data pre-filled
   - After creation: Shows surgery details (read-only view)
5. **Fill Form**: Review pre-filled data, add team/costs, submit
6. **Result**: Surgery created, OPD surgery marked as converted

#### For Doctor:
- Sees the surgery in IPD Surgeries tab
- Can edit/update surgery details
- Can add surgical notes, complications, etc.
- Surgery has `originalOpdSurgeryId` for reference

## Files Modified

### Backend:
1. ✏️ `backend/src/repositories/IPD.repository.ts`
   - Removed auto-create logic
   - Added originalOpdSurgeryId parameter

2. ✏️ `backend/src/controllers/IPD.controller.ts`
   - Added OPD surgery status update
   - Accepts originalOpdSurgeryId from request

### Frontend:
1. ✏️ `frontend/src/api/ipd.ts`
   - Added originalOpdSurgeryId to API types

2. ✏️ `frontend/src/pages/ipd/IPDQueuePage.tsx`
   - Added surgery button logic
   - Created ReceptionistSurgeryForm component
   - Smart handling (form vs view)

## Setup Instructions

### 1. Run Prisma Generate
The schema already has the fields, but Prisma client needs regeneration:
```bash
cd backend
npx prisma generate
```

### 2. Restart Backend
```bash
npm run dev
```

### 3. Test the Flow

#### Test Scenario:
1. **Create Surgery in OPD**:
   - Doctor prescribes surgery for patient
   - Note the surgery category and description

2. **Confirm Surgery (Receptionist)**:
   - Go to Surgical Appointments
   - Confirm the surgery with a scheduled date
   - **Verify**: Patient appears in IPD Queue with "Surgery Scheduled" badge

3. **Admit Patient (Receptionist)**:
   - Go to IPD Queue → Queued tab
   - Click "Admit" on the patient
   - Fill admission form and submit
   - **Verify**: Patient moves to "Admitted" tab

4. **Create Surgery (Receptionist)**:
   - In Admitted tab, click orange "Surgery" button
   - **Verify**: Form opens with pre-filled data from OPD:
     - Surgery name = OPD category
     - Category = OPD category
     - Description = OPD description
     - Scheduled date = OPD scheduled date
   - Add additional info (surgeon, costs, etc.)
   - Click "Create Surgery"
   - **Verify**: Success toast, form closes

5. **View Surgery (Receptionist)**:
   - Click "Surgery" button again
   - **Verify**: Now shows surgery details (not form)
   - Shows "Auto-Converted from OPD Surgery" badge

6. **Doctor View (Doctor)**:
   - Go to IPD Patient Management
   - Click on the patient
   - Go to "IPD Surgeries" tab
   - **Verify**: Surgery appears in list
   - Can edit and manage surgery details

## Comparison Chart

| Aspect | Original (Auto-Create) | New (Manual Form) |
|--------|------------------------|-------------------|
| **When Created** | During admission (automatic) | After admission (manual) |
| **Who Creates** | System (automatic) | Receptionist (explicit action) |
| **Data Review** | No review opportunity | Receptionist reviews before creating |
| **Additional Info** | Limited to OPD data | Can add team, costs, notes |
| **User Feedback** | Silent creation | Clear form submission |
| **Flexibility** | Fixed process | Receptionist can delay/modify |
| **Tracking** | Auto-linked | Explicitly linked via form |

## Benefits Summary

✅ **Better Control**: Receptionist explicitly manages surgery creation  
✅ **Data Verification**: Review OPD data before IPD creation  
✅ **Complete Information**: Add scheduling details, team, costs during admission  
✅ **Clear Process**: Visible button and form make workflow explicit  
✅ **Error Prevention**: Receptionist can catch mistakes before creating  
✅ **Flexibility**: Can create surgery immediately or later  
✅ **User-Friendly**: Form pre-fills reduce data entry  
✅ **Audit Trail**: Clear indication of who created surgery and when  

## Migration Notes

- **Existing Data**: No migration needed for existing surgeries
- **Backward Compatibility**: Old auto-created surgeries continue to work
- **New Admissions**: Will use new manual form process
- **OPD Surgeries**: Existing confirmed surgeries maintain their links

