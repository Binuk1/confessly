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
  const [bulkBanMode, setBulkBanMode] = useState(false);
  const [ipv4ToBan, setIpv4ToBan] = useState('');
  const [ipv6ToBan, setIpv6ToBan] = useState('');

  useEffect(() => {
    loadBannedIPs();
  }, []);

  const loadBannedIPs = async () => {
    try {
      setLoading(true);
      const now = new Date();
      // Query for active bans
      const q = query(
        collection(db, 'bannedIPs'), 
        where('isActive', '==', true),
        where('expiresAt', '>', now)
      );
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
  
  /**
   * Normalizes IP address to match backend logic exactly
   */
  const normalizeIP = (ip) => {
    let normalized = ip.trim();
    // Remove IPv4-mapped IPv6 prefix, e.g., ::ffff:192.168.1.1 -> 192.168.1.1
    if (normalized.startsWith('::ffff:')) {
      normalized = normalized.substring(7);
    }
    // Convert to lowercase for consistent storage and comparison
    return normalized.toLowerCase();
  };

  /**
   * Validates IPv4 or IPv6 address
   */
  const isValidIP = (ip) => {
    if (!ip.trim()) return false;
    
    // IPv4 regex
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 regex (full and compressed formats)
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|::)$/;
    
    // We validate the raw input, which might include the mapped prefix
    const ipv4MappedRegex = /^::ffff:(\d{1,3}\.){3}\d{1,3}$/i;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ipv4MappedRegex.test(ip);
  };

  const addBannedIP = async (ipToBan) => {
    try {
      const expiresAt = new Date();
      if (duration > 0) {
        expiresAt.setSeconds(expiresAt.getSeconds() + duration);
      } else {
        // Permanent ban (set to 10 years from now)
        expiresAt.setFullYear(expiresAt.getFullYear() + 10);
      }

      await addDoc(collection(db, 'bannedIPs'), {
        ip: ipToBan,
        reason: reason.trim() || 'No reason provided',
        banType,
        bannedAt: serverTimestamp(),
        expiresAt,
        bannedBy: 'admin',
        isActive: true
      });

      return true;
    } catch (err) {
      console.error('Error banning IP:', err);
      return false;
    }
  };

  const handleSingleBan = async (e) => {
    e.preventDefault();
    
    if (!newIP.trim()) {
      setError('Please enter an IP address');
      return;
    }

    // Validate the original IP format first
    if (!isValidIP(newIP.trim())) {
      setError('Please enter a valid IPv4 or IPv6 address (e.g., 192.168.1.1 or 2001:0db8::1)');
      return;
    }
    
    // Normalize the IP before saving (matches backend normalization)
    const ipToBan = normalizeIP(newIP);

    try {
      setError('');
      setSuccess('');
      
      const success = await addBannedIP(ipToBan);
      
      if (success) {
        setNewIP('');
        setReason('');
        setSuccess(`IP address ${ipToBan} has been banned successfully`);
        loadBannedIPs();
      } else {
        setError('Failed to ban IP address');
      }
    } catch (err) {
      console.error('Error banning IP:', err);
      setError('Failed to ban IP address');
    }
  };

  const handleBulkBan = async (e) => {
    e.preventDefault();
    
    if (!ipv4ToBan.trim() && !ipv6ToBan.trim()) {
      setError('Please enter at least one IP address (IPv4 or IPv6)');
      return;
    }

    const ipsToBan = [];
    
    if (ipv4ToBan.trim() && isValidIP(ipv4ToBan)) {
      ipsToBan.push(normalizeIP(ipv4ToBan));
    } else if (ipv4ToBan.trim()) {
      setError('Please enter a valid IPv4 address');
      return;
    }
    
    if (ipv6ToBan.trim() && isValidIP(ipv6ToBan)) {
      ipsToBan.push(normalizeIP(ipv6ToBan));
    } else if (ipv6ToBan.trim()) {
      setError('Please enter a valid IPv6 address');
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      let successCount = 0;
      for (const ip of ipsToBan) {
        const success = await addBannedIP(ip);
        if (success) successCount++;
      }
      
      if (successCount > 0) {
        setIpv4ToBan('');
        setIpv6ToBan('');
        setReason('');
        setSuccess(`Successfully banned ${successCount} IP address(es)`);
        loadBannedIPs();
      } else {
        setError('Failed to ban any IP addresses');
      }
    } catch (err) {
      console.error('Error in bulk ban:', err);
      setError('Failed to ban IP addresses');
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

  const getIPType = (ip) => {
    if (ip.includes(':')) return 'IPv6';
    if (ip.includes('.')) return 'IPv4';
    return 'Unknown';
  };

  return (
    <RequireStaffAuth allowedRoles={['admin', 'mod']}>
      <div className="banned-ips-management">
        <h2>🔒 Banned IP Addresses</h2>
        
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="ban-mode-toggle" style={{ marginBottom: '1rem' }}>
          <button
            type="button"
            className={`btn ${!bulkBanMode ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setBulkBanMode(false)}
          >
            Single IP Ban
          </button>
          <button
            type="button"
            className={`btn ${bulkBanMode ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setBulkBanMode(true)}
          >
            Dual-Stack Ban (IPv4 + IPv6)
          </button>
        </div>

        {!bulkBanMode ? (
          <div className="add-ban-form">
            <h3>Ban Single IP Address</h3>
            <form onSubmit={handleSingleBan}>
              <div className="form-group">
                <label>IP Address (IPv4 or IPv6)</label>
                <input
                  type="text"
                  value={newIP}
                  onChange={(e) => setNewIP(e.target.value)}
                  placeholder="e.g., 192.168.1.1 or 2001:db8::1"
                  required
                />
                <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                  Enter either IPv4 or IPv6 address
                </small>
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
        ) : (
          <div className="add-ban-form">
            <h3>Ban Dual-Stack IP Addresses</h3>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
              Use this for users with both IPv4 and IPv6 addresses. Ban both to ensure complete blocking.
            </p>
            <form onSubmit={handleBulkBan}>
              <div className="form-group">
                <label>IPv4 Address</label>
                <input
                  type="text"
                  value={ipv4ToBan}
                  onChange={(e) => setIpv4ToBan(e.target.value)}
                  placeholder="e.g., 27.125.249.123"
                />
              </div>
              
              <div className="form-group">
                <label>IPv6 Address</label>
                <input
                  type="text"
                  value={ipv6ToBan}
                  onChange={(e) => setIpv6ToBan(e.target.value)}
                  placeholder="e.g., 2405:3800:88f:d57c:f0ea:8c3d:e145:9785"
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
              
              <button type="submit" className="btn btn-primary">Ban IP Addresses</button>
            </form>
          </div>
        )}

        <div className="banned-ips-list">
          <h3>Currently Banned IPs ({bannedIPs.length})</h3>
          {loading ? (
            <p>Loading banned IPs...</p>
          ) : bannedIPs.length === 0 ? (
            <p>No active IP bans found.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>IP Address</th>
                  <th>Type</th>
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
                    <td>
                      <code style={{ 
                        background: '#f5f5f5', 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px',
                        fontSize: '0.9rem'
                      }}>
                        {ban.ip}
                      </code>
                    </td>
                    <td>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        color: ban.ip.includes(':') ? '#3498db' : '#27ae60',
                        fontWeight: '600'
                      }}>
                        {getIPType(ban.ip)}
                      </span>
                    </td>
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