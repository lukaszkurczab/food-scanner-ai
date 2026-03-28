import { validateEmail } from "@/utils/validation";

export function validateRegisterEmail(email: string): boolean {
  return validateEmail(email);
}

export function validateRegisterUsername(username: string): boolean {
  return username.trim().length >= 3;
}

export function validateRegisterPassword(password: string): boolean {
  return (
    password.length >= 6 &&
    password.length <= 21 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export function validateRegisterPasswordConfirmation(
  password: string,
  confirmPassword: string,
): boolean {
  return password === confirmPassword;
}
