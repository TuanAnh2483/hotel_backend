import { Check } from "lucide-react";
import { useLang } from "../../contexts/LanguageContext";
import { C } from "../../lib/constants";

/**
 * Stepper 4 bước dùng chung cho BookingPage và PaymentPage.
 * current: index 0-based của bước đang active (0=Chọn phòng, 1=Xác nhận, 2=Thanh toán, 3=Hoàn tất).
 * darkMode: true khi stepper nằm trên nền tối (PaymentPage header).
 */
export default function BookingStepper({ current, darkMode = false }) {
  const { t } = useLang();
  const steps = [t("step_room"), t("step_confirm"), t("step_payment"), t("step_done")];

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
      {steps.map((label, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800,
                background: active ? C.primary : done ? "#10b981" : darkMode ? "rgba(255,255,255,0.12)" : "#e8e8e8",
                color: (active || done || darkMode) ? "#fff" : "#bbb",
                border: (!active && !done && darkMode) ? "1px solid rgba(255,255,255,0.2)" : "none",
                boxShadow: active ? `0 0 0 4px ${C.primary}33` : "none",
                flexShrink: 0,
              }}>
                {done ? <Check size={14} strokeWidth={3} /> : i + 1}
              </div>
              <span style={{
                fontSize: 13,
                fontWeight: active ? 800 : 600,
                color: active
                  ? (darkMode ? "#fff" : C.primary)
                  : done
                    ? (darkMode ? "#10b981" : "#555")
                    : (darkMode ? "rgba(255,255,255,0.4)" : "#bbb"),
              }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width: 36, height: 2, borderRadius: 2,
                background: done ? "#10b981" : darkMode ? "rgba(255,255,255,0.1)" : "#e8e8e8",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
