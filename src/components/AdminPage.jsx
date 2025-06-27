// AdminPage.jsx
import React, { useState, useEffect } from 'react';
import AdminPanel from './auth/AdminPanel';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './auth/AdminPanel.css';
import SkeletonItem from './SkeletonItem';
import './SkeletonItem.css';

const AdminPage = ({ user, role, username }) => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [promoteMsg, setPromoteMsg] = useState('');
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertType, setAlertType] = useState('banner');
  const [alertText, setAlertText] = useState('');
  const [alertMsg, setAlertMsg] = useState('');
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [currentBanner, setCurrentBanner] = useState('');
  const [currentPopup, setCurrentPopup] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showBackSpinner, setShowBackSpinner] = useState(false);
  const navigate = useNavigate();

  // Only allow admins
  useEffect(() => {
    if (!user || role !== 'admin') {
      navigate('/');
    }
  }, [user, role, navigate]);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      const q = search
        ? query(collection(db, 'users'), where('username', '>=', search), where('username', '<=', search + '\uf8ff'))
        : collection(db, 'users');
      const snap = await getDocs(q);
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingUsers(false);
    };
    fetchUsers();
  }, [search]);

  // Fetch current alerts when modal opens
  useEffect(() => {
    if (alertsModalOpen) {
      const fetchAlerts = async () => {
        const alertDoc = await getDoc(doc(db, 'config', 'alerts'));
        const data = alertDoc.data() || {};
        setCurrentBanner(data.banner || '');
        setCurrentPopup(data.popup || '');
      };
      fetchAlerts();
    }
  }, [alertsModalOpen]);

  const handleDeleteUser = async (uid) => {
    await deleteDoc(doc(db, 'users', uid));
    setSelectedUser(null);
    setUsers(users.filter(u => u.id !== uid));
  };

  const handlePromoteUser = async (uid) => {
    await updateDoc(doc(db, 'users', uid), { role: 'admin' });
    setPromoteMsg('User promoted to admin!');
    setTimeout(() => setPromoteMsg(''), 1500);
    setUsers(users.map(u => u.id === uid ? { ...u, role: 'admin' } : u));
    setSelectedUser({ ...selectedUser, role: 'admin' });
  };

  const handleRemoveBanner = async () => {
    await updateDoc(doc(db, 'config', 'alerts'), { banner: '' });
    setCurrentBanner('');
  };
  const handleRemovePopup = async () => {
    await updateDoc(doc(db, 'config', 'alerts'), { popup: '' });
    setCurrentPopup('');
  };

  return (
    <div className="admin-page-bg">
      {showBackSpinner && (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(255,255,255,0.7)',zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div className="spinner" style={{width:48,height:48,border:'5px solid #e0e7ff',borderTop:'5px solid #6366f1',borderRadius:'50%',animation:'spin 1s linear infinite'}} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`}</style>
        </div>
      )}
      <header className="admin-header">
        <button className="admin-back-btn" onClick={() => { setShowBackSpinner(true); setTimeout(() => navigate(-1), 300); }} title="Go Back">&#8592;</button>
        <span className="admin-title">Admin Dashboard</span>
        <span className="admin-welcome">Welcome Admin</span>
        <button className="modal-btn" style={{marginLeft:'auto',marginRight:24,background:'#f59e42',color:'#fff',borderRadius:999,fontWeight:600,boxShadow:'0 2px 8px rgba(245,158,66,0.10)',fontFamily:'Segoe UI Semibold,Segoe UI,Roboto,Arial',fontSize:'1.08rem',padding:'0.6em 1.5em'}} onClick={()=>setAlertModalOpen(true)}>
          Send Alert
        </button>
        <button className="modal-btn" style={{marginRight:12,background:'#6366f1',color:'#fff',borderRadius:999,fontWeight:600,boxShadow:'0 2px 8px rgba(99,102,241,0.10)',fontFamily:'Segoe UI Semibold,Segoe UI,Roboto,Arial',fontSize:'1.08rem',padding:'0.6em 1.5em'}} onClick={()=>setAlertsModalOpen(true)}>
          Current Alerts
        </button>
      </header>
      <div className="admin-page-container">
        <section>
          <h3 style={{marginBottom:8}}>Users</h3>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by username..." style={{width:'100%',padding:'0.5em',borderRadius:8,border:'1px solid #ccc',marginBottom:12}} />
          <div style={{maxHeight:320,overflowY:'auto',border:'1px solid #eee',borderRadius:10,padding:'0.5em',background:'#f8fafc'}}>
            {loadingUsers ? (
              <>
                <SkeletonItem style={{height:36}} />
                <SkeletonItem style={{height:36}} />
                <SkeletonItem style={{height:36}} />
              </>
            ) : (
              <>
                {users.map(user => (
                  <div key={user.id} style={{padding:'0.6em 0.7em',borderBottom:'1px solid #e5e7eb',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between'}} onClick={()=>setSelectedUser(user)}>
                    <span style={{fontWeight:600}}>{user.username || user.email}</span>
                    <span style={{fontSize:'0.9em',color:'#6366f1'}}>{user.role||'user'}</span>
                  </div>
                ))}
                {users.length === 0 && <div style={{textAlign:'center',color:'#aaa'}}>No users found.</div>}
              </>
            )}
          </div>
        </section>
      </div>
      {/* User Info Modal */}
      {selectedUser && (
        <div className="modal-overlay" style={{zIndex:3000}} onClick={()=>setSelectedUser(null)}>
          <div className="modal-content" style={{maxWidth:380,margin:'8vh auto',borderRadius:16,background:'#fff',boxShadow:'0 4px 24px rgba(99,102,241,0.10)',padding:'2rem 1.5rem 1.5rem 1.5rem',position:'relative'}} onClick={e=>e.stopPropagation()}>
            <button className="close-modal" style={{position:'absolute',top:18,right:18,fontSize:'2rem',background:'none',border:'none',color:'#6366f1',cursor:'pointer'}} onClick={()=>setSelectedUser(null)}>&times;</button>
            <h3 style={{marginBottom:12}}>User Info</h3>
            {!selectedUser.username ? <SkeletonItem style={{height:24,marginBottom:10}} /> : <div style={{marginBottom:10}}><b>Username:</b> {selectedUser.username}</div>}
            {!selectedUser.email ? <SkeletonItem style={{height:24,marginBottom:10}} /> : <div style={{marginBottom:10}}><b>Email:</b> {selectedUser.email}</div>}
            {!selectedUser.role ? <SkeletonItem style={{height:24,marginBottom:10}} /> : <div style={{marginBottom:10}}><b>Role:</b> {selectedUser.role||'user'}</div>}
            {!selectedUser.id ? <SkeletonItem style={{height:24,marginBottom:10}} /> : <div style={{marginBottom:10}}><b>User ID:</b> {selectedUser.id}</div>}
            <button style={{background:'#ef4444',color:'#fff',border:'none',borderRadius:8,padding:'0.5em 1.2em',fontWeight:600,marginTop:10}} onClick={()=>handleDeleteUser(selectedUser.id)}>Delete Account</button>
            <button style={{background:'#6366f1',color:'#fff',border:'none',borderRadius:8,padding:'0.5em 1.2em',fontWeight:600,marginTop:10,marginLeft:10}} onClick={()=>handlePromoteUser(selectedUser.id)} disabled={selectedUser.role==='admin'}>Promote to Admin</button>
            {promoteMsg && <div style={{marginTop:8,color:'#10b981'}}>{promoteMsg}</div>}
          </div>
        </div>
      )}
      {/* Alert Modal */}
      {alertModalOpen && (
        <div className="modal-overlay" style={{zIndex:3000,overflow:'hidden'}} onClick={()=>setAlertModalOpen(false)}>
          <div className="modal-content" style={{maxWidth:380,width:'95vw',margin:'8vh auto',borderRadius:16,background:'#fff',boxShadow:'0 4px 24px rgba(99,102,241,0.10)',padding:'2rem 1.5rem 1.5rem 1.5rem',position:'relative',display:'flex',flexDirection:'column',alignItems:'center'}} onClick={e=>e.stopPropagation()}>
            <button className="close-modal" style={{position:'absolute',top:18,right:18,fontSize:'2rem',background:'none',border:'none',color:'#6366f1',cursor:'pointer'}} onClick={()=>setAlertModalOpen(false)}>&times;</button>
            <h3 style={{marginBottom:12,fontFamily:'Segoe UI Semibold,Segoe UI,Roboto,Arial',color:'#f59e42'}}>Send Alert</h3>
            <textarea value={alertText} onChange={e=>setAlertText(e.target.value)} placeholder="Enter alert text..." style={{width:'100%',maxWidth:320,minHeight:80,maxHeight:120,margin:'0 auto',padding:'0.7em',borderRadius:8,border:'1.5px solid #c7d2fe',fontSize:'1.08rem',fontFamily:'inherit',marginBottom:12,resize:'vertical',boxSizing:'border-box',display:'block'}} rows={3} />
            <div style={{marginBottom:12,display:'flex',gap:24,alignItems:'center',justifyContent:'center',flexWrap:'wrap'}}>
              <label style={{display:'flex',alignItems:'center',gap:6,fontWeight:600}}>
                <input type="radio" checked={alertType==='banner'} onChange={()=>setAlertType('banner')} /> News Banner
              </label>
              <label style={{display:'flex',alignItems:'center',gap:6,fontWeight:600}}>
                <input type="radio" checked={alertType==='popup'} onChange={()=>setAlertType('popup')} /> Popup
              </label>
            </div>
            <button style={{background:'#6366f1',color:'#fff',border:'none',borderRadius:8,padding:'0.5em 1.2em',fontWeight:600}} onClick={async ()=>{
              if(!alertText.trim()) { setAlertMsg('Please enter alert text.'); return; }
              const alertDocRef = doc(db, 'config', 'alerts');
              if(alertType==='banner') {
                await setDoc(alertDocRef, { banner: alertText, bannerId: Date.now() }, { merge: true });
                setAlertMsg('Banner set!');
              } else {
                await setDoc(alertDocRef, { popup: alertText }, { merge: true });
                setAlertMsg('Popup set!');
              }
              setTimeout(()=>{ setAlertMsg(''); setAlertModalOpen(false); }, 1200);
            }}>Send</button>
            {alertMsg && <div style={{marginTop:8,color:'#10b981',fontWeight:600}}>{alertMsg}</div>}
          </div>
        </div>
      )}
      {/* Current Alerts Modal */}
      {alertsModalOpen && (
        <div className="modal-overlay" style={{zIndex:3000,overflow:'hidden'}} onClick={()=>setAlertsModalOpen(false)}>
          <div className="modal-content" style={{maxWidth:380,width:'95vw',margin:'8vh auto',borderRadius:16,background:'#fff',boxShadow:'0 4px 24px rgba(99,102,241,0.10)',padding:'2rem 1.5rem 1.5rem 1.5rem',position:'relative',display:'flex',flexDirection:'column',alignItems:'center'}} onClick={e=>e.stopPropagation()}>
            <button className="close-modal" style={{position:'absolute',top:18,right:18,fontSize:'2rem',background:'none',border:'none',color:'#6366f1',cursor:'pointer'}} onClick={()=>setAlertsModalOpen(false)}>&times;</button>
            <h3 style={{marginBottom:12,fontFamily:'Segoe UI Semibold,Segoe UI,Roboto,Arial',color:'#6366f1'}}>Current Alerts</h3>
            <div style={{width:'100%',marginBottom:18}}>
              <div style={{marginBottom:14}}>
                <b>Banner:</b>
                <div style={{marginTop:6,padding:'0.7em',background:'#f8fafc',borderRadius:8,border:'1px solid #fbbf24',color:'#f59e42',fontWeight:600}}>{currentBanner || <span style={{color:'#aaa'}}>No banner set</span>}</div>
                {currentBanner && <button style={{marginTop:8,background:'#f59e42',color:'#fff',border:'none',borderRadius:8,padding:'0.4em 1em',fontWeight:600}} onClick={handleRemoveBanner}>Remove Banner</button>}
              </div>
              <div>
                <b>Popup:</b>
                <div style={{marginTop:6,padding:'0.7em',background:'#f8fafc',borderRadius:8,border:'1px solid #6366f1',color:'#6366f1',fontWeight:600}}>{currentPopup || <span style={{color:'#aaa'}}>No popup set</span>}</div>
                {currentPopup && <button style={{marginTop:8,background:'#6366f1',color:'#fff',border:'none',borderRadius:8,padding:'0.4em 1em',fontWeight:600}} onClick={handleRemovePopup}>Remove Popup</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
