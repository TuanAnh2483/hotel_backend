import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { C, S, SubmitButton, ImgSide } from "../components/auth/AuthShared";
import { authService } from "../services/authService";

export default function ResetPasswordPage({ setPage }) {
  const [sp] = useSearchParams();
  const token = sp.get("token") || "";

  const [form, setForm]     = useState({ password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]   = useState("");

  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleReset = async () => {
    setError("");
    if (!form.password || form.password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(form.password)) {
      setError("Mật khẩu phải có ít nhất 1 chữ cái và 1 chữ số.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }
    if (!token) {
      setError("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword({
        token,
        newPassword: form.password,
        confirmPassword: form.confirm,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Không thể đặt lại mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width: "100%", padding: "11px 14px", border: "1.5px solid #ddd", borderRadius: 9,
    fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
    transition: "border-color 0.2s",
  };
  const lbl = { fontSize: 13, fontWeight: 600, color: "#444", display: "block", marginBottom: 6 };

  if (!token) {
    return (
      <div style={S.authWrap}>
        <ImgSide />
        <div style={S.formSide}>
          <div style={S.formBox}>
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>Liên kết không hợp lệ</h2>
              <p style={{ fontSize: 14, color: "#888", marginBottom: 24 }}>
                Liên kết đặt lại mật khẩu này không hợp lệ hoặc đã hết hạn.
              </p>
              <button
                onClick={() => setPage("forgot")}
                style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 9, padding: "11px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                Yêu cầu liên kết mới
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={S.authWrap}>
        <ImgSide />
        <div style={S.formSide}>
          <div style={S.formBox}>
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>Đặt lại thành công!</h2>
              <p style={{ fontSize: 14, color: "#888", lineHeight: 1.6, marginBottom: 28 }}>
                Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.
              </p>
              <button
                onClick={() => setPage("login")}
                style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 9, padding: "12px 36px", fontSize: 15, fontWeight: 800, cursor: "pointer" }}
              >
                Đăng nhập ngay
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.authWrap}>
      <ImgSide />
      <div style={S.formSide}>
        <div style={S.formBox}>
          <h1 style={S.title}>Đặt lại mật khẩu</h1>
          <p style={S.sub}>Nhập mật khẩu mới cho tài khoản của bạn</p>

          <div style={{ marginBottom: 18 }}>
            <label style={lbl}>Mật khẩu mới *</label>
            <input
              style={inp}
              type="password"
              placeholder="Tối thiểu 8 ký tự, gồm chữ và số"
              value={form.password}
              onChange={upd("password")}
              onFocus={e => (e.target.style.borderColor = C.primary)}
              onBlur={e => (e.target.style.borderColor = "#ddd")}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={lbl}>Xác nhận mật khẩu *</label>
            <input
              style={inp}
              type="password"
              placeholder="Nhập lại mật khẩu"
              value={form.confirm}
              onChange={upd("confirm")}
              onFocus={e => (e.target.style.borderColor = C.primary)}
              onBlur={e => (e.target.style.borderColor = "#ddd")}
            />
          </div>

          {error && (
            <div style={{ background: "#fff5f5", border: "1px solid #ffcdd2", borderRadius: 8, padding: "10px 14px", color: C.primary, fontSize: 13, marginBottom: 18 }}>
              {error}
            </div>
          )}

          <SubmitButton loading={loading} onClick={handleReset}>
            {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
          </SubmitButton>

          <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "#888" }}>
            Nhớ mật khẩu rồi?{" "}
            <button
              onClick={() => setPage("login")}
              style={{ background: "none", border: "none", color: C.primary, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 13 }}
            >
              Đăng nhập
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
