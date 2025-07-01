import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Auth from './components/auth/Auth';
import AdminPage from './components/AdminPage';
import Dashboard from './components/Dashboard';
import ChatSystem from './components/chatsystem/ChatSystem';
import FullChatPage from './pages/FullChatPage';
import './App.css';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { FaTimes } from 'react-icons/fa';
import Welcome from './components/Welcome';
import './components/welcome.css';
import SplashScreen from './components/SplashScreen';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const settingsRef = useRef(null);
  const [banner, setBanner] = useState('');
  const [popup, setPopup] = useState('');
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [username, setUsername] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  const [bannerId, setBannerId] = useState(null);
  const [friends, setFriends] = useState([]);

  // Listen for auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setRole(userData.role);
          setUsername(userData.username || null);
          // Create enhanced user object with Firestore data
          const enhancedUser = {
            ...user,
            username: userData.username,
            photoURL: userData.photoURL || user.photoURL, // Use Firestore photoURL if available, fallback to auth photoURL
            role: userData.role
          };
          setUser(enhancedUser);
        } else {
          setRole(null);
          setUsername(null);
          setUser(user);
        }
      } else {
        setRole(null);
        setUsername(null);
        setUser(null);
      }
      setIsLoggedIn(!!user);
      setLoadingAuth(false);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Real-time listener for user document changes (profile updates)
  useEffect(() => {
    if (!user?.uid) return;
    
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        setRole(userData.role);
        setUsername(userData.username || null);
        // Update user object with latest Firestore data
        setUser(prevUser => ({
          ...prevUser,
          username: userData.username,
          photoURL: userData.photoURL || prevUser?.photoURL,
          role: userData.role
        }));
      }
    });
    
    return () => unsubscribe();
  }, [user?.uid]);

  // Real-time banner/popup using Firestore
  useEffect(() => {
    const alertDocRef = doc(db, 'config', 'alerts');
    const unsub = onSnapshot(alertDocRef, (snap) => {
      const data = snap.data() || {};
      setBanner(data.banner || '');
      setPopup(data.popup || '');
      setBannerId(data.bannerId || null);
      // Check if user has dismissed this bannerId
      const dismissed = localStorage.getItem('dismissedBannerId');
      setShowBanner(data.banner && (!data.bannerId || dismissed !== String(data.bannerId)));
    });
    return () => unsub();
  }, []);

  // Dismiss banner for this user
  const handleDismissBanner = () => {
    if (bannerId) {
      localStorage.setItem('dismissedBannerId', String(bannerId));
    }
    setShowBanner(false);
  };

  // Admin: Remove banner for all users
  const handleAdminRemoveBanner = async () => {
    await updateDoc(doc(db, 'config', 'alerts'), { banner: '' });
  };

  // Admin: Remove popup for all users
  const handleAdminRemovePopup = async () => {
    await updateDoc(doc(db, 'config', 'alerts'), { popup: '' });
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Fetch friends list
  useEffect(() => {
    if (!user) { setFriends([]); return; }
    if (!user.uid) { setFriends([]); return; }
    const userRef = doc(db, 'users', user.uid);
    getDoc(userRef).then(userDoc => {
      if (userDoc.exists()) {
        const data = userDoc.data();
        const friendUids = data.friends || [];
        Promise.all(friendUids.map(uid => getDoc(doc(db, 'users', uid)))).then(friendDocs => {
          setFriends(friendDocs.filter(d => d.exists()).map(d => ({
            id: d.id,
            username: d.data().username || '',
            email: d.data().email || '',
            photoURL: d.data().photoURL || null
          })));
        });
      } else {
        setFriends([]);
      }
    });
  }, [user]);

  if (loadingAuth) {
    return <SplashScreen />;
  }

  return (
    <Router>
      {banner && showBanner && (
        <div className="admin-banner" style={{position:'relative',width:'100vw',background:'#f59e42',color:'#fff',fontWeight:700,padding:'0.9em 0',textAlign:'center',zIndex:2000,overflow:'hidden',borderBottom:'2px solid #fbbf24',letterSpacing:'0.5px',fontFamily:'Segoe UI Semibold,Segoe UI,Roboto,Arial',fontSize:'1.15rem'}}>
          <span style={{display:'inline-block',whiteSpace:'nowrap',animation:'admin-banner-move 28s linear infinite'}}>{banner}</span>
          <button
            aria-label="Dismiss banner"
            style={{position:'absolute',top:8,right:16,background:'none',border:'none',color:'#fff',fontSize:'1.5em',cursor:'pointer',padding:0,lineHeight:1}}
            onClick={handleDismissBanner}
          >
            <FaTimes />
          </button>
        </div>
      )}
      {popup && (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.18)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>{setPopup('')}}>
          <div style={{background:'#fff',borderRadius:16,padding:'2.2em 1.5em',boxShadow:'0 4px 24px rgba(99,102,241,0.10)',maxWidth:340,width:'90vw',textAlign:'center',fontFamily:'Segoe UI Semibold,Segoe UI,Roboto,Arial',fontSize:'1.15rem',fontWeight:700,color:'#f59e42',letterSpacing:'0.5px',border:'2px solid #fbbf24',position:'relative'}} onClick={e=>e.stopPropagation()}>
            <span>{popup}</span>
            <button
              aria-label="Close popup"
              style={{position:'absolute',top:12,right:18,background:'none',border:'none',color:'#6366f1',fontSize:'1.5em',cursor:'pointer',padding:0,lineHeight:1}}
              onClick={()=>{setPopup('')}}
            >
              <FaTimes />
            </button>
          </div>
        </div>
      )}
      <div className="main-content">
        <AppRoutes user={user} role={role} username={username} friends={friends} handleLogout={handleLogout} setFriends={setFriends} />
      </div>
    </Router>
  );
}

function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}

function AppRoutes({ user, role, username, friends, handleLogout, setFriends }) {
  const navigate = useNavigate();
  return (
    <Routes>
      <Route path="/admin" element={
        <ProtectedRoute user={user}>
          <AdminPage user={user} role={role} username={username} />
        </ProtectedRoute>
      } />
      <Route path="/chat/:friendId" element={
        <ProtectedRoute user={user}>
          <FullChatPage user={user} friends={friends} />
        </ProtectedRoute>
      } />
      <Route path="/chat" element={
        <ProtectedRoute user={user}>
          <FullChatPage user={user} friends={friends} />
        </ProtectedRoute>
      } />
      <Route path="/" element={
        user ? (
          <ProtectedRoute user={user}>
            <Dashboard user={user} role={role} username={username} onLogout={handleLogout} friends={friends} setFriendsList={setFriends} />
          </ProtectedRoute>
        ) : (
          <Welcome />
        )
      } />
      <Route path="/auth" element={<Auth onLogout={handleLogout} />} />
      <Route path="*" element={<Navigate to={user ? "/" : "/auth"} replace />} />
    </Routes>
  );
}

export default App;
