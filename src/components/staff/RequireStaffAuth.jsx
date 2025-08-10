import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import "./staff.css";

export default function RequireStaffAuth({ children, allowedRoles = [] }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/staff"); // Not logged in
        return;
      }

      try {
        const staffRef = doc(db, "staff", user.uid);
        const staffSnap = await getDoc(staffRef);

        if (!staffSnap.exists()) {
          console.warn("Staff record not found for UID:", user.uid);
          setAuthorized(false);
        } else {
          const role = staffSnap.data().role?.toLowerCase();
          // Convert allowedRoles to lowercase for a case-insensitive comparison
          const lowercasedAllowedRoles = allowedRoles.map(r => r.toLowerCase());
          
          if (lowercasedAllowedRoles.includes(role)) {
            setAuthorized(true);
          } else {
            console.warn("User role not allowed:", role);
            setAuthorized(false);
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [allowedRoles, navigate]);

  if (loading) {
    return <p className="staff-loading">Loading...</p>;
  }

  if (!authorized) {
    return (
      <div className="staff-unauth-container">
        <h2>Unauthorized Access</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return children;
}