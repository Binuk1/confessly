import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminAuth() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === 'admin123') { // Temporary password
      navigate('/admin-panel');
    } else {
      setError('Incorrect password');
    }
  };

  return (
    <div className="admin-auth-container">
      <form onSubmit={handleSubmit}>
        <h2>Admin Login</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter admin password"
          required
        />
        {error && <div className="error-message">{error}</div>}
        <div className="button-group">
          <button type="submit">Submit</button>
          <button type="button" onClick={() => navigate('/')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

export default AdminAuth;