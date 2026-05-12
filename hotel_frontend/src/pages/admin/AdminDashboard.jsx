import { useState, useEffect } from "react";
import AdminLayout, { AP, Card } from "../../components/admin/AdminLayout";
import { adminService } from "../../services/adminService";
import Skeleton from "../../components/ui/Skeleton";
import "../../styles/pages/AdminDashboard.css";

function StatCard({ icon, label, value, color, sub, onClick }) {
  return (
    <div
      onClick={onClick}
      className="admin-dashboard-stat-card"
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div
        className="admin-dashboard-stat-icon"
        style={{
          background: `linear-gradient(135deg, ${color}22, ${color}11)`,
          border: `1px solid ${color}30`,
        }}
      >
        {icon}
      </div>
      <div className="admin-dashboard-stat-info">
        <div className="admin-dashboard-stat-value">
          {value !== null && value !== undefined ? value.toLocaleString() : "—"}
        </div>
        <div className="admin-dashboard-stat-label">{label}</div>
        {sub && <div className="admin-dashboard-stat-sub" style={{ color }}>{sub}</div>}
      </div>
      {onClick && <span className="admin-dashboard-stat-arrow">›</span>}
    </div>
  );
}

function QuickBtn({ icon, label, desc, onClick }) {
  return (
    <button onClick={onClick} className="admin-dashboard-quick-btn">
      <span className="admin-dashboard-quick-btn-icon">{icon}</span>
      <div>
        <div className="admin-dashboard-quick-btn-label">{label}</div>
        <div className="admin-dashboard-quick-btn-desc">{desc}</div>
      </div>
    </button>
  );
}

export default function AdminDashboard({ navigate, user, onLogout }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const STATS = [
  ];

  const QUICK = [
  ];

  return (
    <AdminLayout page="admin-dashboard" navigate={navigate} user={user} onLogout={onLogout}>
      {/* Welcome banner */}
      <div className="admin-dashboard-banner">
        <div className="admin-dashboard-banner-text">
          <div className="admin-dashboard-banner-greeting">
          </div>
          <h1 className="admin-dashboard-banner-title">
            VLU <span style={{ color: AP }}>Hotel Hub</span> — Admin
          </h1>
          <p className="admin-dashboard-banner-sub">
          </p>
        </div>
        <div className="admin-dashboard-banner-icon">🏨</div>
      </div>

      {/* Stats */}
      <div style={{ marginBottom: 8 }}>
        {loading ? (
          <div className="admin-dashboard-stats-grid">
            {STATS.map((_, i) => (
              <div key={i} className="admin-dashboard-skeleton-card">
                <Skeleton width="52px" height="52px" borderRadius="14px" />
                <div style={{ flex: 1 }}>
                  <Skeleton width="60%" height="28px" style={{ marginBottom: 8 }} />
                  <Skeleton width="40%" height="12px" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="admin-dashboard-stats-grid">
            {STATS.map(s => (
              <StatCard
                key={s.key}
                icon={s.icon}
                label={s.label}
                value={stats?.[s.key]}
                color={s.color}
                onClick={() => navigate(s.page)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick actions + System info */}
      <div className="admin-dashboard-two-col">
        <Card>
          <div className="admin-dashboard-quick-grid">
            {QUICK.map(q => (
              <QuickBtn key={q.page} icon={q.icon} label={q.label} desc={q.desc} onClick={() => navigate(q.page)} />
            ))}
          </div>
        </Card>

        <Card>
          {[
          ].map(([k, v]) => (
            <div key={k} className="admin-dashboard-sysinfo-row">
              <span className="admin-dashboard-sysinfo-key">{k}</span>
              <span className="admin-dashboard-sysinfo-val">{v}</span>
            </div>
          ))}

          <button onClick={() => navigate("home")} className="admin-dashboard-home-btn">
          </button>
        </Card>
      </div>

      {/* Partner feature map */}
      <Card>
        <div className="admin-dashboard-feature-grid">
          {[
            {
            },
            {
            },
            {
            },
            {
            },
            {
            },
            {
            },
          ].map(f => (
            <div key={f.title} 
              className="admin-dashboard-feature-card"
              style={{
                "--bg-base": `${f.color}06`,
                "--border-base": `${f.color}25`,
                "--bg-hover": `${f.color}10`,
                "--border-hover": `${f.color}50`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${f.color}18`, display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 20,
                }}>
                  {f.icon}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a" }}>{f.title}</div>
              </div>
              <ul style={{ margin: 0, padding: "0 0 0 18px", listStyle: "disc" }}>
                {f.items.map(it => (
                  <li key={it} style={{ fontSize: 12, color: "#555", marginBottom: 4, lineHeight: 1.5 }}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </AdminLayout>
  );
}
