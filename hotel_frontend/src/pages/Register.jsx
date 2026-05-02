import { useState } from "react";
import { S, EyeOpen, EyeOff, SubmitButton, ImgSide } from "../components/auth/AuthShared";
import { authService } from "../services/authService";

const errStyle = { color: "#BE1E2E", fontSize: 12, margin: "4px 0 0" };
const noteStyle = {
  background: "#fff5f5",
  border: "1px solid #ffcdd2",
  borderRadius: 10,
  color: "#7f1d1d",
  fontSize: 13,
  lineHeight: 1.6,
  marginBottom: 18,
  padding: "12px 14px",
};

function validateField(key, value, form) {
  if (key === "email") {
    if (!value) return "Email không được để trống";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Email không hợp lệ";
  }
  if (key === "pw") {
    if (!value) return "Mật khẩu không được để trống";
    if (value.length < 8) return "Mật khẩu tối thiểu 8 ký tự";
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(value)) return "Mật khẩu phải có ít nhất 1 chữ cái và 1 chữ số";
  }
  if (key === "cf" && value !== form.pw) {
    return "Mật khẩu xác nhận không khớp";
  }
  return "";
}

export default function Register({ setPage }) {
  const [role, setRole] = useState("customer");
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [f, setF] = useState({ email: "", pw: "", cf: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");

  const upd = (k) => (e) => {
    const val = e.target.value;
    const next = { ...f, [k]: val };
    setF(next);
    setFieldErrors((prev) => ({ ...prev, [k]: validateField(k, val, next) }));
  };

  const handleRegister = async () => {
    const errs = {
      email: validateField("email", f.email, f),
      pw: validateField("pw", f.pw, f),
      cf: validateField("cf", f.cf, f),
    };
    setFieldErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    setError("");
    setLoading(true);
    try {
      await authService.register({
        email: f.email,
        password: f.pw,
        confirmPassword: f.cf,
      });
      setRegisteredEmail(f.email);
      setF({ email: "", pw: "", cf: "" });
      setAgreed(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (registeredEmail) {
    return (
      <div style={S.authWrap}>
        <ImgSide />
        <div style={S.formSide}>
          <div style={S.formBox}>
            <h1 style={S.title}>Kiểm tra email của bạn</h1>
            <p style={S.sub}>Tài khoản đã được tạo cho {registeredEmail}.</p>

            <div style={{ ...noteStyle, marginBottom: 22 }}>
              Vui lòng mở link xác thực trong email. Sau khi xác thực thành công, hệ thống sẽ báo rõ để bạn quay lại đăng nhập.
              {role === "partner" && " Sau khi xác minh và đăng nhập, hãy vào mục Đăng ký đối tác để gửi hồ sơ partner."}
            </div>

            <SubmitButton label="Đến trang đăng nhập" onClick={() => setPage("login")} />
            <p style={S.bottomTxt}>
              Chưa nhận được email?{" "}
              <button
                type="button"
                onClick={() => setRegisteredEmail("")}
                style={{ background: "none", border: "none", color: "#BE1E2E", cursor: "pointer", fontWeight: 700, padding: 0 }}
              >
                Đăng ký lại
              </button>
            </p>
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
          <h1 style={S.title}>Đăng ký tài khoản</h1>
          <p style={S.sub}>Tạo tài khoản thật để test trực tiếp với backend</p>

          <div style={S.tabs}>
            <button style={S.tab(role === "customer")} onClick={() => setRole("customer")}>Khách hàng</button>
            <button style={S.tab(role === "partner")} onClick={() => setRole("partner")}>Đối tác khách sạn</button>
          </div>

          <div style={noteStyle}>
            {role === "customer"
              ? "Đăng ký chỉ gửi đúng 3 field backend đang nhận: email, password, confirmPassword."
              : "Backend chưa cho đăng ký partner trực tiếp ở màn này. Bước đúng là: tạo tài khoản thường, xác minh email, đăng nhập, rồi gửi hồ sơ tại mục Đăng ký đối tác."}
          </div>

          <div style={{ display: "grid", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={S.label}>Email đăng ký</label>
              <input
                style={S.input}
                type="email"
                placeholder="example@email.com"
                value={f.email}
                onChange={upd("email")}
              />
              {fieldErrors.email && <p style={errStyle}>{fieldErrors.email}</p>}
            </div>

            <div>
              <label style={S.label}>Mật khẩu</label>
              <div style={S.inputWrap}>
                <input
                  style={S.input}
                  type={showPw ? "text" : "password"}
                  placeholder="Tối thiểu 8 ký tự, gồm chữ và số"
                  value={f.pw}
                  onChange={upd("pw")}
                />
                <button type="button" style={S.eyeBtn} onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
              {fieldErrors.pw && <p style={errStyle}>{fieldErrors.pw}</p>}
            </div>

            <div>
              <label style={S.label}>Xác nhận mật khẩu</label>
              <div style={S.inputWrap}>
                <input
                  style={S.input}
                  type={showCf ? "text" : "password"}
                  placeholder="Nhập lại mật khẩu"
                  value={f.cf}
                  onChange={upd("cf")}
                />
                <button type="button" style={S.eyeBtn} onClick={() => setShowCf(!showCf)}>
                  {showCf ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
              {fieldErrors.cf && <p style={errStyle}>{fieldErrors.cf}</p>}
            </div>
          </div>

          <div style={{ ...S.checkRow, marginTop: 0 }}>
            <input style={S.checkBox} type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span style={S.checkLabel}>
              Tôi đồng ý với các <a style={S.redLink}>Điều khoản &amp; Điều kiện</a> và <a style={S.redLink}>Chính sách bảo mật</a>
            </span>
          </div>

          {error && <p style={{ color: "#BE1E2E", fontSize: 13, marginBottom: 10, textAlign: "center" }}>{error}</p>}

          <SubmitButton
            label={loading ? "Đang xử lý..." : (role === "customer" ? "Tạo tài khoản" : "Tạo tài khoản để đăng ký đối tác")}
            onClick={handleRegister}
            disabled={!f.email || !f.pw || !f.cf || !agreed || loading || Object.values(fieldErrors).some(Boolean)}
          />
          <p style={S.bottomTxt}>
            Đã có tài khoản?{" "}
            <button
              type="button"
              onClick={() => setPage("login")}
              style={{ background: "none", border: "none", color: "#BE1E2E", cursor: "pointer", fontWeight: 700, padding: 0 }}
            >
              Đăng nhập ngay
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
