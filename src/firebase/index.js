import { app, db, storage } from './config';
import { getAuth } from 'firebase/auth';

// Initialize Firebase Auth
const auth = getAuth(app);

export { app, db, storage, auth }; 