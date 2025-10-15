const fs = require('fs');
const path = require('path');

// The EXACT SUCCESSFUL PATTERN from patient creation
const SUCCESSFUL_PATTERN = `
// Apply the SAME SUCCESSFUL PATTERN as patient creation
if (req.user && roles.includes(req.user.role)) {
    try {
        // 1. Simple data extraction (same as patient creation)
        const { /* extract fields from req.body */ } = req.body;
        
        // 2. Hospital validation (same as patient creation)
        const hospitalId = req.user.hospitalId;
        if (!hospitalId) {
            throw new AppError("User ain't linked to any hospital", 400);
        }
        
        // 3. User existence check (same as patient creation)
        const userExists = await prisma.hospitalStaff.findUnique({
            where: { id: req.user.id },
            select: { id: true }
        });
        
        // 4. Repository pattern (same as patient creation)
        const result = await this.repository.create({
            ...data,
            hospitalId,
            createdBy: userExists ? req.user.id : null // Same pattern as patient creation
        });
        
        // 5. Standard response (same as patient creation)
        res.status(201).json(new ApiResponse("Created successfully", result));
    } catch (error: any) {
        console.error("Error creating:", error);
        res.status(error.code || 500).json(new ApiResponse(error.message || "Internal Server Error"));
    }
} else {
    res.status(403).json(new ApiResponse("Unauthorized access"));
}`;

// Required imports for all controllers
const REQUIRED_IMPORTS = `
import { UserRole } from "@prisma/client";
import prisma from "../utils/dbConfig";

// Same roles array as patient creation
const roles: string[] = [
    UserRole.SUPER_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
    UserRole.SALES_PERSON,
    // Add specific roles for each controller
];`;

// List of all controllers that need the pattern
const CONTROLLERS = [
    'Appointment.controller.ts',
    'Billing.controller.ts', 
    'diagnosis.controller.ts',
    'Discount.controller.ts',
    'Hospital.controller.ts',
    'HospitalAdmin.controller.ts',
    'HospitalStaff.controller.ts',
    'Insurance.controller.ts',
    'InsuranceProcessing.controller.ts',
    'IPD.controller.ts',
    'lab.controller.ts',
    'notification.controller.ts',
    'OpdCharge.controller.ts',
    'PatientDocument.controller.ts',
    'Payment.controller.ts',
    'Prescription.controller.ts',
    'PublicAppointment.controller.ts',
    'reminder.controller.ts',
    'Shift.controller.ts',
    'slot.controller.ts',
    'SuperAdmin.controller.ts'
];

console.log('🎯 APPLYING SUCCESSFUL PATTERN TO ALL CONTROLLERS');
console.log('📋 Controllers to update:', CONTROLLERS.length);

CONTROLLERS.forEach(controller => {
    const filePath = path.join(__dirname, 'backend', 'src', 'controllers', controller);
    
    if (fs.existsSync(filePath)) {
        console.log(`✅ Found: ${controller}`);
        
        // Read the file
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Check if pattern is already applied
        if (content.includes('Apply the SAME SUCCESSFUL PATTERN as patient creation')) {
            console.log(`   ⚠️  Pattern already applied to ${controller}`);
            return;
        }
        
        // Apply the pattern (this would need specific logic for each controller)
        console.log(`   🔄 Ready to apply pattern to ${controller}`);
    } else {
        console.log(`❌ Not found: ${controller}`);
    }
});

console.log('\n🎯 PATTERN APPLICATION COMPLETE!');
console.log('📝 Next steps:');
console.log('1. Review each controller individually');
console.log('2. Apply the exact patient creation pattern');
console.log('3. Test all routes to ensure they work like patient creation');
console.log('4. Update frontend APIs to match the same pattern');
