import { useState, useEffect, useCallback } from "react";
import AdminLayout, { AP, PageHeader, Card, Badge, Btn, Table, Modal } from "../../components/admin/AdminLayout";
import { adminService } from "../../services/adminService";
import "../../styles/pages/admin/AdminCommon.css";

const STATUSES = ["", "PENDING", "APPROVED", "REJECTED"];
const STATUS_LABEL = { "": "Tất cả", PENDING: "Chờ duyệt", APPROVED: "Đã duyệt", REJECTED: "Từ chối" };

function fmt(n) {
  if (!n && n !== 0) return "—";
  return Number(n).toLocaleString("vi-VN") + " ₫";
}

export default function AdminRefunds({ navigate, user, onLogout }) {
  const [refunds, setRefunds] = useState([]);
  const [filter, setFilter]   = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail]   = useState(null);
  const [acting, setActing]   = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = useCallback(async (status = filter) => {
    setLoading(true);
    const data = await adminService.getRefunds(status);
    setRefunds(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  const handleFilter = s => { setPage(1); setFilter(s); };

  const handleAction = async (id, newStatus) => {
    const label = newStatus === "APPROVED" ? "phê duyệt" : "từ chối";
    if (!window.confirm(`Xác nhận ${label} yêu cầu hoàn tiền này?`)) return;
    setActing(id);
    try {
      const updated = await adminService.updateRefundStatus(id, newStatus);
      setRefunds(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
      if (detail?.id === id) setDetail(d => ({ ...d, ...updated }));
    } catch (e) {
      alert(e.message || "Không thể cập nhật yêu cầu hoàn tiền.");
    } finally {
      setActing(null);
    }
  };

  const pending      = refunds.filter(r => r.status === "PENDING").length;
  const approved     = refunds.filter(r => r.status === "APPROVED").length;
  const rejected     = refunds.filter(r => r.status === "REJECTED").length;
  const totalPending = refunds.filter(r => r.status === "PENDING").reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <AdminLayout page="admin-refunds" navigate={navigate} user={user} onLogout={onLogout}>
      <PageHeader title="Quản lý hoàn tiền" subtitle="Xem xét và xử lý các yêu cầu hoàn tiền từ khách hàng" />

      {/* Summary */}
      <div className="admin-summary-grid admin-summary-grid-4">
        {[
          { label: "Chờ duyệt",     value: pending,           color: "#f57f17", icon: "⏳" },
          { label: "Đã duyệt",      value: approved,          color: "#2e7d32", icon: "✅" },
          { label: "Từ chối",       value: rejected,          color: "#c62828", icon: "❌" },
          { label: "Tổng chờ hoàn", value: fmt(totalPending), color: AP,        icon: "💰", isStr: true },
        ].map(c => (
          <div key={c.label} className="admin-summary-card">
            <span className="admin-summary-card-icon">{c.icon}</span>
            <div>
              <div className="admin-summary-card-value" style={{ fontSize: c.isStr ? 15 : 24, color: c.color }}>{c.value}</div>
              <div className="admin-summary-card-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <Card>
        {/* Tabs */}
        <div className="admin-filter-bar">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => handleFilter(s)}
              className={`admin-filter-tab${filter === s ? " active" : ""}`}
            >
              {STATUS_LABEL[s]}
              {s === "PENDING" && pending > 0 && (
                <span className="admin-filter-tab-badge">{pending}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="admin-loading">Đang tải dữ liệu...</div>
        ) : (
          <>
            <Table
              headers={["#ID", "Booking", "Người dùng", "Khách sạn", "Số tiền hoàn", "Trạng thái", "Thao tác"]}
              rows={refunds.slice((page - 1) * pageSize, page * pageSize).map(r => [
              <span className="admin-cell-id">#{r.id}</span>,
              <span className="admin-cell-id">#B{r.bookingId}</span>,
              <span className="admin-cell-text">{r.userEmail}</span>,
              <span className="admin-cell-name">{r.hotelName}</span>,
              <span className="admin-cell-amount">{fmt(r.amount)}</span>,
              <Badge status={r.status} />,
              <div className="admin-cell-actions">
                <Btn small variant="action" onClick={() => setDetail(r)}>👁 Xem</Btn>
                {r.status === "PENDING" && (
                  <>
                    <Btn small variant="success" disabled={acting === r.id} onClick={() => handleAction(r.id, "APPROVED")}>Duyệt</Btn>
                    <Btn small variant="danger"  disabled={acting === r.id} onClick={() => handleAction(r.id, "REJECTED")}>Từ chối</Btn>
                  </>
                )}
              </div>,
            ])}
              empty="Không có yêu cầu hoàn tiền nào"
            />

            {/* Pagination */}
            {refunds.length > pageSize && (
              <div className="admin-pagination">
                {[...Array(Math.ceil(refunds.length / pageSize))].map((_, i) => (
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
        <Modal title={`💰 Yêu cầu hoàn tiền #${detail.id}`} onClose={() => setDetail(null)}>
          <div className="admin-modal-info">
            <div className="admin-modal-info-title">{detail.hotelName}</div>
            <div className="admin-modal-info-sub">{detail.userEmail}</div>
          </div>
          {[
            ["Mã đặt phòng",   `#B${detail.bookingId}`],
            ["Số tiền hoàn",   fmt(detail.amount)],
            ["Ngày đặt phòng", detail.bookingDate || "—"],
            ["Ngày yêu cầu",   detail.requestedAt || "—"],
            ["Lý do",          detail.reason],
            ["Trạng thái",     <Badge status={detail.status} />],
          ].map(([k, v]) => (
            <div key={k} className="admin-modal-row">
              <span className="admin-modal-row-key">{k}</span>
              <span className="admin-modal-row-val">{v}</span>
            </div>
          ))}
          {detail.status === "PENDING" && (
            <div className="admin-modal-actions">
              <Btn variant="danger"  onClick={() => handleAction(detail.id, "REJECTED")}>❌ Từ chối</Btn>
              <Btn variant="success" onClick={() => handleAction(detail.id, "APPROVED")}>✅ Phê duyệt</Btn>
            </div>
          )}
          {detail.status !== "PENDING" && (
            <div className="admin-modal-actions-right">
              <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
            </div>
          )}
        </Modal>
      )}
    </AdminLayout>
  );
}
