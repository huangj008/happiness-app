// Only these emails are allowed to use the app.
// Add more emails to the array to grant access.
const ALLOWED_EMAILS = ["hello@byjennyhuang.com"];

export function isEmailAllowed(email) {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase().trim());
}

export default ALLOWED_EMAILS;
