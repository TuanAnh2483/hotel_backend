import { useState } from "react";
import { C } from "../components/auth/AuthShared";
import MainNavbar from "../components/MainNavbar";
import Footer from "../components/Footer";
import { getToken } from "../services/authService";
import "../styles/pages/BecomePartnerPage.css";

async function onboardingFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message || json.message || `HTTP ${res.status}`);
  return json.data ?? json;
}

function StepIndicator({ current }) {
  return (
    <div className="bp-stepper">
        const done   = i < current;
        const active = i === current;
        return (
          <div key={i} className="bp-step">
            <div className="bp-step-col">
              <div
                className="bp-step-circle"
                style={{
                  background: done || active ? C.primary : "#e5e7eb",
                  color: done || active ? "#fff" : "#9ca3af",
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className="bp-step-label"
                style={{
                  fontWeight: active ? 700 : 400,
                  color: active ? C.primary : done ? "#374151" : "#9ca3af",
                }}
              >
                {label}
              </span>
            </div>
              <div
                className="bp-step-connector"
                style={{ background: done ? C.primary : "#e5e7eb" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, required, children, hint }) {
  return (
    <div className="bp-field">
      <label className="bp-field-label">{label}{required && " *"}</label>
      {children}
      {hint && <div className="bp-field-hint">{hint}</div>}
    </div>
  );
}

export default function BecomePartnerPage({ navigate, user, onLogout }) {
  const [step, setStep]       = useState(0);
  const [form, setForm]       = useState({ businessName: "", email: user?.email || "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [appId, setAppId]     = useState(null);

  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  if (!user) {
    return (
      <div className="bp-root-auth">
        <MainNavbar active="become-partner" navigate={navigate} user={user} onLogout={onLogout} />
        <div className="bp-login-gate">
          <div className="bp-login-icon">🏨</div>
        </div>
      </div>
    );
  }

  async function handleStartAndSubmit() {
    setError("");
    if (!form.businessName.trim() || !form.email.trim() || !form.phone.trim()) {
      return;
    }
    if (form.phone.length < 8 || form.phone.length > 10) {
      return;
    }
    setLoading(true);
    try {
      const app = await onboardingFetch("/api/partner-onboarding/start", {
        method: "POST",
        body: JSON.stringify({ businessName: form.businessName, email: form.email, phone: form.phone }),
      });
      const id = app.applicationId || app.id;
      await onboardingFetch(`/api/partner-onboarding/${id}/submit`, { method: "POST" });
      setAppId(id);
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bp-root">
      <MainNavbar active="become-partner" navigate={navigate} user={user} onLogout={onLogout} />

      {/* Hero */}
      <div className="bp-hero">
        <div className="bp-hero-icon">🏨</div>
      </div>

      <div className="bp-content">
        <StepIndicator current={step} />

        {/* Step 0 — Fill form */}
        {step === 0 && (
          <div className="bp-card">

            </Field>

              <input className="bp-input" type="email" value={form.email} onChange={upd("email")} placeholder="business@example.com" />
            </Field>

            </Field>

            {error && <div className="bp-error-alert">{error}</div>}

            <div className="bp-form-actions">
              <button
                className="bp-next-btn"
                onClick={() => {
                  if (!form.businessName.trim() || !form.email.trim() || !form.phone.trim()) {
                    return;
                  }
                  setError("");
                  setStep(1);
                }}
              >
              </button>
            </div>
          </div>
        )}

        {/* Step 1 — Confirm */}
        {step === 1 && (
          <div className="bp-card">

            {[
            ].map(({ label, value }) => (
              <div key={label} className="bp-review-row">
                <span className="bp-review-key">{label}</span>
                <span className="bp-review-val">{value}</span>
              </div>
            ))}


            {error && (
              <div className="bp-error-alert" style={{ marginTop: 16, marginBottom: 0 }}>{error}</div>
            )}

            <div className="bp-confirm-actions">
              <button
                className="bp-submit-btn"
                onClick={handleStartAndSubmit}
                disabled={loading}
                style={{ background: loading ? "#ccc" : C.primary, cursor: loading ? "not-allowed" : "pointer" }}
              >
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Success */}
        {step === 2 && (
          <div className="bp-card bp-card-success">
            <div className="bp-success-icon">🎉</div>
            <p className="bp-success-desc">
            </p>

            <div className="bp-success-id-box">
              <div className="bp-success-id-val">#{appId || "—"}</div>
            </div>

          </div>
        )}

        {/* Benefits */}
        {step === 0 && (
          <div className="bp-benefits">
            <div className="bp-benefits-grid">
                  <div className="bp-benefit-icon">{b.icon}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer navigate={navigate} />
    </div>
  );
}
