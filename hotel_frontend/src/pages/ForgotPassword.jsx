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
          <h1 style={S.title}>Quên mật khẩu</h1>
          <p style={S.sub}>Vui lòng nhập email để nhận lại mã khôi phục</p>

          {sent ? (
            <div style={{ background: "#eafaf1", border: "1.5px solid #27ae60", borderRadius: 10, padding: "22px 24px", textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 700, color: "#27ae60", marginBottom: 4 }}>Email đã được gửi!</div>
              <div style={{ fontSize: 13, color: "#555" }}>Kiểm tra hộp thư <strong>{email}</strong> để lấy mã</div>
            </div>
          ) : (
            <>
              <div style={{ ...S.fg, marginBottom: 22 }}>
                <label style={S.label}>Email</label>
                <input style={S.input} type="email" placeholder="concierge@luminous.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              {error && <p style={{ color: C.primary, fontSize: 13, marginBottom: 10, textAlign: "center" }}>{error}</p>}
              <SubmitButton
                label={loading ? "Đang gửi..." : "Gửi yêu cầu"}
                onClick={handleForgot}
                disabled={!email || loading}
              />
            </>
          )}

          <p style={{ ...S.bottomTxt, marginBottom: 22 }}>
            <a style={S.redLink} onClick={() => setPage("login")}>← Quay lại đăng nhập</a>
          </p>

          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 10 }}>Hỗ trợ</p>
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