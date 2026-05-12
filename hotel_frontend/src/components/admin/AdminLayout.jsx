import { useState } from "react";
import {
  LayoutDashboard, Users, Handshake, Building2,
  ClipboardList, CircleDollarSign, Settings, Home, LogOut,
  Menu, Search, Star, ChevronDown, UserPlus
} from "lucide-react";
import { LOGO_IMG } from "../auth/AuthShared";
import "../../layouts/admin/AdminLayout.css";

// ── Brand colours ────────────────────────────────────────────────────
export const AP = "#BE1E2E";
const SIDEBAR_BG   = "#EFD6D6";
const SIDEBAR_HVR  = "rgba(190,30,46,0.09)";
const SIDEBAR_ACT  = AP;
const SIDEBAR_TEXT = "#5a1a22";
const SIDEBAR_DIV  = "rgba(190,30,46,0.14)";

const NAV = [
  {
    key: "admin-users-group",
    icon: <Users size={18} />,
    children: [
    ],
  },
];
  const initialOpen = NAV
    .filter(item => item.children?.some(c => c.key === page))
    .map(item => item.key);
  const [expanded, setExpanded] = useState(initialOpen);

  const toggleGroup = key =>
    setExpanded(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  return (
    <>
      {open && <div className="admin-sidebar-overlay" onClick={onClose} />}

      <aside className={`admin-sidebar${open ? " open" : ""}`}>
        {/* Logo */}
        <div className="admin-sidebar-logo">
          <div className="admin-sidebar-logo-box">
            <img src={LOGO_IMG} alt="VLU Hotel Hub" />
          </div>
        </div>

        {/* Nav */}
        <nav className="admin-sidebar-nav">
          {NAV.map(item => {
            if (item.children) {
              const isOpen    = expanded.includes(item.key);
              const hasActive = item.children.some(c => c.key === page);
              return (
                <div key={item.key} style={{ marginBottom: 2 }}>
                  <button
                    onClick={() => toggleGroup(item.key)}
                    className={`admin-nav-btn${hasActive ? " active" : ""}`}
                  >
                    <span className="admin-nav-icon">{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    <span className={`admin-nav-chevron ${isOpen ? "open" : "closed"}`}>
                      <ChevronDown size={15} />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="admin-nav-children">
                      {item.children.map(child => {
                        const childActive = page === child.key;
                        return (
                          <button
                            key={child.key}
                            onClick={() => { navigate(child.key); onClose?.(); }}
                            className={`admin-nav-btn-child${childActive ? " active" : ""}`}
                          >
                            <span className="admin-nav-icon-sm">{child.icon}</span>
                            {child.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = page === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { navigate(item.key); onClose?.(); }}
                className={`admin-nav-btn${isActive ? " active" : ""}`}
              >
                <span className="admin-nav-icon">{item.icon}</span>
                {item.label}
              </button>
            );
          })}

          {/* Back to home */}
          <div className="admin-nav-divider">
            <button onClick={() => navigate("home")} className="admin-nav-home-btn">
              <span className="admin-nav-icon"><Home size={18} /></span>
            </button>
          </div>
        </nav>

        {/* User info */}
        <div className="admin-sidebar-user">
          <div className="admin-sidebar-user-row">
            <div className="admin-sidebar-avatar">
              {user?.email?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="admin-sidebar-user-info">
              <div className="admin-sidebar-user-email">{user?.email || "admin"}</div>
            </div>
          </div>
          <button onClick={onLogout} className="admin-sidebar-logout-btn">
          </button>
        </div>
      </aside>
    </>
  );
}

// ── Main layout ───────────────────────────────────────────────────────
export default function AdminLayout({ page, navigate, user, onLogout, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-root">
      <Sidebar
        page={page} navigate={navigate} user={user} onLogout={onLogout}
        open={mobileOpen} onClose={() => setMobileOpen(false)}
      />

      <div className="admin-content-area">
        {/* Top bar */}
        <div className="admin-topbar">
          <button
            onClick={() => setMobileOpen(true)}
            className="admin-menu-btn"
            aria-label="Mở menu"
          >
            <Menu size={20} color={AP} />
          </button>
          <div className="admin-topbar-breadcrumb">
            <span className="admin-topbar-sep">/</span>
            <span className="admin-topbar-title">{PAGE_TITLES[page] || page}</span>
          </div>
        </div>

        {/* Page content */}
        <main className="admin-main">
          {children}
        </main>
      </div>
    </div>
  );
}

// ── Shared UI primitives ──────────────────────────────────────────────

export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a", margin: 0, userSelect: "none", cursor: "default" }}>{title}</h1>
        {subtitle && <p style={{ color: "#888", fontSize: 13, marginTop: 4, marginBottom: 0 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "rgba(255, 255, 255, 0.9)", borderRadius: 14, padding: "22px 26px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.03)",
      backdropFilter: "blur(10px)",
      ...style,
    }}>
      {children}
    </div>
  );
}

const BADGE_MAP = {
  ACTIVE:          { bg: "#e8f5e9", color: "#2e7d32",  label: "Hoạt động"      },
  LOCKED:          { bg: "#ffebee", color: "#c62828",  label: "Bị khóa"        },
  INACTIVE:        { bg: "#fafafa", color: "#888",      label: "Vô hiệu"       },
  DISABLED:        { bg: "#fafafa", color: "#888",      label: "Vô hiệu"       },
  CONFIRMED:       { bg: "#e3f2fd", color: "#1565c0",  label: "Đã xác nhận"   },
  PENDING_PAYMENT: { bg: "#fff3e0", color: "#e65100",  label: "Chờ thanh toán" },
  CANCELLED:       { bg: "#f5f5f5", color: "#616161",  label: "Đã hủy"        },
  COMPLETED:       { bg: "#e8f5e9", color: "#2e7d32",  label: "Hoàn thành"    },
  PENDING:         { bg: "#fff8e1", color: "#f57f17",  label: "Chờ duyệt"     },
  SUBMITTED:       { bg: "#fff8e1", color: "#f57f17",  label: "Chờ duyệt"     },
  UNDER_REVIEW:    { bg: "#e3f2fd", color: "#1565c0",  label: "Đang xem xét"  },
  APPROVED:        { bg: "#e8f5e9", color: "#2e7d32",  label: "Đã duyệt"      },
  REJECTED:        { bg: "#ffebee", color: "#c62828",  label: "Từ chối"       },
  HIGH:            { bg: "#ffebee", color: "#c62828",  label: "Cao"            },
  MEDIUM:          { bg: "#fff3e0", color: "#e65100",  label: "Trung bình"    },
  LOW:             { bg: "#e8f5e9", color: "#2e7d32",  label: "Thấp"          },
  CUSTOMER:        { bg: "#e3f2fd", color: "#1565c0",  label: "Khách hàng"    },
  PARTNER:         { bg: "#f3e5f5", color: "#6a1b9a",  label: "Đối tác"       },
  ADMIN:           { bg: "#fce4ec", color: "#880e4f",  label: "Admin"         },
};

export function Badge({ status }) {
  const s = BADGE_MAP[status] || { bg: "#f5f5f5", color: "#555", label: status };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 20,
      background: s.bg, color: s.color, fontSize: 11, fontWeight: 700,
    }}>
      {s.label}
    </span>
  );
}

export function Btn({ children, onClick, variant = "primary", disabled = false, small = false, loading = false, style: extraStyle = {} }) {
  const [hov, setHov] = useState(false);
  const active = hov && !disabled && !loading;

  const styles = {
    primary:   { background: active ? "#a31825" : AP, color: "#fff", border: "none", boxShadow: active ? "0 4px 12px rgba(163, 24, 37, 0.3)" : "none" },
    secondary: { background: active ? "#f0f0f5" : "#fff", color: "#333", border: "1px solid #ddd" },
    danger:    { background: active ? "#c62828" : "#ffebee", color: active ? "#fff" : "#c62828", border: active ? "none" : "1px solid #ffcdd2" },
    success:   { background: active ? "#2e7d32" : "#e8f5e9", color: active ? "#fff" : "#2e7d32", border: active ? "none" : "1px solid #c8e6c9" },
    ghost:     { background: active ? "#f5f5f5" : "transparent", color: active ? AP : "#666", border: active ? "1px solid #ddd" : "1px solid transparent" },
    action:    { background: active ? AP : "#F7F7F7", color: active ? "#fff" : "#1a1a1a", border: "none" },
  };
  
  const s = styles[variant] || styles.primary;
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...s, padding: small ? "5px 14px" : "10px 24px",
        borderRadius: 10, cursor: (disabled || loading) ? "not-allowed" : "pointer",
        fontSize: small ? 12 : 13, fontWeight: 700,
        opacity: (disabled || loading) ? 0.6 : 1, 
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        transform: active ? "translateY(-1px)" : "none",
        fontFamily: "inherit",
        ...extraStyle,
      }}
    >
      {loading && (
        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      )}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      {children}
    </button>
  );
}

