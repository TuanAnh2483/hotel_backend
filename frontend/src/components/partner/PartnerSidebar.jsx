import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, BedDouble, CalendarDays,
  BookOpen, Star, TrendingUp, Sparkles, Plus,
  ChevronRight, ChevronDown, User, LogOut, Wrench,
} from "lucide-react";
import { useMyHotels, usePartnerReviews, usePartnerBookings } from "../../hooks/usePartnerQueries";
import { useAuth } from "../../contexts/AuthContext";
import { getGroupColor, getTypeLabel } from "../../utils/propertyGroupUtils";
import { useLang } from "../../contexts/LanguageContext";
import "./PartnerSidebar.css";

function NavItem({ icon, label, path, active, badge, navigate, disabled, soon, collapsed }) {
  const Icon = icon;
  const cls = [
    "ps-nav-item",
    active ? "active" : "",
    disabled ? "disabled" : "",
  ].filter(Boolean).join(" ");

  return (
    <button
      className={cls}
      onClick={() => !disabled && navigate(path)}
      tabIndex={disabled ? -1 : 0}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
    >
      <span className="ps-nav-icon"><Icon size={16} /></span>
      {!collapsed && <span className="ps-nav-label">{label}</span>}
      {!collapsed && badge > 0 && (
        <span className="ps-nav-badge">{badge > 99 ? "99+" : badge}</span>
      )}
      {!collapsed && soon && <span className="ps-nav-soon">Soon</span>}
    </button>
  );
}

function SubNavItem({ label, path, active, navigate }) {
  return (
    <button
      className={`ps-nav-sub-item${active ? " active" : ""}`}
      onClick={() => navigate(path)}
    >
      <span className="ps-nav-sub-label">{label}</span>
    </button>
  );
}

