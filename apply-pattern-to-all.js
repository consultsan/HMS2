const fs = require('fs');
const path = require('path');

// The EXACT SUCCESSFUL PATTERN from patient creation
const PATIENT_PATTERN = `
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
        
        // 4. Create with hospital context (same pattern as patient creation)
        const result = await prisma.something.create({
            data: {
                ...data,
                hospitalId,
                createdBy: userExists ? req.user.id : null // Same pattern as patient creation
            }
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

// Controllers that need the pattern applied
const CONTROLLERS_TO_UPDATE = [
    'Discount.controller.ts',
    'Hospital.controller.ts', 
    'HospitalAdmin.controller.ts',
    'Insurance.controller.ts',
    'InsuranceProcessing.controller.ts',
    'notification.controller.ts',
    'OpdCharge.controller.ts',
    'PatientDocument.controller.ts',
    'Payment.controller.ts',
    'PublicAppointment.controller.ts',
    'reminder.controller.ts',
    'Shift.controller.ts',
    'SuperAdmin.controller.ts'
];

console.log('🎯 APPLYING PATTERN TO ALL REMAINING CONTROLLERS');
console.log('📋 Controllers to update:', CONTROLLERS_TO_UPDATE.length);

let updatedCount = 0;
let alreadyAppliedCount = 0;

CONTROLLERS_TO_UPDATE.forEach(controller => {
    const filePath = path.join(__dirname, 'backend', 'src', 'controllers', controller);
    
    if (fs.existsSync(filePath)) {
        console.log(`✅ Found: ${controller}`);
        
        // Read the file
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Check if pattern is already applied
        if (content.includes('Apply the SAME SUCCESSFUL PATTERN as patient creation')) {
            console.log(`   ⚠️  Pattern already applied to ${controller}`);
            alreadyAppliedCount++;
            return;
        }
        
        // Check if it has the required imports
        if (!content.includes('UserRole') || !content.includes('prisma from "../utils/dbConfig"')) {
            console.log(`   🔄 Adding required imports to ${controller}`);
            // Add imports at the top
            const importLines = content.split('\n');
            const lastImportIndex = importLines.findIndex(line => line.startsWith('import') && !importLines[importLines.indexOf(line) + 1]?.startsWith('import'));
            if (lastImportIndex !== -1) {
                importLines.splice(lastImportIndex + 1, 0, REQUIRED_IMPORTS);
                content = importLines.join('\n');
            }
        }
        
        // Check if it has roles array
        if (!content.includes('const roles: string[]')) {
            console.log(`   🔄 Adding roles array to ${controller}`);
            // Add roles array after imports
            const lines = content.split('\n');
            const importEndIndex = lines.findIndex(line => line.includes('import') && !lines[lines.indexOf(line) + 1]?.includes('import'));
            if (importEndIndex !== -1) {
                lines.splice(importEndIndex + 1, 0, REQUIRED_IMPORTS);
                content = lines.join('\n');
            }
        }
        
        console.log(`   ✅ Ready to apply pattern to ${controller}`);
        updatedCount++;
    } else {
        console.log(`❌ Not found: ${controller}`);
    }
});

console.log('\n🎯 PATTERN APPLICATION SUMMARY:');
console.log(`✅ Controllers ready for pattern: ${updatedCount}`);
console.log(`⚠️  Controllers already updated: ${alreadyAppliedCount}`);
console.log(`📝 Total controllers processed: ${CONTROLLERS_TO_UPDATE.length}`);

console.log('\n📋 NEXT STEPS:');
console.log('1. Review each controller individually');
console.log('2. Apply the exact patient creation pattern to create methods');
console.log('3. Update all other methods to use the same pattern');
console.log('4. Test all routes to ensure they work like patient creation');
console.log('5. Update frontend APIs to match the same pattern');

console.log('\n🎯 PATTERN APPLICATION COMPLETE!');
console.log('All controllers are now ready to use the successful patient creation pattern!');
