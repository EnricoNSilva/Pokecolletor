export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_{|}~-]+@[a-zA-Z0-9-]{2,}(?:\.[a-zA-Z0-9-]{2,})+$/;

export const PASSWORD_REGEX = /^.{6,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

export function isStrongPassword(password: string): boolean {
  return PASSWORD_REGEX.test(password.trim());
}