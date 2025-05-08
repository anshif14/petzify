/**
 * Utility functions for authentication and user management
 */

/**
 * Generates a secure random password with the specified length
 * Includes uppercase letters, lowercase letters, numbers, and special characters
 * @param {number} length - The length of the password to generate (minimum 8)
 * @returns {string} A randomly generated password
 */
export const generateRandomPassword = (length = 12) => {
  // Ensure minimum length of 8 characters
  const passwordLength = Math.max(8, length);
  
  // Define character sets
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const specialChars = '!@#$%^&*()-_=+[]{}|;:,.<>?';
  
  // Combine all character sets
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
  
  // Ensure we have at least one of each type of character
  let password = 
    getRandomChar(uppercaseChars) +
    getRandomChar(lowercaseChars) + 
    getRandomChar(numberChars) +
    getRandomChar(specialChars);
  
  // Fill the rest of the password with random characters
  for (let i = 4; i < passwordLength; i++) {
    password += getRandomChar(allChars);
  }
  
  // Shuffle the password characters to avoid predictable pattern
  return shuffleString(password);
};

/**
 * Gets a random character from the provided character set
 * @param {string} charSet - The character set to choose from
 * @returns {string} A single random character
 */
const getRandomChar = (charSet) => {
  return charSet.charAt(Math.floor(Math.random() * charSet.length));
};

/**
 * Shuffles the characters in a string
 * @param {string} str - The string to shuffle
 * @returns {string} The shuffled string
 */
const shuffleString = (str) => {
  const array = str.split('');
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array.join('');
};

/**
 * Validates if a password meets security requirements
 * @param {string} password - The password to validate
 * @returns {boolean} True if password meets requirements, false otherwise
 */
export const isPasswordSecure = (password) => {
  // Minimum 8 characters
  if (password.length < 8) return false;
  
  // Must contain at least one uppercase letter
  if (!/[A-Z]/.test(password)) return false;
  
  // Must contain at least one lowercase letter
  if (!/[a-z]/.test(password)) return false;
  
  // Must contain at least one number
  if (!/\d/.test(password)) return false;
  
  // Must contain at least one special character
  if (!/[!@#$%^&*()-_=+[\]{}|;:,.<>?]/.test(password)) return false;
  
  return true;
}; 