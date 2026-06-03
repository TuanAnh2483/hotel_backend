import { useState } from "react";
import { C } from "../lib/constants";
import MainNavbar from "../components/MainNavbar";
import Footer from "../components/Footer";
import { useMyBookings } from "../hooks/useBookingQueries";
import { useLang } from "../contexts/LanguageContext";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonBookingCard } from "../components/ui/Skeleton";
import { CalendarDays, Moon, User, CalendarOff, ClipboardList, AlertCircle } from "lucide-react";

/* ── Status badge map — centralised colours matching BookingDetailPage ── */
function useStatusMap() {
  const { t } = useLang();
  return {
    PENDING_PAYMENT: { label: t("status_pending_payment"), cls: "badge-pending"   },
    CONFIRMED:       { label: t("status_confirmed"),       cls: "badge-confirmed" },
    CANCELLED:       { label: t("status_cancelled"),       cls: "badge-cancelled" },
    COMPLETED:       { label: t("status_completed"),       cls: "badge-completed" },
    REFUNDED:        { label: t("status_refunded"),        cls: "badge-refunded"  },
  };
}

function fmt(n) { return (n || 0).toLocaleString("vi-VN") + "₫"; }

function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d) ? s : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function nightsBetween(a, b) {
  if (!a || !b) return 0;
  const diff = (new Date(b) - new Date(a)) / 86400000;
  return diff > 0 ? Math.round(diff) : 0;
}

function StatusBadge({ status }) {
  const statusMap = useStatusMap();
  const cfg = statusMap[status] || { label: status, cls: "badge-cancelled" };
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}

function BookingCard({ booking, onView }) {
  const { t } = useLang();
  const roomNames = booking.items?.map(i => i.roomTypeName).join(", ") || t("mybookings_room_fb");
  const n = nightsBetween(booking.checkIn, booking.checkOut);
  const isPending = booking.status === "PENDING_PAYMENT";

  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] p-5 mb-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header row */}
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[var(--text-sm)] text-[var(--text-light)] mb-1">
            {t("mybookings_booking_id")}{booking.bookingId}
          </p>
          {booking.hotelName && (
            <p className="text-base font-[800] text-[var(--text-main)] mb-0.5 truncate">
              {booking.hotelName}
            </p>
          )}
          <p className="text-[13px] font-[500] text-[var(--text-muted)] truncate">{roomNames}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-5 text-[13px] text-[var(--text-muted)] mb-3 items-center">
        <span className="flex items-center gap-1.5">
          <CalendarDays size={14} color="#94a3b8" aria-hidden="true" />
          {fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}
        </span>
        {n > 0 && (
          <span className="flex items-center gap-1.5">
            <Moon size={14} color="#94a3b8" aria-hidden="true" />
            {n}{t("night")}
          </span>
        )}
        {booking.contact?.fullName && (
          <span className="flex items-center gap-1.5">
            <User size={14} color="#94a3b8" aria-hidden="true" />
            {booking.contact.fullName}
          </span>
        )}
      </div>

      {/* Expiry warning */}
      {isPending && booking.expiresAt && (
        <div className="alert alert-warning inline-flex mb-3 text-[12px] py-1 px-3">
          <CalendarDays size={13} aria-hidden="true" />
          {t("mybookings_expires")} {new Date(booking.expiresAt).toLocaleString("vi-VN")}
        </div>
      )}

      {/* Footer row */}
      <div className="flex justify-between items-center">
        <p className="text-[15px] font-[800] text-[var(--primary)] m-0">{fmt(booking.totalPrice)}</p>
        <button className="btn btn-primary btn-sm" onClick={onView}>
          {t("mybookings_view")}
        </button>
      </div>
    </div>
  );
}

function useTabs() {
  const { t } = useLang();
  return [
    { key: "ALL",             label: t("tab_all") },
    { key: "PENDING_PAYMENT", label: t("tab_pending") },
    { key: "CONFIRMED",       label: t("tab_confirmed") },
    { key: "COMPLETED",       label: t("tab_completed") },
    { key: "REFUNDED",        label: t("tab_refunded") },
    { key: "CANCELLED",       label: t("tab_cancelled") },
  ];
}

export default function MyBookingsPage({ navigate, user, onLogout }) {
  const { t } = useLang();
  const tabs = useTabs();
  const [tab, setTab] = useState("ALL");

  const { data, isLoading: loading, error: queryError } = useMyBookings({ enabled: Boolean(user) });
  const bookings = Array.isArray(data) ? data : [];
  const error = queryError?.message || "";

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col">
        <MainNavbar active="my-bookings" navigate={navigate} user={user} onLogout={onLogout} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <p className="text-[var(--text-muted)] mb-5">{t("mybookings_login_msg")}</p>
            <button className="btn btn-primary btn-lg" onClick={() => navigate("login")}>
              {t("nav_login")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filtered = tab === "ALL" ? bookings : bookings.filter(b => b.status === tab);

  return (
    <div className="min-h-screen bg-[var(--gradient-brand)] flex flex-col" style={{ background: "linear-gradient(135deg,#ffffff 0%,#fdf4f5 45%,#f7ebeb 100%)" }}>
      <MainNavbar active="my-bookings" navigate={navigate} user={user} onLogout={onLogout} />

      <div className="max-w-[900px] mx-auto w-full px-6 py-8 flex-1 box-border">
        <h1 className="text-[var(--text-2xl)] font-[800] text-[var(--text-main)] mb-6">
          {t("mybookings_title")}
        </h1>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(tb => (
            <button
              key={tb.key}
              className={`btn btn-sm transition-all ${
                tab === tb.key
                  ? "btn-primary"
                  : "btn-secondary"
              }`}
              onClick={() => setTab(tb.key)}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {loading && (
          <>
            <SkeletonBookingCard />
            <SkeletonBookingCard />
            <SkeletonBookingCard />
          </>
        )}

        {error && (
          <div className="alert alert-error mb-4">
            <AlertCircle size={16} aria-hidden="true" />
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          tab === "ALL" ? (
            <EmptyState
              icon={<CalendarOff size={56} />}
              title={t("mybookings_empty_all")}
              description={t("mybookings_empty_all_desc")}
              action={{ label: t("mybookings_find_hotel"), onClick: () => navigate("hotels") }}
            />
          ) : (
            <EmptyState
              icon={<ClipboardList size={56} />}
              title={t("mybookings_empty_tab")}
            />
          )
        )}

        {filtered.map(b => (
          <BookingCard
            key={b.bookingId}
            booking={b}
            onView={() => navigate("booking-detail", { bookingId: b.bookingId })}
          />
        ))}
      </div>

      <Footer navigate={navigate} />
    </div>
  );
}
