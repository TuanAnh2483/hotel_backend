import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { partnerService } from "../../services/partnerService";
import { PageHeader, Card, Btn, Modal } from "../../components/admin/AdminLayout";
import {
  Bed, Users, Home, Edit3, Trash2, Search, Plus,
  Wind, Coffee, Bath, Layout, Grid, Smartphone, Box, TrendingUp
} from "lucide-react";
import "../../styles/pages/partner/PartnerRooms.css";

// --- Configuration ---
const CATEGORIES = [
  { key: "STANDARD", label: "Tiêu chuẩn" },
  { key: "DELUXE",   label: "Sang trọng" },
  { key: "SUITE",    label: "Suite" },
  { key: "FAMILY",   label: "Gia đình" },
];
const BED_TYPES = [
  { key: "SINGLE", label: "Giường đơn" },
  { key: "DOUBLE", label: "Giường đôi" },
  { key: "TWIN",   label: "Hai giường" },
];
const ROOM_AMENITIES = [
  { key: "AIR_CONDITIONER", label: "Điều hòa", Icon: Wind },
  { key: "TV", label: "TV", Icon: Smartphone },
  { key: "MINI_BAR", label: "Mini bar", Icon: Coffee },
  { key: "PRIVATE_BATHROOM", label: "Phòng tắm riêng", Icon: Bath },
  { key: "BATHTUB", label: "Bồn tắm", Icon: Bath },
  { key: "HAIR_DRYER", label: "Máy sấy tóc", Icon: Wind },
  { key: "BALCONY", label: "Ban công", Icon: Layout },
  { key: "WINDOW", label: "Cửa sổ", Icon: Layout },
  { key: "DESK", label: "Bàn làm việc", Icon: Layout },
  { key: "WARDROBE", label: "Tủ quần áo", Icon: Box },
  { key: "KETTLE", label: "Ấm đun nước", Icon: Coffee },
  { key: "REFRIGERATOR", label: "Tủ lạnh", Icon: Box },
  { key: "SAFE_BOX", label: "Két an toàn", Icon: Box },
  { key: "FREE_WATER", label: "Nước miễn phí", Icon: Coffee },
  { key: "SEA_VIEW", label: "Hướng biển", Icon: Layout },
  { key: "BREAKFAST", label: "Bữa sáng", Icon: Coffee },
];
const ROOM_AMENITY_KEYS = new Set(ROOM_AMENITIES.map((amenity) => amenity.key));

const EMPTY_FORM = {
  name: "", capacity: 2, quantity: 1, price: 500000,
  roomCategory: "STANDARD", bedType: "DOUBLE", amenities: [],
  images: [],
};

function getRoomImageUrl(room) {
  const imageUrls = Array.isArray(room?.imageUrls) ? room.imageUrls : [];
  const legacyImages = Array.isArray(room?.images) ? room.images : [];
  return room?.coverImageUrl || imageUrls[0] || legacyImages[0] || "";
}

function Field({ label, children, required }) {
  return (
    <div className="pr-field">
      <div className="pr-field-label">
        {label} {required && <span className="pr-field-required">*</span>}
      </div>
      {children}
    </div>
  );
}

