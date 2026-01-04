# IPD Frontend Billing Implementation Plan

## Current State Analysis

### ✅ What EXISTS:
1. **Receptionist Discharge Form** (`ReceptionistDischargeForm.tsx`)
   - Only creates discharge summary (medical info)
   - NO billing functionality
   - Fields: diagnosis, treatment summary, medicines prescribed (text), follow-up

2. **View Bill Component** (`ViewBill.tsx`)
   - Generic bill viewer that shows bill items
   - Can display any bill (OPD/IPD)
   - Shows: items, quantity, unit price, discount, total

3. **Backend APIs Available:**
   - `GET /api/ipd/billing/:admissionId/calculate` - Calculate discharge bill
   - `POST /api/ipd/billing/:admissionId/generate` - Generate final bill
   - Already includes: Room charges, Surgery costs, Lab test costs

### ❌ What's MISSING:
1. **Billing preview before discharge**
2. **Bill generation button**
3. **Display of bill breakdown**
4. **Integration with discharge process**

---

## Implementation Plan

### Phase 1: Add Billing to Discharge Process (PRIORITY)

#### A. Update `ReceptionistDischargeForm.tsx`

**Changes Needed:**
1. Fetch bill calculation on form open
2. Display bill breakdown in the form
3. Add "Generate Bill" step before/after discharge
4. Show:
   - Room charges (days × rate)
   - Surgery costs
   - Lab test costs
   - Total amount
   - Advance payment (if any)
   - Amount due

**New Sections to Add:**
```tsx
// 1. Billing Preview Card
<Card>
  <CardHeader>
    <CardTitle>Bill Summary</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <div className="flex justify-between">
        <span>Room Charges ({days} days × ₹{rate}/day)</span>
        <span>₹{roomCharges}</span>
      </div>
      <div className="flex justify-between">
        <span>Surgery Charges</span>
        <span>₹{surgeryCharges}</span>
      </div>
      <div className="flex justify-between">
        <span>Lab Test Charges</span>
        <span>₹{labTestCharges}</span>
      </div>
      <div className="border-t pt-2 flex justify-between font-semibold">
        <span>Total</span>
        <span>₹{total}</span>
      </div>
      {advanceAmount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Advance Paid</span>
          <span>-₹{advanceAmount}</span>
        </div>
      )}
      <div className="border-t pt-2 flex justify-between font-bold text-lg">
        <span>Amount Due</span>
        <span>₹{amountDue}</span>
      </div>
    </div>
  </CardContent>
</Card>

// 2. Payment Information Section
<Card>
  <CardHeader>
    <CardTitle>Payment Details</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Amount Paid</Label>
        <Input type="number" />
      </div>
      <div>
        <Label>Payment Mode</Label>
        <Select>
          <SelectItem value="CASH">Cash</SelectItem>
          <SelectItem value="CARD">Card</SelectItem>
          <SelectItem value="UPI">UPI</SelectItem>
        </Select>
      </div>
    </div>
  </CardContent>
</Card>
```

**Updated Flow:**
1. Receptionist clicks "Discharge"
2. Form opens → Automatically fetches bill calculation
3. Shows bill breakdown at the top
4. Receptionist fills medical discharge summary
5. Enters payment details (if not paid)
6. Click "Discharge & Generate Bill"
7. Backend creates discharge summary + generates bill
8. Show success with bill number
9. Option to view/print bill

---

### Phase 2: Detailed Bill View

#### Create `IPDDischargeBillViewer.tsx`

**Purpose:** Display full bill with all details

**Features:**
- Patient information
- Admission details (dates, duration, ward)
- Itemized charges:
  - Room charges breakdown
  - Each surgery with cost
  - Each lab test with cost
- Summary section
- Advance payment adjustment
- Final amount
- Hospital stamp/signature
- Print functionality

**Usage:**
- Called from discharge form after bill generation
- Can be accessed from discharged patients list
- Can be viewed by clicking "View Bill" button

---

### Phase 3: Medicines Integration (IF NEEDED LATER)

Currently, backend has:
- Prescription system (doctors can prescribe)
- Medicine costs calculation (if implemented)

**What's needed:**
1. Nurse interface to add medicines/prescriptions
2. Link prescriptions to IPD admission
3. Include medicine costs in billing

**Note:** This requires backend changes to include medicines in discharge billing, so we'll skip for now.

---

## Implementation Steps

### Step 1: Update API Types
```typescript
// In frontend/src/types/ipd.ts
export interface IPDBillCalculation {
  admission: {
    id: string;
    admissionDate: string;
    dischargeDate: string;
    stayDuration: number;
    wardType: string;
    advanceAmount?: number;
    advanceBillNumber?: string;
  };
  billBreakdown: {
    roomCharges: {
      amount: number;
      days: number;
      ratePerDay: number;
      description: string;
    };
    surgeryCharges: {
      amount: number;
      count: number;
      items: Array<{
        id: string;
        name: string;
        cost: number;
      }>;
    };
    labTestCharges: {
      amount: number;
      count: number;
      items: Array<{
        id: string;
        name: string;
        cost: number;
      }>;
    };
  };
  totalAmount: number;
  advanceAmount: number;
  amountAfterAdvance: number;
}
```

### Step 2: Add API Functions
```typescript
// In frontend/src/api/ipd.ts
calculateDischargeB ill: (admissionId: string) =>
  api.get<{ data: IPDBillCalculation }>(`/api/ipd/billing/${admissionId}/calculate`),

generateDischargeBill: (admissionId: string, data: {
  paidAmount?: number;
  notes?: string;
}) =>
  api.post<{ data: any }>(`/api/ipd/billing/${admissionId}/generate`, data),
```

### Step 3: Update ReceptionistDischargeForm
- Add useState for bill calculation
- Fetch bill on form open
- Display bill breakdown
- Add payment inputs
- Update submit to generate bill after discharge

### Step 4: Test Flow
1. Admit patient with advance
2. Order lab tests
3. Schedule surgery
4. Discharge patient
5. Verify bill shows all charges
6. Verify advance is deducted
7. Generate and view final bill

---

## Current Backend Billing Structure

The backend already calculates:
✅ Room charges (based on bed price × days)
✅ Surgery costs (from IPD surgeries)
✅ Lab test costs (from IPD lab tests)
✅ Advance payment adjustment
❌ Medicines (prescription system exists but not in billing)
❌ GST (not added)
❌ Package patients (not implemented)
❌ Visiting doctors (not implemented)

---

## Summary

**What I'll implement NOW:**
1. ✅ Fetch bill calculation in discharge form
2. ✅ Display bill breakdown
3. ✅ Add payment input fields
4. ✅ Generate bill on discharge
5. ✅ Show success with bill details

**What can be added LATER:**
- Medicine billing (needs backend changes)
- GST on room charges (needs backend changes)
- Package patient support (needs backend changes)
- Visiting doctor fees (needs backend & schema changes)

The frontend will work with what the backend currently provides!

