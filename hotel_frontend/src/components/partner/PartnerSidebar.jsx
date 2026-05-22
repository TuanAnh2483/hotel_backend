import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, BedDouble, CalendarDays,
  BookOpen, Star, TrendingUp, Sparkles, Plus,
  ChevronRight, User, LogOut,
} from "lucide-react";
import { useMyHotels, usePartnerReviews, usePartnerBookings } from "../../hooks/usePartnerQueries";
import { useAuth } from "../../contexts/AuthContext";
import { getPropertyGroup, getGroupColor, getTypeLabel } from "../../utils/propertyGroupUtils";
import { useLang } from "../../contexts/LanguageContext";

const HOTEL_LIKE = ["HOTEL", "RESORT", "HOSTEL"];

function NavItem({ icon: Icon, label, path, active, badge, navigate }) {
  return (
    <button
      onClick={() => navigate(path)}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "9px 12px", borderRadius: 10, border: "none", cursor: "pointer",
        background: active ? "#BE1E2E" : "transparent",
        color: active ? "#fff" : "#94a3b8",
        fontWeight: active ? 700 : 500, fontSize: 13,
        transition: "all 0.15s", textAlign: "left",
        position: "relative",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <Icon size={16} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge > 0 && (
        <span style={{
          background: active ? "rgba(255,255,255,0.3)" : "#BE1E2E",
          color: "#fff", borderRadius: 10, padding: "1px 7px",
          fontSize: 11, fontWeight: 800, minWidth: 18, textAlign: "center",
        }}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

export default function PartnerSidebar({ selectedHotelId, onSelectHotel }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { lang } = useLang();

  const { data: hotels = [] } = useMyHotels();
  const { data: reviewsData = [] } = usePartnerReviews({ hasReply: "false" });
  const unrepliedCount = Array.isArray(reviewsData) ? reviewsData.length : 0;

  const { data: bookingsPage } = usePartnerBookings({ status: "CONFIRMED", size: 1 });
  const pendingBookings = bookingsPage?.totalItems ?? 0;

  const selectedHotel = hotels.find(h => h.id === selectedHotelId) || hotels[0];
  const hotelType = selectedHotel?.hotelType || "HOTEL";
  const group = getPropertyGroup(hotelType);
  const showRoomTypes = HOTEL_LIKE.includes(hotelType);

  const isActive = (path) => {
    if (path === "/partner") return pathname === "/partner";
    return pathname.startsWith(path);
  };

  const sectionLabel = { fontSize: 10, fontWeight: 800, color: "#475569", letterSpacing: 1, padding: "16px 12px 6px", textTransform: "uppercase" };

  return (
    <aside style={{
      width: 240, flexShrink: 0, background: "#0f172a",
      display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0,
      borderRight: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#BE1E2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Building2 size={18} color="#fff" />
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>Hotel Hub</div>
            <div style={{ color: "#64748b", fontSize: 11 }}>Partner Portal</div>
          </div>
        </div>
      </div>

      {/* Tầng 1: Property list */}
      <div style={{ padding: "0 8px", borderBottom: "1px solid rgba(255,255,255,0.06)", maxHeight: 220, overflowY: "auto" }}>
        <div style={sectionLabel}>Cơ sở lưu trú</div>
        {hotels.map(hotel => {
          const color = getGroupColor(hotel.hotelType);
          const isSelected = selectedHotelId ? hotel.id === selectedHotelId : hotel === hotels[0];
          return (
            <button
              key={hotel.id}
              onClick={() => onSelectHotel(hotel.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "8px 10px", borderRadius: 10, border: "none", cursor: "pointer",
                background: isSelected ? "rgba(190,30,46,0.15)" : "transparent",
                transition: "all 0.15s", textAlign: "left", marginBottom: 2,
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: isSelected ? "#fff" : "#cbd5e1", fontSize: 13, fontWeight: isSelected ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {hotel.name}
                </div>
                <div style={{ color: "#475569", fontSize: 11 }}>{getTypeLabel(hotel.hotelType, lang)}</div>
              </div>
              {isSelected && <ChevronRight size={12} color="#BE1E2E" />}
            </button>
          );
        })}

        <button
          onClick={() => navigate("/partner/add-property")}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "8px 10px", borderRadius: 10, border: "1px dashed rgba(255,255,255,0.12)",
            cursor: "pointer", background: "transparent", color: "#64748b",
            fontSize: 12, fontWeight: 600, marginBottom: 10, marginTop: 4,
          }}
        >
          <Plus size={13} /> Thêm cơ sở mới
        </button>
      </div>

      {/* Tầng 2: Feature menu */}
      <nav style={{ flex: 1, padding: "0 8px", overflowY: "auto" }}>
        <div style={sectionLabel}>Quản lý</div>
        <NavItem icon={LayoutDashboard} label="Tổng quan"         path="/partner"          active={isActive("/partner")}          navigate={navigate} />
        <NavItem icon={Building2}      label="Cơ sở của tôi"      path="/partner/hotels"   active={isActive("/partner/hotels")}   navigate={navigate} />
        {showRoomTypes && (
          <NavItem icon={BedDouble}    label="Loại phòng"          path="/partner/rooms"    active={isActive("/partner/rooms")}    navigate={navigate} />
        )}
        <NavItem icon={CalendarDays}   label="Lịch & Vận hành"    path="/partner/calendar" active={isActive("/partner/calendar")} navigate={navigate} />
        <NavItem icon={BookOpen}       label="Booking"             path="/partner/bookings" active={isActive("/partner/bookings")} navigate={navigate} badge={pendingBookings} />

        <div style={sectionLabel}>Phân tích</div>
        <NavItem icon={Star}           label="Đánh giá"            path="/partner/reviews"  active={isActive("/partner/reviews")}  navigate={navigate} badge={unrepliedCount} />
        <NavItem icon={TrendingUp}     label="Doanh thu"           path="/partner/revenue"  active={isActive("/partner/revenue")}  navigate={navigate} />
        <NavItem icon={Sparkles}       label="AI Dự báo"           path="/partner/forecast" active={isActive("/partner/forecast")} navigate={navigate} />
      </nav>

      {/* Tầng 3: User info */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => navigate("/profile")}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            background: "transparent", border: "none", cursor: "pointer",
            padding: "6px 6px", borderRadius: 10, textAlign: "left",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          title="Xem hồ sơ"
        >
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#BE1E2E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
            {(user?.displayName || user?.email || "P")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.displayName || user?.email}
            </div>
            <div style={{ color: "#475569", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
              <User size={10} /> Partner
            </div>
          </div>
        </button>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <button
            onClick={() => navigate("/profile")}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
              background: "transparent", color: "#94a3b8", fontSize: 12, fontWeight: 600, cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#e2e8f0"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
          >
            <User size={13} /> Hồ sơ
          </button>
          <button
            onClick={logout}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)",
              background: "transparent", color: "#f87171", fontSize: 12, fontWeight: 600, cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#fca5a5"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#f87171"; }}
          >
            <LogOut size={13} /> Đăng xuất
          </button>
        </div>
      </div>
    </aside>
  );
}