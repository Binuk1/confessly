// Friends.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { FaCog, FaUser, FaUserFriends, FaMoon, FaSun, FaRegStar } from 'react-icons/fa';
import { deleteUser } from 'firebase/auth';
import { deleteDoc } from 'firebase/firestore';
import './friends.css';
import SkeletonItem from '../SkeletonItem';

const Spinner = () => (
  <div className="spinner-container"><div className="spinner"></div></div>
);

const Friends = ({ currentUser, username, onLogout, showAdminButton, setFriendsList }) => {
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
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [editingProfile, setEditingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState(username || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletePrompt, setDeletePrompt] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [noticeType, setNoticeType] = useState('banner');
  const [noticeText, setNoticeText] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');

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
    if (!currentUser) return;
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
    if (!currentUser) return;
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
    if (!currentUser) return;
    setLoadingFriends(true);
    const userRef = doc(db, 'users', currentUser.uid);
    return onSnapshot(userRef, (docSnap) => {
      const data = docSnap.data();
      setFriendRequests(data?.friendRequests || []);
      setFriends(data?.friends || []);
      setLoadingFriends(false);
    });
  }, [currentUser]);

  // Fetch outgoing friend requests (users where currentUser.uid is in their friendRequests) in real time
  useEffect(() => {
    if (!currentUser) return;
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
    setLoadingProfile(true);
    const fetchUsers = async (uids) => {
      if (!uids.length) {
        setLoadingProfile(false);
        return;
      }
      const q = query(collection(db, 'users'), where('__name__', 'in', uids.slice(0,10)));
      const snap = await getDocs(q);
      const map = {};
      snap.forEach(doc => { map[doc.id] = doc.data(); });
      setUserMap(prev => ({ ...prev, ...map }));
      setLoadingProfile(false);
    };
    fetchUsers([...friendRequests, ...friends, ...outgoingRequests]);
  }, [friendRequests, friends, outgoingRequests]);

  // Accept friend request
  const acceptRequest = async (fromUid) => {
    // Add each other as friends
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
    await updateDoc(doc(db, 'users', currentUser.uid), {
      friendRequests: arrayRemove(fromUid)
    });
  };

  // Remove friend
  const removeFriend = async (userId) => {
    if (!currentUser) return;
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
  const outgoingRequestsHelper = results.length === 0
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
    setSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { username: editUsername });
      setEditingProfile(false);
    } catch (err) {
      alert('Error updating profile: ' + err.message);
    }
    setSavingProfile(false);
  };

  // Update parent with friends list for chat system
  useEffect(() => {
    if (setFriendsList && friends.length > 0 && Object.keys(userMap).length > 0) {
      const friendObjs = friends.map(uid => ({
        id: uid,
        username: userMap[uid]?.username || '',
        email: userMap[uid]?.email || ''
      }));
      setFriendsList(friendObjs);
    } else if (setFriendsList && friends.length === 0) {
      setFriendsList([]);
    }
  }, [friends, userMap, setFriendsList]);

  return (
    <div className="friends-fullpage-bg">
      {/* Header/Navbar */}
      <header className="friends-header">
        <h2 className="logo">Confessly</h2>
        <div className="header-actions">
          <button className="icon-btn" title="Profile" onClick={() => setProfileOpen(true)}>
            <FaUser size={22} />
          </button>
          <button className="icon-btn" title="Settings" onClick={() => setSettingsOpen(true)}>
            <FaCog size={22} />
          </button>
          <button className="modal-btn" onClick={() => setModalOpen(true)}>
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
      </header>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setSettingsOpen(false)}>&times;</button>
            <h3>Settings</h3>
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
                <button style={{background:'#ef4444',color:'#fff',border:'none',borderRadius:8,padding:'0.5em 1.2em',fontWeight:600}} onClick={()=>setDeletePrompt(true)}>
                  Delete Account
                </button>
              </div>
            </div>
            <p style={{marginTop:18}}>Settings coming soon!</p>
          </div>
        </div>
      )}
      {/* Account Deletion Modal */}
      {deletePrompt && (
        <div className="modal-overlay" onClick={()=>{setDeletePrompt(false);setDeleteInput('');setDeleteError('');}}>
          <div className="modal-content" onClick={e=>e.stopPropagation()}>
            <button className="close-modal" onClick={()=>{setDeletePrompt(false);setDeleteInput('');setDeleteError('');}}>&times;</button>
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
                <button onClick={()=>{setDeletePrompt(false);setDeleteInput('');setDeleteError('');}} disabled={deleting}>Cancel</button>
              </div>
              {deleteError && <div style={{color:'#ef4444',marginTop:6}}>{deleteError}</div>}
            </div>
          </div>
        </div>
      )}
      {/* User Profile Modal */}
      {profileOpen && (
        <div className="modal-overlay" onClick={() => setProfileOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setProfileOpen(false)}>&times;</button>
            <h3>Your Profile</h3>
            <div className="profile-info">
              <div className="profile-avatar"><FaUser size={48} /></div>
              <div>
                {loadingProfile ? (
                  <>
                    <SkeletonItem style={{height:24,width:120,marginBottom:8}} />
                    <SkeletonItem style={{height:20,width:180,marginBottom:8}} />
                    <SkeletonItem style={{height:20,width:140}} />
                  </>
                ) : (
                  editingProfile ? (
                    <>
                      <div style={{marginBottom:8}}>
                        <b>Username:</b> <input value={editUsername} onChange={e => setEditUsername(e.target.value)} style={{padding:'0.3em 0.7em',borderRadius:8,border:'1px solid #ccc',fontSize:'1em'}} />
                      </div>
                      <button onClick={handleProfileSave} disabled={savingProfile} style={{marginRight:8}}>
                        {savingProfile ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => setEditingProfile(false)} disabled={savingProfile}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <div><b>Username:</b> {username || currentUser?.displayName || userMap[currentUser.uid]?.username || 'Unknown'}</div>
                      <div><b>Email:</b> {currentUser?.email}</div>
                      <div><b>User ID:</b> {currentUser?.uid}</div>
                      <button style={{marginTop:12}} onClick={() => setEditingProfile(true)}>Edit Profile</button>
                    </>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Friend Requests Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setModalOpen(false)}>&times;</button>
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
      {/* Main Content: Find Friends and Friends List */}
      <main className="friends-main-content">
        <section className="friends-search-section">
          <h3>Find Friends</h3>
          <form onSubmit={handleSearch} className="friends-search-form">
            <input
              type="text"
              placeholder="Search by username"
              value={search}
              onChange={e => { setSearch(e.target.value); setMessage(''); }}
            />
            <button type="submit">Search</button>
          </form>
          {message && <p>{message}</p>}
          <ul className="friends-results">
            {results.map(user => {
              const isFriend = friends.includes(user.id);
              const requestSent = outgoingRequests.includes(user.id);
              const isSelf = user.id === currentUser.uid;
              return (
                <li key={user.id}>
                  {user.username} ({user.email})
                  {!isSelf && !isFriend && !requestSent && !friendRequests.includes(user.id) && (
                    <button onClick={() => sendFriendRequest(user.id)}>
                      Send Friend Request
                    </button>
                  )}
                  {!isSelf && !isFriend && requestSent && <span style={{marginLeft:8, color:'#888'}}>Request Sent</span>}
                </li>
              );
            })}
          </ul>
        </section>
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
