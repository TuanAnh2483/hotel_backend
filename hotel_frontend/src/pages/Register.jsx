import { useState } from "react";
import { S, EyeOpen, EyeOff, SubmitButton, ImgSide } from "../components/auth/AuthShared";
import { useRegister } from "../hooks/useAuthMutations";
import { useLang } from "../contexts/LanguageContext";

const errStyle = { color: "#BE1E2E", fontSize: 12, margin: "4px 0 0" };

function validateField(key, value, form, t) {
  if (key === "email") {
    if (!value) return t("register_err_email_empty");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return t("register_err_email_invalid");
  }
  if (key === "pw") {
    if (!value) return t("register_err_pw_empty");
    if (value.length < 8) return t("register_err_pw_min");
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(value)) return t("register_err_pw_format");
  }
  if (key === "cf" && value !== form.pw) {
    return t("register_err_cf");
  }
  return "";
}

export default function Register({ setPage }) {
  const { t } = useLang();
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [f, setF] = useState({ email: "", pw: "", cf: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");

  const registerMutation = useRegister();

  const upd = (k) => (e) => {
    const val = e.target.value;
    const next = { ...f, [k]: val };
    setF(next);
    setFieldErrors((prev) => ({ ...prev, [k]: validateField(k, val, next, t) }));
  };

  const handleRegister = () => {
    const errs = {
      email: validateField("email", f.email, f, t),
      pw:    validateField("pw",    f.pw,    f, t),
      cf:    validateField("cf",    f.cf,    f, t),
    };
    setFieldErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    setError("");
    registerMutation.mutate(
      { email: f.email, password: f.pw, confirmPassword: f.cf },
      {
        onSuccess: (result) => {
          // Dev mode: backend exposes token directly → auto-verify without email
          if (result?.verificationToken) {
            window.location.href = `/verify-email?token=${encodeURIComponent(result.verificationToken)}`;
            return;
          }
          setRegisteredEmail(f.email);
          setF({ email: "", pw: "", cf: "" });
          setAgreed(false);
        },
        onError: (err) => setError(err.message),
      },
    );
  };

  if (registeredEmail) {
    return (
      <div style={S.authWrap}>
        <ImgSide />
        <div style={S.formSide}>
          <div style={S.formBox}>
            <h1 style={S.title}>{t("register_success_title")}</h1>
            <p style={S.sub}>{t("register_success_sub").replace("{email}", registeredEmail)}</p>

            <div style={{
              background: "#eafaf1", border: "1.5px solid #27ae60",
              borderRadius: 10, padding: "16px 18px", marginBottom: 22,
              fontSize: 13, lineHeight: 1.6, color: "#1a5c38",
            }}>
              {t("register_success_note")}
            </div>

            <SubmitButton label={t("register_goto_login")} onClick={() => setPage("login")} />
            <p style={S.bottomTxt}>
              {t("register_no_email")}{" "}
              <button
                type="button"
                onClick={() => setRegisteredEmail("")}
                style={{ background: "none", border: "none", color: "#BE1E2E", cursor: "pointer", fontWeight: 700, padding: 0 }}
              >
                {t("register_retry")}
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
          <h1 style={S.title}>{t("register_title")}</h1>
          <p style={S.sub}>{t("register_sub")}</p>

          <div style={{ display: "grid", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={S.label}>{t("register_email_label")}</label>
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
              <label style={S.label}>{t("auth_password")}</label>
              <div style={S.inputWrap}>
                <input
                  style={S.input}
                  type={showPw ? "text" : "password"}
                  placeholder={t("register_pw_ph")}
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
              <label style={S.label}>{t("auth_password_cf")}</label>
              <div style={S.inputWrap}>
                <input
                  style={S.input}
                  type={showCf ? "text" : "password"}
                  placeholder={t("register_cf_ph")}
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
              {t("register_terms")} <a style={S.redLink}>{t("register_terms_link")}</a> {t("register_privacy")} <a style={S.redLink}>{t("register_privacy_link")}</a>
            </span>
          </div>

          {error && <p style={{ color: "#BE1E2E", fontSize: 13, marginBottom: 10, textAlign: "center" }}>{error}</p>}

          <SubmitButton
            label={registerMutation.isPending ? t("register_loading") : t("register_submit")}
            onClick={handleRegister}
            disabled={!f.email || !f.pw || !f.cf || !agreed || registerMutation.isPending || Object.values(fieldErrors).some(Boolean)}
          />

          <p style={S.bottomTxt}>
            {t("register_has_account")}{" "}
            <button
              type="button"
              onClick={() => setPage("login")}
              style={{ background: "none", border: "none", color: "#BE1E2E", cursor: "pointer", fontWeight: 700, padding: 0 }}
            >
              {t("register_login_link")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
