// src/utils/validation.ts
export const validate = {
  email: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  password: (password: string): boolean => {
    return password.length >= 6;
  },
  name: (name: string): boolean => {
    return name.trim().length >= 2;
  },
};