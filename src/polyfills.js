// Polyfills for Node.js built-ins
import { Buffer } from 'buffer';
import process from 'process';

window.Buffer = Buffer;
window.process = process;

// Ensure process.env exists
if (!process.env) {
  process.env = {};
}

// Add any other polyfills needed for Node.js built-ins 