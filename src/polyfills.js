// Polyfills for Node.js built-ins
import { Buffer } from 'buffer';
import process from 'process';

// Import browser polyfills
import 'process/browser';

window.Buffer = Buffer;
window.process = process;

// Ensure process.env exists
if (!process.env) {
  process.env = {};
}

// Add any other polyfills needed for Node.js built-ins 

// Other polyfills if needed
// Import regenerator-runtime for async/await
if (typeof window.regeneratorRuntime === 'undefined') {
  try {
    require('regenerator-runtime/runtime');
  } catch (e) {
    console.warn('Could not load regenerator-runtime polyfill:', e);
  }
}

// Ensure process is available globally
window.process = window.process || require('process/browser');

// Export for use in other files
export default {}; 