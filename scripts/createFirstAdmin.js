import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const readline = createInterface({
  input: process.stdin,
  output: process.stdout
});

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig, 'createAdminScript');
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdminAccount() {
  try {
    // Get admin details from user input
    readline.question('Enter admin email: ', async (email) => {
      readline.question('Enter admin password (min 6 characters): ', async (password) => {
        try {
          // Create the auth user
          console.log('Creating admin account...');
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          
          // Create the staff document
          const staffData = {
            email: email.toLowerCase(),
            role: 'admin',
            active: true,
            createdAt: new Date().toISOString()
          };
          
          await setDoc(doc(db, 'staff', user.uid), staffData);
          
          console.log('✅ Success! Admin account created with the following details:');
          console.log(`Email: ${email}`);
          console.log(`User ID: ${user.uid}`);
          console.log('\nYou can now log in to the admin dashboard.');
          
        } catch (error) {
          console.error('❌ Error creating admin account:', error.message);
          if (error.code === 'auth/email-already-in-use') {
            console.log('This email is already registered. Please try a different email.');
          } else if (error.code === 'auth/weak-password') {
            console.log('Password is too weak. Please use at least 6 characters.');
          }
        } finally {
          readline.close();
          process.exit();
        }
      });
    });
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
console.log('=== Create First Admin Account ===');
console.log('Make sure you have set up your .env file with Firebase credentials\n');

// Check if required environment variables are set
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Error: Missing required environment variables:');
  missingVars.forEach(varName => console.error(`- ${varName}`));
  console.log('\nPlease create a .env file in your project root with these variables.');
  console.log('You can find these values in your Firebase Console under Project Settings > General > Your apps');
  process.exit(1);
}

createAdminAccount();
