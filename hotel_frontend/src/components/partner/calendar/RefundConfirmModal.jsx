import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Btn } from "../../admin/AdminLayout";
import { fmtCurrency } from "./calendarUtils";

export default function RefundConfirmModal({ pending, onConfirm, onCancel, loading }) {
  if (!pending) return null;
  const isApprove = pending.type === "approve";

  return (
    <div className="pcrc-overlay" role="dialog" aria-modal="true">
      <div className="pcrc-modal">
        <div className={`pcrc-icon ${isApprove ? "pcrc-icon--green" : "pcrc-icon--red"}`}>
          {isApprove
            ? <CheckCircle2 size={30} />
            : <XCircle     size={30} />
          }
        </div>

        <div className="pcrc-title">
          {isApprove ? "Xác nhận duyệt hoàn tiền?" : "Xác nhận từ chối hoàn tiền?"}
        </div>

        <div className="pcrc-body">
          {isApprove ? "Duyệt yêu cầu hoàn tiền từ " : "Từ chối yêu cầu từ "}
          <strong>{pending.refund.userEmail}</strong>
          {" — số tiền "}
          <strong style={{ color: isApprove ? "#059669" : "#BE1E2E" }}>
            {fmtCurrency(pending.refund.amount)}
          </strong>
          .
        </div>

        {!isApprove && (
          <div className="pcrc-warn">
            <AlertTriangle size={12} style={{ flexShrink: 0 }} />
            Thao tác từ chối không thể hoàn tác sau khi xác nhận.
          </div>
        )}

        <div className="pcrc-actions">
          <Btn variant="ghost" onClick={onCancel} disabled={loading}>
            Huỷ
          </Btn>
          <Btn
            variant={isApprove ? "success" : "danger"}
            loading={loading}
            onClick={onConfirm}
          >
            {isApprove ? "Xác nhận duyệt" : "Xác nhận từ chối"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
