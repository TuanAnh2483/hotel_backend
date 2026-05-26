import { useNavigate } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useMyHotels, usePartnerBookings, useAnalyticsSummary, usePartnerRooms } from "../../hooks/usePartnerQueries";
import { useLang } from "../../contexts/LanguageContext";
import {
  Building2, ClipboardList, CircleDollarSign, BarChart3,
  Bed, Calendar, ArrowRight, User, TrendingUp, BedDouble,
  CalendarDays,
} from "lucide-react";
import { getPropertyGroup, getGroupColor, getTypeLabel } from "../../utils/propertyGroupUtils";
import { calcADR, calcOccupancyRate, calcRevPAR, sumBookingNights, periodDays, fmtMetric } from "../../utils/metricsCalculator";
import { SkeletonRow } from "../../components/ui/Skeleton";
import "../../styles/pages/PartnerDashboard.css";

const HOTEL_LIKE = ["HOTEL", "RESORT", "HOSTEL"];

// --- Helpers ---
function fmtPrice(n) { return fmtMetric(n, "currency"); }

function toIsoDate(date) {
  const yyyy = date.getFullYear();
  const mm   = String(date.getMonth() + 1).padStart(2, "0");
  const dd   = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
}

function formatDisplayName(user) {
  return user?.email?.split("@")[0] || "Đối tác";
}

function startOfCurrentMonth() {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function endOfCurrentMonth() {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

// ── Property group badge ─────────────────────────────────────────────────────
function PropertyBadge({ hotelType, lang }) {
  const color = getGroupColor(hotelType);
  const label = getTypeLabel(hotelType, lang);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: `${color}18`, color, border: `1px solid ${color}40`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, hint, Icon, color, path, navigate, loading }) {
  return (
    <button onClick={() => navigate(path)} className="partner-dashboard-stat-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}10`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={22} color={color} />
        </div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#1e293b" }}>{loading ? "..." : value}</div>
      <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, fontWeight: 600 }}>{hint}</div>
    </button>
  );
}

