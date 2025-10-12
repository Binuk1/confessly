// Updated StaffDashboard.jsx
import RequireStaffAuth from "./RequireStaffAuth";
import { auth } from "../../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./staff.css";

export default function StaffDashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/staff");
  };

  return (
    <RequireStaffAuth allowedRoles={["creator", "admin", "mod"]}>
      <div className="staff-dashboard-container">
        <h2>Staff Dashboard</h2>
        <p>Welcome! Use the tools below to moderate confessions.</p>

        <div className="staff-tools">
          <button onClick={() => navigate("/staff/manage")}>
            👥 Manage Staff
          </button>
          <button onClick={() => navigate("/staff/reports")}>
            📋 Review Reports
          </button>
          <button onClick={() => navigate("/staff/banned-ips")}>
            🚫 Manage Banned IPs
          </button>
          <button disabled>
            📊 Analytics (Coming Soon)
          </button>
        </div>

        <button className="staff-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </RequireStaffAuth>
  );
}