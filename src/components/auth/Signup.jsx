// Signup.jsx
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import './auth.css';

const Signup = ({ onSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Cloudinary config
  const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dqptpxh4r/upload';
  const CLOUDINARY_PRESET = 'ztxza7xb';

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Profile picture must be less than 5MB');
        return;
      }
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onload = (e) => setProfilePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const uploadProfilePicture = async (file) => {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', CLOUDINARY_PRESET);
    form.append('folder', 'profile-pictures'); // Organize in folder
    
    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: form });
    const data = await res.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return {
      photoURL: data.secure_url,
      photoPublicId: data.public_id
    };
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setUploading(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      let photoData = null;
      if (profilePicture) {
        photoData = await uploadProfilePicture(profilePicture);
      }
      
      try {
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: userCredential.user.email,
          username,
          role: 'user',
          createdAt: serverTimestamp(),
          ...(photoData && {
            photoURL: photoData.photoURL,
            photoPublicId: photoData.photoPublicId
          })
        });
      } catch (firestoreError) {
        alert('Firestore error: ' + firestoreError.message);
        console.error('Firestore error:', firestoreError);
      }
      onSignup();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSignup}>
      <h3>Sign Up</h3>
      
      {/* Profile Picture Upload */}
      <div style={{ textAlign: 'center', marginBottom: '1rem', width: '100%', maxWidth: '100%' }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          margin: '0 auto 0.5rem',
          background: profilePreview ? 'none' : '#e0e7ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed #6366f1',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          minWidth: '60px',
          minHeight: '60px'
        }} onClick={() => document.getElementById('profile-picture-input').click()}>
          {profilePreview ? (
            <img 
              src={profilePreview} 
              alt="Profile preview" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ color: '#6366f1', fontSize: '1.5rem' }}>📷</span>
          )}
        </div>
        <input
          id="profile-picture-input"
          type="file"
          accept="image/*"
          onChange={handleProfilePictureChange}
          style={{ display: 'none' }}
        />
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          justifyContent: 'center', 
          flexWrap: 'wrap',
          width: '100%',
          maxWidth: '100%'
        }}>
          <button 
            type="button" 
            onClick={() => document.getElementById('profile-picture-input').click()}
            style={{
              background: 'none',
              border: '1px solid #6366f1',
              color: '#6366f1',
              padding: '0.3rem 0.8rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
              minWidth: 'fit-content'
            }}
          >
            {profilePicture ? 'Change' : 'Add Photo'}
          </button>
          {profilePicture && (
            <button 
              type="button" 
              onClick={() => {
                setProfilePicture(null);
                setProfilePreview(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                padding: '0.3rem 0.8rem',
                cursor: 'pointer',
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
                minWidth: 'fit-content'
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>
      
      <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
      <button type="submit" disabled={uploading}>
        {uploading ? 'Creating Account...' : 'Sign Up'}
      </button>
      {error && <p className="auth-error">{error}</p>}
    </form>
  );
};

export default Signup;
