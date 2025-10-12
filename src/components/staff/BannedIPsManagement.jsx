import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import RequireStaffAuth from './RequireStaffAuth';
import './BannedIPsManagement.css';

const BAN_DURATIONS = [
  { value: 3600, label: '1 hour' },
  { value: 86400, label: '1 day' },
  { value: 604800, label: '1 week' },
  { value: 2592000, label: '1 month' },
  { value: 0, label: 'Permanent' },
];

const BAN_TYPES = [
  { value: 'confess', label: 'Posting Confessions' },
  { value: 'reply', label: 'Posting Replies' },
  { value: 'both', label: 'Both' },
  { value: 'site', label: 'Entire Site' },
];

function BannedIPsManagement() {
  const [bannedIPs, setBannedIPs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newIP, setNewIP] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(86400); // 1 day default
  const [banType, setBanType] = useState('both');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadBannedIPs();
  }, []);

  const loadBannedIPs = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'bannedIPs'), where('expiresAt', '>', new Date()));
      const querySnapshot = await getDocs(q);
      
      const ips = [];
      querySnapshot.forEach((doc) => {
        ips.push({ id: doc.id, ...doc.data() });
      });
      
      setBannedIPs(ips);
    } catch (err) {
      console.error('Error loading banned IPs:', err);
      setError('Failed to load banned IPs');
    } finally {
      setLoading(false);
    }
  };

  const addBannedIP = async (e) => {
    e.preventDefault();
    
    if (!newIP.trim()) {
      setError('Please enter an IP address');
      return;
    }

    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipRegex.test(newIP)) {
      setError('Please enter a valid IP address (e.g., 192.168.1.1)');
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      const expiresAt = new Date();
      if (duration > 0) {
        expiresAt.setSeconds(expiresAt.getSeconds() + duration);
      } else {
        // Permanent ban (set to 10 years from now)
        expiresAt.setFullYear(expiresAt.getFullYear() + 10);
      }

      await addDoc(collection(db, 'bannedIPs'), {
        ip: newIP.trim(),
        reason: reason.trim() || 'No reason provided',
        banType,
        bannedAt: serverTimestamp(),
        expiresAt,
        bannedBy: 'admin', // In a real app, you'd use the current admin's ID
        isActive: true
      });

      setNewIP('');
      setReason('');
      setSuccess('IP address has been banned successfully');
      loadBannedIPs();
    } catch (err) {
      console.error('Error banning IP:', err);
      setError('Failed to ban IP address');
    }
  };

  const unbanIP = async (id) => {
    if (!window.confirm('Are you sure you want to unban this IP address?')) return;
    
    try {
      const ipRef = doc(db, 'bannedIPs', id);
      await updateDoc(ipRef, {
        isActive: false,
        unbannedAt: serverTimestamp()
      });
      
      setSuccess('IP address has been unbanned');
      loadBannedIPs();
    } catch (err) {
      console.error('Error unbanning IP:', err);
      setError('Failed to unban IP address');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString();
  };

  const getBanTypeLabel = (type) => {
    const found = BAN_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

  return (
    <RequireStaffAuth allowedRoles={['admin', 'mod']}>
      <div className="banned-ips-management">
        <h2>🔒 Banned IP Addresses</h2>
        
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="add-ban-form">
          <h3>Ban New IP Address</h3>
          <form onSubmit={addBannedIP}>
            <div className="form-group">
              <label>IP Address</label>
              <input
                type="text"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
                placeholder="e.g., 192.168.1.1"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for ban"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Ban Type</label>
              <select
                value={banType}
                onChange={(e) => setBanType(e.target.value)}
              >
                {BAN_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              >
                {BAN_DURATIONS.map((dur) => (
                  <option key={dur.value} value={dur.value}>
                    {dur.label}
                  </option>
                ))}
              </select>
            </div>
            
            <button type="submit" className="btn btn-primary">Ban IP Address</button>
          </form>
        </div>

        <div className="banned-ips-list">
          <h3>Currently Banned IPs</h3>
          {loading ? (
            <p>Loading banned IPs...</p>
          ) : bannedIPs.length === 0 ? (
            <p>No active IP bans found.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>IP Address</th>
                  <th>Reason</th>
                  <th>Ban Type</th>
                  <th>Banned On</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bannedIPs.map((ban) => (
                  <tr key={ban.id}>
                    <td>{ban.ip}</td>
                    <td>{ban.reason}</td>
                    <td>{getBanTypeLabel(ban.banType)}</td>
                    <td>{formatDate(ban.bannedAt)}</td>
                    <td>{ban.expiresAt ? formatDate(ban.expiresAt) : 'Permanent'}</td>
                    <td>
                      <button 
                        onClick={() => unbanIP(ban.id)}
                        className="btn btn-sm btn-outline"
                      >
                        Unban
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </RequireStaffAuth>
  );
}

export default BannedIPsManagement;