// ── Hotel-like KPIs (ADR / Occupancy / RevPAR) ───────────────────────────────
function HotelKpiRow({ bookings, rooms, loading, navigate }) {
  const fromIso = startOfCurrentMonth();
  const toIso   = endOfCurrentMonth();
  const days    = periodDays(fromIso, toIso);

  const confirmedBookings = bookings.filter(b => ["CONFIRMED","COMPLETED"].includes(b.status));
  const totalRevenue = confirmedBookings.reduce((s, b) => s + Number(b.totalPrice || 0), 0);
  const totalNights  = sumBookingNights(bookings);
  const totalRooms   = rooms.reduce((s, r) => s + Number(r.quantity || 0), 0);

  const adr        = calcADR(totalRevenue, totalNights);
  const occupancy  = calcOccupancyRate(totalNights, totalRooms, days);
  const revpar     = calcRevPAR(adr, occupancy);

  const kpis = [
    { label: "ADR", hint: "Doanh thu trung bình / đêm phòng", value: fmtPrice(adr),         Icon: BedDouble,  color: "#0EA5E9", path: "/partner/revenue"  },
    { label: "Occupancy", hint: "Tỷ lệ lấp đầy tháng này",    value: fmtMetric(occupancy, "percent"), Icon: BarChart3,  color: "#7C3AED", path: "/partner/calendar" },
    { label: "RevPAR", hint: "Doanh thu / phòng có sẵn",      value: fmtPrice(revpar),       Icon: TrendingUp, color: "#059669", path: "/partner/revenue"  },
  ];

  return (
    <div className="partner-dashboard-kpi-3col">
      {kpis.map(k => (
        <div key={k.label} style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${k.color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <k.Icon size={17} color={k.color} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>{k.label}</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b" }}>{loading ? "..." : k.value}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{k.hint}</div>
          <button onClick={() => navigate(k.path)} style={{ marginTop: 10, background: "none", border: "none", color: k.color, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 3 }}>
            Xem chi tiết <ArrowRight size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function PartnerDashboard() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const rrNavigate = useNavigate();
  const { selectedHotelId } = useOutletContext() || {};

  const today    = toIsoDate(new Date());
  const monthLabel = new Date().toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  const sharedParam    = selectedHotelId ? { hotelId: selectedHotelId } : {};
  const analyticsParams = { checkInFrom: startOfCurrentMonth(), checkInTo: endOfCurrentMonth(), ...sharedParam };
  const todayParams     = { checkInFrom: today, checkInTo: today, ...sharedParam };
  const bookingsParams  = { size: 10, page: 1, ...sharedParam };

  const { data: hotelData,     isLoading: hotelsLoading    } = useMyHotels();
  const { data: bookingData,   isLoading: bookingsLoading  } = usePartnerBookings(bookingsParams);
  const { data: analyticsData, isLoading: analyticsLoading } = useAnalyticsSummary(analyticsParams);
  const { data: todayData,     isLoading: todayLoading     } = useAnalyticsSummary(todayParams);

  const hotelList     = Array.isArray(hotelData) ? hotelData : [];
  const selectedHotel = hotelList.find(h => h.id === selectedHotelId) || hotelList[0] || null;
  const hotelType     = selectedHotel?.hotelType || "HOTEL";
  const isHotelLike   = HOTEL_LIKE.includes(hotelType);
  const groupColor    = getGroupColor(hotelType);

  const { data: roomsData = [], isLoading: roomsLoading } = usePartnerRooms(selectedHotel?.id || null);
  const rooms = Array.isArray(roomsData) ? roomsData : [];

  const bookings       = Array.isArray(bookingData?.items) ? bookingData.items : [];
  const bookingTotal   = Number(bookingData?.totalItems ?? analyticsData?.totalBookings ?? 0);
  const monthlyRevenue = Number(analyticsData?.netRevenue ?? analyticsData?.grossRevenue ?? 0);

  const totalPhysicalRooms = rooms.reduce((sum, r) => sum + Number(r.quantity || 0), 0);
  const checkInToday       = Number(todayData?.totalBookings ?? 0);
  const availableToday     = Math.max(0, totalPhysicalRooms - checkInToday);

  const loading     = hotelsLoading || bookingsLoading || analyticsLoading;
  const opLoading   = loading || todayLoading;

  function statusConfig(status) {
    const MAP = {
      CONFIRMED:       { label: t("pt_status_confirmed"),       color: "#10b981", bg: "#ecfdf5" },
      PENDING_PAYMENT: { label: t("pt_status_pending_payment"), color: "#f59e0b", bg: "#fffbeb" },
      CANCELLED:       { label: t("pt_status_cancelled"),       color: "#94a3b8", bg: "#f8fafc" },
      COMPLETED:       { label: t("pt_status_completed"),       color: "#BE1E2E", bg: "#FFF1F2" },
    };
    return MAP[status] || { label: status || t("pt_status_unknown"), color: "#475569", bg: "#f8fafc" };
  }

  // ── Operational KPIs (primary) ───────────────────────────────────────────
  const opKpis = [
    {
      label: "Phòng trống",
      value: availableToday,
      hint:  "Phòng chưa có khách check-in hôm nay",
      Icon:  BedDouble, color: "#059669", path: isHotelLike ? "/partner/rooms" : "/partner/calendar",
    },
    {
      label: "Check-in hôm nay",
      value: checkInToday,
      hint:  `Lượt nhận phòng ${today}`,
      Icon:  CalendarDays, color: "#0EA5E9", path: "/partner/bookings",
    },
    {
      label: "Booking tháng này",
      value: bookingTotal,
      hint:  `Tổng đặt phòng ${monthLabel}`,
      Icon:  ClipboardList, color: "#7C3AED", path: "/partner/bookings",
    },
    {
      label: "Tổng phòng",
      value: totalPhysicalRooms,
      hint:  `${rooms.length} loại phòng`,
      Icon:  Bed, color: "#f59e0b", path: isHotelLike ? "/partner/rooms" : "/partner/calendar",
    },
  ];

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Compact page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", margin: "0 0 6px" }}>
            {t("pt_dash_greeting").replace("{name}", formatDisplayName(user))}
          </h1>
          {selectedHotel ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#64748b", fontSize: 13, fontWeight: 500 }}>{selectedHotel.name}</span>
              <PropertyBadge hotelType={hotelType} lang={lang} />
            </div>
          ) : (
            <div style={{ color: "#94a3b8", fontSize: 13 }}>{t("pt_dash_subtitle")}</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <button
            onClick={() => rrNavigate("/partner/calendar")}
            style={{ padding: "8px 16px", borderRadius: 8, background: "#BE1E2E", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            {t("pt_dash_manage_price")} <ArrowRight size={14} />
          </button>
          <button
            onClick={() => rrNavigate("/partner/revenue")}
            style={{ padding: "8px 16px", borderRadius: 8, background: "#fff", color: "#475569", border: "1px solid #e2e8f0", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            {t("pt_dash_finance")}
          </button>
        </div>
      </div>

      {/* Operational KPI cards */}
      <div className="partner-dashboard-stats-grid">
        {opKpis.map(card => (
          <KpiCard key={card.label} {...card} navigate={rrNavigate} loading={opLoading} />
        ))}
      </div>

      {/* Secondary financial section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>
            Tài chính — {monthLabel}
          </h2>
          <button
            onClick={() => rrNavigate("/partner/revenue")}
            style={{ fontSize: 12, color: "#BE1E2E", background: "none", border: "none", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}
          >
            Chi tiết <ArrowRight size={12} />
          </button>
        </div>

        {/* Monthly revenue summary card */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "18px 22px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#7C3AED10", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <CircleDollarSign size={22} color="#7C3AED" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b" }}>{loading ? "..." : fmtPrice(monthlyRevenue)}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2, fontWeight: 500 }}>Doanh thu {monthLabel}</div>
          </div>
        </div>

        {/* ADR / Occupancy / RevPAR */}
        {isHotelLike && (
          <HotelKpiRow
            bookings={bookings}
            rooms={rooms}
            loading={loading || roomsLoading}
            navigate={rrNavigate}
          />
        )}
      </div>

      <div className="partner-dashboard-main-grid">
        {/* Recent Bookings */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "24px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Calendar size={18} color="#0EA5E9" />
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", margin: 0, userSelect: "none", cursor: "default" }}>{t("pt_dash_recent")}</h2>
            </div>
            <button onClick={() => rrNavigate("/partner/bookings")} style={{ fontSize: 13, color: "#BE1E2E", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
              {t("pt_view_all")}
            </button>
          </div>

          <div className="partner-dashboard-table-wrapper">
            <table className="partner-dashboard-table">
              <thead>
                <tr className="partner-dashboard-table-header">
                  {[t("pt_dash_col_customer"), t("pt_dash_col_hotel"), t("pt_dash_col_stay"), t("pt_dash_col_amount"), t("pt_dash_col_status")].map(h => (
                    <th key={h} className="partner-dashboard-table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!loading && bookings.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: "36px 16px", textAlign: "center", color: "#94a3b8", fontWeight: 700 }}>
                      {t("pt_dash_no_bookings")}
                    </td>
                  </tr>
                )}
                {loading && <>
                  <SkeletonRow cols={5} />
                  <SkeletonRow cols={5} />
                  <SkeletonRow cols={5} />
                </>}
                {!loading && bookings.slice(0, 6).map((b) => {
                  const s = statusConfig(b.status);
                  return (
                    <tr key={b.bookingId} className="partner-dashboard-table-row" style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#475569" }}>
                            {b.customerName?.[0] || "C"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "#1e293b" }}>{b.customerName || t("pt_unknown_guest")}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>#{b.bookingId}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "16px", color: "#475569", fontWeight: 600 }}>{b.hotelName}</td>
                      <td style={{ padding: "16px" }}>
                        <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 500 }}>{formatDate(b.checkIn)}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{formatDate(b.checkOut)}</div>
                      </td>
                      <td style={{ padding: "16px", color: "#BE1E2E", fontWeight: 800 }}>{fmtPrice(b.totalPrice)}</td>
                      <td style={{ padding: "16px" }}>
                        <span style={{ padding: "4px 12px", borderRadius: 20, background: s.bg, color: s.color, fontSize: 11, fontWeight: 800, border: `1px solid ${s.bg}` }}>
                          {s.label.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions & Tip */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "24px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", marginBottom: 20, userSelect: "none", cursor: "default" }}>{t("pt_dash_quick")}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { title: t("pt_dash_qa_hotels"),   Icon: Building2, color: "#BE1E2E", path: "/partner/hotels"   },
                { title: t("pt_dash_qa_calendar"), Icon: Calendar,  color: "#0EA5E9", path: "/partner/calendar" },
                { title: t("pt_dash_qa_revenue"),  Icon: BarChart3, color: "#7C3AED", path: "/partner/revenue"  },
              ].map(item => (
                <button key={item.title} onClick={() => rrNavigate(item.path)}
                  className="partner-dashboard-quick-action"
                  style={{ "--action-color": item.color }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${item.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <item.Icon size={18} color={item.color} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>{item.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: "#eff6ff", borderRadius: 16, padding: "24px", border: "1px solid #bfdbfe" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <BarChart3 size={16} color="#fff" />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1e40af", margin: 0, userSelect: "none", cursor: "default" }}>{t("pt_dash_monthly")}</h3>
            </div>
            <p style={{ fontSize: 13, color: "#3b5fad", lineHeight: 1.6, margin: 0 }}>
              {bookingTotal > 0
                ? t("pt_dash_monthly_msg").replace("{n}", bookingTotal).replace("{revenue}", fmtPrice(monthlyRevenue))
                : t("pt_dash_monthly_empty")}
            </p>
            <button
              onClick={() => rrNavigate("/partner/revenue")}
              style={{ marginTop: 16, background: "none", border: "none", color: "#1d4ed8", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
            >
              {t("pt_dash_see_report")} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}