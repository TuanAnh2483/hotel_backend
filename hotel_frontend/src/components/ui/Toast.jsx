import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

const TYPE_STYLES = {
  success: { bg: "#ecfdf5", border: "#10b981", color: "#065f46", icon: <CheckCircle size={18} /> },
  error:   { bg: "#fef2f2", border: "#ef4444", color: "#991b1b", icon: <XCircle size={18} /> },
  info:    { bg: "#eff6ff", border: "#3b82f6", color: "#1e40af", icon: <Info size={18} /> },
  warning: { bg: "#fffbeb", border: "#f59e0b", color: "#92400e", icon: <AlertTriangle size={18} /> },
};

export default function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 12,
      pointerEvents: "none",
    }}>
      {toasts.map(t => {
        const s = TYPE_STYLES[t.type] || TYPE_STYLES.info;
        return (
          <div
            key={t.id}
            style={{
              pointerEvents: "auto",
              minWidth: 280, maxWidth: 420,
              background: s.bg, borderLeft: `4px solid ${s.border}`,
              borderRadius: 8, padding: "12px 16px",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
              display: "flex", alignItems: "flex-start", gap: 12,
              animation: "toast-in 0.3s ease-out forwards",
            }}
          >
            <div style={{ color: s.border, marginTop: 2 }}>{s.icon}</div>
            <div style={{ flex: 1, fontSize: 14, color: s.color, fontWeight: 500, lineHeight: 1.4 }}>
              {t.message}
            </div>
            <button
              onClick={() => onRemove(t.id)}
              style={{
                background: "none", border: "none", padding: 4, cursor: "pointer",
                color: "#9ca3af", display: "flex", borderRadius: 4,
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes toast-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
