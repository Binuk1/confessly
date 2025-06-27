// Auth.jsx
// Main authentication component (handles login, signup, logout, role selection)
import React, { useState, useEffect } from 'react';
import { auth } from '../../firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import Signup from './Signup';
import Dashboard from '../Dashboard';
import './auth.css';
import { useLocation } from 'react-router-dom';

const Auth = ({ onLogout }) => {
  const [user, setUser] = useState(null);
  const [showSignup, setShowSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [role, setRole] = useState(null);
  const [username, setUsername] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // Show signup if ?mode=signup in URL
    if (location.search.includes('mode=signup')) setShowSignup(true);
    else if (location.search.includes('mode=login')) setShowSignup(false);
  }, [location.search]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setRole(userDoc.data().role);
          setUsername(userDoc.data().username || null);
        } else {
          // Create user doc if missing
          await setDoc(userRef, {
            email: user.email,
            username: user.displayName || '',
            role: 'user',
            createdAt: serverTimestamp()
          });
          setRole('user');
          setUsername(user.displayName || '');
        }
      } else {
        setRole(null);
        setUsername(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (user) {
    return <Dashboard user={user} role={role} username={username} onLogout={onLogout} />;
  }

  return (
    <div className="auth-card">
      <h2 className="auth-title">{showSignup ? 'Sign Up' : 'Login'}</h2>
      {showSignup ? (
        <>
          <Signup onSignup={() => setShowSignup(false)} />
          <p className="auth-switch">Already have an account? <button className="link-btn" onClick={() => setShowSignup(false)}>Login</button></p>
        </>
      ) : (
        <>
          <form className="auth-form" onSubmit={handleLogin}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="submit">Login</button>
            {error && <p className="auth-error">{error}</p>}
          </form>
          <p className="auth-switch">Don't have an account? <button className="link-btn" onClick={() => setShowSignup(true)}>Sign Up</button></p>
        </>
      )}
    </div>
  );
};

export default Auth;
