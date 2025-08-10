import { useEffect, useState, useRef } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { db, auth, firebaseConfig } from "../../firebase";
import RequireStaffAuth from "./RequireStaffAuth";
import {
  initializeApp,
  getApps
} from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import "./staff.css";

export default function ManageStaff() {
  const [staffList, setStaffList] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("mod");
  const [password, setPassword] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const newlyAddedRef = useRef(null);

  const fetchStaffAndRole = async () => {
    const snapshot = await getDocs(collection(db, "staff"));
    const staffData = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    setStaffList(staffData);

    const uid = auth.currentUser?.uid;
    const match = staffData.find((s) => s.id === uid);
    if (match) {
      setCurrentUserRole(match.role);
    }
  };

  useEffect(() => {
    fetchStaffAndRole();
  }, []);

  const canRemove = (myRole, targetRole) => {
    if (!myRole) return false;
    if (myRole === "creator") return true;
    if (myRole === "admin" && targetRole === "mod") return true;
    return false;
  };

  const handleAddStaff = async () => {
    setError("");
    setSuccess("");
    if (!email || !role || !password) {
      setError("Fill all fields.");
      return;
    }

    if (currentUserRole === "admin" && role === "admin") {
      setError("Admins cannot add other admins.");
      return;
    }
    if (currentUserRole === "mod") {
      setError("Moderators cannot add new staff.");
      return;
    }

    const exists = staffList.some(
      (s) => s.email.toLowerCase() === email.toLowerCase()
    );
    if (exists) {
      setError("This email is already added as staff.");
      return;
    }

    setIsCreating(true);
    try {
      // Create a temporary Firebase app to avoid switching current auth session
      const tempApp = initializeApp(firebaseConfig, "temp" + Date.now());
      const tempAuth = getAuth(tempApp);

      const userCred = await createUserWithEmailAndPassword(
        tempAuth,
        email,
        password
      );
      const uid = userCred.user.uid;

      await signOut(tempAuth); // Clean up temp session

      await setDoc(doc(db, "staff", uid), {
        email,
        role,
      });

      setSuccess(`Created ${role} account for ${email}.`);
      setEmail("");
      setPassword("");
      setRole("mod");

      await fetchStaffAndRole();
      newlyAddedRef.current = uid;

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("That email is already in use.");
      } else {
        setError("Failed to create staff: " + err.message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id, targetRole) => {
    if (!canRemove(currentUserRole, targetRole)) {
      alert("You do not have permission to remove this staff member.");
      return;
    }
    try {
      await deleteDoc(doc(db, "staff", id));
      setStaffList((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error("Delete failed", e);
      alert("Failed to remove staff.");
    }
  };

  if (currentUserRole === null) {
    return <p className="staff-loading">Loading...</p>;
  }

  return (
    <RequireStaffAuth allowedRoles={["admin", "creator"]}>
      <div className="staff-manage-container">
        <h2>Manage Staff</h2>

        <div className="staff-add-form">
          <div className="input-group">
            <input
              type="email"
              placeholder="Staff Email"
              value={email}
              disabled={isCreating}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              disabled={isCreating}
              onChange={(e) => setPassword(e.target.value)}
            />
            <select
              value={role}
              disabled={isCreating}
              onChange={(e) => setRole(e.target.value)}
            >
              {currentUserRole === "creator" && (
                <option value="admin">Admin</option>
              )}
              <option value="mod">Moderator</option>
            </select>
          </div>
          <button
            onClick={handleAddStaff}
            disabled={isCreating}
            className="add-staff-btn"
          >
            {isCreating ? (
              <>
                <span className="spinner" /> Creating...
              </>
            ) : (
              "Add Staff"
            )}
          </button>
        </div>

        {error && <div className="staff-feedback error">{error}</div>}
        {success && <div className="staff-feedback success">{success}</div>}

        <div className="staff-list">
          <h3>Current Staff</h3>
          {staffList.map((staff) => (
            <div
              key={staff.id}
              className={`staff-row ${
                newlyAddedRef.current === staff.id ? "fade-in" : ""
              }`}
            >
              <div className="staff-info">
                <span>{staff.email}</span>
                <span className={`staff-role role-${staff.role}`}>
                  {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                </span>
              </div>
              {canRemove(currentUserRole, staff.role) && (
                <button
                  onClick={() => handleDelete(staff.id, staff.role)}
                  className="remove-btn"
                >
                  ❌ Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </RequireStaffAuth>
  );
}