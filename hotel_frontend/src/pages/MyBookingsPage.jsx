import { useState, useEffect } from "react";
import { C } from "../components/auth/AuthShared";
import MainNavbar from "../components/MainNavbar";
import Footer from "../components/Footer";
import { bookingService } from "../services/bookingService";

};

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
  return (
    <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function BookingCard({ booking, onView }) {
  const n = nightsBetween(booking.checkIn, booking.checkOut);
  const isPending = booking.status === "PENDING_PAYMENT";

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #eee", padding: "20px 24px", marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>{roomNames}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div style={{ display: "flex", gap: 24, fontSize: 13, color: "#555", marginBottom: 12, flexWrap: "wrap" }}>
        <span>📅 {fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}</span>
        {booking.contact?.fullName && <span>👤 {booking.contact.fullName}</span>}
      </div>

      {isPending && booking.expiresAt && (
        <div style={{ fontSize: 12, color: "#d48806", background: "#fffbe6", borderRadius: 6, padding: "4px 10px", display: "inline-block", marginBottom: 12 }}>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.primary }}>{fmt(booking.totalPrice)}</p>
        <button
          style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          onClick={onView}
      </div>
    </div>
  );
}

];

export default function MyBookingsPage({ navigate, user, onLogout }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [tab, setTab]           = useState("ALL");

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    bookingService.getMyBookings()
      .then((data) => {
        setBookings(Array.isArray(data) ? data : []);
        setError("");
      })
      .catch((err) => {
        setBookings([]);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "#f7f8fa", fontFamily: "'Segoe UI',sans-serif" }}>
        <MainNavbar active="my-bookings" navigate={navigate} user={user} onLogout={onLogout} />
        <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", padding: 24 }}>
          <button
            style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 10, padding: "12px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
            onClick={() => navigate("login")}
        </div>
      </div>
    );
  }

  const filtered = tab === "ALL" ? bookings : bookings.filter(b => b.status === tab);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #ffffff 0%, #fdf4f5 45%, #f7ebeb 100%)", fontFamily: "'Segoe UI',sans-serif", display: "flex", flexDirection: "column" }}>
      <MainNavbar active="my-bookings" navigate={navigate} user={user} onLogout={onLogout} />

      <div style={{ maxWidth: 900, margin: "0 auto", width: "100%", padding: "32px 24px", flex: 1, boxSizing: "border-box" }}>

        {/* Status tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          ))}
        </div>

        {loading && (
        )}

        {error && (
          <div style={{ background: "#fff5f5", border: "1px solid #ffa39e", borderRadius: 10, padding: "12px 16px", color: "#cf1322", marginBottom: 16 }}>
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 16, color: "#aaa", marginBottom: 16 }}>
            </p>
            {tab === "ALL" && (
              <button
                style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                onClick={() => navigate("hotels")}
            )}
          </div>
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
