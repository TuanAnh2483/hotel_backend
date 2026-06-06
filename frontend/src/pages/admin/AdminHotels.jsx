import { useState } from "react";
import AdminLayout, {
  AP, PageHeader, Card, Badge, Btn, SearchInput,
  Table, Modal, FormField, Input, Select,
} from "../../components/admin/AdminLayout";
import {
  useAdminHotels, useUpdateAdminHotel, useDeleteAdminHotel,
  useAdminHotelRooms, useApproveAdminHotel, useRejectAdminHotel,
} from "../../hooks/useAdminQueries";
import { useLang } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { HOTEL_AMENITIES_FLAT, ROOM_AMENITIES_FLAT } from "../../utils/amenityConfig";
import { Building2, CheckCircle2, Star, Clock, XCircle, Eye, Pencil, Trash2, Check } from "lucide-react";
import { useVnLocations } from "../../hooks/useVnLocations";
import "../../styles/pages/admin/AdminCommon.css";

const HOTEL_AMENITY_LABEL = Object.fromEntries(HOTEL_AMENITIES_FLAT.map(a => [a.key, a.label]));
const ROOM_AMENITY_LABEL  = Object.fromEntries(ROOM_AMENITIES_FLAT.map(a => [a.key, a.label]));

const HOTEL_TYPES = ["HOTEL", "RESORT", "VILLA", "APARTMENT", "HOMESTAY", "HOSTEL", "GUEST_HOUSE"];
const EMPTY_FORM  = { name: "", province: "", district: "", address: "", hotelType: "HOTEL", description: "" };

// Khách sạn ở trạng thái nào thì hiện nút duyệt/từ chối
const isPending = h => h.status === "PENDING_APPROVAL";

