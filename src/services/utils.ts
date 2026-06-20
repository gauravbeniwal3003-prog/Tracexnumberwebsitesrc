/**
 * Smartly polishes and cleans Indian phone number inputs.
 * If a user pastes a phone number with "+91", "91" prefix, or a leading "0",
 * this automatically strips it to return the core 10-digit mobile number.
 */
export const cleanIndianPhoneNumber = (val: string): string => {
  // Extract all digits
  let cleaned = val.replace(/\D/g, '');

  // Detect copy-pasted numbers with prefix:
  // 12 digits starting with '91' (e.g., 919876543210 or +919876543210 formatted)
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.substring(2);
  }
  // 11 digits starting with '0' (e.g., 09876543210)
  else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  // 11 digits starting with '91' (e.g. typing 91 then 9-digit number)
  else if (cleaned.length === 11 && cleaned.startsWith('91')) {
    cleaned = cleaned.substring(2);
  }

  // Slice to max 10 digits to keep it precise
  return cleaned.slice(0, 10);
};
