const Dashboard = ({ user, role, onLogout }) => {
  return (
    <div className="dashboard-container">
      <h2>Welcome, {user.email}</h2>
      <p>Role: <strong>{role || 'unknown'}</strong></p>
      {role === 'admin' && <AdminPanel />}
      <Friends currentUser={user} />
    </div>
  );
};

export default Dashboard;