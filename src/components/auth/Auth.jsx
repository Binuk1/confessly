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

const Auth = ({ onLogout }) => {
  const [user, setUser] = useState(null);
  const [showSignup, setShowSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [role, setRole] = useState(null);
  const [username, setUsername] = useState(null);

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
    <div className="auth-container">
      <h2>Authentication</h2>
      {showSignup ? (
        <>
          <Signup onSignup={() => setShowSignup(false)} />
          <p>Already have an account? <button className="link-btn" onClick={() => setShowSignup(false)}>Login</button></p>
        </>
      ) : (
        <>
          <form className="auth-form" onSubmit={handleLogin}>
            <h3>Login</h3>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="submit">Login</button>
            {error && <p className="auth-error">{error}</p>}
          </form>
          <p>Don't have an account? <button className="link-btn" onClick={() => setShowSignup(true)}>Sign Up</button></p>
        </>
      )}
    </div>
  );
};

export default Auth;