export default function AdminHotels({ navigate, user, onLogout }) {
  const { t } = useLang();
  const toast  = useToast();

  const HOTEL_TYPE_LABEL = {
    HOTEL: t("pt_type_hotel"), RESORT: t("pt_type_resort"), VILLA: t("pt_type_villa"),
    APARTMENT: t("pt_type_apartment"), HOMESTAY: t("pt_type_homestay"),
    HOSTEL: t("pt_type_hostel"), GUEST_HOUSE: t("pt_type_guesthouse"),
  };
  const TAB_LABEL = {
    "":                 t("adm_hotels_tab_all")     || "Tất cả",
    "PENDING_APPROVAL": t("adm_hotels_tab_pending")  || "Chờ duyệt",
    "ACTIVE":           t("adm_hotels_tab_active")   || "Hoạt động",
    "REJECTED":         t("adm_hotels_tab_rejected") || "Từ chối",
  };

  const [search,     setSearch]     = useState("");
  const [tabStatus,  setTabStatus]  = useState("");
  const [filterType, setFilterType] = useState("");
  const [page,       setPage]       = useState(1);
  const [modal,      setModal]      = useState(null); // null | "detail" | "approve" | "reject" | "edit" | "delete"
  const [selected,   setSelected]   = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [rejectReason, setRejectReason] = useState("");
  const [formError,  setFormError]  = useState("");
  const pageSize = 10;

  const { data: hotels = [], isLoading: loading } = useAdminHotels();
  const { data: selectedRooms = [], isLoading: roomsLoading } =
    useAdminHotelRooms((modal === "detail") ? selected?.id : null);

  const updateHotel  = useUpdateAdminHotel();
  const deleteHotel  = useDeleteAdminHotel();
  const approveHotel = useApproveAdminHotel();
  const rejectHotel  = useRejectAdminHotel();
  const acting = updateHotel.isPending || deleteHotel.isPending ||
                 approveHotel.isPending || rejectHotel.isPending;

  // ── Filtering ───────────────────────────────────────────────────────
  const filtered = hotels.filter(h => {
    const q = search.toLowerCase();
    const matchQ      = !q         || (h.name || "").toLowerCase().includes(q) || (h.province || "").toLowerCase().includes(q) || (h.ownerEmail || "").toLowerCase().includes(q);
    const matchType   = !filterType || h.hotelType === filterType;
    const matchStatus = !tabStatus   || h.status    === tabStatus;
    return matchQ && matchType && matchStatus;
  });
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ── Summary counts ──────────────────────────────────────────────────
  const counts = {
    total:   hotels.length,
    pending: hotels.filter(h => h.status === "PENDING_APPROVAL").length,
    active:  hotels.filter(h => h.status === "ACTIVE").length,
    avg:     hotels.length
      ? (hotels.reduce((s, h) => s + (Number(h.ratingAvg) || 0), 0) / hotels.length).toFixed(1)
      : "—",
  };

  // ── Helpers ─────────────────────────────────────────────────────────
  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const { provinceOptions, districtOptions, loadingProvinces, loadingDistricts } = useVnLocations(form.province);
  const visibleDistricts = form.district && !districtOptions.includes(form.district)
    ? [form.district, ...districtOptions]
    : districtOptions;

  const switchTab = s => { setPage(1); setTabStatus(s); };

  const openDetail  = h => { setSelected(h); setModal("detail"); };
  const openApprove = h => { setSelected(h); setModal("approve"); };
  const openReject  = h => { setSelected(h); setRejectReason(""); setModal("reject"); };
  const openEdit    = h => {
    setFormError("");
    setSelected(h);
    setForm({ name: h.name || "", province: h.province || "", district: h.district || "", address: h.address || "", hotelType: h.hotelType || "HOTEL", description: h.description || "" });
    setModal("edit");
  };
  const openDel = h => { setFormError(""); setSelected(h); setModal("delete"); };
  const close   = () => setModal(null);

  // ── Actions ─────────────────────────────────────────────────────────
  const handleApprove = () => {
    if (!selected) return;
    approveHotel.mutate(selected.id, {
      onSuccess: () => { toast.success(`Đã duyệt khách sạn "${selected.name}".`); close(); },
      onError:   e  => toast.error(e.message || "Duyệt thất bại."),
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) { toast.warning("Vui lòng nhập lý do từ chối."); return; }
    rejectHotel.mutate({ hotelId: selected.id, reason: rejectReason }, {
      onSuccess: () => { toast.success(`Đã từ chối khách sạn "${selected.name}".`); close(); },
      onError:   e  => toast.error(e.message || "Từ chối thất bại."),
    });
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.province.trim() || !form.district.trim() || !form.address.trim()) return;
    setFormError("");
    updateHotel.mutate({ hotelId: selected.id, ...form }, {
      onSuccess: () => { toast.success("Đã cập nhật khách sạn."); close(); },
      onError:   e  => setFormError(e.message || t("adm_hotels_err_update")),
    });
  };

  const handleDelete = () => {
    setFormError("");
    deleteHotel.mutate(selected.id, {
      onSuccess: () => { toast.success("Đã xóa khách sạn."); close(); },
      onError:   e  => setFormError(e.message || t("adm_hotels_err_delete")),
    });
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <AdminLayout page="admin-hotels" navigate={navigate} user={user} onLogout={onLogout}>
      <PageHeader
        title={t("adm_hotels_title")}
        subtitle={t("adm_hotels_subtitle")}
      />

      {/* ── Summary cards ── */}
      <div className="admin-summary-grid admin-summary-grid-4">
        {[
          { label: t("adm_hotels_total"),      value: counts.total,   color: AP,        Icon: Building2   },
          { label: TAB_LABEL.PENDING_APPROVAL, value: counts.pending, color: "#d97706", Icon: Clock,       onClick: () => switchTab("PENDING_APPROVAL") },
          { label: TAB_LABEL.ACTIVE,           value: counts.active,  color: "#2e7d32", Icon: CheckCircle2, onClick: () => switchTab("ACTIVE") },
          { label: t("adm_hotels_avg_rating"), value: counts.avg,     color: "#f5a623", Icon: Star         },
        ].map(c => (
          <div
            key={c.label}
            className="admin-summary-card"
            onClick={c.onClick}
            style={{ cursor: c.onClick ? "pointer" : "default" }}
          >
            <div className="admin-summary-card-icon">
              <c.Icon size={22} color={c.color} aria-hidden="true" />
            </div>
            <div>
              <div className="admin-summary-card-value" style={{ color: c.color }}>{c.value}</div>
              <div className="admin-summary-card-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <Card>
        {/* ── Filter tabs ── */}
        <div className="admin-filter-bar">
          {Object.entries(TAB_LABEL).map(([status, label]) => (
            <button
              key={status}
              onClick={() => switchTab(status)}
              className={`admin-filter-tab${tabStatus === status ? " active" : ""}`}
            >
              {label}
              {status === "PENDING_APPROVAL" && counts.pending > 0 && (
                <span className="admin-filter-tab-badge">{counts.pending}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="admin-table-toolbar">
          <div className="admin-table-toolbar-left">
            <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder={t("adm_hotels_search_ph")} />
            <select
              value={filterType}
              onChange={e => { setFilterType(e.target.value); setPage(1); }}
              style={{ padding: "9px 12px", borderRadius: 9, border: "1px solid #e5e5e5", fontSize: 13, background: "#f8f9fa", cursor: "pointer", fontFamily: "inherit" }}
            >
              <option value="">{t("adm_hotels_filter_type")}</option>
              {HOTEL_TYPES.map(ht => <option key={ht} value={ht}>{HOTEL_TYPE_LABEL[ht]}</option>)}
            </select>
          </div>
          <span style={{ fontSize: 12, color: "#aaa", fontWeight: 600 }}>
            {t("adm_hotels_count").replace("{count}", filtered.length)}
          </span>
        </div>

        {/* ── Pending notice banner ── */}
        {counts.pending > 0 && tabStatus !== "PENDING_APPROVAL" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13 }}>
            <Clock size={16} color="#d97706" style={{ flexShrink: 0 }} aria-hidden="true" />
            <span style={{ color: "#92400e", fontWeight: 600 }}>
              Có <strong>{counts.pending} khách sạn</strong> đang chờ duyệt.
            </span>
            <button
              onClick={() => switchTab("PENDING_APPROVAL")}
              style={{ marginLeft: "auto", background: "#d97706", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              Xem ngay
            </button>
          </div>
        )}

        {loading ? (
          <div className="admin-loading">{t("adm_loading")}</div>
        ) : (
          <>
            <Table
              headers={[
                t("adm_id"), t("adm_hotels_col_name"), t("adm_hotels_col_partner"),
                t("adm_hotels_col_loc"), t("adm_hotels_col_type"),
                t("adm_hotels_col_rating"), t("adm_status"), t("adm_actions"),
              ]}
              rows={paginated.map(h => [
                <span className="admin-cell-id">#{h.id}</span>,

                <div>
                  <div className="admin-cell-name">{h.name}</div>
                  {h.description && (
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                      {h.description.slice(0, 50)}{h.description.length > 50 ? "…" : ""}
                    </div>
                  )}
                </div>,

                <span className="admin-cell-text">{h.ownerEmail || "—"}</span>,

                <span className="admin-cell-text">
                  {[h.district, h.province].filter(Boolean).join(", ") || "—"}
                </span>,

                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: "#f0f4ff", color: "#4361ee", whiteSpace: "nowrap" }}>
                  {HOTEL_TYPE_LABEL[h.hotelType] || h.hotelType || "—"}
                </span>,

                <span style={{ fontWeight: 700, color: "#f5a623" }}>
                  {h.ratingAvg > 0 ? `★ ${Number(h.ratingAvg).toFixed(1)}` : "—"}
                  {h.ratingCount > 0 && <span style={{ color: "#aaa", fontWeight: 400, fontSize: 11 }}> ({h.ratingCount})</span>}
                </span>,

                <Badge status={h.status || "ACTIVE"} />,

                <div className="admin-cell-actions">
                  <Btn small iconOnly variant="action" title="Chi tiết" onClick={() => openDetail(h)}>
                    <Eye size={14} />
                  </Btn>
                  {isPending(h) ? (
                    <>
                      <Btn small iconOnly variant="success" title="Duyệt" onClick={() => openApprove(h)}>
                        <Check size={14} />
                      </Btn>
                      <Btn small iconOnly variant="danger" title="Từ chối" onClick={() => openReject(h)}>
                        <XCircle size={14} />
                      </Btn>
                    </>
                  ) : (
                    <>
                      <Btn small iconOnly variant="secondary" title={t("adm_edit")} onClick={() => openEdit(h)}>
                        <Pencil size={14} />
                      </Btn>
                      <Btn small iconOnly variant="danger" title={t("adm_delete")} onClick={() => openDel(h)}>
                        <Trash2 size={14} />
                      </Btn>
                    </>
                  )}
                </div>,
              ])}
              empty={t("adm_hotels_empty")}
            />

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

      {/* ── Approve modal ── */}
      {modal === "approve" && selected && (
        <Modal title="Duyệt khách sạn" onClose={close} width={460}>
          <div style={{ marginBottom: 20 }}>
            <div className="admin-modal-info">
              <div className="admin-modal-info-title">{selected.name}</div>
              <div className="admin-modal-info-sub">
                {[selected.district, selected.province].filter(Boolean).join(", ") || "—"}
                {selected.ownerEmail && <> · {selected.ownerEmail}</>}
              </div>
            </div>
            <p style={{ fontSize: 13, color: "#555", margin: 0, lineHeight: 1.6 }}>
              Xác nhận duyệt khách sạn này? Sau khi duyệt, khách sạn sẽ hiển thị trên
              hệ thống và khách hàng có thể đặt phòng.
            </p>
          </div>
          <div className="admin-modal-actions">
            <Btn variant="ghost" onClick={close} disabled={acting}>{t("adm_cancel")}</Btn>
            <Btn variant="success" onClick={handleApprove} loading={approveHotel.isPending}>
              <CheckCircle2 size={14} /> Duyệt ngay
            </Btn>
          </div>
        </Modal>
      )}

      {/* ── Reject modal ── */}
      {modal === "reject" && selected && (
        <Modal title="Từ chối khách sạn" onClose={close} width={480}>
          <div className="admin-modal-info" style={{ marginBottom: 16 }}>
            <div className="admin-modal-info-title">{selected.name}</div>
            <div className="admin-modal-info-sub">
              {[selected.district, selected.province].filter(Boolean).join(", ") || "—"}
            </div>
          </div>
          <p style={{ fontSize: 13, color: "#555", marginBottom: 14, lineHeight: 1.6 }}>
            Lý do từ chối sẽ được gửi đến partner để họ biết cần chỉnh sửa gì.
          </p>
          <FormField label="Lý do từ chối" required>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Thông tin địa chỉ không chính xác, thiếu ảnh khách sạn, loại hình không khớp..."
              rows={4}
              className="admin-textarea"
            />
          </FormField>
          <div className="admin-modal-actions" style={{ marginTop: 8 }}>
            <Btn variant="ghost" onClick={close} disabled={acting}>{t("adm_cancel")}</Btn>
            <Btn variant="danger" onClick={handleReject} loading={rejectHotel.isPending}>
              <XCircle size={14} /> Xác nhận từ chối
            </Btn>
          </div>
        </Modal>
      )}

      {/* ── Detail modal ── */}
      {modal === "detail" && selected && (
        <Modal title={`Chi tiết: ${selected.name}`} onClose={close} width={620}>
          {/* Status banner for pending */}
          {isPending(selected) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
              <Clock size={15} color="#d97706" aria-hidden="true" />
              <span style={{ color: "#92400e", fontWeight: 700 }}>Khách sạn đang chờ duyệt</span>
            </div>
          )}

          {/* Info grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", marginBottom: 18, fontSize: 13 }}>
            {[
              ["Mã KS",       `#${selected.id}`],
              ["Chủ sở hữu",  selected.ownerEmail],
              ["Loại hình",   HOTEL_TYPE_LABEL[selected.hotelType] || selected.hotelType],
              ["Trạng thái",  <Badge status={selected.status} />],
              ["Đánh giá",    selected.ratingAvg > 0 ? `★ ${Number(selected.ratingAvg).toFixed(1)} (${selected.ratingCount})` : "Chưa có"],
              ["Tỉnh/Thành",  selected.province],
              ["Quận/Huyện",  selected.district],
              ["Địa chỉ",     selected.address],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 6 }}>
                <span style={{ color: "#999", minWidth: 90, fontWeight: 600 }}>{k}:</span>
                <span style={{ color: "#333", fontWeight: 500, wordBreak: "break-all" }}>{v || "—"}</span>
              </div>
            ))}
            {selected.description && (
              <div style={{ gridColumn: "1/-1", display: "flex", gap: 6 }}>
                <span style={{ color: "#999", minWidth: 90, fontWeight: 600 }}>Mô tả:</span>
                <span style={{ color: "#555", fontStyle: "italic" }}>{selected.description}</span>
              </div>
            )}
          </div>

          {/* Standard amenities */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#666", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Tiện ích tiêu chuẩn ({selected.amenities?.length || 0})
            </div>
            {selected.amenities?.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[...selected.amenities].map(a => (
                  <span key={a} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: "#f0f4ff", color: "#4361ee", fontWeight: 600, border: "1px solid #d0daff" }}>
                    {HOTEL_AMENITY_LABEL[a] || a}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12, color: "#bbb" }}>Chưa có tiện ích tiêu chuẩn</span>
            )}
          </div>

          {/* Custom amenities */}
          <div style={{ marginBottom: 16, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Tiện ích tùy chỉnh của partner ({selected.customAmenities?.length || 0})
            </div>
            {selected.customAmenities?.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[...selected.customAmenities].map(a => (
                  <span key={a} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: "#fef3c7", color: "#92400e", fontWeight: 700, border: "1px solid #fde68a" }}>
                    {a}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12, color: "#b45309" }}>Partner chưa thêm tiện ích tùy chỉnh</span>
            )}
          </div>

          {/* Rooms */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#666", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Danh sách phòng ({roomsLoading ? "…" : selectedRooms.length})
            </div>
            {roomsLoading ? (
              <div style={{ color: "#bbb", fontSize: 13, padding: "10px 0" }}>Đang tải phòng…</div>
            ) : selectedRooms.length === 0 ? (
              <div style={{ color: "#bbb", fontSize: 13, padding: "10px 0" }}>Chưa có phòng nào</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {selectedRooms.map(room => (
                  <div key={room.id} style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: "10px 14px", background: "#fafafa" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#1a1a1a" }}>
                        {room.name}
                        <span style={{ fontWeight: 400, fontSize: 11, color: "#999", marginLeft: 8 }}>#{room.id}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#666", display: "flex", gap: 10 }}>
                        <span>{room.price?.toLocaleString("vi-VN")} ₫/đêm</span>
                        <span>·</span>
                        <span>{room.capacity} khách</span>
                        <span>·</span>
                        <Badge status={room.status || "ACTIVE"} />
                      </div>
                    </div>
                    {room.amenities?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: room.customAmenities?.length > 0 ? 6 : 0 }}>
                        {[...room.amenities].map(a => (
                          <span key={a} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f0f4ff", color: "#4361ee", fontWeight: 600, border: "1px solid #d0daff" }}>
                            {ROOM_AMENITY_LABEL[a] || a}
                          </span>
                        ))}
                      </div>
                    )}
                    {room.customAmenities?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                        {[...room.customAmenities].map(a => (
                          <span key={a} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#fef3c7", color: "#92400e", fontWeight: 700, border: "1px solid #fde68a" }}>
                            ✨ {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          {isPending(selected) ? (
            <div className="admin-modal-actions">
              <Btn variant="ghost" onClick={close}>{t("adm_close")}</Btn>
              <Btn variant="danger"  onClick={() => { close(); openReject(selected); }}>Từ chối</Btn>
              <Btn variant="success" onClick={() => { close(); openApprove(selected); }}>Duyệt</Btn>
            </div>
          ) : (
            <div className="admin-modal-actions">
              <Btn variant="ghost" onClick={close}>{t("adm_close")}</Btn>
              <Btn variant="action" onClick={() => { close(); openEdit(selected); }}>{t("adm_edit")}</Btn>
            </div>
          )}
        </Modal>
      )}

      {/* ── Edit modal ── */}
      {modal === "edit" && (
        <Modal title={t("adm_hotels_edit_title")} onClose={close} width={520}>
          {formError && <div className="admin-error-alert">{formError}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <FormField label={t("adm_hotels_col_name")} required>
                <Input value={form.name} onChange={upd("name")} placeholder={t("adm_hotels_name_ph")} />
              </FormField>
            </div>
            <div style={{ paddingRight: 8 }}>
              <FormField label={t("adm_hotels_province")} required>
                <Select
                  value={form.province}
                  onChange={e => setForm(f => ({ ...f, province: e.target.value, district: "" }))}
                  disabled={loadingProvinces}
                >
                  <option value="">{loadingProvinces ? "Đang tải..." : t("adm_hotels_province_ph")}</option>
                  {provinceOptions.map(p => <option key={p.code} value={p.name}>{p.name}</option>)}
                </Select>
              </FormField>
            </div>
            <div style={{ paddingLeft: 8 }}>
              <FormField label={t("adm_hotels_district")} required>
                <Select value={form.district} onChange={upd("district")} disabled={!form.province || loadingDistricts}>
                  <option value="">{loadingDistricts ? "Đang tải quận/huyện..." : t("adm_hotels_district_ph")}</option>
                  {visibleDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
              </FormField>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <FormField label={t("adm_hotels_address")} required>
                <Input value={form.address} onChange={upd("address")} placeholder={t("adm_hotels_address_ph")} />
              </FormField>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <FormField label={t("adm_hotels_type")}>
                <Select value={form.hotelType} onChange={upd("hotelType")}>
                  {HOTEL_TYPES.map(ht => <option key={ht} value={ht}>{HOTEL_TYPE_LABEL[ht]}</option>)}
                </Select>
              </FormField>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <FormField label={t("adm_hotels_desc")}>
                <textarea
                  value={form.description}
                  onChange={upd("description")}
                  placeholder={t("adm_hotels_desc_ph")}
                  rows={3}
                  className="admin-textarea"
                />
              </FormField>
            </div>
          </div>
          <div className="admin-modal-actions">
            <Btn variant="ghost" onClick={close}>{t("adm_cancel")}</Btn>
            <Btn
              disabled={acting || !form.name.trim() || !form.province.trim() || !form.district.trim() || !form.address.trim()}
              loading={updateHotel.isPending}
              onClick={handleSave}
            >
              {t("adm_hotels_save")}
            </Btn>
          </div>
        </Modal>
      )}

      {/* ── Delete modal ── */}
      {modal === "delete" && selected && (
        <Modal title={t("adm_hotels_del_title")} onClose={close}>
          {formError && <div className="admin-error-alert">{formError}</div>}
          <div style={{ textAlign: "center", padding: "12px 0 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <p style={{ fontSize: 14, color: "#333", margin: "0 0 6px" }}>{t("adm_hotels_del_confirm")}</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: AP, margin: 0 }}>"{selected?.name}"?</p>
            <p style={{ fontSize: 12, color: "#aaa", marginTop: 8 }}>{t("adm_hotels_del_warning")}</p>
          </div>
          <div className="admin-modal-actions" style={{ justifyContent: "center" }}>
            <Btn variant="ghost" onClick={close}>{t("adm_cancel")}</Btn>
            <Btn variant="danger" disabled={acting} loading={deleteHotel.isPending} onClick={handleDelete}>
              {t("adm_hotels_del_submit")}
            </Btn>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
