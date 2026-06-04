import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  usePartnerBookingDetail, useCompleteBooking,
  useHotelRoomUnits, useUpdateRoomUnit,
} from "../../hooks/usePartnerQueries";
import { PageHeader, Card, Badge, Modal, Btn } from "../../components/admin/AdminLayout";
import { useLang } from "../../contexts/LanguageContext";
import {
  ArrowLeft, Calendar, User, Users, Building2, CreditCard,
  Clock, CheckCircle2, BedDouble, LogIn, AlertTriangle, Pencil,
} from "lucide-react";
import "../../styles/pages/PartnerBookingDetailPage.css";

// ── helpers ────────────────────────────────────────────────────────────────

function fmtPrice(n) {
  return new Intl.NumberFormat("vi-VN").format(n) + " ₫";
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("vi-VN");
}
function canCheckoutBooking(booking) {
  if (booking?.status !== "CONFIRMED" || !booking.checkOut) return false;
  const co = new Date(`${booking.checkOut}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return !isNaN(co) && co <= today;
}
function isCheckinDay(booking) {
  if (booking?.status !== "CONFIRMED" || !booking.checkIn) return false;
  const ci = new Date(`${booking.checkIn}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return !isNaN(ci) && today >= ci;
}

// ── unit status config ─────────────────────────────────────────────────────

const UNIT_CFG = {
  AVAILABLE:   { label: "Trống",     color: "#10b981", bg: "#d1fae5" },
  RESERVED:    { label: "Đã đặt",    color: "#8b5cf6", bg: "#ede9fe" },
  OCCUPIED:    { label: "Có khách",  color: "#3b82f6", bg: "#dbeafe" },
  CLEANING:    { label: "Dọn phòng", color: "#f59e0b", bg: "#fef3c7" },
  MAINTENANCE: { label: "Bảo trì",   color: "#ef4444", bg: "#fee2e2" },
};

function UnitBadge({ status }) {
  const cfg = UNIT_CFG[status] || { label: status, color: "#64748b", bg: "#f1f5f9" };
  return (
    <span className="pbd-unit-badge" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

// ── AssignRoomModal ────────────────────────────────────────────────────────
// mode: "assign" → set RESERVED  |  "checkin" → set OCCUPIED

function AssignRoomModal({ booking, allUnits, customerName, mode, onConfirm, onClose, loading }) {
  const items       = booking?.items ?? [];
  const isCheckin   = mode === "checkin";
  const targetLabel = isCheckin ? "Có khách" : "Đã đặt";
  const targetColor = isCheckin ? "#3b82f6"  : "#8b5cf6";

  const bookingBkTag = `bk:${booking?.bookingId}`;
  const [selected, setSelected] = useState(() => {
    const init = {};
    items.forEach(item => {
      const key = item.roomTypeName || "";
      // Pre-select units already reserved for this booking
      const pre = allUnits
        .filter(u => u.roomName === key && u.notes?.startsWith(bookingBkTag) && u.status === "RESERVED")
        .map(u => u.id);
      init[key] = new Set(pre);
    });
    return init;
  });

  const toggle = (typeName, unitId) => {
    setSelected(prev => {
      const s = new Set(prev[typeName] || []);
      s.has(unitId) ? s.delete(unitId) : s.add(unitId);
      return { ...prev, [typeName]: s };
    });
  };

  const isValid = items.every(item => {
    const key = item.roomTypeName || "";
    return (selected[key]?.size ?? 0) >= item.quantity;
  });

  return (
    <Modal
      title={isCheckin ? `Check-in: ${customerName}` : `Gán phòng: ${customerName}`}
      onClose={onClose}
      width={520}
    >
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
        {isCheckin
          ? <>Chọn phòng vật lý cho khách. Phòng chuyển sang <strong style={{ color: targetColor }}>{targetLabel}</strong>.</>
          : <>Chọn phòng sẽ giữ cho booking này. Phòng chuyển sang <strong style={{ color: targetColor }}>{targetLabel}</strong>.</>
        }
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {items.map((item, idx) => {
          const typeName  = item.roomTypeName || item.roomName || "";
          const available = allUnits.filter(u =>
            u.roomName === typeName &&
            (u.status === "AVAILABLE" ||
             (u.status === "RESERVED" && u.notes?.startsWith(bookingBkTag)))
          );
          const sel      = selected[typeName] || new Set();
          const needed   = item.quantity;
          const selCount = sel.size;

          return (
            <div key={idx}>
              <div className="pbd-modal-type-header">
                <span className="pbd-room-type-name">{typeName}</span>
                <span className="pbd-modal-count" style={{ color: selCount >= needed ? "#10b981" : "#f59e0b" }}>
                  {selCount}/{needed} đã chọn
                </span>
              </div>

              {available.length === 0 ? (
                <p className="pbd-unit-hint pbd-unit-hint--warn">
                  <AlertTriangle size={13} /> Không có phòng trống cho loại này.
                </p>
              ) : (
                <div className="pbd-unit-checklist">
                  {available.map(u => {
                    const checked  = sel.has(u.id);
                    const disabled = !checked && selCount >= needed;
                    return (
                      <label
                        key={u.id}
                        className={`pbd-unit-check-row${disabled ? " disabled" : ""}${checked ? " checked" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggle(typeName, u.id)}
                          style={{ accentColor: "#BE1E2E" }}
                        />
                        <BedDouble size={14} color="#64748b" />
                        <span>
                          {u.roomNumber ? `Phòng ${u.roomNumber}` : `Phòng #${u.id}`}
                          {u.floor != null ? ` · Tầng ${u.floor}` : ""}
                        </span>
                        <UnitBadge status={u.status} />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
        <Btn variant="ghost" onClick={onClose} disabled={loading}>Hủy</Btn>
        <Btn onClick={() => onConfirm(selected)} disabled={!isValid || loading} loading={loading}>
          {isCheckin ? <><LogIn size={14} /> Xác nhận Check-in</> : <><BedDouble size={14} /> Xác nhận Gán phòng</>}
        </Btn>
      </div>
    </Modal>
  );
}

// ── RoomPhysicalSection ────────────────────────────────────────────────────

function RoomPhysicalSection({ booking, allUnits, customerName, onAssign, onCheckin, checkinDay }) {
  const items = booking?.items ?? [];
  const isConfirmed = booking?.status === "CONFIRMED";

  return (
    <Card title={
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <BedDouble size={16} color="#64748b" />
        <span>Phòng vật lý</span>
      </div>
    }>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {items.map((item, idx) => {
          const typeName   = item.roomTypeName || item.roomName || "";
          const bookingTag = `bk:${booking?.bookingId}`;
          const matchUnits = allUnits.filter(u => u.roomName === typeName);
          const assigned   = matchUnits.filter(
            u => u.notes?.startsWith(bookingTag) &&
                 (u.status === "OCCUPIED" || u.status === "RESERVED")
          );

          return (
            <div key={idx} className="pbd-room-type-block">
              <div className="pbd-room-type-header">
                <span className="pbd-room-type-name">{typeName || "Phòng"}</span>
                <span className="pbd-room-type-qty">× {item.quantity}</span>
              </div>

              {matchUnits.length === 0 ? (
                <p className="pbd-unit-hint">Chưa có phòng vật lý nào cho loại này.</p>
              ) : assigned.length > 0 ? (
                <div className="pbd-unit-list">
                  {assigned.map(u => (
                    <div key={u.id} className="pbd-unit-row">
                      <BedDouble size={14} color="#64748b" />
                      <span className="pbd-unit-number">
                        {u.roomNumber ? `Phòng ${u.roomNumber}` : `#${u.id}`}
                        {u.floor != null ? ` · Tầng ${u.floor}` : ""}
                      </span>
                      <UnitBadge status={u.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="pbd-unit-hint pbd-unit-hint--warn">
                  <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                  Chưa gán phòng cụ thể.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      {isConfirmed && (
        <div className="pbd-room-actions">
          {/* Gán phòng — luôn hiện khi CONFIRMED */}
          <button className="pbd-assign-btn" onClick={onAssign}>
            <Pencil size={14} />
            {allUnits.some(u => u.notes?.startsWith(`bk:${booking?.bookingId}`) && u.status === "RESERVED")
              ? "Thay đổi phòng"
              : "Gán phòng"}
          </button>

          {/* Check-in — chỉ hiện khi đến ngày */}
          {checkinDay && (
            <button className="pbd-checkin-btn" onClick={onCheckin}>
              <LogIn size={14} /> Check-in khách
            </button>
          )}
        </div>
      )}

      {isConfirmed && !checkinDay && (
        <p className="pbd-unit-hint" style={{ marginTop: 10 }}>
          Check-in mở vào ngày {fmtDate(booking.checkIn)}.
        </p>
      )}
    </Card>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function PartnerBookingDetailPage() {
  const { t } = useLang();
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [actionError,   setActionError]   = useState("");
  const [actionMessage, setActionMessage] = useState("");
  // modal: null | "assign" | "checkin" | "confirmCheckout"
  const [modalMode, setModalMode] = useState(null);

  const { data: booking, isLoading: loading, error } = usePartnerBookingDetail(bookingId);
  const { data: allUnits = [] } = useHotelRoomUnits(booking?.hotelId);

  const completeBooking = useCompleteBooking();
  const updateUnit      = useUpdateRoomUnit();

  const completing = completeBooking.isPending || updateUnit.isPending;
  const modalBusy  = updateUnit.isPending;

  const customerName = booking?.customerName
    || booking?.contact?.fullName
    || booking?.contact?.email
    || "khách hàng";

  // Dùng notes "bk:<bookingId>" để khớp phòng theo booking, không phải tên khách
  const bkTag = `bk:${booking?.bookingId}`;
  const assignedUnits = allUnits.filter(
    u => u.notes?.startsWith(bkTag) &&
         (u.status === "OCCUPIED" || u.status === "RESERVED")
  );

  // ── gán phòng (RESERVED) ──────────────────────────────────────────────────
  async function handleAssign(selected) {
    const updates = buildUpdates(selected, "RESERVED");
    // Clear previously assigned units not in new selection
    const prevReserved = allUnits.filter(
      u => u.notes?.startsWith(bkTag) && u.status === "RESERVED"
    );
    const newIds = new Set(updates.map(u => u.unitId));
    const toRelease = prevReserved.filter(u => !newIds.has(u.id));

    try {
      await Promise.all([
        ...updates.map(u => updateUnit.mutateAsync(u)),
        ...toRelease.map(u => updateUnit.mutateAsync({
          roomId: u.roomId, unitId: u.id, hotelId: booking.hotelId,
          status: "AVAILABLE", guestName: null,
          notes: null, roomNumber: u.roomNumber ?? null,
          floor: u.floor ?? null, coverImageUrl: u.coverImageUrl ?? null,
        })),
      ]);
      setModalMode(null);
      setActionMessage(`Đã gán ${updates.length} phòng cho ${customerName}.`);
      setActionError("");
    } catch (e) {
      setActionError(e.message || "Gán phòng thất bại.");
    }
  }

  // ── check-in (RESERVED → OCCUPIED) ───────────────────────────────────────
  async function handleCheckin(selected) {
    // Nếu đã có phòng RESERVED → flip luôn, không cần chọn lại
    const reservedUnits = allUnits.filter(
      u => u.notes?.startsWith(bkTag) && u.status === "RESERVED"
    );

    let updates;
    if (reservedUnits.length > 0) {
      // Flip toàn bộ RESERVED → OCCUPIED, giữ nguyên bkTag trong notes
      updates = reservedUnits.map(u => ({
        roomId: u.roomId, unitId: u.id, hotelId: booking.hotelId,
        status: "OCCUPIED", guestName: customerName,
        notes: u.notes, roomNumber: u.roomNumber ?? null,
        floor: u.floor ?? null, coverImageUrl: u.coverImageUrl ?? null,
      }));
    } else {
      // Chưa gán → dùng selection từ modal
      updates = buildUpdates(selected, "OCCUPIED");
    }

    try {
      await Promise.all(updates.map(u => updateUnit.mutateAsync(u)));
      setModalMode(null);
      setActionMessage(`Đã check-in ${updates.length} phòng cho ${customerName}.`);
      setActionError("");
    } catch (e) {
      setActionError(e.message || "Check-in thất bại.");
    }
  }

  // ── complete (checkout + CLEANING) ────────────────────────────────────────
  async function handleComplete() {
    if (!booking) return;
    setModalMode("confirmCheckout");
  }

  async function executeComplete() {
    setModalMode(null);
    setActionError(""); setActionMessage("");
    try {
      await completeBooking.mutateAsync(booking.bookingId);
      await Promise.all(
        assignedUnits.map(u =>
          updateUnit.mutateAsync({
            roomId: u.roomId, unitId: u.id, hotelId: booking.hotelId,
            status: "CLEANING", guestName: null,
            notes: null, roomNumber: u.roomNumber ?? null,
            floor: u.floor ?? null, coverImageUrl: u.coverImageUrl ?? null,
          })
        )
      );
      setActionMessage(
        assignedUnits.length > 0
          ? `${t("pt_bk_checkout_done")} · ${assignedUnits.length} phòng chuyển sang Dọn phòng.`
          : t("pt_bk_checkout_done")
      );
    } catch (e) {
      setActionError(e.message || t("pt_bk_err_checkout"));
    }
  }

  // ── helper: build updateUnit payload list ─────────────────────────────────
  function buildUpdates(selected, status) {
    const updates = [];
    for (const item of (booking?.items ?? [])) {
      const typeName = item.roomTypeName || item.roomName || "";
      for (const uid of [...(selected?.[typeName] ?? [])]) {
        const unit = allUnits.find(u => u.id === uid);
        if (!unit) continue;
        updates.push({
          roomId: unit.roomId, unitId: unit.id, hotelId: booking.hotelId,
          status, guestName: customerName,
          notes: bkTag, roomNumber: unit.roomNumber ?? null,
          floor: unit.floor ?? null, coverImageUrl: unit.coverImageUrl ?? null,
        });
      }
    }
    return updates;
  }

  // ── open check-in: if rooms already reserved, no modal needed ────────────
  function openCheckin() {
    const hasReserved = allUnits.some(
      u => u.notes?.startsWith(bkTag) && u.status === "RESERVED"
    );
    if (hasReserved) {
      handleCheckin(null); // flip directly, no modal
    } else {
      setModalMode("checkin"); // open modal to select + check-in at once
    }
  }

  // ── guards ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>{t("pt_loading")}</div>
  );
  if (error || !booking) return (
    <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>
      {error?.message || t("pt_bk_err_detail")}
    </div>
  );

  const showCheckout = canCheckoutBooking(booking);
  // Chỉ hiện Check-in khi đến ngày nhận phòng VÀ chưa đến ngày trả phòng,
  // tránh trường hợp cả 2 nút cùng hiện vào ngày checkout.
  const checkinDay   = isCheckinDay(booking) && !showCheckout;

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#94a3b8", marginBottom: 16, flexWrap: "wrap" }}>
        <button
          onClick={() => navigate("/partner/bookings")}
          style={{ background: "none", border: "none", color: "#64748b", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 }}
        >
          {t("pt_bk_title")}
        </button>
        <span aria-hidden="true">/</span>
        <span style={{ color: "#1e293b", fontWeight: 700 }}>#{booking.bookingId}</span>
      </nav>

      <div style={{ marginBottom: 24 }}>
        <button onClick={() => navigate("/partner/bookings")} className="partner-booking-detail-back-btn">
          <ArrowLeft size={18} /> {t("pt_bk_back")}
        </button>
      </div>

      <PageHeader
        title={t("pt_bk_detail_title").replace("#{id}", booking.bookingId)}
        subtitle={t("pt_bk_detail_subtitle").replace("{name}", customerName)}
        action={<Badge status={booking.status} />}
      />

      <div className="pbd-grid">

        {/* ── Left ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Hotel + room types */}
          <Card title={t("pt_bk_section_hotel_rooms")}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <Building2 size={18} color="#64748b" style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{t("pt_bk_col_hotel")}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{booking.hotelName}</div>
                </div>
              </div>
              <div style={{ height: 1, background: "#f1f5f9" }} />
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 12 }}>
                  {t("pt_bk_section_rooms")}
                </div>
                {booking.items?.map((item, i) => (
                  <div key={i} style={{
                    background: "#f8fafc", borderRadius: 10, padding: "12px 16px",
                    marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#1e293b" }}>
                        {item.roomTypeName || item.roomName || "Phòng"}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {t("pt_bk_room_qty").replace("{n}", item.quantity)}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: "#BE1E2E" }}>{fmtPrice(item.stayPrice)}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Physical room assignment */}
          <RoomPhysicalSection
            booking={booking}
            allUnits={allUnits}
            customerName={customerName}
            checkinDay={checkinDay}
            onAssign={() => setModalMode("assign")}
            onCheckin={openCheckin}
          />

          {/* Customer */}
          <Card title={t("pt_bk_section_customer")}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <User size={18} color="#64748b" />
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{t("pt_bk_customer_name")}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{customerName}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <CreditCard size={18} color="#64748b" />
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{t("pt_bk_contact")}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                    {booking.contact?.email || booking.contact?.phone || "—"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <Users size={18} color="#64748b" />
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{t("pt_bk_guests")}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                    {booking.guests != null ? `${booking.guests} ${t("pt_bk_guests_unit")}` : "—"}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Right ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Cost + actions */}
          <Card style={{ background: "#FFF1F2", border: "1px solid #FFE4E6" }}>
            <div style={{ fontSize: 12, color: "#BE1E2E", fontWeight: 700, marginBottom: 16 }}>
              {t("pt_bk_section_cost")}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{t("pt_bk_total_label")}</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#BE1E2E" }}>{fmtPrice(booking.totalPrice)}</span>
            </div>

            {(actionError || actionMessage) && (
              <div style={{
                marginTop: 14, padding: "10px 12px", borderRadius: 10,
                fontSize: 12, fontWeight: 700, lineHeight: 1.5,
                background: actionError ? "#fff" : "#ecfdf5",
                border: `1px solid ${actionError ? "#fecaca" : "#bbf7d0"}`,
                color: actionError ? "#b91c1c" : "#047857",
              }}>
                {actionError || actionMessage}
              </div>
            )}

            {showCheckout && (
              <button
                onClick={handleComplete}
                disabled={completing}
                style={{
                  alignItems: "center", background: "#10b981", border: "none",
                  borderRadius: 10, color: "#fff", cursor: completing ? "not-allowed" : "pointer",
                  display: "flex", fontSize: 13, fontWeight: 800, gap: 8,
                  justifyContent: "center", marginTop: 16, opacity: completing ? 0.7 : 1,
                  padding: "12px 14px", width: "100%",
                }}
              >
                <CheckCircle2 size={16} />
                {completing ? t("pt_bk_checking_out") : t("pt_bk_checkout_open")}
              </button>
            )}
          </Card>

          {/* Dates */}
          <Card title={t("pt_bk_section_time")}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                [t("pt_bk_col_checkin"),  fmtDate(booking.checkIn)],
                [t("pt_bk_col_checkout"), fmtDate(booking.checkOut)],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", gap: 12 }}>
                  <Calendar size={18} color="#64748b" />
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{val}</div>
                  </div>
                </div>
              ))}
              <div style={{ height: 1, background: "#f1f5f9" }} />
              <div style={{ display: "flex", gap: 12 }}>
                <Clock size={18} color="#64748b" />
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{t("pt_bk_created_at")}</div>
                  <div style={{ fontSize: 14, color: "#64748b" }}>{fmtDateTime(booking.createdAt)}</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal */}
      {(modalMode === "assign" || modalMode === "checkin") && (
        <AssignRoomModal
          booking={booking}
          allUnits={allUnits}
          customerName={customerName}
          mode={modalMode}
          loading={modalBusy}
          onConfirm={modalMode === "assign" ? handleAssign : handleCheckin}
          onClose={() => setModalMode(null)}
        />
      )}

      {modalMode === "confirmCheckout" && (
        <Modal title={t("pt_bk_confirm_checkout_title") || "Xác nhận hoàn tất"} onClose={() => setModalMode(null)} width={400}>
          <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.65, margin: "0 0 24px" }}>
            {t("pt_bk_confirm_checkout") || `Xác nhận checkout cho khách ${customerName}? Các phòng đã gán sẽ chuyển sang trạng thái Dọn phòng.`}
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <Btn variant="ghost" style={{ flex: 1 }} onClick={() => setModalMode(null)} disabled={completing}>
              {t("pt_cancel") || "Hủy"}
            </Btn>
            <Btn style={{ flex: 1, background: "#10b981" }} onClick={executeComplete} loading={completing}>
              <CheckCircle2 size={15} /> {t("pt_bk_checkout_btn")}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
