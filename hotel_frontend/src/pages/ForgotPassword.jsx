import { useState } from "react";
import { C, S, SubmitButton, ImgSide } from "../components/auth/AuthShared";
import { useForgotPassword } from "../hooks/useAuthMutations";
import { useLang } from "../contexts/LanguageContext";

const ForgotPassword = ({ setPage }) => {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const forgotMutation = useForgotPassword();

  const handleForgot = () => {
    setError("");
    forgotMutation.mutate({ email }, {
      onSuccess: () => setSent(true),
      onError: (err) => setError(err.message),
    });
  };

  return (
    <div style={S.authWrap}>
      <ImgSide />
      <div style={S.formSide}>
        <div style={S.formBox}>
          <h1 style={S.title}>{t("forgot_title")}</h1>
          <p style={S.sub}>{t("forgot_sub")}</p>

          {sent ? (
            <div style={{ background: "#eafaf1", border: "1.5px solid #27ae60", borderRadius: 10, padding: "22px 24px", textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 700, color: "#27ae60", marginBottom: 4 }}>{t("forgot_sent_title")}</div>
              <div style={{ fontSize: 13, color: "#555" }}>{t("forgot_sent_msg").replace("{email}", email)}</div>
            </div>
          ) : (
            <>
              <div style={{ ...S.fg, marginBottom: 22 }}>
                <label style={S.label}>{t("auth_email")}</label>
                <input style={S.input} type="email" placeholder="concierge@luminous.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              {error && <p style={{ color: C.primary, fontSize: 13, marginBottom: 10, textAlign: "center" }}>{error}</p>}
              <SubmitButton
                label={forgotMutation.isPending ? t("forgot_loading") : t("forgot_submit")}
                onClick={handleForgot}
                disabled={!email || forgotMutation.isPending}
              />
            </>
          )}

          <p style={{ ...S.bottomTxt, marginBottom: 22 }}>
            <a style={S.redLink} onClick={() => setPage("login")}>{t("auth_back_login")}</a>
          </p>

          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 10 }}>{t("auth_support")}</p>
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
