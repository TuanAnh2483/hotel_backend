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
    { icon: "👥", label: "Khách hàng",       key: "totalUsers",     color: "#4361ee", page: "admin-users"    },
    { icon: "🤝", label: "Đối tác",           key: "totalPartners",  color: "#7209b7", page: "admin-partners" },
    { icon: "🏨", label: "Khách sạn",         key: "totalHotels",    color: AP,        page: "admin-hotels"   },
    { icon: "📋", label: "Tổng đặt phòng",    key: "totalBookings",  color: "#4cc9f0", page: "admin-bookings" },
    { icon: "⏳", label: "Chờ thanh toán",    key: "pendingBookings",color: "#f72585", page: "admin-bookings" },
  ];

  const QUICK = [
    { icon: "🤝", label: "Duyệt đối tác",     desc: "Xem các đơn đăng ký mới",    page: "admin-partners" },
    { icon: "👥", label: "Quản lý người dùng", desc: "Xem, khoá, kích hoạt tài khoản", page: "admin-users" },
    { icon: "🏨", label: "Quản lý khách sạn",  desc: "Thêm, sửa thông tin khách sạn",  page: "admin-hotels" },
    { icon: "📋", label: "Đặt phòng",          desc: "Theo dõi giao dịch đặt phòng",   page: "admin-bookings" },
    { icon: "💰", label: "Hoàn tiền",          desc: "Xử lý các yêu cầu hoàn tiền",    page: "admin-refunds" },
    { icon: "⚙️", label: "Hệ thống",          desc: "Kiểm tra trạng thái hệ thống",    page: "admin-system" },
  ];

  return (
    <AdminLayout page="admin-dashboard" navigate={navigate} user={user} onLogout={onLogout}>
      {/* Welcome banner */}
      <div className="admin-dashboard-banner">
        <div className="admin-dashboard-banner-text">
          <div className="admin-dashboard-banner-greeting">
            Xin chào, {user?.email || "Admin"} 👋
          </div>
          <h1 className="admin-dashboard-banner-title">
            VLU <span style={{ color: AP }}>Hotel Hub</span> — Admin
          </h1>
          <p className="admin-dashboard-banner-sub">
            Quản lý toàn bộ hệ thống khách sạn tại một nơi
          </p>
        </div>
        <div className="admin-dashboard-banner-icon">🏨</div>
      </div>

      {/* Stats */}
      <div style={{ marginBottom: 8 }}>
        <h2 className="admin-dashboard-section-title">Tổng quan hệ thống</h2>
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
          <h3 className="admin-dashboard-section-title">Truy cập nhanh</h3>
          <div className="admin-dashboard-quick-grid">
            {QUICK.map(q => (
              <QuickBtn key={q.page} icon={q.icon} label={q.label} desc={q.desc} onClick={() => navigate(q.page)} />
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="admin-dashboard-section-title">Thông tin hệ thống</h3>
          {[
            ["🔖 Phiên bản",    "1.0.0"],
            ["🌐 Môi trường",   "Development"],
            ["⚙️ Backend",      "Spring Boot"],
            ["🗄️ Database",    "PostgreSQL"],
            ["🔐 JWT Expiry",   "24 giờ"],
            ["📅 Ngày hiện tại", new Date().toLocaleDateString("vi-VN")],
          ].map(([k, v]) => (
            <div key={k} className="admin-dashboard-sysinfo-row">
              <span className="admin-dashboard-sysinfo-key">{k}</span>
              <span className="admin-dashboard-sysinfo-val">{v}</span>
            </div>
          ))}

          <button onClick={() => navigate("home")} className="admin-dashboard-home-btn">
            🏠 Về trang chủ
          </button>
        </Card>
      </div>

      {/* Partner feature map */}
      <Card>
        <h3 className="admin-dashboard-section-title" style={{ marginBottom: 6 }}>Tính năng dành cho đối tác</h3>
        <p style={{ fontSize: 12, color: "#aaa", margin: "0 0 18px" }}>Tổng quan các nhóm chức năng mà đối tác có thể sử dụng trong hệ thống</p>
        <div className="admin-dashboard-feature-grid">
          {[
            {
              icon: "🏨", color: "#4361ee", title: "Quản lý khách sạn",
              items: ["Tạo khách sạn mới", "Cập nhật thông tin", "Xem danh sách khách sạn"],
            },
            {
              icon: "🛏️", color: "#7209b7", title: "Quản lý loại phòng",
              items: ["Tạo loại phòng", "Cập nhật loại phòng", "Xem danh sách phòng"],
            },
            {
              icon: "💰", color: "#e65100", title: "Giá & Số lượng phòng",
              items: ["Thiết lập giá theo ngày", "Thiết lập số phòng trống", "Quản lý theo lịch"],
            },
            {
              icon: "⭐", color: "#f59e0b", title: "Đánh giá khách sạn",
              items: ["Xem danh sách đánh giá", "Phản hồi đánh giá", "Theo dõi điểm TB"],
            },
            {
              icon: "📊", color: "#2e7d32", title: "Thống kê & Báo cáo",
              items: ["Danh sách booking", "Thống kê doanh thu", "Biểu đồ theo tháng"],
            },
            {
              icon: "🤖", color: "#c62828", title: "AI Dự báo & Tối ưu giá",
              items: ["Dự báo nhu cầu theo ngày", "Gợi ý giá tối ưu", "Phân tích xu hướng"],
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
