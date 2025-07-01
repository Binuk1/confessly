// Friends.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { FaCog, FaUser, FaUserFriends, FaSun, FaMoon, FaRegStar, FaSearch } from 'react-icons/fa';
import { deleteUser } from 'firebase/auth';
import { deleteDoc } from 'firebase/firestore';
import './friends.css';
import SkeletonItem from '../SkeletonItem';

const Spinner = () => (
  <div className="spinner-container"><div className="spinner"></div></div>
);

const Friends = ({ currentUser, username, onLogout, showAdminButton, setFriendsList, hideActionsOnMobile }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState('');
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [editingProfile, setEditingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState(username || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [noticeType, setNoticeType] = useState('banner');
  const [noticeText, setNoticeText] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'friendRequests', 'settings', 'profile', 'search', 'delete'
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Cloudinary config
  const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dqptpxh4r/upload';
  const CLOUDINARY_PRESET = 'ztxza7xb';

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Profile picture must be less than 5MB');
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
    form.append('folder', 'profile-pictures');
    
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

  // Helper function to open a modal (closes any previous modal)
  const openModal = (modalType) => {
    setActiveModal(modalType);
  };

  // Helper function to close all modals
  const closeAllModals = () => {
    setActiveModal(null);
    setSearchDrawerOpen(false);
  };

  // Search users by username
  const handleSearch = async (e) => {
    e.preventDefault();
    setMessage('');
    setResults([]);
    if (!search) return;
    const q = query(collection(db, 'users'), where('username', '==', search));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      setMessage('No user found.');
    } else {
      setResults(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
  };

  // Send or cancel friend request
  const sendFriendRequest = async (userId) => {
    if (!currentUser || !currentUser.uid) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        friendRequests: arrayUnion(currentUser.uid)
      });
      setMessage('Friend request sent!');
      // Refresh search results
      handleSearch({ preventDefault: () => {} });
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  const cancelFriendRequest = async (userId) => {
    if (!currentUser || !currentUser.uid) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        friendRequests: arrayRemove(currentUser.uid)
      });
      setMessage('Friend request canceled.');
      // Refresh search results
      handleSearch({ preventDefault: () => {} });
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  // Listen for incoming friend requests and friends
  useEffect(() => {
    if (!currentUser || !currentUser.uid) return;
    setLoadingFriends(true);
    const userRef = doc(db, 'users', currentUser.uid);
    return onSnapshot(userRef, (docSnap) => {
      const data = docSnap.data();
      setFriendRequests(data?.friendRequests || []);
      setFriends(data?.friends || []);
      setLoadingFriends(false);
    });
  }, [currentUser]);

  // Fetch outgoing friend requests (users to whom current user has sent a request, but not received one from) in real time
  useEffect(() => {
    if (!currentUser || !currentUser.uid) return;
    const q = query(collection(db, 'users'), where('friendRequests', 'array-contains', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const outgoing = [];
      const map = {};
      snap.forEach(doc => {
        // Only include if not already friends and not in incoming requests
        if (!friends.includes(doc.id) && !friendRequests.includes(doc.id)) {
          outgoing.push(doc.id);
        }
        map[doc.id] = doc.data();
      });
      setOutgoingRequests(outgoing);
      setUserMap(prev => ({ ...prev, ...map }));
    });
    return unsubscribe;
  }, [currentUser, friends, friendRequests]);

  // Fetch usernames for friend requests and friends
  useEffect(() => {
    const fetchUsers = async (uids) => {
      if (!uids.length) {
        return;
      }
      const q = query(collection(db, 'users'), where('__name__', 'in', uids.slice(0,10)));
      const snap = await getDocs(q);
      const map = {};
      snap.forEach(doc => { map[doc.id] = doc.data(); });
      setUserMap(prev => ({ ...prev, ...map }));
    };
    fetchUsers([...friendRequests, ...friends, ...outgoingRequests]);
  }, [friendRequests, friends, outgoingRequests]);

  // Accept friend request
  const acceptRequest = async (fromUid) => {
    if (!currentUser || !currentUser.uid) return;
    await updateDoc(doc(db, 'users', currentUser.uid), {
      friends: arrayUnion(fromUid),
      friendRequests: arrayRemove(fromUid)
    });
    await updateDoc(doc(db, 'users', fromUid), {
      friends: arrayUnion(currentUser.uid)
    });
  };

  // Decline friend request
  const declineRequest = async (fromUid) => {
    if (!currentUser || !currentUser.uid) return;
    await updateDoc(doc(db, 'users', currentUser.uid), {
      friendRequests: arrayRemove(fromUid)
    });
  };

  // Remove friend
  const removeFriend = async (userId) => {
    if (!currentUser || !currentUser.uid) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        friends: arrayRemove(userId)
      });
      await updateDoc(doc(db, 'users', userId), {
        friends: arrayRemove(currentUser.uid)
      });
      setMessage('Friend removed.');
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
  };

  // Helper: get outgoing requests (users to whom current user has sent a request, but not received one from)
  const outgoingRequestsHelper = results.length === 0 && currentUser && currentUser.uid
    ? Object.entries(userMap)
        .filter(([uid, user]) =>
          user.friendRequests && user.friendRequests.includes(currentUser.uid) && !friendRequests.includes(uid)
        )
        .map(([uid]) => uid)
    : [];

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Update editUsername if username prop changes
  useEffect(() => {
    setEditUsername(username || '');
  }, [username]);

  // Profile save handler
  const handleProfileSave = async () => {
    if (!currentUser || !currentUser.uid) return;
    setSavingProfile(true);
    setUploadingPhoto(true);
    
    try {
      let photoData = null;
      if (profilePicture) {
        photoData = await uploadProfilePicture(profilePicture);
      }
      
      const updateData = { username: editUsername };
      if (photoData) {
        updateData.photoURL = photoData.photoURL;
        updateData.photoPublicId = photoData.photoPublicId;
      }
      
      await updateDoc(doc(db, 'users', currentUser.uid), updateData);
      
      // Update local userMap immediately
      setUserMap(prev => ({
        ...prev,
        [currentUser.uid]: {
          ...prev[currentUser.uid],
          ...updateData
        }
      }));
      
      setEditingProfile(false);
      setProfilePicture(null);
      setProfilePreview(null);
    } catch (err) {
      alert('Error updating profile: ' + err.message);
    } finally {
      setSavingProfile(false);
      setUploadingPhoto(false);
    }
  };

  // Update parent with friends list for chat system
  useEffect(() => {
    if (setFriendsList && friends.length > 0 && Object.keys(userMap).length > 0 && currentUser && currentUser.uid) {
      const friendObjs = friends.map(uid => ({
        id: uid,
        username: userMap[uid]?.username || '',
        email: userMap[uid]?.email || ''
      }));
      setFriendsList(friendObjs);
    }
  }, [setFriendsList, friends, userMap, currentUser]);

  return (
    <div className="friends-fullpage-bg">
      {/* Header/Navbar */}
      <header className="friends-header">
        <h2 className="logo">Confessly</h2>
        {!hideActionsOnMobile && (
          <div className="header-actions">
            <button className="icon-btn" title="Search" onClick={() => openModal('search')}>
              <FaSearch size={22} />
            </button>
            <button className="icon-btn" title="Profile" onClick={() => openModal('profile')}>
              <FaUser size={22} />
            </button>
            <button className="icon-btn" title="Settings" onClick={() => openModal('settings')}>
              <FaCog size={22} />
            </button>
            <button className="modal-btn" onClick={() => openModal('friendRequests')}>
              <FaUserFriends style={{marginRight:6}} /> Friend Requests
              {friendRequests.length > 0 && <span className="badge">{friendRequests.length}</span>}
            </button>
            {/* Admin button in header actions */}
            {showAdminButton && (
              <button
                className="modal-btn admin-navbar-btn"
                style={{ background: '#6366f1', color: '#fff', borderRadius: 999, fontWeight: 600, marginLeft: 8 }}
                onClick={() => window.location.href = '/admin'}
              >
                Admin
              </button>
            )}
          </div>
        )}
      </header>
      {/* Search Modal/Full-screen */}
      {activeModal === 'search' && (
        <div className="search-overlay" onClick={closeAllModals}>
          <div className={`search-container ${isMobile ? 'search-mobile' : 'search-desktop'}`} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="search-header">
              <h3>Find Friends</h3>
              <button className="close-modal" onClick={closeAllModals}>&times;</button>
            </div>
            
            {/* Search Form */}
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-wrapper">
                <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by username"
                value={search}
                onChange={e => { setSearch(e.target.value); setMessage(''); }}
                autoFocus
                  className="search-input"
              />
                <button type="submit" className="search-submit-btn">Search</button>
              </div>
            </form>
            
            {/* Results */}
            <div className="search-results-container">
              {message && <p className="search-message">{message}</p>}
              <ul className="search-results">
              {results.map(user => {
                const isFriend = friends.includes(user.id);
                const requestSent = outgoingRequests.includes(user.id);
                const isSelf = user.id === currentUser.uid;
                return (
                    <li key={user.id} className="search-result-item">
                      <div className="search-result-info">
                        <div className="search-result-username">{user.username}</div>
                        <div className="search-result-email">{user.email}</div>
                      </div>
                      <div className="search-result-actions">
                    {!isSelf && !isFriend && !requestSent && !friendRequests.includes(user.id) && (
                          <button 
                            onClick={() => sendFriendRequest(user.id)}
                            className="search-add-btn"
                          >
                            Add Friend
                      </button>
                    )}
                        {!isSelf && !isFriend && requestSent && (
                          <span className="search-status">Request Sent</span>
                        )}
                        {isFriend && (
                          <span className="search-status">Already Friends</span>
                        )}
                        {isSelf && (
                          <span className="search-status">This is you</span>
                        )}
                      </div>
                  </li>
                );
              })}
            </ul>
            </div>
          </div>
        </div>
      )}
      {/* Mobile Bottom Navbar for modal actions */}
      {hideActionsOnMobile && isMobile && (
        <div className="mobile-bottom-navbar">
          <button className="nav-action" onClick={() => openModal('friendRequests')} aria-label="Friend Requests">
            <FaUserFriends size={24} />
            {friendRequests.length > 0 && <span className="badge">{friendRequests.length}</span>}
          </button>
          <button className="nav-action" onClick={() => openModal('settings')} aria-label="Settings">
            <FaCog size={24} />
          </button>
          <button className="nav-action" onClick={() => openModal('profile')} aria-label="Profile">
            <FaUser size={24} />
          </button>
          <button className="nav-action" onClick={() => openModal('search')} aria-label="Search">
            <FaSearch size={24} />
          </button>
        </div>
      )}
      {/* Settings Modal */}
      {activeModal === 'settings' && (
        <div className="modal-overlay" onClick={closeAllModals}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={closeAllModals}>&times;</button>
            <h3>Settings</h3>
            {(() => {
              try {
                return (
                  <div style={{margin:'1.2rem 0 1.5rem 0', display:'flex', flexDirection:'column', gap:'1.2rem'}}>
                    <button
                      className="theme-toggle-btn"
                      onClick={() => setDarkMode(v => !v)}
                      aria-label="Toggle dark mode"
                      style={{display:'flex',alignItems:'center',gap:12,justifyContent:'flex-start',width:'fit-content',background:'none',border:'none',padding:'0.5em 1.2em',borderRadius:20,cursor:'pointer'}}
                    >
                      {darkMode ? (
                        <span style={{display:'flex',alignItems:'center',gap:2}}>
                          <FaMoon style={{color:'#818cf8',fontSize:'1.5em'}} />
                          <FaRegStar style={{color:'#facc15',fontSize:'1em',marginLeft:'-0.7em',marginTop:'-0.5em'}} />
                        </span>
                      ) : (
                        <FaSun style={{color:'#f59e42',fontSize:'1.5em'}} />
                      )}
                      <span style={{fontWeight:600,fontSize:'1.1em'}}>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
                    </button>
                    <button style={{background:'#6366f1',color:'#fff',border:'none',borderRadius:8,padding:'0.5em 1.2em',fontWeight:600}} onClick={onLogout}>
                      Logout
                    </button>
                    <div style={{marginTop:'1.5em',padding:'1em',background:'#fffbe9',border:'2px solid #f59e42',borderRadius:10}}>
                      <h4 style={{color:'#ef4444',margin:'0 0 0.7em 0'}}>Danger Zone</h4>
                      <button style={{background:'#ef4444',color:'#fff',border:'none',borderRadius:8,padding:'0.5em 1.2em',fontWeight:600}} onClick={()=>openModal('delete')}>
                        Delete Account
                      </button>
                    </div>
                  </div>
                );
              } catch (err) {
                return <div style={{color:'red'}}>Error rendering settings modal: {err.message}</div>;
              }
            })()}
            <p style={{marginTop:18}}>Settings coming soon!</p>
          </div>
        </div>
      )}
      {/* Account Deletion Modal */}
      {activeModal === 'delete' && (
        <div className="modal-overlay" onClick={closeAllModals}>
          <div className="modal-content" onClick={e=>e.stopPropagation()}>
            <button className="close-modal" onClick={closeAllModals}>&times;</button>
            <h3 style={{color:'#ef4444'}}>Delete Account</h3>
            <div style={{marginTop:10}}>
              <b>Are you sure?</b> This action is <span style={{color:'#ef4444'}}>permanent</span>.<br/>
              Please type your username <span style={{fontWeight:600}}>{username}</span> to confirm:
              <input style={{marginTop:8,padding:'0.3em 0.7em',borderRadius:8,border:'1px solid #ccc',fontSize:'1em',width:'100%'}}
                value={deleteInput} onChange={e=>setDeleteInput(e.target.value)} disabled={deleting}/>
              <div style={{marginTop:10}}>
                <button style={{background:'#ef4444',color:'#fff',border:'none',borderRadius:8,padding:'0.4em 1em',fontWeight:600,marginRight:8}} onClick={async()=>{
                  setDeleteError('');
                  if(deleteInput!==username){setDeleteError('Username does not match.');return;}
                  setDeleting(true);
                  try{
                    await deleteDoc(doc(db,'users',currentUser.uid));
                    await deleteUser(currentUser);
                    window.location.reload();
                  }catch(err){setDeleteError('Error: '+err.message);}
                  setDeleting(false);
                }} disabled={deleting}>
                  {deleting?'Deleting...':'Confirm Delete'}
                </button>
                <button onClick={closeAllModals} disabled={deleting}>Cancel</button>
              </div>
              {deleteError && <div style={{color:'#ef4444',marginTop:6}}>{deleteError}</div>}
            </div>
          </div>
        </div>
      )}
      {/* User Profile Modal */}
      {activeModal === 'profile' && (
        <div className="modal-overlay" onClick={closeAllModals}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={closeAllModals}>&times;</button>
            <h3>Your Profile</h3>
            <div className="profile-info">
              {!currentUser ? (
                <>
                  {/* Skeleton loading for profile picture */}
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <div style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      margin: '0 auto 1rem',
                      background: '#e0e7ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                      <div className="skeleton" style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                        backgroundSize: '200px 100%',
                        animation: 'skeleton-loading 1.5s infinite'
                      }}></div>
                    </div>
                  </div>
                  {/* Skeleton loading for profile info */}
                  <div style={{ marginBottom: '8px' }}>
                    <div className="skeleton" style={{
                      height: '20px',
                      width: '60%',
                      marginBottom: '8px',
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200px 100%',
                      animation: 'skeleton-loading 1.5s infinite',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <div className="skeleton" style={{
                      height: '20px',
                      width: '80%',
                      marginBottom: '8px',
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200px 100%',
                      animation: 'skeleton-loading 1.5s infinite',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <div className="skeleton" style={{
                      height: '20px',
                      width: '70%',
                      marginBottom: '8px',
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200px 100%',
                      animation: 'skeleton-loading 1.5s infinite',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <div className="skeleton" style={{
                      height: '36px',
                      width: '120px',
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200px 100%',
                      animation: 'skeleton-loading 1.5s infinite',
                      borderRadius: '8px'
                    }}></div>
                  </div>
                </>
              ) : editingProfile ? (
                <>
                  {/* Profile Picture Upload */}
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <div style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      margin: '0 auto 1rem',
                      background: profilePreview ? 'none' : '#e0e7ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px dashed #6366f1',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden'
                    }} onClick={() => document.getElementById('edit-profile-picture-input').click()}>
                      {profilePreview ? (
                        <img 
                          src={profilePreview} 
                          alt="Profile preview" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ color: '#6366f1', fontSize: '2rem' }}>📷</span>
                      )}
                    </div>
                    <input
                      id="edit-profile-picture-input"
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      style={{ display: 'none' }}
                    />
                    <button 
                      type="button" 
                      onClick={() => document.getElementById('edit-profile-picture-input').click()}
                      style={{
                        background: 'none',
                        border: '1px solid #6366f1',
                        color: '#6366f1',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      {profilePicture ? 'Change Picture' : 'Add Profile Picture'}
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
                          padding: '0.5rem 1rem',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          marginLeft: '0.5rem'
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div style={{marginBottom:8}}>
                    <b>Username:</b> <input value={editUsername} onChange={e => setEditUsername(e.target.value)} style={{padding:'0.3em 0.7em',borderRadius:8,border:'1px solid #ccc',fontSize:'1em'}} />
                  </div>
                  <button onClick={handleProfileSave} disabled={savingProfile} style={{marginRight:8}}>
                    {savingProfile ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => {
                    setEditingProfile(false);
                    setProfilePicture(null);
                    setProfilePreview(null);
                  }} disabled={savingProfile}>Cancel</button>
                </>
              ) : (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <div style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      margin: '0 auto 1rem',
                      background: '#e0e7ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                      {(() => {
                        // Try to get photoURL from multiple sources
                        const photoURL = userMap[currentUser.uid]?.photoURL || 
                                       currentUser.photoURL || 
                                       currentUser?.photoURL;
                        if (photoURL) {
                          return (
                            <img 
                              src={photoURL} 
                              alt="Profile" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                // Fallback to initial if image fails to load
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          );
                        } else {
                          return (
                            <span style={{ color: '#6366f1', fontSize: '2rem' }}>
                              {username?.[0]?.toUpperCase() || currentUser?.username?.[0]?.toUpperCase() || 'U'}
                            </span>
                          );
                        }
                      })()}
                    </div>
                  </div>
                  <div><b>Username:</b> {username || currentUser?.displayName || (currentUser && currentUser.uid && userMap[currentUser.uid]?.username) || 'Unknown'}</div>
                  <div><b>Email:</b> {currentUser?.email}</div>
                  <div><b>User ID:</b> {currentUser?.uid}</div>
                  <button style={{marginTop:12}} onClick={() => setEditingProfile(true)}>Edit Profile</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Friend Requests Modal */}
      {activeModal === 'friendRequests' && (
        <div className="modal-overlay" onClick={closeAllModals}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={closeAllModals}>&times;</button>
            <h3>Friend Requests</h3>
            <ul className="friends-requests">
              {friendRequests.length === 0 && <li>No requests</li>}
              {friendRequests.map(uid => (
                <li key={uid}>
                  {userMap[uid]?.username || uid}
                  <button onClick={() => acceptRequest(uid)}>Accept</button>
                  <button onClick={() => declineRequest(uid)}>Decline</button>
                </li>
              ))}
            </ul>
            <h4>Outgoing Friend Requests</h4>
            <ul className="friends-requests">
              {outgoingRequests.length === 0 && <li>No outgoing requests</li>}
              {outgoingRequests.map(uid => (
                <li key={uid}>
                  {userMap[uid]?.username || uid}
                  <button onClick={() => cancelFriendRequest(uid)}>
                    Cancel Request
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {/* Main Content: Friends List only, search moved to drawer */}
      <main className="friends-main-content">
        <section className="friends-section">
          <h4>Your Friends</h4>
          {loadingFriends ? (
            <ul className="friends-list">
              {[...Array(3)].map((_, i) => (
                <li key={i}><SkeletonItem style={{height:24,width:120,marginBottom:8}} /></li>
              ))}
            </ul>
          ) : (
            <ul className="friends-list">
              {friends.length === 0 && <li>No friends yet</li>}
              {friends.map(uid => (
                <li key={uid}>
                  {userMap[uid]?.username || userMap[uid]?.email || <SkeletonItem style={{height:24,width:120}} />}
                  <button className="remove-friend-btn" onClick={() => removeFriend(uid)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

export default Friends;
