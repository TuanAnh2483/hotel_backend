import { useState, useEffect, useRef } from "react";
import {
  useMyHotels, useHotelRoomUnits, usePartnerRooms, partnerKeys,
  useUpdateRoomUnit, useDeleteRoomUnit, useUploadRoomUnitImage,
} from "../../hooks/usePartnerQueries";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useOutletContext } from "react-router-dom";
import { PageHeader, Modal } from "../../components/admin/AdminLayout";
import {
  Search, Building2, BedDouble, DoorOpen,
  Pencil, Trash2, AlertTriangle, ChevronDown, Hash, Layers,
  Sparkles, ImagePlus, X,
} from "lucide-react";
import "../../styles/pages/partner/PartnerRoomUnits.css";

const STATUS_CONFIG = {
  AVAILABLE:   { label: "Sẵn sàng",  color: "#10b981", bg: "#d1fae5", dot: "#10b981" },
  OCCUPIED:    { label: "Có khách",  color: "#3b82f6", bg: "#dbeafe", dot: "#3b82f6" },
  MAINTENANCE: { label: "Bảo trì",   color: "#ef4444", bg: "#fee2e2", dot: "#ef4444" },
  CLEANING:    { label: "Dọn phòng", color: "#f59e0b", bg: "#fef3c7", dot: "#f59e0b" },
};

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([key, v]) => ({ key, ...v }));

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.AVAILABLE;
  return (
    <span className="pru-status-badge" style={{ background: cfg.bg, color: cfg.color }}>
      <span className="pru-status-dot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function StatusSelect({ value, onChange, disabled }) {
  return (
    <div className="pru-status-select-wrap">
      <select
        className="pru-status-select"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{ color: STATUS_CONFIG[value]?.color, opacity: disabled ? 0.55 : 1 }}
      >
        {STATUS_OPTIONS.map(s => (
          <option key={s.key} value={s.key}>{s.label}</option>
        ))}
      </select>
      <ChevronDown size={12} className="pru-status-select-icon" />
    </div>
  );
}

