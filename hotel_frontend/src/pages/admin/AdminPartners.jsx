import { useState, useEffect, useCallback } from "react";
import AdminLayout, {
  AP, PageHeader, Card, Badge, Btn, Table, Modal, FormField,
} from "../../components/admin/AdminLayout";
import { adminService } from "../../services/adminService";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";
import { SkeletonRow } from "../../components/ui/Skeleton";
import { useLang } from "../../contexts/LanguageContext";
import "../../styles/pages/admin/AdminCommon.css";

const STATUSES = ["", "SUBMITTED", "APPROVED", "REJECTED"];
const REVIEWABLE_STATUSES = new Set(["SUBMITTED", "PENDING"]);
const isReviewable = status => REVIEWABLE_STATUSES.has(status);

export default function AdminPartners({ navigate, user, onLogout }) {
  const { t } = useLang();
  const STATUS_LABEL = { "": t("adm_partners_tab_all"), SUBMITTED: t("adm_partners_tab_pending"), APPROVED: t("adm_partners_tab_approved"), REJECTED: t("adm_partners_tab_rejected") };
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
    if (!window.confirm(t("adm_partners_confirm_approve"))) return;
    setActing(id);
    try {
      await adminService.approvePartner(id);
      toast.success(t("adm_partners_toast_approved"));
      await load();
    }
    catch (e) { toast.error(e.message); }
    setActing(null);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.warning(t("adm_partners_err_reason")); return; }
    setActing(rejectModal.id);
    try {
      await adminService.rejectPartner(rejectModal.id, rejectReason);
      toast.success(t("adm_partners_toast_rejected"));
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
      <PageHeader title={t("adm_partners_title")} subtitle={t("adm_partners_subtitle")} />

      {/* Summary */}
      <div className="admin-summary-grid admin-summary-grid-3">
        {[
          { label: t("adm_partners_tab_pending"),  value: counts.pending,  icon: <Clock size={24} color={AP} /> },
          { label: t("adm_partners_tab_approved"), value: counts.approved, icon: <CheckCircle size={24} color={AP} /> },
          { label: t("adm_partners_tab_rejected"), value: counts.rejected, icon: <XCircle size={24} color={AP} /> },
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
            headers={[t("adm_id"), t("adm_partners_col_biz"), t("adm_email"), t("adm_partners_col_phone"), t("adm_status"), t("adm_actions")]}
            rows={Array.from({ length: 5 }).map((_, i) => [
              <SkeletonRow key={i} cols={6} />
            ])}
          />
        ) : (
          <>
            <Table
              headers={[t("adm_id"), t("adm_partners_col_biz"), t("adm_email"), t("adm_partners_col_phone"), t("adm_status"), t("adm_actions")]}
              rows={apps.slice((page - 1) * pageSize, page * pageSize).map(a => [
              <span className="admin-cell-id">#{a.id}</span>,
              <div className="admin-cell-name">{a.bussinessName || a.businessName || "—"}</div>,
              <span className="admin-cell-text">{a.email || "—"}</span>,
              <span className="admin-cell-text">{a.phoneNumber || a.phone || "—"}</span>,
              <Badge status={a.status} />,
              <div className="admin-cell-actions">
                <Btn small variant="action" onClick={() => setDetailModal(a)}>{t("adm_view")}</Btn>
                {isReviewable(a.status) && (
                  <>
                    <Btn small variant="success" loading={acting === a.id} onClick={() => handleApprove(a.id)}>{t("adm_approve")}</Btn>
                    <Btn small variant="danger" loading={acting === a.id} onClick={() => { setRejectModal({ id: a.id }); setRejectReason(""); }}>{t("adm_reject")}</Btn>
                  </>
                )}
              </div>,
            ])}
              empty={t("adm_partners_empty")}
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
        <Modal title={t("adm_partners_modal_title")} onClose={() => setDetailModal(null)}>
          {[
            ["ID", `#${detailModal.id}`],
            [t("adm_partners_col_biz"), detailModal.bussinessName || detailModal.businessName || "—"],
            [t("adm_email"), detailModal.email || "—"],
            [t("adm_partners_col_phone"), detailModal.phoneNumber || detailModal.phone || "—"],
            [t("adm_status"), <Badge status={detailModal.status} />],
          ].map(([k, v]) => (
            <div key={k} className="admin-modal-row">
              <span className="admin-modal-row-key">{k}</span>
              <span className="admin-modal-row-val">{v}</span>
            </div>
          ))}
          {isReviewable(detailModal.status) && (
            <div className="admin-modal-actions">
              <Btn variant="danger" onClick={() => { setDetailModal(null); setRejectModal({ id: detailModal.id }); setRejectReason(""); }}>{t("adm_partners_btn_reject")}</Btn>
              <Btn variant="success" onClick={() => { setDetailModal(null); handleApprove(detailModal.id); }}>{t("adm_partners_btn_approve")}</Btn>
            </div>
          )}
          {!isReviewable(detailModal.status) && (
            <div className="admin-modal-actions-right">
              <Btn variant="ghost" onClick={() => setDetailModal(null)}>{t("adm_close")}</Btn>
            </div>
          )}
        </Modal>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <Modal title={t("adm_partners_btn_reject")} onClose={() => setRejectModal(null)}>
          <p style={{ fontSize: 13, color: "#555", marginBottom: 14 }}>{t("adm_partners_reject_hint")}</p>
          <FormField label={t("adm_partners_reject_title")} required>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder={t("adm_partners_reject_ph")}
              rows={4}
              className="admin-textarea"
            />
          </FormField>
          <div className="admin-modal-actions" style={{ marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setRejectModal(null)}>{t("adm_cancel")}</Btn>
            <Btn variant="danger" disabled={acting === rejectModal.id} onClick={handleReject}>
              {acting === rejectModal.id ? t("adm_processing") : t("adm_partners_reject_submit")}
            </Btn>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
