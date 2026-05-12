import { useState, useEffect, useCallback } from "react";
import AdminLayout, {
  AP, PageHeader, Card, Badge, Btn, Table, Modal, FormField,
} from "../../components/admin/AdminLayout";
import { adminService } from "../../services/adminService";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";
import { SkeletonRow } from "../../components/ui/Skeleton";
import "../../styles/pages/admin/AdminCommon.css";

const STATUSES = ["", "SUBMITTED", "APPROVED", "REJECTED"];
const REVIEWABLE_STATUSES = new Set(["SUBMITTED", "PENDING"]);
const isReviewable = status => REVIEWABLE_STATUSES.has(status);

export default function AdminPartners({ navigate, user, onLogout }) {
  const [apps, setApps]         = useState([]);
  const [filter, setFilter]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing]     = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const toast = useToast();

  const load = useCallback(async (status = filter) => {
    setLoading(true); setError("");
    try {
      const data = await adminService.getPartnerApplications(status || null);
      setApps(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleFilter = s => { setPage(1); setFilter(s); };

  const handleApprove = async id => {
    setActing(id);
    try { 
      await adminService.approvePartner(id); 
      await load(); 
    }
    catch (e) { toast.error(e.message); }
    setActing(null);
  };

  const handleReject = async () => {
    setActing(rejectModal.id);
    try {
      await adminService.rejectPartner(rejectModal.id, rejectReason);
      setRejectModal(null); setRejectReason("");
      await load();
    } catch (e) { toast.error(e.message); }
    setActing(null);
  };

  const counts = {
    pending:  apps.filter(a => isReviewable(a.status)).length,
    approved: apps.filter(a => a.status === "APPROVED").length,
    rejected: apps.filter(a => a.status === "REJECTED").length,
  };

  return (
    <AdminLayout page="admin-partners" navigate={navigate} user={user} onLogout={onLogout}>

      {/* Summary */}
      <div className="admin-summary-grid admin-summary-grid-3">
        {[
        ].map(c => (
          <div key={c.label} className="admin-summary-card">
            <div className="admin-summary-card-icon">{c.icon}</div>
            <div>
              <div className="admin-summary-card-value">{c.value}</div>
              <div className="admin-summary-card-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <Card>
        {/* Filter tabs */}
        <div className="admin-filter-bar" style={{ marginBottom: 20 }}>
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => handleFilter(s)}
              className={`admin-filter-tab${filter === s ? " active" : ""}`}
            >
              {STATUS_LABEL[s]}
              {s === "SUBMITTED" && counts.pending > 0 && (
                <span className="admin-filter-tab-badge">{counts.pending}</span>
              )}
            </button>
          ))}
        </div>

        {error && <div className="admin-error-alert">⚠️ {error}</div>}

        {loading ? (
          <Table
            rows={Array.from({ length: 5 }).map((_, i) => [
              <SkeletonRow key={i} cols={6} />
            ])}
          />
        ) : (
          <>
            <Table
              rows={apps.slice((page - 1) * pageSize, page * pageSize).map(a => [
              <span className="admin-cell-id">#{a.id}</span>,
              <div className="admin-cell-name">{a.bussinessName || a.businessName || "—"}</div>,
              <span className="admin-cell-text">{a.email || "—"}</span>,
              <span className="admin-cell-text">{a.phoneNumber || a.phone || "—"}</span>,
              <Badge status={a.status} />,
              <div className="admin-cell-actions">
                {isReviewable(a.status) && (
                  <>
                  </>
                )}
              </div>,
            ])}
            />

            {/* Pagination */}
            {apps.length > pageSize && (
              <div className="admin-pagination">
                {[...Array(Math.ceil(apps.length / pageSize))].map((_, i) => (
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
      {detailModal && (
          {[
            ["ID", `#${detailModal.id}`],
          ].map(([k, v]) => (
            <div key={k} className="admin-modal-row">
              <span className="admin-modal-row-key">{k}</span>
              <span className="admin-modal-row-val">{v}</span>
            </div>
          ))}
          {isReviewable(detailModal.status) && (
            <div className="admin-modal-actions">
            </div>
          )}
          {!isReviewable(detailModal.status) && (
            <div className="admin-modal-actions-right">
            </div>
          )}
        </Modal>
      )}

      {/* Reject modal */}
      {rejectModal && (
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={4}
              className="admin-textarea"
            />
          </FormField>
          <div className="admin-modal-actions" style={{ marginTop: 8 }}>
            <Btn variant="danger" disabled={acting === rejectModal.id} onClick={handleReject}>
            </Btn>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
