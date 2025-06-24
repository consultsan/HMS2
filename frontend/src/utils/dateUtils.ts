export const formatDate = (date: Date | string) =>
    new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

export const calculateAge = (dob: Date | string) => {
    const dobDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - dobDate.getFullYear();
    return age;
}; 
