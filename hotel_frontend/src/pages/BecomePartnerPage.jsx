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

const STEPS = ["Thông tin kinh doanh", "Xác nhận", "Hoàn tất"];

function StepIndicator({ current }) {
  return (
    <div className="bp-stepper">
      {STEPS.map((label, i) => {
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
            {i < STEPS.length - 1 && (
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
        <MainNavbar active="home" navigate={navigate} user={user} onLogout={onLogout} />
        <div className="bp-login-gate">
          <div className="bp-login-icon">🏨</div>
          <h2 className="bp-login-title">Đăng nhập để tiếp tục</h2>
          <p className="bp-login-desc">Bạn cần đăng nhập bằng tài khoản Khách hàng để đăng ký làm đối tác.</p>
          <button className="bp-login-btn" onClick={() => navigate("login")}>Đăng nhập</button>
        </div>
      </div>
    );
  }

  async function handleStartAndSubmit() {
    setError("");
    if (!form.businessName.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Vui lòng điền đầy đủ tất cả các trường bắt buộc.");
      return;
    }
    if (form.phone.length < 8 || form.phone.length > 10) {
      setError("Số điện thoại phải từ 8 đến 10 ký tự.");
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
      <MainNavbar active="home" navigate={navigate} user={user} onLogout={onLogout} />

      {/* Hero */}
      <div className="bp-hero">
        <div className="bp-hero-icon">🏨</div>
        <h1 className="bp-hero-title">Đăng ký làm Đối tác</h1>
        <p className="bp-hero-subtitle">
          Tham gia mạng lưới đối tác VLU HotelHub và bắt đầu nhận đặt phòng từ hàng nghìn khách du lịch.
        </p>
      </div>

      <div className="bp-content">
        <StepIndicator current={step} />

        {/* Step 0 — Fill form */}
        {step === 0 && (
          <div className="bp-card">
            <h2 className="bp-card-title">Thông tin doanh nghiệp</h2>
            <p className="bp-card-subtitle">Điền thông tin để bắt đầu quá trình đăng ký làm đối tác</p>

            <Field label="Tên doanh nghiệp / khách sạn" required hint="Tên này sẽ hiển thị trên hệ thống quản lý">
              <input className="bp-input" value={form.businessName} onChange={upd("businessName")} placeholder="Ví dụ: Grand Palace Hotel & Resort" />
            </Field>

            <Field label="Email liên hệ" required hint="Chúng tôi sẽ gửi thông báo và cập nhật qua email này">
              <input className="bp-input" type="email" value={form.email} onChange={upd("email")} placeholder="business@example.com" />
            </Field>

            <Field label="Số điện thoại liên hệ" required hint="Từ 8 đến 10 chữ số">
              <input className="bp-input" value={form.phone} onChange={upd("phone")} placeholder="0912345678" maxLength={10} />
            </Field>

            {error && <div className="bp-error-alert">{error}</div>}

            <div className="bp-form-actions">
              <button className="bp-back-btn" onClick={() => navigate("home")}>← Quay lại</button>
              <button
                className="bp-next-btn"
                onClick={() => {
                  if (!form.businessName.trim() || !form.email.trim() || !form.phone.trim()) {
                    setError("Vui lòng điền đầy đủ tất cả các trường bắt buộc.");
                    return;
                  }
                  setError("");
                  setStep(1);
                }}
              >
                Tiếp theo →
              </button>
            </div>
          </div>
        )}

        {/* Step 1 — Confirm */}
        {step === 1 && (
          <div className="bp-card">
            <h2 className="bp-card-title">Xác nhận thông tin</h2>
            <p className="bp-card-subtitle">Kiểm tra lại thông tin trước khi gửi đơn đăng ký</p>

            {[
              { label: "Tên doanh nghiệp", value: form.businessName },
              { label: "Email liên hệ",    value: form.email },
              { label: "Số điện thoại",    value: form.phone },
            ].map(({ label, value }) => (
              <div key={label} className="bp-review-row">
                <span className="bp-review-key">{label}</span>
                <span className="bp-review-val">{value}</span>
              </div>
            ))}

            <div className="bp-success-note">
              ✅ Sau khi gửi, đơn đăng ký sẽ được Admin xem xét trong vòng 1–3 ngày làm việc.
            </div>

            {error && (
              <div className="bp-error-alert" style={{ marginTop: 16, marginBottom: 0 }}>{error}</div>
            )}

            <div className="bp-confirm-actions">
              <button className="bp-edit-btn" onClick={() => { setStep(0); setError(""); }}>← Chỉnh sửa</button>
              <button
                className="bp-submit-btn"
                onClick={handleStartAndSubmit}
                disabled={loading}
                style={{ background: loading ? "#ccc" : C.primary, cursor: loading ? "not-allowed" : "pointer" }}
              >
                {loading ? "Đang gửi đơn..." : "Gửi đơn đăng ký"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Success */}
        {step === 2 && (
          <div className="bp-card bp-card-success">
            <div className="bp-success-icon">🎉</div>
            <h2 className="bp-success-title">Đơn đăng ký đã được gửi!</h2>
            <p className="bp-success-desc">
              Cảm ơn bạn đã đăng ký làm đối tác VLU HotelHub. Đơn đăng ký của bạn đang được xem xét.
              Chúng tôi sẽ liên hệ qua email <strong style={{ color: "#1a1a1a" }}>{form.email}</strong> trong vòng 1–3 ngày làm việc.
            </p>

            <div className="bp-success-id-box">
              <div className="bp-success-id-label">Mã hồ sơ của bạn</div>
              <div className="bp-success-id-val">#{appId || "—"}</div>
            </div>

            <button className="bp-home-btn" onClick={() => navigate("home")}>Về trang chủ</button>
          </div>
        )}

        {/* Benefits */}
        {step === 0 && (
          <div className="bp-benefits">
            <h3 className="bp-benefits-title">Lợi ích khi trở thành đối tác</h3>
            <div className="bp-benefits-grid">
              {[
                { icon: "📊", title: "Quản lý thông minh", desc: "Dashboard tập trung, báo cáo doanh thu chi tiết" },
                { icon: "🌐", title: "Tiếp cận rộng",      desc: "Hàng nghìn khách du lịch tìm kiếm mỗi ngày" },
                { icon: "💰", title: "Tối ưu doanh thu",   desc: "Công cụ dự báo AI và chiến lược giá linh hoạt" },
                { icon: "🛡️", title: "An toàn & Bảo mật", desc: "Xác thực danh tính, hợp đồng minh bạch" },
              ].map(b => (
                <div key={b.title} className="bp-benefit-card">
                  <div className="bp-benefit-icon">{b.icon}</div>
                  <div className="bp-benefit-title">{b.title}</div>
                  <div className="bp-benefit-desc">{b.desc}</div>
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
