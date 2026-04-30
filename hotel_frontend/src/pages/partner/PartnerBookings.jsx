import { createElement, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { partnerService } from "../../services/partnerService";
import { PageHeader, Card, Badge, Btn, Table, Modal } from "../../components/admin/AdminLayout";
import { Search, Filter, Calendar, Download, User, Building2, Eye } from "lucide-react";

const fmtPrice = (n) => new Intl.NumberFormat("vi-VN").format(n) + " ₫";

export default function PartnerBookings() {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState([]);
  const [filters, setFilters] = useState({ hotelId: "", status: "", checkInFrom: "", checkInTo: "", page: 1 });
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [hList, bData] = await Promise.all([
        partnerService.getMyHotels(),
        partnerService.getBookings({ ...filters, size: 10 }),
      ]);
      setHotels(Array.isArray(hList) ? hList : []);
      setPageData(bData && Array.isArray(bData.items) ? bData : { items: [], totalPages: 0, totalItems: 0 });
    } catch (e) {
      setHotels([]);
      setPageData({ items: [], totalPages: 0, totalItems: 0 });
      setError(e.message || "Không thể tải danh sách đặt phòng.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id) => {
    try {
      const res = await partnerService.getBooking(id);
      setDetail(res);
    } catch (e) {
      setError(e.message || "Không thể tải chi tiết đặt phòng.");
    }
  };

  const items = pageData?.items || [];

  const rows = items.map(b => [
    <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#64748b" }}>#{b.bookingId}</span>,
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Building2 size={14} color="#94a3b8" />
      <span style={{ fontWeight: 600, color: "#1e293b" }}>{b.hotelName}</span>
    </div>,
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#475569" }}>
        {b.customerName?.[0] || "C"}
      </div>
      <span style={{ fontWeight: 500, color: "#334155" }}>{b.customerName || "Khách ẩn danh"}</span>
    </div>,
    <div style={{ fontSize: 13, color: "#1e293b" }}>{b.checkIn}</div>,
    <div style={{ fontSize: 13, color: "#1e293b" }}>{b.checkOut}</div>,
    <span style={{ fontWeight: 800, color: "#BE1E2E" }}>{fmtPrice(b.totalPrice)}</span>,
    <Badge status={b.status} />,
    <button 
      onClick={() => openDetail(b.bookingId)}
      style={{ padding: "8px 16px", borderRadius: 10, background: "#f1f5f9", border: "none", color: "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
    >
      <Eye size={14} /> Chi tiết
    </button>,
    <button 
      onClick={() => navigate(`/partner/bookings/${b.bookingId}`)}
      style={{ padding: "8px 16px", borderRadius: 10, background: "#BE1E2E", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 10px rgba(190, 30, 46, 0.2)" }}
    >
      Xem toàn bộ
    </button>,
  ]);

  return (
    <div style={{ paddingBottom: 60 }}>
      <PageHeader
        title="Danh sách đặt phòng"
        subtitle="Theo dõi và xử lý các yêu cầu đặt phòng từ khách hàng"
        action={
          <button style={{ 
            padding: "10px 18px", borderRadius: 10, background: "#fff", color: "#475569", 
            border: "1px solid #e2e8f0", fontWeight: 700, fontSize: 13, cursor: "pointer", 
            display: "flex", alignItems: "center", gap: 8 
          }}>
            <Download size={16} /> Xuất CSV
          </button>
        }
      />

      {/* Filter Bar */}
      <div style={{ 
        background: "#fff", borderRadius: 20, padding: "24px", marginBottom: 32, 
        border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        display: "grid", gridTemplateColumns: "repeat(4, 1fr) auto", gap: 16, alignItems: "end"
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Building2 size={14} /> KHÁCH SẠN
          </div>
          <select 
            style={selectSt} 
            value={filters.hotelId} 
            onChange={e => setFilters({ ...filters, hotelId: e.target.value, page: 1 })}
          >
            <option value="">Tất cả khách sạn</option>
            {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Filter size={14} /> TRẠNG THÁI
          </div>
          <select 
            style={selectSt} 
            value={filters.status} 
            onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="PENDING_PAYMENT">Chờ thanh toán</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Calendar size={14} /> TỪ NGÀY
          </div>
          <input 
            type="date" style={selectSt} value={filters.checkInFrom} 
            onChange={e => setFilters({ ...filters, checkInFrom: e.target.value, page: 1 })} 
          />
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Calendar size={14} /> ĐẾN NGÀY
          </div>
          <input 
            type="date" style={selectSt} value={filters.checkInTo} 
            onChange={e => setFilters({ ...filters, checkInTo: e.target.value, page: 1 })} 
          />
        </div>

        <button 
          onClick={() => setFilters({ hotelId: "", status: "", checkInFrom: "", checkInTo: "", page: 1 })}
          style={{ padding: "10px 16px", borderRadius: 10, background: "#f1f5f9", border: "none", color: "#475569", fontWeight: 700, fontSize: 13, cursor: "pointer", height: 42 }}
        >
          Làm mới
        </button>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {error && (
          <div style={{ margin: 20, padding: "12px 14px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>
            {error}
          </div>
        )}
        {loading
          ? <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Đang tải danh sách...</div>
          : <>
              <Table
                headers={["MÃ", "KHÁCH SẠN", "KHÁCH HÀNG", "CHECK-IN", "CHECK-OUT", "TỔNG TIỀN", "TRẠNG THÁI", "", "THAO TÁC"]}
                rows={rows}
                empty="Không tìm thấy đặt phòng nào khớp với bộ lọc."
              />
              
              {/* Pagination */}
              {pageData?.totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "24px", borderTop: "1px solid #f1f5f9" }}>
                  {[...Array(pageData.totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setFilters({ ...filters, page: i + 1 })}
                      style={{
                        width: 36, height: 36, borderRadius: 10, border: "1px solid #e2e8f0",
                        background: filters.page === i + 1 ? "#BE1E2E" : "#fff",
                        color: filters.page === i + 1 ? "#fff" : "#475569",
                        fontWeight: 700, cursor: "pointer", transition: "all 0.2s"
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
        }
      </Card>

      {/* Detail Modal */}
      {detail && (
        <Modal title={`Chi tiết đặt phòng #${detail.bookingId || ""}`} onClose={() => setDetail(null)} width={500}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: "#f8fafc", borderRadius: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>TỔNG THANH TOÁN</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#BE1E2E" }}>{fmtPrice(detail.totalPrice)}</div>
              </div>
              <Badge status={detail.status} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <InfoItem label="Khách hàng" value={detail.customerName || detail.contact?.fullName || detail.contact?.email} Icon={User} />
              <InfoItem label="Khách sạn" value={detail.hotelName} Icon={Building2} />
              <InfoItem label="Nhận phòng" value={detail.checkIn} Icon={Calendar} />
              <InfoItem label="Trả phòng" value={detail.checkOut} Icon={Calendar} />
            </div>

            {detail.items && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", marginBottom: 10, letterSpacing: 0.5 }}>DANH SÁCH PHÒNG</div>
                {detail.items.map((it, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{it.roomTypeName} × {it.quantity}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>{fmtPrice(it.stayPrice)}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              <Btn style={{ width: "100%" }} onClick={() => setDetail(null)}>Đóng</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InfoItem({ label, value, Icon }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
        {createElement(Icon, { size: 12 })} {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{value || "—"}</div>
    </div>
  );
}

const selectSt = {
  width: "100%", padding: "10px 14px", borderRadius: 12, border: "1px solid #e2e8f0",
  fontSize: 14, outline: "none", background: "#f8fafc", cursor: "pointer", fontWeight: 500
};
