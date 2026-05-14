import { useEffect, useRef, useState } from "react";
import { C, S, EyeOpen, EyeOff, SubmitButton, ImgSide } from "../components/auth/AuthShared";
import { useLogin, useGoogleLogin } from "../hooks/useAuthMutations";
import { useLang } from "../contexts/LanguageContext";

const Login = ({ setPage, onSuccess }) => {
  const { t } = useLang();
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [f, setF] = useState({ email: "", pw: "" });
  const [error, setError] = useState("");
  const googleButtonRef = useRef(null);
  const googleInitializedRef = useRef(false);
  const upd = k => e => setF({ ...f, [k]: e.target.value });

  const loginMutation = useLogin();
  const googleLoginMutation = useGoogleLogin();
  const loading = loginMutation.isPending || googleLoginMutation.isPending;

  const handleLogin = () => {
    setError("");
    loginMutation.mutate({ email: f.email, password: f.pw }, {
      onSuccess: (res) => { if (onSuccess) onSuccess(res.user, res.accessToken); },
      onError: (err) => setError(err.message),
    });
  };

  const handleGoogleLogin = (credential) => {
    setError("");
    googleLoginMutation.mutate({ credential }, {
      onSuccess: (res) => { if (onSuccess) onSuccess(res.user, res.accessToken); },
      onError: (err) => setError(err.message),
    });
  };
  useEffect(() => {
    if (
        googleInitializedRef.current ||
        !window.google ||
        !googleButtonRef.current
    ) {
      return;
    }

    googleInitializedRef.current = true;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: (response) => {
        handleGoogleLogin(response.credential);
      },
    });

    window.google.accounts.id.renderButton(
        googleButtonRef.current,
        {
          theme: "outline",
          size: "large",
          width: 260,
          text: "signin_with",
        }
    );
  }, []);

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
            <div ref={googleButtonRef} />

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