export default function PartnerSidebar({ selectedHotelId, onSelectHotel, open, collapsed }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { lang } = useLang();

  const { data: hotels = [] } = useMyHotels();
  const { data: reviewsData = [] } = usePartnerReviews({ hasReply: "false" });
  const unrepliedCount = Array.isArray(reviewsData) ? reviewsData.length : 0;

  const { data: bookingsPage } = usePartnerBookings({ status: "CONFIRMED", size: 1 });
  const pendingBookings = bookingsPage?.totalItems ?? 0;

  const isRoomRoute = pathname.startsWith("/partner/rooms") || pathname.startsWith("/partner/room-units");
  const [roomMenuOpen, setRoomMenuOpen] = useState(isRoomRoute);

  const isActive = (path) => {
    if (path === "/partner") return pathname === "/partner";
    return pathname.startsWith(path);
  };

  const effectiveRoomMenuOpen = !collapsed && (roomMenuOpen || isRoomRoute);

  return (
    <aside className={`ps-root${open ? " open" : ""}${collapsed ? " collapsed" : ""}`}>
      {/* Logo */}
      <div className="ps-logo">
        <img src="/logo.png" alt="VLU Hotel Hub" className="ps-logo-img" />
        {!collapsed && <div className="ps-logo-sub">Partner Portal</div>}
      </div>

      {/* Scrollable middle: hotels + nav */}
      <div className="ps-middle">
        {/* Property list */}
        <div className="ps-hotels">
          {!collapsed && <div className="ps-section-label">Cơ sở lưu trú</div>}
          {hotels.map(hotel => {
            const color = getGroupColor(hotel.hotelType);
            const isSelected = selectedHotelId ? hotel.id === selectedHotelId : hotel === hotels[0];
            return (
              <button
                key={hotel.id}
                onClick={() => onSelectHotel(hotel.id)}
                className={`ps-hotel-item${isSelected ? " active" : ""}`}
                title={collapsed ? hotel.name : undefined}
              >
                <div className="ps-hotel-dot" style={{ background: color }} />
                {!collapsed && (
                  <div className="ps-hotel-info">
                    <div className="ps-hotel-name">{hotel.name}</div>
                    <div className="ps-hotel-type">{getTypeLabel(hotel.hotelType, lang)}</div>
                  </div>
                )}
                {!collapsed && isSelected && <ChevronRight size={12} color="#BE1E2E" />}
              </button>
            );
          })}
          {!collapsed && (
            <button
              className="ps-add-btn"
              onClick={() => navigate("/partner/add-property")}
            >
              <Plus size={13} /> Thêm cơ sở mới
            </button>
          )}
        </div>

        {/* Feature menu */}
        <nav className="ps-nav">
          {!collapsed && <div className="ps-section-label">Quản lý</div>}
          <NavItem icon={LayoutDashboard} label="Tổng quan"        path="/partner"             active={isActive("/partner")}              navigate={navigate} collapsed={collapsed} />
          <NavItem icon={Building2}      label="Cơ sở của tôi"    path="/partner/hotels"       active={isActive("/partner/hotels")}       navigate={navigate} collapsed={collapsed} />

          {/* Collapsible: Quản lý phòng */}
          <div className="ps-nav-group">
            <button
              className={`ps-nav-item ps-nav-group-toggle${isRoomRoute ? " active" : ""}`}
              onClick={() => collapsed ? navigate("/partner/rooms") : setRoomMenuOpen(v => !v)}
              title={collapsed ? "Quản lý phòng" : undefined}
            >
              <span className="ps-nav-icon"><BedDouble size={16} /></span>
              {!collapsed && <span className="ps-nav-label">Quản lý phòng</span>}
              {!collapsed && (
                <ChevronDown
                  size={13}
                  className={`ps-nav-chevron${effectiveRoomMenuOpen ? " open" : ""}`}
                />
              )}
            </button>
            {effectiveRoomMenuOpen && (
              <div className="ps-nav-sub">
                <SubNavItem
                  label="Loại phòng"
                  path="/partner/rooms"
                  active={pathname.startsWith("/partner/rooms")}
                  navigate={navigate}
                />
                <SubNavItem
                  label="Phòng"
                  path="/partner/room-units"
                  active={pathname.startsWith("/partner/room-units")}
                  navigate={navigate}
                />
              </div>
            )}
          </div>

          <NavItem icon={CalendarDays}   label="Lịch & Vận hành"  path="/partner/calendar"     active={isActive("/partner/calendar")}     navigate={navigate} collapsed={collapsed} />
          <NavItem icon={BookOpen}       label="Booking"           path="/partner/bookings"     active={isActive("/partner/bookings")}     navigate={navigate} badge={pendingBookings} collapsed={collapsed} />
          <NavItem icon={Wrench}         label="Dịch vụ & tiện ích" path="/partner/services"    active={isActive("/partner/services")}     navigate={navigate} collapsed={collapsed} />

          {!collapsed && <div className="ps-section-label">Phân tích</div>}
          <NavItem icon={Star}           label="Đánh giá"          path="/partner/reviews"      active={isActive("/partner/reviews")}      navigate={navigate} badge={unrepliedCount} collapsed={collapsed} />
          <NavItem icon={TrendingUp}     label="Doanh thu"         path="/partner/revenue"      active={isActive("/partner/revenue")}      navigate={navigate} collapsed={collapsed} />
          <NavItem icon={Sparkles}       label="AI Dự báo"         path="/partner/forecast"     active={isActive("/partner/forecast")}     navigate={navigate} collapsed={collapsed} />
        </nav>
      </div>

      {/* User footer */}
      <div className="ps-footer">
        <button
          className="ps-user-btn"
          onClick={() => navigate("/profile")}
          title={collapsed ? (user?.displayName || user?.email) : "Xem hồ sơ"}
        >
          <div className="ps-avatar">
            {(user?.displayName || user?.email || "P")[0].toUpperCase()}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ps-user-name">{user?.displayName || user?.email}</div>
              <div className="ps-user-role">
                <User size={10} /> Partner
              </div>
            </div>
          )}
        </button>
        {!collapsed && (
          <div className="ps-footer-actions">
            <button className="ps-footer-btn logout" onClick={logout}>
              <LogOut size={13} /> Đăng xuất
            </button>
          </div>
        )}
        {collapsed && (
          <button
            className="ps-footer-btn logout"
            onClick={logout}
            title="Đăng xuất"
            style={{ justifyContent: "center", width: "100%" }}
          >
            <LogOut size={13} />
          </button>
        )}
      </div>
    </aside>
  );
}
