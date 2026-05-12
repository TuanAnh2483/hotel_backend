import { useEffect, useState } from "react";
import { C } from "../components/auth/AuthShared";
import MainNavbar from "../components/MainNavbar";
import Footer from "../components/Footer";
import { bookingService } from "../services/bookingService";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Clock,
  CreditCard,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import "../styles/pages/BookingDetailPage.css";

};

};

};

function fmt(n) {
  return (n || 0).toLocaleString("vi-VN") + " ₫";
}

function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtDateTime(s) {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString("vi-VN");
}

function nightsBetween(a, b) {
  if (!a || !b) return 0;
  const diff = (new Date(b) - new Date(a)) / 86400000;
  return diff > 0 ? Math.round(diff) : 0;
}

function Card({ children, style }) {
  return (
    <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", boxShadow: "0 10px 30px rgba(0,0,0,0.04)", padding: 24, ...style }}>
      {children}
    </div>
  );
}

function SmallBadge({ value, map }) {
  return (
    <span style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 999, color: cfg.color, display: "inline-flex", fontSize: 12, fontWeight: 800, padding: "4px 10px" }}>
      {cfg.label}
    </span>
  );
}

function fieldLabel(value) {
  if (!value) return "—";
  return String(value).replaceAll("_", " ");
}

export default function BookingDetailPage({ navigate, user, params = {}, onLogout }) {
  const { bookingId, hotelName } = params;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");
  const [refundRequest, setRefundRequest] = useState(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState("");

  useEffect(() => {
    let ignore = false;

    if (!bookingId) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setPayments([]);
    setRefundRequest(null);
    setPaymentsError("");
    setRefundError("");
    bookingService.getBooking(bookingId)
      .then((data) => {
        if (ignore) return;
        setBooking(data || null);
        setError("");
      })
      .catch((err) => {
        if (ignore) return;
        setBooking(null);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    setPaymentsLoading(true);
    bookingService.getPaymentHistory(bookingId)
      .then((data) => {
        if (ignore) return;
        setPayments(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (ignore) return;
        setPayments([]);
      })
      .finally(() => {
        if (!ignore) setPaymentsLoading(false);
      });

    setRefundLoading(true);
    bookingService.getRefundRequest(bookingId)
      .then((data) => {
        if (ignore) return;
        setRefundRequest(data || null);
      })
      .catch((err) => {
        if (ignore) return;
        setRefundRequest(null);
      })
      .finally(() => {
        if (!ignore) setRefundLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [bookingId]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const updated = await bookingService.cancelBooking(booking.bookingId);
      setBooking(updated);
      setError("");
    } catch (err) {
    } finally {
      setCancelling(false);
    }
  };

  if (!user) {
    return (
      <div className="bkd-root">
        <MainNavbar active="my-bookings" navigate={navigate} user={user} onLogout={onLogout} />
        <div className="bkd-login-center">
          <div className="bkd-login-box">
            <div className="bkd-login-avatar">
              <User size={40} color="#94a3b8" />
            </div>
          </div>
        </div>
        <Footer navigate={navigate} />
      </div>
    );
  }

  const nights = nightsBetween(booking?.checkIn, booking?.checkOut);
  const StatusIcon = statusCfg.icon;
  const canRequestRefund = booking
    && ["CONFIRMED", "COMPLETED", "CANCELLED"].includes(booking.status)
    && !refundRequest;

  return (
    <div className="bkd-root">
      <MainNavbar active="my-bookings" navigate={navigate} user={user} onLogout={onLogout} />

      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "32px 24px 40px" }}>
        <button
          onClick={() => navigate("my-bookings")}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 999, color: "#64748b", cursor: "pointer", fontSize: 13, fontWeight: 700, marginBottom: 24, padding: "10px 18px" }}
        >
        </button>

        {loading && (
          <Card>
          </Card>
        )}

        {!loading && error && !booking && (
          <Card>
            <div style={{ color: "#64748b", lineHeight: 1.6 }}>{error}</div>
          </Card>
        )}

        {!loading && booking && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 24, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
                  <div>
                    <div style={{ color: "#64748b", fontSize: 14 }}>
                    </div>
                  </div>
                  <div style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, background: statusCfg.bg, color: statusCfg.color, borderRadius: 999, fontSize: 13, fontWeight: 800, padding: "8px 14px" }}>
                    <StatusIcon size={16} />
                    {statusCfg.label}
                  </div>
                </div>

                {booking.expiresAt && booking.status === "PENDING_PAYMENT" && (
                  <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, color: "#92400e", marginBottom: 18, padding: "12px 14px" }}>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
                  <div style={{ background: "#f8fafc", borderRadius: 16, padding: 16 }}>
                    <div style={{ color: "#0f172a", fontSize: 16, fontWeight: 800 }}>{fmtDate(booking.checkIn)}</div>
                  </div>
                  <div style={{ background: "#f8fafc", borderRadius: 16, padding: 16 }}>
                    <div style={{ color: "#0f172a", fontSize: 16, fontWeight: 800 }}>{fmtDate(booking.checkOut)}</div>
                  </div>
                  <div style={{ background: "#f8fafc", borderRadius: 16, padding: 16 }}>
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {booking.items?.map((item) => (
                    <div key={`${item.roomTypeId}-${item.roomTypeName}`} style={{ alignItems: "center", border: "1px solid #f1f5f9", borderRadius: 16, display: "flex", justifyContent: "space-between", gap: 12, padding: 16 }}>
                      <div>
                        <div style={{ color: "#0f172a", fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{item.roomTypeName}</div>
                      </div>
                      <div style={{ color: C.primary, fontSize: 16, fontWeight: 900 }}>{fmt(item.stayPrice)}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
                  <div>
                    <div style={{ color: "#0f172a", fontSize: 14, fontWeight: 700 }}>{booking.contact?.fullName || "—"}</div>
                  </div>
                  <div>
                    <div style={{ color: "#0f172a", fontSize: 14, fontWeight: 700 }}>{booking.contact?.email || "—"}</div>
                  </div>
                  <div>
                    <div style={{ color: "#0f172a", fontSize: 14, fontWeight: 700 }}>{booking.contact?.phone || "—"}</div>
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ alignItems: "center", display: "flex", gap: 10, marginBottom: 18 }}>
                  <CreditCard size={20} color={C.primary} />
                </div>

                {paymentsLoading ? (
                ) : paymentsError ? (
                  <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 14, color: "#be123c", fontSize: 13, lineHeight: 1.6, padding: "12px 14px" }}>
                    {paymentsError}
                  </div>
                ) : payments.length === 0 ? (
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, color: "#64748b", fontSize: 13, lineHeight: 1.6, padding: "14px 16px" }}>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {payments.map((payment) => (
                      <div key={payment.paymentTransactionId || payment.clientRequestId} style={{ border: "1px solid #f1f5f9", borderRadius: 16, padding: 16 }}>
                        <div style={{ alignItems: "flex-start", display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                          <div>
                            <div style={{ color: "#0f172a", fontSize: 14, fontWeight: 900 }}>
                              {fieldLabel(payment.method)}
                            </div>
                            <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, marginTop: 4 }}>
                              {fmtDateTime(payment.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div style={{ alignItems: "center", color: C.primary, display: "flex", fontSize: 18, fontWeight: 900, justifyContent: "space-between" }}>
                          <span>{fmt(payment.amount)}</span>
                          <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700 }}>#{payment.paymentTransactionId}</span>
                        </div>
                        {(payment.providerReference || payment.failureReason) && (
                          <div style={{ borderTop: "1px solid #f1f5f9", color: "#64748b", fontSize: 12, lineHeight: 1.6, marginTop: 12, paddingTop: 10 }}>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "sticky", top: 20 }}>
              <Card>
                <div style={{ borderBottom: "1px solid #f1f5f9", color: "#64748b", display: "flex", fontSize: 14, justifyContent: "space-between", marginBottom: 16, paddingBottom: 12 }}>
                  <span style={{ color: "#0f172a", fontWeight: 700 }}>{fmt(booking.totalPrice)}</span>
                </div>
                <div style={{ color: C.primary, display: "flex", fontSize: 24, fontWeight: 900, justifyContent: "space-between", marginBottom: 18 }}>
                  <span>{fmt(booking.totalPrice)}</span>
                </div>

                {error && (
                  <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 14, color: "#be123c", fontSize: 13, lineHeight: 1.6, marginBottom: 16, padding: "12px 14px" }}>
                    {error}
                  </div>
                )}

                {booking.status === "PENDING_PAYMENT" && (
                  <button
                    onClick={() => navigate("payment", { bookingId: booking.bookingId, hotelName })}
                    style={{ alignItems: "center", background: C.primary, border: "none", borderRadius: 16, boxShadow: `0 12px 24px ${C.primary}33`, color: "#fff", cursor: "pointer", display: "flex", fontSize: 15, fontWeight: 800, gap: 10, justifyContent: "center", marginBottom: 12, padding: "15px 18px", width: "100%" }}
                  >
                  </button>
                )}

                {(booking.status === "PENDING_PAYMENT" || booking.status === "CONFIRMED") && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, color: "#64748b", cursor: cancelling ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, opacity: cancelling ? 0.7 : 1, padding: "14px 18px", width: "100%" }}
                  >
                  </button>
                )}
              </Card>

              <Card>
                <div style={{ alignItems: "center", display: "flex", gap: 10, marginBottom: 16 }}>
                  <ReceiptText size={20} color={C.primary} />
                </div>

                {refundLoading ? (
                ) : refundError ? (
                  <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 14, color: "#be123c", fontSize: 13, lineHeight: 1.6, padding: "12px 14px" }}>
                    {refundError}
                  </div>
                ) : refundRequest ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: 12 }}>
                    </div>
                    <div style={{ background: "#f8fafc", borderRadius: 14, padding: 14 }}>
                      <div style={{ color: C.primary, fontSize: 20, fontWeight: 900 }}>{fmt(refundRequest.amount)}</div>
                    </div>
                    <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.7 }}>
                    </div>
                  </div>
                ) : canRequestRefund ? (
                  <div>
                    <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.7, margin: "0 0 14px" }}>
                    </p>
                    <button
                      onClick={() => navigate("refund-request", { bookingId: booking.bookingId })}
                      style={{ background: "#fff", border: `1px solid ${C.primary}`, borderRadius: 16, color: C.primary, cursor: "pointer", fontSize: 14, fontWeight: 800, padding: "13px 16px", width: "100%" }}
                    >
                    </button>
                  </div>
                ) : (
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, color: "#64748b", fontSize: 13, lineHeight: 1.6, padding: "12px 14px" }}>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      <Footer navigate={navigate} />
    </div>
  );
}