function SummaryCards({ units }) {
  const counts = { AVAILABLE: 0, OCCUPIED: 0, MAINTENANCE: 0, CLEANING: 0 };
  units.forEach(u => { if (counts[u.status] !== undefined) counts[u.status]++; });
  const cards = [
    { key: "total",       label: "Tổng phòng",   value: units.length,          color: "#1e293b",  bg: "#f8fafc" },
    { key: "AVAILABLE",   label: "Sẵn sàng",     value: counts.AVAILABLE,      color: "#10b981",  bg: "#f0fdf4" },
    { key: "OCCUPIED",    label: "Có khách",      value: counts.OCCUPIED,       color: "#3b82f6",  bg: "#eff6ff" },
    { key: "CLEANING",    label: "Dọn phòng",     value: counts.CLEANING,       color: "#f59e0b",  bg: "#fffbeb" },
    { key: "MAINTENANCE", label: "Bảo trì",       value: counts.MAINTENANCE,    color: "#ef4444",  bg: "#fef2f2" },
  ];
  return (
    <div className="pru-summary-cards">
      {cards.map(c => (
        <div key={c.key} className="pru-summary-card" style={{ background: c.bg }}>
          <div className="pru-summary-value" style={{ color: c.color }}>{c.value}</div>
          <div className="pru-summary-label">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

const CATEGORY_LABEL = {
  STANDARD: "Tiêu chuẩn",
  DELUXE:   "Sang trọng",
  SUITE:    "Suite",
  FAMILY:   "Gia đình",
};

function UnitThumb({ unit }) {
  const src = unit.coverImageUrl || unit.roomCoverImageUrl;
  if (!src) {
    return (
      <div className="pru-thumb pru-thumb-placeholder">
        <BedDouble size={16} color="#cbd5e1" />
      </div>
    );
  }
  return (
    <div className="pru-thumb">
      <img src={src} alt="" />
      {!unit.coverImageUrl && unit.roomCoverImageUrl && (
        <span className="pru-thumb-inherited" title="Ảnh loại phòng" />
      )}
    </div>
  );
}

function EditModal({ unit, hotelId, onSave, onClose, saving, error }) {
  const [form, setForm] = useState({
    roomNumber: unit.roomNumber || "",
    floor: unit.floor != null ? String(unit.floor) : "",
    status: unit.status,
    notes: unit.notes || "",
    coverImageUrl: unit.coverImageUrl || "",
  });
  const [previewUrl, setPreviewUrl] = useState(unit.coverImageUrl || "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef(null);
  const uploadImage = useUploadRoomUnitImage();

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const result = await uploadImage.mutateAsync({
        roomId: unit.roomId, unitId: unit.id, hotelId, file,
      });
      const url = result?.coverImageUrl || result?.data?.coverImageUrl || "";
      setPreviewUrl(url);
      set("coverImageUrl", url);
    } catch (err) {
      setUploadError(err.message || "Không thể tải ảnh lên");
    } finally {
      setUploading(false);
    }
  }

  function clearImage() {
    setPreviewUrl("");
    set("coverImageUrl", "");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <Modal title={`Chỉnh sửa phòng ${unit.roomNumber || `#${unit.id}`}`} onClose={onClose} width={480}>
      <div className="pru-edit-modal-body">

        {/* Image section */}
        <div className="pru-edit-field">
          <label className="pru-edit-label"><ImagePlus size={12} /> Ảnh phòng</label>
          <div className="pru-image-section">
            {previewUrl ? (
              <div className="pru-image-preview-wrap">
                <img src={previewUrl} alt="Ảnh phòng" className="pru-image-preview" />
                <button
                  type="button"
                  className="pru-image-clear-btn"
                  onClick={clearImage}
                  title="Xóa ảnh"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="pru-image-placeholder">
                {unit.roomCoverImageUrl && (
                  <img
                    src={unit.roomCoverImageUrl}
                    alt="Ảnh loại phòng"
                    className="pru-image-preview pru-image-inherited"
                  />
                )}
                {!unit.roomCoverImageUrl && <BedDouble size={28} color="#cbd5e1" />}
                {unit.roomCoverImageUrl && (
                  <div className="pru-image-inherited-label">Ảnh loại phòng (dùng chung)</div>
                )}
              </div>
            )}
            <div className="pru-image-actions">
              <button
                type="button"
                className="pru-btn pru-btn-ghost pru-btn-sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <ImagePlus size={13} />
                {uploading ? "Đang tải..." : previewUrl ? "Đổi ảnh" : "Tải ảnh lên"}
              </button>
              {uploadError && <span className="pru-upload-error">{uploadError}</span>}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFile}
            />
          </div>
        </div>

        <div className="pru-edit-grid">
          <div className="pru-edit-field">
            <label className="pru-edit-label"><Hash size={12} /> Số phòng</label>
            <input
              className="pru-edit-input"
              placeholder="VD: 301, 12A..."
              maxLength={20}
              value={form.roomNumber}
              onChange={e => set("roomNumber", e.target.value)}
            />
          </div>
          <div className="pru-edit-field">
            <label className="pru-edit-label"><Layers size={12} /> Tầng</label>
            <input
              className="pru-edit-input"
              type="number"
              placeholder="VD: 3"
              value={form.floor}
              onChange={e => set("floor", e.target.value)}
            />
          </div>
        </div>
        <div className="pru-edit-field">
          <label className="pru-edit-label">Trạng thái</label>
          <StatusSelect value={form.status} onChange={v => set("status", v)} />
        </div>
        <div className="pru-edit-field">
          <label className="pru-edit-label">Ghi chú vận hành</label>
          <input
            className="pru-edit-input"
            placeholder="VD: Sửa điều hoà..."
            maxLength={500}
            value={form.notes}
            onChange={e => set("notes", e.target.value)}
          />
        </div>
        {error && <div className="pru-edit-error">{error}</div>}
        <div className="pru-edit-actions">
          <button className="pru-btn pru-btn-ghost" onClick={onClose} disabled={saving || uploading}>Huỷ</button>
          <button
            className="pru-btn pru-btn-primary"
            disabled={saving || uploading}
            onClick={() => onSave({
              roomNumber: form.roomNumber.trim() || null,
              floor: form.floor !== "" ? Number(form.floor) : null,
              status: form.status,
              notes: form.notes.trim() || null,
              coverImageUrl: form.coverImageUrl || null,
            })}
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function PartnerRoomUnits() {
  const [sp] = useSearchParams();
  const outletCtx = useOutletContext() || {};
  const { selectedHotelId: ctxHotelId, setSelectedHotelId: setCtxHotelId } = outletCtx;
  const queryClient = useQueryClient();

  const [selectedHotelId, setSelectedHotelId] = useState(
    () => sp.get("hotelId") || (ctxHotelId ? String(ctxHotelId) : "")
  );
  const [filterRoomId, setFilterRoomId] = useState(sp.get("roomId") || "");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchText, setSearchText] = useState("");
  const [editingUnit, setEditingUnit] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState(null);

  useEffect(() => {
    if (ctxHotelId && !sp.get("hotelId")) setSelectedHotelId(String(ctxHotelId));
  }, [ctxHotelId]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectHotel(id) {
    setSelectedHotelId(id);
    setCtxHotelId?.(id ? Number(id) : null);
    setFilterRoomId("");
  }

  const { data: hotelData } = useMyHotels();
  const { data: roomData } = usePartnerRooms(selectedHotelId);
  const { data: unitData = [], isLoading } = useHotelRoomUnits(selectedHotelId);

  const hotels = Array.isArray(hotelData) ? hotelData : [];
  const rooms  = Array.isArray(roomData)  ? roomData  : [];
  const units  = Array.isArray(unitData)  ? unitData  : [];

  useEffect(() => {
    if (!selectedHotelId && hotels.length > 0) selectHotel(String(hotels[0].id));
  }, [hotels]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredUnits = units.filter(u => {
    if (filterRoomId && String(u.roomId) !== String(filterRoomId)) return false;
    if (filterStatus && u.status !== filterStatus) return false;
    if (searchText) return (u.roomNumber || "").toLowerCase().includes(searchText.toLowerCase());
    return true;
  });

  const updateUnit = useUpdateRoomUnit();
  const deleteUnit = useDeleteRoomUnit();

  async function handleStatusChange(unit, newStatus) {
    if (changingStatusId === unit.id) return;
    setChangingStatusId(unit.id);
    try {
      await updateUnit.mutateAsync({
        roomId: unit.roomId, unitId: unit.id, hotelId: selectedHotelId,
        roomNumber: unit.roomNumber, floor: unit.floor,
        status: newStatus, notes: unit.notes, coverImageUrl: unit.coverImageUrl,
      });
    } catch (e) { alert(e.message); }
    finally { setChangingStatusId(null); }
  }

  async function handleEditSave(data) {
    setSaving(true); setFormError("");
    try {
      await updateUnit.mutateAsync({
        roomId: editingUnit.roomId, unitId: editingUnit.id,
        hotelId: selectedHotelId, ...data,
      });
      setEditingUnit(null);
    } catch (e) { setFormError(e.message || "Lỗi khi cập nhật phòng"); }
    finally { setSaving(false); }
  }

  async function handleDelete(unit) {
    setSaving(true);
    try {
      await deleteUnit.mutateAsync({ roomId: unit.roomId, unitId: unit.id, hotelId: selectedHotelId });
      setDeleteId(null);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="pru-root">
      <PageHeader
        title="Phòng"
        subtitle="Quản lý trạng thái và vận hành từng phòng vật lý"
      />

      {/* Hotel selector */}
      {hotels.length > 0 && (
        <div className="pru-hotel-chips-wrap">
          <div className="pru-hotel-chips-label">
            <Building2 size={15} color="#BE1E2E" /> Chọn cơ sở:
          </div>
          <div className="pru-hotel-chips-row">
            {hotels.map(h => {
              const thumb = h.coverImageUrl || (Array.isArray(h.imageUrls) ? h.imageUrls[0] : "");
              const active = String(h.id) === String(selectedHotelId);
              return (
                <button
                  key={h.id}
                  className={`pru-hotel-chip${active ? " active" : ""}`}
                  onClick={() => selectHotel(String(h.id))}
                >
                  <div className="pru-hotel-chip-thumb">
                    {thumb ? <img src={thumb} alt={h.name} /> : <Building2 size={16} color="#94a3b8" />}
                  </div>
                  <div className="pru-hotel-chip-name">{h.name}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!selectedHotelId ? (
        <div className="pru-empty-state">
          <DoorOpen size={40} color="#cbd5e1" />
          <div className="pru-empty-title">Chọn cơ sở để xem danh sách phòng</div>
        </div>
      ) : isLoading ? (
        <div className="pru-loading"><div className="pru-spinner" /> Đang tải danh sách phòng...</div>
      ) : (
        <>
          {units.length > 0 && <SummaryCards units={units} />}

          <div className="pru-filter-bar">
            <div className="pru-filter-search-wrap">
              <Search size={14} color="#94a3b8" className="pru-filter-search-icon" />
              <input
                className="pru-filter-search"
                placeholder="Tìm số phòng..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </div>
            <select
              className="pru-filter-select"
              value={filterRoomId}
              onChange={e => setFilterRoomId(e.target.value)}
            >
              <option value="">Tất cả loại phòng</option>
              {rooms.map(r => (
                <option key={r.id} value={String(r.id)}>{r.name}</option>
              ))}
            </select>
            <select
              className="pru-filter-select"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <div className="pru-filter-count">
              {filteredUnits.length} / {units.length} phòng
            </div>
          </div>

          {units.length === 0 ? (
            <div className="pru-empty-state">
              <Sparkles size={36} color="#cbd5e1" />
              <div className="pru-empty-title">Chưa có phòng vật lý nào</div>
              <div className="pru-empty-desc">
                Tạo loại phòng trong trang <strong>Loại phòng</strong> — hệ thống sẽ tự động tạo phòng tương ứng.
              </div>
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="pru-empty-state">
              <Search size={32} color="#cbd5e1" />
              <div className="pru-empty-title">Không tìm thấy phòng phù hợp</div>
            </div>
          ) : (
            <div className="pru-table-wrap">
              <table className="pru-table">
                <thead>
                  <tr>
                    <th style={{ width: 48 }}></th>
                    <th>Số phòng</th>
                    <th>Loại phòng</th>
                    <th>Tầng</th>
                    <th>Trạng thái</th>
                    <th>Ghi chú</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.map(unit => (
                    deleteId === unit.id ? (
                      <tr key={unit.id} className="pru-row-deleting">
                        <td colSpan={7}>
                          <div className="pru-delete-confirm">
                            <AlertTriangle size={14} color="#ef4444" />
                            <span>Xóa phòng <strong>{unit.roomNumber || `#${unit.id}`}</strong>? Không thể hoàn tác.</span>
                            <button className="pru-btn pru-btn-ghost" onClick={() => setDeleteId(null)} disabled={saving}>Huỷ</button>
                            <button className="pru-btn pru-btn-danger" onClick={() => handleDelete(unit)} disabled={saving}>
                              {saving ? "Đang xóa..." : "Xóa"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={unit.id} className="pru-row">
                        <td className="pru-cell-thumb">
                          <UnitThumb unit={unit} />
                        </td>
                        <td className="pru-cell-number">
                          {unit.roomNumber
                            ? <strong>{unit.roomNumber}</strong>
                            : <span className="pru-empty-val">Chưa đặt số</span>
                          }
                          {!unit.roomNumber && (
                            <span className="pru-auto-badge" title="Được tạo tự động từ loại phòng">Tự động</span>
                          )}
                        </td>
                        <td className="pru-cell-room-type">
                          <div className="pru-room-type-name">{unit.roomName}</div>
                          {unit.roomCategory && (
                            <div className="pru-room-type-cat">{CATEGORY_LABEL[unit.roomCategory] || unit.roomCategory}</div>
                          )}
                        </td>
                        <td className="pru-cell-floor">
                          {unit.floor != null ? `Tầng ${unit.floor}` : <span className="pru-empty-val">—</span>}
                        </td>
                        <td>
                          <StatusSelect
                            value={unit.status}
                            onChange={v => handleStatusChange(unit, v)}
                            disabled={changingStatusId === unit.id}
                          />
                        </td>
                        <td className="pru-cell-notes">
                          {unit.notes || <span className="pru-empty-val">—</span>}
                        </td>
                        <td className="pru-cell-actions">
                          <button
                            className="pru-action-btn"
                            title="Chỉnh sửa"
                            onClick={() => { setEditingUnit(unit); setFormError(""); }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="pru-action-btn pru-action-btn--delete"
                            title="Xóa phòng"
                            onClick={() => setDeleteId(unit.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {editingUnit && (
        <EditModal
          unit={editingUnit}
          hotelId={selectedHotelId}
          onSave={handleEditSave}
          onClose={() => { setEditingUnit(null); setFormError(""); }}
          saving={saving}
          error={formError}
        />
      )}
    </div>
  );
}
