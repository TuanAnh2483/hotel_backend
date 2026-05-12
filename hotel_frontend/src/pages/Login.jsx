import { useState } from "react";
import { C, S, EyeOpen, EyeOff, SubmitButton, ImgSide } from "../components/auth/AuthShared";
import { authService } from "../services/authService";
import { useLang } from "../contexts/LanguageContext";

const Login = ({ setPage, onSuccess }) => {
  const { t } = useLang();
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [f, setF] = useState({ email: "", pw: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const upd = k => e => setF({ ...f, [k]: e.target.value });

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await authService.login({ email: f.email, password: f.pw });
      if (onSuccess) onSuccess(res.user, res.accessToken);
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
          <h1 style={S.title}>{t("login_title")}</h1>
          <p style={S.sub}>{t("login_sub")}</p>

          <div style={S.fg}>
            <label style={S.label}>{t("auth_email")}</label>
            <input style={S.input} type="email" placeholder="concierge@luminous.com" value={f.email} onChange={upd("email")} />
          </div>

          <div style={{ ...S.fg, marginBottom: 10 }}>
            <label style={S.label}>{t("auth_password")}</label>
            <div style={S.inputWrap}>
              <input style={S.input} type={showPw ? "text" : "password"} placeholder={t("auth_password_ph")} value={f.pw} onChange={upd("pw")} />
              <button style={S.eyeBtn} onClick={() => setShowPw(!showPw)}>{showPw ? <EyeOff /> : <EyeOpen />}</button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: C.textMuted, cursor: "pointer" }}>
              <input style={S.checkBox} type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              {t("login_remember")}
            </label>
            <a style={S.redLink} onClick={() => setPage("forgot")}>{t("login_forgot")}</a>
          </div>

          {error && <p style={{ color: C.primary, fontSize: 13, marginBottom: 10, textAlign: "center" }}>{error}</p>}

          <SubmitButton
            label={loading ? t("login_loading") : t("login_submit")}
            onClick={handleLogin}
            disabled={!f.email || !f.pw || loading}
          />

          <div style={S.orRow}><div style={S.divLine} /><span>{t("login_or")}</span><div style={S.divLine} /></div>
          <div style={S.socialRow}>
            <button style={S.socialBtn}>
              <svg width="22" height="22" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            </button>
            <button style={S.socialBtn}>
              <svg width="22" height="22" viewBox="0 0 48 48">
                <path fill="#3b5998" d="M44 24C44 12.95 35.05 4 24 4S4 12.95 4 24c0 9.98 7.31 18.26 16.88 19.76V29.69h-5.08V24h5.08v-4.41c0-5.02 2.99-7.79 7.57-7.79 2.19 0 4.49.39 4.49.39v4.93H30.4c-2.49 0-3.27 1.55-3.27 3.13V24h5.57l-.89 5.69h-4.68v14.07C36.69 42.26 44 33.98 44 24z"/>
              </svg>
            </button>
          </div>

          <p style={S.bottomTxt}>{t("login_no_account")} <a style={S.redLink} onClick={() => setPage("register")}>{t("login_register_link")}</a></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
