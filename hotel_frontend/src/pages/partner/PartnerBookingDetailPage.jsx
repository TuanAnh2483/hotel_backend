import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { partnerService } from "../../services/partnerService";
import { PageHeader, Card, Badge, Btn } from "../../components/admin/AdminLayout";
import { ArrowLeft, Calendar, User, Building2, CreditCard, Clock, MapPin } from "lucide-react";
import "../../styles/pages/PartnerBookingDetailPage.css";

function fmtPrice(n) {
  return new Intl.NumberFormat("vi-VN").format(n) + " ₫";
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function PartnerBookingDetailPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await partnerService.getBooking(bookingId);
        setBooking(data);
      } catch {
        setError("Không thể tải thông tin đặt phòng.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bookingId]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Đang tải thông tin...</div>;
  if (error || !booking) return <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>{error || "Không tìm thấy đặt phòng."}</div>;

  const customerName = booking.customerName || booking.contact?.fullName || booking.contact?.email || "khách hàng";

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <button 
          onClick={() => navigate("/partner/bookings")}
          className="partner-booking-detail-back-btn"
        >
          <ArrowLeft size={18} /> Quay lại danh sách
        </button>
      </div>

      <PageHeader 
        title={`Chi tiết đặt phòng #${booking.bookingId}`} 
        subtitle={`Quản lý chi tiết đặt phòng của khách hàng ${customerName}`}
        action={<Badge status={booking.status} />}
      />

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Main Info */}
          <Card title="Thông tin khách sạn & Phòng">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <Building2 size={18} color="#64748b" style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>KHÁCH SẠN</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{booking.hotelName}</div>
                </div>
              </div>
              
              <div style={{ height: 1, background: "#f1f5f9" }} />

              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 12 }}>DANH SÁCH PHÒNG</div>
                {booking.items?.map((item, i) => (
                  <div key={i} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#1e293b" }}>{item.roomTypeName || item.roomName || "Phòng"}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{item.quantity} phòng</div>
                    </div>
                    <div style={{ fontWeight: 800, color: "#BE1E2E" }}>{fmtPrice(item.stayPrice)}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Customer Info */}
          <Card title="Thông tin khách hàng">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <User size={18} color="#64748b" />
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>TÊN KHÁCH HÀNG</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{customerName}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <CreditCard size={18} color="#64748b" />
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>LIÊN HỆ</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{booking.contact?.email || booking.contact?.phone || "—"}</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Summary */}
          <Card style={{ background: "#FFF1F2", border: "1px solid #FFE4E6" }}>
            <div style={{ fontSize: 12, color: "#BE1E2E", fontWeight: 700, marginBottom: 16 }}>TỔNG QUAN CHI PHÍ</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#1e293b" }}>
                <span>Tiền phòng</span>
                <span style={{ fontWeight: 600 }}>{fmtPrice(booking.totalPrice)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#1e293b" }}>
                <span>Thuế & Phí (0%)</span>
                <span style={{ fontWeight: 600 }}>0 ₫</span>
              </div>
              <div style={{ height: 1, background: "#FFE4E6", margin: "4px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Tổng cộng</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#BE1E2E" }}>{fmtPrice(booking.totalPrice)}</span>
              </div>
            </div>
          </Card>

          {/* Dates */}
          <Card title="Thời gian">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <Calendar size={18} color="#64748b" />
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>NHẬN PHÒNG</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{new Date(booking.checkIn).toLocaleDateString("vi-VN")}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <Calendar size={18} color="#64748b" />
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>TRẢ PHÒNG</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{new Date(booking.checkOut).toLocaleDateString("vi-VN")}</div>
                </div>
              </div>
              <div style={{ height: 1, background: "#f1f5f9" }} />
              <div style={{ display: "flex", gap: 12 }}>
                <Clock size={18} color="#64748b" />
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>NGÀY ĐẶT</div>
                  <div style={{ fontSize: 14, color: "#64748b" }}>{fmtDate(booking.createdAt)}</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
