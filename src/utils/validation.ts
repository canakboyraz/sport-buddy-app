export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
    if (password.length < 8) {
        return { isValid: false, message: 'Şifre en az 8 karakter olmalıdır.' };
    }
    if (!/[A-Z]/.test(password)) {
        return { isValid: false, message: 'Şifre en az bir büyük harf içermelidir.' };
    }
    if (!/[a-z]/.test(password)) {
        return { isValid: false, message: 'Şifre en az bir küçük harf içermelidir.' };
    }
    if (!/[0-9]/.test(password)) {
        return { isValid: false, message: 'Şifre en az bir rakam içermelidir.' };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return { isValid: false, message: 'Şifre en az bir özel karakter içermelidir (!@#$%^&* vb.)' };
    }
    return { isValid: true };
};

export const validateName = (name: string): boolean => {
    return name.trim().length >= 2;
};

// Session validation
export const validateSessionTitle = (title: string): { isValid: boolean; message?: string } => {
    const trimmed = title.trim();
    if (trimmed.length < 3) {
        return { isValid: false, message: 'Başlık en az 3 karakter olmalıdır.' };
    }
    if (trimmed.length > 100) {
        return { isValid: false, message: 'Başlık en fazla 100 karakter olabilir.' };
    }
    return { isValid: true };
};

export const validateSessionDescription = (description: string): { isValid: boolean; message?: string } => {
    const trimmed = description.trim();
    if (trimmed.length > 1000) {
        return { isValid: false, message: 'Açıklama en fazla 1000 karakter olabilir.' };
    }
    return { isValid: true };
};

export const validateMaxParticipants = (max: number): { isValid: boolean; message?: string } => {
    if (max < 2) {
        return { isValid: false, message: 'En az 2 katılımcı olmalıdır.' };
    }
    if (max > 500) {
        return { isValid: false, message: 'En fazla 500 katılımcı olabilir.' };
    }
    return { isValid: true };
};

export const validateLocation = (location: string): { isValid: boolean; message?: string } => {
    const trimmed = location.trim();
    if (trimmed.length < 3) {
        return { isValid: false, message: 'Konum en az 3 karakter olmalıdır.' };
    }
    if (trimmed.length > 200) {
        return { isValid: false, message: 'Konum en fazla 200 karakter olabilir.' };
    }
    return { isValid: true };
};

export const validateCoordinates = (lat: number, lng: number): { isValid: boolean; message?: string } => {
    if (lat < -90 || lat > 90) {
        return { isValid: false, message: 'Geçersiz enlem değeri.' };
    }
    if (lng < -180 || lng > 180) {
        return { isValid: false, message: 'Geçersiz boylam değeri.' };
    }
    return { isValid: true };
};

// Profile validation
export const validateBio = (bio: string): { isValid: boolean; message?: string } => {
    if (bio.length > 500) {
        return { isValid: false, message: 'Biyografi en fazla 500 karakter olabilir.' };
    }
    return { isValid: true };
};

export const validateAge = (age: number): { isValid: boolean; message?: string } => {
    if (age < 13) {
        return { isValid: false, message: 'Yaş en az 13 olmalıdır.' };
    }
    if (age > 120) {
        return { isValid: false, message: 'Geçerli bir yaş giriniz.' };
    }
    return { isValid: true };
};
