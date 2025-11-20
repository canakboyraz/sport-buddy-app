export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
    if (password.length < 6) {
        return { isValid: false, message: 'Şifre en az 6 karakter olmalıdır.' };
    }
    // Add more rules here if needed (e.g., numbers, special chars)
    return { isValid: true };
};

export const validateName = (name: string): boolean => {
    return name.trim().length >= 2;
};