export function SearchInput({ value, onChange, placeholder = "Tìm kiếm..." }) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#aaa", display: "flex" }}><Search size={16} /></span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: "9px 14px 9px 36px", borderRadius: 9, border: "1px solid #e5e5e5",
          fontSize: 13, outline: "none", width: 260, background: "#f8f9fa",
          transition: "border-color 0.15s",
        }}
        onFocus={e => e.target.style.borderColor = AP}
        onBlur={e => e.target.style.borderColor = "#e5e5e5"}
      />
    </div>
  );
}

export function Table({ headers, rows, empty = "Không có dữ liệu" }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #f0f0f0" }}>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: "11px 14px", textAlign: "left", fontWeight: 700,
                color: "#555", whiteSpace: "nowrap", fontSize: 12, letterSpacing: 0.3,
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? (
              <tr>
                <td colSpan={headers.length} style={{ textAlign: "center", padding: "48px 0", color: "#bbb" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                  <div style={{ fontSize: 13 }}>{empty}</div>
                </td>
              </tr>
            )
            : rows.map((row, i) => (
              <tr
                key={i}
                style={{ borderBottom: "1px solid #f5f5f5", transition: "background 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                onMouseLeave={e => e.currentTarget.style.background = ""}
              >
                {row.map((cell, j) => (
                  <td key={j} style={{ padding: "12px 14px", color: "#333", verticalAlign: "middle" }}>{cell}</td>
                ))}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ title, children, onClose, width = 460 }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "28px 30px",
        width, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1a1a1a", userSelect: "none", cursor: "default" }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: "#f5f5f5", border: "none", width: 30, height: 30,
              borderRadius: "50%", fontSize: 16, cursor: "pointer", color: "#666",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormField({ label, children, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 5, letterSpacing: 0.2 }}>
        {label}{required && <span style={{ color: AP, marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export function Input({ value, onChange, type = "text", placeholder, disabled }) {
  return (
    <input
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%", padding: "9px 12px", borderRadius: 8,
        border: "1px solid #e0e0e0", fontSize: 13, boxSizing: "border-box",
        background: disabled ? "#f5f5f5" : "#fff", outline: "none",
        transition: "border-color 0.15s",
      }}
      onFocus={e => e.target.style.borderColor = AP}
      onBlur={e => e.target.style.borderColor = "#e0e0e0"}
    />
  );
}

export function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        width: "100%", padding: "9px 12px", borderRadius: 8,
        border: "1px solid #e0e0e0", fontSize: 13, background: "#fff", outline: "none",
        cursor: "pointer",
      }}
    >
      {children}
    </select>
  );
}
