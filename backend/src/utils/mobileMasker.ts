/**
 * Utility function to mask mobile numbers for privacy
 * @param mobileNumber - The mobile number to mask
 * @returns Masked mobile number (e.g., "9876****89")
 */
export function maskMobileNumber(mobileNumber: string | null | undefined): string | null {
	if (!mobileNumber) return null;
	
	// Remove any non-digit characters
	const cleanNumber = mobileNumber.replace(/\D/g, '');
	
	// If number is too short, return as is
	if (cleanNumber.length < 4) return mobileNumber;
	
	// Mask middle digits, keep first 4 and last 2 digits
	if (cleanNumber.length >= 6) {
		const firstFour = cleanNumber.substring(0, 4);
		const lastTwo = cleanNumber.substring(cleanNumber.length - 2);
		const maskedMiddle = '*'.repeat(cleanNumber.length - 6);
		return `${firstFour}${maskedMiddle}${lastTwo}`;
	}
	
	// For shorter numbers, mask middle part
	const firstTwo = cleanNumber.substring(0, 2);
	const lastTwo = cleanNumber.substring(cleanNumber.length - 2);
	const maskedMiddle = '*'.repeat(cleanNumber.length - 4);
	return `${firstTwo}${maskedMiddle}${lastTwo}`;
}

/**
 * Utility function to mask patient data for doctors
 * @param patient - Patient object
 * @returns Patient object with masked mobile number
 */
export function maskPatientDataForDoctor(patient: any): any {
	if (!patient) return patient;
	
	return {
		...patient,
		phone: maskMobileNumber(patient.phone)
	};
}

/**
 * Utility function to mask multiple patients data for doctors
 * @param patients - Array of patient objects
 * @returns Array of patient objects with masked mobile numbers
 */
export function maskPatientsDataForDoctor(patients: any[]): any[] {
	if (!patients || !Array.isArray(patients)) return patients;
	
	return patients.map(patient => maskPatientDataForDoctor(patient));
}
