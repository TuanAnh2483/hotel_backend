import { useState } from "react";
import { C, S, SubmitButton, ImgSide } from "../components/auth/AuthShared";
import { authService } from "../services/authService";

const ForgotPassword = ({ setPage }) => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleForgot = async () => {
    setError("");
    setLoading(true);
    try {
      await authService.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.authWrap}>
      <ImgSide />
      <div style={S.formSide}>
        <div style={S.formBox}>

          {sent ? (
            <div style={{ background: "#eafaf1", border: "1.5px solid #27ae60", borderRadius: 10, padding: "22px 24px", textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            </div>
          ) : (
            <>
              <div style={{ ...S.fg, marginBottom: 22 }}>
                <input style={S.input} type="email" placeholder="concierge@luminous.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              {error && <p style={{ color: C.primary, fontSize: 13, marginBottom: 10, textAlign: "center" }}>{error}</p>}
              <SubmitButton
                onClick={handleForgot}
                disabled={!email || loading}
              />
            </>
          )}

          <p style={{ ...S.bottomTxt, marginBottom: 22 }}>
          </p>

          <div style={{ textAlign: "center" }}>
            <div style={S.supportRow}>
              <button style={S.supportBtn}>❓</button>
              <button style={S.supportBtn}>🔗</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;