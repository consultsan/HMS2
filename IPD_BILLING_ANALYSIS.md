# IPD Integrated Billing Analysis

## Current Backend Implementation Status

### ✅ Already Implemented:

1. **IPD Discharge Billing** (`calculateIPDDischargeBill` & `generateIPDDischargeBill`)
   - Room charges calculation (based on stay duration)
   - Surgery costs aggregation
   - Lab test costs aggregation
   - Advance amount adjustment
   - Bill generation with bill items

2. **Database Models:**
   - `IPDAdmission` - Has `insuranceType` field (CASHLESS, REIMBURSEMENT, NA)
   - `Prescription` & `PrescriptionItem` - For medicines (linked to IPD via `admissionId`)
   - `IPDLabTest` - For lab tests
   - `IPDSurgery` - For surgeries
   - `IPDVisit` - For doctor visits

3. **Insurance Types:**
   - Already has enum: `CASHLESS`, `REIMBURSEMENT`, `NA`

---

## ❌ Missing Features (Need to be Added):

### 1. **Cash Package Patient Flag**
   **Backend Changes Needed:**
   - Add `isPackagePatient: Boolean?` to `IPDAdmission` model
   - Add `packageAmount: Float?` to store fixed package cost
   - Modify discharge billing logic to check package flag

### 2. **Medicine Billing Integration**
   **Status:** Prescription model exists BUT not integrated in discharge billing
   **Backend Changes Needed:**
   - Update `calculateIPDDischargeBill` to include prescription items
   - Add medicine costs to bill breakdown
   - Nurse needs ability to add medicines (controller exists but may need expansion)

### 3. **GST on Room Rent**
   **Status:** NOT implemented
   **Backend Changes Needed:**
   - Add GST calculation (e.g., 18%) to room charges
   - Add `gstAmount` and `gstPercentage` fields to bill breakdown
   - Store GST separately in bill items

### 4. **Visiting Doctor System**
   **Status:** NOT implemented at all
   **Backend Changes Needed:**
   - Create `VisitingDoctor` model (name, specialization, fees, etc.)
   - Create `IPDVisitingDoctorVisit` model (link to admission, visiting doctor, fees)
   - Add API for nurse/receptionist to add visiting doctor visits
   - Include visiting doctor fees + 20% markup in discharge bill
   - Admin panel to manage visiting doctors

### 5. **Detailed vs Simplified Billing**
   **Status:** Only detailed billing exists
   **Backend Changes Needed:**
   - Modify `generateIPDDischargeBill` to check `isPackagePatient`
   - For package patients: only show advance, remaining, surgery name, surgeon
   - For cash/insurance: show detailed breakdown of all costs

---

## Required Database Schema Changes:

```prisma
model IPDAdmission {
  // ... existing fields ...
  
  // Package patient support
  isPackagePatient Boolean? @default(false)
  packageAmount Float?
  packageName String?
}

model VisitingDoctor {
  id String @id @default(uuid())
  name String
  specialisation String
  phone String?
  email String?
  consultationFees Float
  isActive Boolean @default(true)
  
  hospitalId String
  hospital Hospital @relation(fields: [hospitalId], references: [id])
  
  visits IPDVisitingDoctorVisit[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([hospitalId])
  @@index([isActive])
}

model IPDVisitingDoctorVisit {
  id String @id @default(uuid())
  visitDate DateTime @default(now())
  consultationFees Float
  hospitalMarkupPercentage Float @default(20)
  totalCharge Float // fees + markup
  notes String?
  
  admissionId String
  admission IPDAdmission @relation(fields: [admissionId], references: [id])
  
  visitingDoctorId String
  visitingDoctor VisitingDoctor @relation(fields: [visitingDoctorId], references: [id])
  
  addedById String // Nurse/Receptionist who added this
  addedBy User @relation(fields: [addedById], references: [id])
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([admissionId])
  @@index([visitingDoctorId])
  @@index([addedById])
}
```

---

## Backend Repository Changes Needed:

### 1. Update `calculateIPDDischargeBill`:
```typescript
// Add these sections:
- Medicines from prescriptions
- GST on room charges
- Visiting doctor visits
- Check isPackagePatient flag for simplified billing
```

### 2. New Methods Needed:
```typescript
// Visiting Doctors
createVisitingDoctor(data)
getVisitingDoctors(hospitalId)
updateVisitingDoctor(id, data)
deleteVisitingDoctor(id)

// Visiting Doctor Visits
addVisitingDoctorVisit(admissionId, data)
getVisitingDoctorVisits(admissionId)
updateVisitingDoctorVisit(id, data)
deleteVisitingDoctorVisit(id)
```

---

## Frontend Implementation Needed:

### 1. **Admission Form Updates:**
   - Add "Package Patient" checkbox
   - If package selected, show package amount input
   - Store `isPackagePatient` and `packageAmount`

### 2. **Nurse Dashboard - Medicine Entry:**
   - Interface to add medicines prescribed by doctor
   - Link medicines to IPD admission
   - Mark medicines as dispensed

### 3. **Nurse/Receptionist - Visiting Doctor Entry:**
   - Form to add visiting doctor visit
   - Select from visiting doctor dropdown
   - Enter visit date and fees (auto-calculate 20% markup)
   - Show list of all visiting doctor visits for admission

### 4. **Admin Panel - Visiting Doctors:**
   - CRUD interface for visiting doctors
   - Add name, specialization, consultation fees
   - Mark active/inactive

### 5. **Discharge Billing Page:**
   - Show different bill formats based on patient type:
     - **Package:** Simplified bill (advance, balance, surgery, surgeon)
     - **Cash/Insurance:** Detailed breakdown (room + GST, medicines, tests, surgeries, visiting doctors)
   - Preview before generating
   - Generate final bill

---

## Implementation Priority:

1. **HIGH PRIORITY:**
   - Package patient flag and logic
   - Medicine billing integration (already have prescriptions)
   - GST on room rent

2. **MEDIUM PRIORITY:**
   - Visiting doctor system (new feature, requires schema changes)

3. **FRONTEND:**
   - Update admission form
   - Nurse medicine entry interface
   - Visiting doctor entry interface
   - Discharge billing page with dual formats

---

## Next Steps:

1. Decide if you want to proceed with schema changes (visiting doctors)
2. Update IPD billing calculation to include medicines
3. Add GST calculation
4. Implement package patient logic
5. Build frontend interfaces

Would you like me to start implementing these changes?

