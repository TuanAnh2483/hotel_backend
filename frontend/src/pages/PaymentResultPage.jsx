import { useLocation, Navigate } from "react-router-dom";
import { CheckCircle2, XCircle, CreditCard } from "lucide-react";
import MainNavbar from "../components/MainNavbar";
import Footer from "../components/Footer";
import { useLang } from "../contexts/LanguageContext";

function fmt(n) { return (n || 0).toLocaleString("vi-VN") + " ₫"; }

function SuccessPage({ navigate, user, onLogout, state }) {
  const { t } = useLang();
  const { bookingId, amount, hotelName, cancellationPolicy } = state || {};

  const POLICY_KEY = {
    FLEXIBLE: "pay_result_policy_flexible",
    MODERATE: "pay_result_policy_moderate",
    STRICT:   "pay_result_policy_strict",
  };
  const policyText = POLICY_KEY[cancellationPolicy] ? t(POLICY_KEY[cancellationPolicy]) : null;

  const checklist = [
    t("pay_result_email_sent"),
    t("pay_result_show_id"),
    ...(policyText ? [policyText] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--gradient-brand)", display: "flex", flexDirection: "column" }}>
      <MainNavbar active="my-bookings" navigate={navigate} user={user} onLogout={onLogout} />

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius-xl)", padding: "52px 48px", maxWidth: 520, width: "100%", boxShadow: "var(--shadow-lg)", textAlign: "center" }}>

          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--success-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <CheckCircle2 size={44} color="var(--success)" aria-hidden="true" />
          </div>

          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--fw-black)", color: "var(--text-main)", marginBottom: 8 }}>
            {t("pay_result_success_title")}
          </h1>
          <p style={{ fontSize: "var(--text-base)", color: "var(--text-light)", marginBottom: 32, lineHeight: 1.7 }}>
            {t("pay_result_success_sub")}
          </p>

          <div style={{ background: "var(--secondary)", borderRadius: "var(--radius-md)", padding: "20px 24px", marginBottom: 28, textAlign: "left" }}>
            {bookingId && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-light)" }}>{t("pay_result_booking_id")}</span>
                <span style={{ fontFamily: "monospace", fontWeight: "var(--fw-heavy)", fontSize: "var(--text-md)", color: "var(--primary)" }}>#{bookingId}</span>
              </div>
            )}
            {hotelName && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-light)" }}>{t("pay_result_hotel")}</span>
                <span style={{ fontWeight: "var(--fw-semibold)", fontSize: "var(--text-sm)", color: "var(--text-main)", textAlign: "right", maxWidth: 240 }}>{hotelName}</span>
              </div>
            )}
            {amount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 4 }}>
                <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--fw-bold)", color: "var(--text-main)" }}>{t("pay_result_amount_paid")}</span>
                <span style={{ fontSize: "var(--text-lg)", fontWeight: "var(--fw-black)", color: "var(--success)" }}>{fmt(amount)}</span>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 32, textAlign: "left" }}>
            {checklist.map(msg => (
              <div key={msg} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                <span style={{ color: "var(--success)", flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", lineHeight: 1.6 }}>{msg}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-primary btn-lg" style={{ flex: 1 }}
              onClick={() => navigate("booking-detail", { bookingId })}>
              {t("pay_result_view_detail")}
            </button>
            <button className="btn btn-secondary btn-lg" style={{ flex: 1 }}
              onClick={() => navigate("my-bookings")}>
              {t("pay_result_all_bookings")}
            </button>
          </div>
        </div>
      </div>

      <Footer navigate={navigate} />
    </div>
  );
}

function FailedPage({ navigate, user, onLogout, state }) {
  const { t } = useLang();
  const { bookingId, errorMessage } = state || {};

  const reasons = [
    t("pay_result_reason_1"),
    t("pay_result_reason_2"),
    t("pay_result_reason_3"),
    t("pay_result_reason_4"),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", flexDirection: "column" }}>
      <MainNavbar active="my-bookings" navigate={navigate} user={user} onLogout={onLogout} />

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius-xl)", padding: "52px 48px", maxWidth: 520, width: "100%", boxShadow: "var(--shadow-lg)", textAlign: "center" }}>

          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--danger-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <XCircle size={44} color="var(--danger)" aria-hidden="true" />
          </div>

          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--fw-black)", color: "var(--text-main)", marginBottom: 8 }}>
            {t("pay_result_failed_title")}
          </h1>
          <p style={{ fontSize: "var(--text-base)", color: "var(--text-light)", marginBottom: 28, lineHeight: 1.7 }}>
            {t("pay_result_failed_sub")}
          </p>

          {errorMessage && (
            <div className="alert alert-error" style={{ marginBottom: 24, textAlign: "left" }}>
              <strong>{t("pay_result_error_detail")}</strong> {errorMessage}
            </div>
          )}

          <div style={{ background: "var(--secondary)", borderRadius: "var(--radius-md)", padding: "16px 20px", marginBottom: 28, textAlign: "left" }}>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-bold)", color: "var(--text-main)", marginBottom: 10 }}>
              {t("pay_result_reasons_title")}
            </div>
            {reasons.map(r => (
              <div key={r} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                <span style={{ color: "var(--primary)", flexShrink: 0 }}>•</span> {r}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {bookingId && (
              <button className="btn btn-primary btn-lg" style={{ flex: 2 }}
                onClick={() => navigate("payment", { bookingId })}>
                <CreditCard size={16} aria-hidden="true" /> {t("pay_result_retry")}
              </button>
            )}
            <button className="btn btn-secondary btn-lg" style={{ flex: 1 }}
              onClick={() => navigate("my-bookings")}>
              {t("pay_result_my_bookings")}
            </button>
          </div>
        </div>
      </div>

      <Footer navigate={navigate} />
    </div>
  );
}

export default function PaymentResultPage({ navigate, user, onLogout, variant }) {
  const location = useLocation();
  const state    = location.state;

  if (!state) return <Navigate to="/customer/bookings" replace />;

  const isSuccess = variant === "success";
  return isSuccess
    ? <SuccessPage navigate={navigate} user={user} onLogout={onLogout} state={state} />
    : <FailedPage  navigate={navigate} user={user} onLogout={onLogout} state={state} />;
}
