export const REGISTRATION_MODES = [
    { value: 'OPD', label: 'OPD' },
    { value: 'IPD', label: 'IPD' },
    { value: 'EMERGENCY', label: 'Emergency' },
] as const;

export const REGISTRATION_SOURCES = [
    { value: 'WALK_IN', label: 'Walk-in' },
    { value: 'REFERRAL', label: 'Referral' },
    { value: 'DIGITAL', label: 'Digital' },
    { value: 'AFFILIATE', label: 'Affiliate' },
    { value: 'DOCTOR_REFERRAL', label: 'Doctor Referral' },
] as const;

export const BLOOD_GROUPS = [
    { value: 'A_POSITIVE', label: 'A+' },
    { value: 'A_NEGATIVE', label: 'A-' },
    { value: 'B_POSITIVE', label: 'B+' },
    { value: 'B_NEGATIVE', label: 'B-' },
    { value: 'AB_POSITIVE', label: 'AB+' },
    { value: 'AB_NEGATIVE', label: 'AB-' },
    { value: 'O_POSITIVE', label: 'O+' },
    { value: 'O_NEGATIVE', label: 'O-' },
] as const;

export const MARITAL_STATUS = [
    { value: 'BACHELOR', label: 'Bachelor' },
    { value: 'MARRIED', label: 'Married' },
    { value: 'DIVORCED', label: 'Divorced' },
    { value: 'WIDOWED', label: 'Widowed' },
] as const; 