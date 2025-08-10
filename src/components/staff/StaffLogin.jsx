import { useState } from "react";
import { auth, db } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./staff.css";

export default function StaffLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      const staffDoc = await getDoc(doc(db, "staff", uid));
      if (!staffDoc.exists()) {
        setError("Access denied. You're not staff.");
        return;
      }

      navigate("/staff/dashboard");
    } catch (err) {
      setError("Invalid credentials or Firebase error.");
    }
  };

  return (
    <div className="staff-login-container">
      <h2>Staff Login</h2>
      <form className="staff-login-form" onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          required
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
        {error && <p className="error-text">{error}</p>}
      </form>
    </div>
  );
}