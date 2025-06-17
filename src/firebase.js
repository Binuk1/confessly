// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAuUM9EIWVZLMIMPWJu85QK5c2LOXHNQHI",
  authDomain: "confey-72ff8.firebaseapp.com",
  projectId: "confey-72ff8",
  storageBucket: "confey-72ff8.firebasestorage.app",
  messagingSenderId: "623094545168",
  appId: "1:623094545168:web:10291b6e116ef088cd0395"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
