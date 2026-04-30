import { useState, useEffect, useCallback } from "react";
import AdminLayout, { AP, PageHeader, Card, Badge, Btn, Table, Modal } from "../../components/admin/AdminLayout";
import { adminService } from "../../services/adminService";
import "../../styles/pages/admin/AdminCommon.css";

const STATUSES = ["", "CONFIRMED", "PENDING_PAYMENT", "CANCELLED", "COMPLETED"];
const STATUS_LABEL = {
  "": "Tất cả",
  CONFIRMED:       "Đã xác nhận",
  PENDING_PAYMENT: "Chờ thanh toán",
  CANCELLED:       "Đã hủy",
  COMPLETED:       "Hoàn thành",
};

function fmt(n) {
  if (!n && n !== 0) return "—";
  return Number(n).toLocaleString("vi-VN") + " ₫";
}

export default function AdminBookings({ navigate, user, onLogout }) {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [detail, setDetail]     = useState(null);
  const [search, setSearch]     = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = useCallback(async (status = filter) => {
    setLoading(true);
    const data = await adminService.getBookings(status);
    setBookings(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  const handleFilter = s => { setPage(1); setFilter(s); };

  const filtered = bookings.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (b.userEmail || "").toLowerCase().includes(q) || (b.hotelName || "").toLowerCase().includes(q);
  });

  const counts = {
    total:          bookings.length,
    confirmed:      bookings.filter(b => b.status === "CONFIRMED").length,
    pending:        bookings.filter(b => b.status === "PENDING_PAYMENT").length,
    cancelled:      bookings.filter(b => b.status === "CANCELLED").length,
    revenue:        bookings.filter(b => b.status === "CONFIRMED" || b.status === "COMPLETED")
                            .reduce((s, b) => s + (Number(b.totalPrice) || 0), 0),
  };

  return (
    <AdminLayout page="admin-bookings" navigate={navigate} user={user} onLogout={onLogout}>
      <PageHeader title="Quản lý đặt phòng" subtitle="Theo dõi tất cả giao dịch đặt phòng trong hệ thống" />

      {/* Summary */}
      <div className="admin-summary-grid admin-summary-grid-5">
        {[
          { label: "Tổng đặt phòng",    value: counts.total,        color: "#4361ee", icon: "📋" },
          { label: "Đã xác nhận",       value: counts.confirmed,    color: "#2e7d32", icon: "✅" },
          { label: "Chờ thanh toán",    value: counts.pending,      color: "#f57f17", icon: "⏳" },
          { label: "Đã hủy",            value: counts.cancelled,    color: "#888",    icon: "❌" },
          { label: "Doanh thu xác nhận",value: fmt(counts.revenue), color: AP,        icon: "💰", isStr: true },
        ].map(c => (
          <div key={c.label} className="admin-summary-card">
            <span className="admin-summary-card-icon">{c.icon}</span>
            <div>
              <div className="admin-summary-card-value" style={{ fontSize: c.isStr ? 14 : 22, color: c.color }}>{c.value}</div>
              <div className="admin-summary-card-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <div className="admin-table-toolbar">
          <div className="admin-table-toolbar-left">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => handleFilter(s)}
                className={`admin-filter-tab${filter === s ? " active" : ""}`}
                style={{ padding: "6px 14px" }}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Tìm email, khách sạn..."
            className="admin-table-search"
          />
        </div>

        {loading ? (
          <div className="admin-loading">Đang tải dữ liệu...</div>
        ) : (
          <>
            <Table
              headers={["#ID", "Người dùng", "Khách sạn", "Nhận phòng", "Trả phòng", "Số đêm", "Tổng tiền", "Trạng thái", ""]}
              rows={filtered.slice((page - 1) * pageSize, page * pageSize).map(b => [
              <span className="admin-cell-id">#{b.id}</span>,
              <span className="admin-cell-text">{b.userEmail}</span>,
              <span className="admin-cell-name">{b.hotelName || "—"}</span>,
              <span className="admin-cell-text">{b.checkIn}</span>,
              <span className="admin-cell-text">{b.checkOut}</span>,
              <span className="admin-cell-text">{b.nights} đêm</span>,
              <span className="admin-cell-amount">{fmt(b.totalPrice)}</span>,
              <Badge status={b.status} />,
              <Btn small variant="action" onClick={() => setDetail(b)}>Chi tiết</Btn>,
            ])}
              empty="Không có đặt phòng nào"
            />

            {/* Pagination */}
            {filtered.length > pageSize && (
              <div className="admin-pagination">
                {[...Array(Math.ceil(filtered.length / pageSize))].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setPage(i + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className={`admin-page-btn${page === i + 1 ? " active" : ""}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Detail modal */}
      {detail && (
        <Modal title={`📋 Chi tiết đặt phòng #${detail.id}`} onClose={() => setDetail(null)}>
          <div className="admin-modal-info">
            <div className="admin-modal-info-title">{detail.hotelName || "—"}</div>
            <div className="admin-modal-info-sub">{detail.userEmail}</div>
          </div>
          {[
            ["Ngày nhận phòng", detail.checkIn],
            ["Ngày trả phòng",  detail.checkOut],
            ["Số đêm",          `${detail.nights} đêm`],
            ["Tổng tiền",       fmt(detail.totalPrice)],
            ["Ngày đặt",        detail.createdAt],
            ["Trạng thái",      <Badge status={detail.status} />],
          ].map(([k, v]) => (
            <div key={k} className="admin-modal-row">
              <span className="admin-modal-row-key">{k}</span>
              <span className="admin-modal-row-val">{v}</span>
            </div>
          ))}
          <div className="admin-modal-actions-right">
            <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
