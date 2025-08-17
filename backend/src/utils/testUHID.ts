import { UhidGenerator } from "./uhidGenerator";

/**
 * Test script to verify UHID and Visit ID generation
 */
async function testUHIDGeneration() {
	console.log("Testing UHID and Visit ID Generation\n");

	try {
		// Test UHID generation
		console.log("1. Testing UHID Generation:");
		const uhid1 = await UhidGenerator.generateUHID("AVISE Hospital");
		console.log(`   Generated UHID: ${uhid1}`);

		const uhid2 = await UhidGenerator.generateUHID("City Medical Center");
		console.log(`   Generated UHID: ${uhid2}`);

		const uhid3 = await UhidGenerator.generateUHID("General Hospital");
		console.log(`   Generated UHID: ${uhid3}`);

		// Test UHID validation
		console.log("\n2. Testing UHID Validation:");
		console.log(`   ${uhid1} is valid: ${UhidGenerator.validateUHID(uhid1)}`);
		console.log(
			`   "INVALID" is valid: ${UhidGenerator.validateUHID("INVALID")}`
		);
		console.log(
			`   "TRAV25001" is valid: ${UhidGenerator.validateUHID("TRAV25001")}`
		);

		// Test Visit ID generation
		console.log("\n3. Testing Visit ID Generation:");
		const visitId1 = await UhidGenerator.generateVisitID(uhid1, "OPD");
		console.log(`   Generated OPD Visit ID: ${visitId1}`);

		const visitId2 = await UhidGenerator.generateVisitID(uhid1, "IPD");
		console.log(`   Generated IPD Visit ID: ${visitId2}`);

		const visitId3 = await UhidGenerator.generateVisitID(uhid1, "OPD");
		console.log(`   Generated OPD Visit ID (2nd visit): ${visitId3}`);

		// Test Visit ID validation
		console.log("\n4. Testing Visit ID Validation:");
		console.log(
			`   ${visitId1} is valid: ${UhidGenerator.validateVisitID(visitId1)}`
		);
		console.log(
			`   ${visitId2} is valid: ${UhidGenerator.validateVisitID(visitId2)}`
		);
		console.log(
			`   "INVALID" is valid: ${UhidGenerator.validateVisitID("INVALID")}`
		);

		// Test UHID extraction from Visit ID
		console.log("\n5. Testing UHID Extraction from Visit ID:");
		const extractedUHID1 = UhidGenerator.extractUHIDFromVisitID(visitId1);
		console.log(`   Extracted UHID from ${visitId1}: ${extractedUHID1}`);

		const extractedUHID2 = UhidGenerator.extractUHIDFromVisitID(visitId2);
		console.log(`   Extracted UHID from ${visitId2}: ${extractedUHID2}`);

		// Test error handling
		console.log("\n6. Testing Error Handling:");
		try {
			await UhidGenerator.generateVisitID("", "OPD");
		} catch (error: any) {
			console.log(`   ✓ Correctly caught error: ${error.message}`);
		}

		console.log("\n✅ All tests completed successfully!");
	} catch (error) {
		console.error("❌ Test failed:", error);
	}
}

// Run tests if this file is executed directly
if (require.main === module) {
	testUHIDGeneration();
}
