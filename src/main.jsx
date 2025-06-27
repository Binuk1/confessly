import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

// Provide a global listener for auth state
onAuthStateChanged(auth, (user) => {
  if (window.firebaseAuthListener) {
    window.firebaseAuthListener(user);
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