function RoomForm({ form, setForm, onSubmit, onCancel, saving, title, categories, bedTypes, amenities }) {
  function toggleAmenity(key) {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(key)
        ? f.amenities.filter(a => a !== key)
        : [...f.amenities, key],
    }));
  }

  return (
    <Modal title={title} onClose={onCancel} width={640}>
      <div className="pr-form-body">
        <Field label="Tên loại phòng" required>
          <input className="pr-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ví dụ: Deluxe Sea View Double" />
        </Field>

        <div className="pr-form-grid-2">
          <Field label="Hạng phòng">
            <select className="pr-input" value={form.roomCategory} onChange={e => setForm(f => ({ ...f, roomCategory: e.target.value }))}>
              {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Loại giường">
            <select className="pr-input" value={form.bedType} onChange={e => setForm(f => ({ ...f, bedType: e.target.value }))}>
              {bedTypes.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
            </select>
          </Field>
        </div>

        <div className="pr-form-grid-3">
          <Field label="Sức chứa">
            <input className="pr-input" type="number" min="1" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
          </Field>
          <Field label="Số lượng phòng">
            <input className="pr-input" type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
          </Field>
          <Field label="Giá niêm yết (VND)">
            <div className="pr-price-wrap">
              <input className="pr-input pr-input-icon-left" type="number" min="0" step="50000" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
              <TrendingUp size={16} color="#10b981" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
            </div>
          </Field>
        </div>

        <Field label="Tiện nghi phòng">
          <div className="pr-amenities-grid">
            {amenities.map(a => {
              const selected = form.amenities.includes(a.key);
              return (
                <label
                  key={a.key}
                  className="pr-amenity-label"
                  style={{
                    background:  selected ? "#FFF1F2" : "#fff",
                    color:       selected ? "#BE1E2E" : "#64748b",
                    borderColor: selected ? "#BE1E2E" : "#e2e8f0",
                    fontWeight:  selected ? 700 : 500,
                  }}
                >
                  <input type="checkbox" style={{ display: "none" }} checked={selected} onChange={() => toggleAmenity(a.key)} />
                  <a.Icon size={16} />
                  {a.label}
                </label>
              );
            })}
          </div>
        </Field>

        <Field label="Hình ảnh loại phòng (Chọn nhiều hình)">
          <div className="pr-images-grid">
            {form.images?.map((img, idx) => (
              <div key={idx} className="pr-image-thumb">
                <img src={img} />
                <button
                  className="pr-image-delete-btn"
                  onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <label className="pr-image-add-label">
              <Plus size={24} />
              <div className="pr-image-add-text">Thêm ảnh</div>
              <input
                type="file" multiple style={{ display: "none" }}
                onChange={e => {
                  const files = Array.from(e.target.files);
                  files.forEach(file => {
                    const reader = new FileReader();
                    reader.onloadend = () => setForm(f => ({ ...f, images: [...(f.images || []), reader.result] }));
                    reader.readAsDataURL(file);
                  });
                }}
              />
            </label>
          </div>
          <p className="pr-image-hint">Hỗ trợ định dạng JPG, PNG. Tối đa 5MB mỗi ảnh.</p>
        </Field>

        <div className="pr-form-footer">
          <Btn variant="ghost" onClick={onCancel}>Hủy bỏ</Btn>
          <Btn onClick={onSubmit} disabled={saving || !form.name.trim()}>
            {saving ? "Đang xử lý..." : "Lưu thay đổi"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function fmtPrice(n) {
  return new Intl.NumberFormat("vi-VN").format(n) + " ₫";
}

export default function PartnerRooms() {
  const [sp] = useSearchParams();
  const initialHotelId = sp.get("hotelId") || "";

  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState(initialHotelId);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [catalog, setCatalog] = useState({
    roomCategories: CATEGORIES.map(c => c.key),
    bedTypes: BED_TYPES.map(b => b.key),
    roomAmenities: ROOM_AMENITIES.map(a => a.key),
  });
  const [error, setError] = useState("");
  const pageSize = 8;

  useEffect(() => {
    partnerService.getMyHotels()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setHotels(list);
        if (!initialHotelId && list.length > 0) setSelectedHotelId(String(list[0].id));
      })
      .catch((e) => {
        setHotels([]);
        setSelectedHotelId("");
        setError(e.message || "Không thể tải danh sách khách sạn.");
      });

    partnerService.getCatalogOptions()
      .then((data) => setCatalog({
        roomCategories: Array.isArray(data?.roomCategories) && data.roomCategories.length ? data.roomCategories : CATEGORIES.map(c => c.key),
        bedTypes: Array.isArray(data?.bedTypes) && data.bedTypes.length ? data.bedTypes : BED_TYPES.map(b => b.key),
        roomAmenities: Array.isArray(data?.roomAmenities) && data.roomAmenities.length ? data.roomAmenities : ROOM_AMENITIES.map(a => a.key),
      }))
      .catch(() => {});
  }, [initialHotelId]);

  const categoryOptions = catalog.roomCategories.map((key) => CATEGORIES.find((item) => item.key === key) || { key, label: key });
  const bedTypeOptions = catalog.bedTypes.map((key) => BED_TYPES.find((item) => item.key === key) || { key, label: key });
  const roomAmenityOptions = catalog.roomAmenities
    .map((key) => ROOM_AMENITIES.find((item) => item.key === key) || { key, label: key, Icon: Box });

  useEffect(() => {
    if (!selectedHotelId) { setRooms([]); return; }
    setLoading(true);
    setError("");
    partnerService.getRooms(selectedHotelId)
      .then(data => setRooms(Array.isArray(data) ? data : []))
      .catch((e) => {
        setRooms([]);
        setError(e.message || "Không thể tải dữ liệu phòng.");
      })
      .finally(() => setLoading(false));
  }, [selectedHotelId]);

  function openAdd() { setForm({ ...EMPTY_FORM, images: [] }); setModal("add"); }
  function openEdit(room) {
    setSelected(room);
    const images = Array.isArray(room.imageUrls) ? room.imageUrls : (Array.isArray(room.images) ? room.images : []);
    setForm({
      name: room.name || "", capacity: room.capacity || 2, quantity: room.quantity || 1, price: room.price || 0,
      roomCategory: room.roomCategory || "STANDARD", bedType: room.bedType || "DOUBLE",
      amenities: room.amenities ? room.amenities.filter(key => catalog.roomAmenities.includes(key) || ROOM_AMENITY_KEYS.has(key)) : [],
      images,
    });
    setModal("edit");
  }
  function openDelete(room) { setSelected(room); setModal("delete"); }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { ...form, imageUrls: form.images || [] };
      delete payload.images;
      if (modal === "add") await partnerService.createRoom(selectedHotelId, payload);
      else await partnerService.updateRoom(selected.id, payload);
      setModal(null);
      const data = await partnerService.getRooms(selectedHotelId);
      setRooms(Array.isArray(data) ? data : []);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await partnerService.deleteRoom(selected.id);
      setModal(null);
      const data = await partnerService.getRooms(selectedHotelId);
      setRooms(Array.isArray(data) ? data : []);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="pr-root">
      <PageHeader
        title="Thiết lập các loại phòng"
        subtitle="Quản lý chi tiết hạng phòng, giá niêm yết và số lượng phòng cho từng cơ sở"
        action={selectedHotelId && (
          <button className="pr-add-btn" onClick={openAdd}>
            <Plus size={20} /> Thêm loại phòng mới
          </button>
        )}
      />

      {/* Hotel Selector */}
      <div className="pr-hotel-selector">
        <div className="pr-hotel-selector-label">
          <Home size={20} color="#BE1E2E" /> ĐANG QUẢN LÝ TẠI:
        </div>
        <select
          className="pr-hotel-select"
          value={selectedHotelId}
          onChange={e => setSelectedHotelId(e.target.value)}
        >
          <option value="">-- Vui lòng chọn khách sạn của bạn --</option>
          {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>

      {error && (
        <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>
          {error}
        </div>
      )}

      {!selectedHotelId ? (
        <Card style={{ textAlign: "center", padding: "100px 0", borderRadius: 28 }}>
          <div className="pr-empty-icon">
            <Box size={40} color="#cbd5e1" />
          </div>
          <h3 className="pr-empty-title">Sẵn sàng quản lý hạng phòng</h3>
          <p className="pr-empty-desc">Vui lòng chọn một khách sạn từ danh sách phía trên để xem và chỉnh sửa các loại phòng.</p>
        </Card>
      ) : loading ? (
        <div className="pr-loading">
          <div className="pr-spinner" />
          Đang đồng bộ dữ liệu phòng...
        </div>
      ) : rooms.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "80px 20px", borderRadius: 20 }}>
          <div className="pr-empty-icon">
            <Bed size={40} color="#cbd5e1" />
          </div>
          <h3 className="pr-empty-title">Chưa có loại phòng nào</h3>
          <p className="pr-empty-desc">Thêm loại phòng đầu tiên để khách có thể đặt phòng từ dữ liệu thật.</p>
          <Btn onClick={openAdd}>Thêm loại phòng mới</Btn>
        </Card>
      ) : (
        <div className="pr-rooms-grid">
          {rooms.slice((page - 1) * pageSize, page * pageSize).map((r) => (
            <div key={r.id} className="pr-room-card">
              <div className="pr-room-image-wrap">
                {getRoomImageUrl(r) ? (
                  <img src={getRoomImageUrl(r)} alt={r.name} className="pr-room-image" />
                ) : (
                  <div className="pr-room-image" style={{ alignItems: "center", background: "#f8fafc", color: "#cbd5e1", display: "flex", justifyContent: "center" }}>
                    <Bed size={42} />
                  </div>
                )}
                <div className="pr-room-badge-wrap">
                  <span className="pr-room-category-badge">
                    {(categoryOptions.find(c => c.key === r.roomCategory)?.label || r.roomCategory || "PHÒNG").toUpperCase()}
                  </span>
                </div>
                <div className="pr-room-price-wrap">
                  <span className="pr-room-price-badge">{fmtPrice(r.price)}</span>
                </div>
              </div>

              <div className="pr-room-body">
                <div className="pr-room-header">
                  <h3 className="pr-room-name">{r.name}</h3>
                </div>

                <div className="pr-room-meta-grid">
                  <div className="pr-room-meta-item">
                    <div className="pr-room-meta-icon"><Users size={14} color="#BE1E2E" /></div>
                    {r.capacity} khách tối đa
                  </div>
                  <div className="pr-room-meta-item">
                    <div className="pr-room-meta-icon"><Bed size={14} color="#BE1E2E" /></div>
                    {bedTypeOptions.find(b => b.key === r.bedType)?.label || r.bedType || "—"}
                  </div>
                  <div className="pr-room-meta-item">
                    <div className="pr-room-meta-icon"><Grid size={14} color="#BE1E2E" /></div>
                    {r.quantity} phòng tổng
                  </div>
                  <div className="pr-room-meta-item">
                    <div className="pr-room-meta-icon"><Box size={14} color="#BE1E2E" /></div>
                    Mã #{r.id}
                  </div>
                </div>

                <div className="pr-room-actions">
                  <button className="pr-edit-btn" onClick={() => openEdit(r)}>
                    <Edit3 size={16} /> Chỉnh sửa
                  </button>
                  <button className="pr-delete-btn" onClick={() => openDelete(r)}>
                    <Trash2 size={16} /> Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {rooms.length > pageSize && (
        <div className="pr-pagination">
          {[...Array(Math.ceil(rooms.length / pageSize))].map((_, i) => (
            <button
              key={i}
              className="pr-page-btn"
              onClick={() => { setPage(i + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{
                background:  page === i + 1 ? "#BE1E2E" : "#fff",
                color:       page === i + 1 ? "#fff" : "#475569",
                boxShadow:   page === i + 1 ? "0 4px 12px rgba(190, 30, 46, 0.3)" : "none",
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Modals */}
      {(modal === "add" || modal === "edit") && (
        <RoomForm
          title={modal === "add" ? "Thêm loại phòng mới" : "Cập nhật loại phòng"}
          form={form} setForm={setForm} onSubmit={handleSave} onCancel={() => setModal(null)} saving={saving}
          categories={categoryOptions}
          bedTypes={bedTypeOptions}
          amenities={roomAmenityOptions}
        />
      )}

      {modal === "delete" && (
        <Modal title="Xác nhận xóa" onClose={() => setModal(null)} width={440}>
          <div className="pr-delete-modal-content">
            <div className="pr-delete-modal-icon">
              <Trash2 size={32} color="#ef4444" />
            </div>
            <h3 className="pr-delete-modal-title">Xóa hạng phòng này?</h3>
            <p className="pr-delete-modal-desc">Bạn có chắc muốn xóa <strong>"{selected?.name}"</strong>? Toàn bộ thông tin giá và số lượng sẽ bị gỡ bỏ vĩnh viễn.</p>
            <div className="pr-delete-modal-actions">
              <button className="pr-delete-modal-cancel" onClick={() => setModal(null)}>Hủy bỏ</button>
              <button className="pr-delete-modal-confirm" onClick={handleDelete} disabled={saving}>
                {saving ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
