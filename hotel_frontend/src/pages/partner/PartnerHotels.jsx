import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { partnerService } from "../../services/partnerService";
import { PageHeader, Card, Btn, Modal } from "../../components/admin/AdminLayout";
import {
  Building2, MapPin, Star, MoreVertical, Edit2, Trash2, Bed,
  Wifi, Waves, Car, Dumbbell, Sparkles, Utensils, Dog, Search, Plus, ArrowRight, Layout
} from "lucide-react";
import "../../styles/pages/partner/PartnerHotels.css";

// --- Configuration & Helpers ---
const HOTEL_TYPES = ["HOTEL", "APARTMENT", "RESORT", "VILLA", "HOMESTAY", "HOSTEL", "GUEST_HOUSE"];
const HOTEL_TYPE_LABELS = {
  HOTEL: "Khách sạn", APARTMENT: "Căn hộ", RESORT: "Resort",
  VILLA: "Villa", HOMESTAY: "Homestay", HOSTEL: "Hostel", GUEST_HOUSE: "Nhà khách",
};

const AMENITIES = [
  { key: "WIFI", label: "WiFi", Icon: Wifi },
  { key: "POOL", label: "Hồ bơi", Icon: Waves },
  { key: "PARKING", label: "Bãi đỗ xe", Icon: Car },
  { key: "GYM", label: "Gym", Icon: Dumbbell },
  { key: "SPA", label: "Spa", Icon: Sparkles },
  { key: "RESTAURANT", label: "Nhà hàng", Icon: Utensils },
  { key: "PET_ALLOWED", label: "Thú cưng", Icon: Dog },
];

const EMPTY_FORM = {
  name: "", province: "", district: "", address: "",
  hotelType: "HOTEL", description: "", amenities: [],
  images: [],
};

function getHotelImageUrl(hotel) {
  const imageUrls = Array.isArray(hotel?.imageUrls) ? hotel.imageUrls : [];
  const legacyImages = Array.isArray(hotel?.images) ? hotel.images : [];
  return hotel?.coverImageUrl || imageUrls[0] || legacyImages[0] || "";
}

// --- Components ---

function Field({ label, children, required }) {
  return (
    <div className="partner-hotel-form-field">
      <div className="partner-hotel-form-label">
        {label} {required && <span className="partner-hotel-form-required">*</span>}
      </div>
      {children}
    </div>
  );
}

function HotelForm({ form, setForm, onSubmit, onCancel, saving, title, hotelTypes, amenities }) {
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
      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "80vh", overflowY: "auto", paddingRight: 8 }}>
        <Field label="Tên khách sạn" required>
          <input className="partner-hotel-form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ví dụ: Grand Palace Hotel & Spa" />
        </Field>

        <div className="partner-hotel-form-grid">
          <Field label="Tỉnh/Thành phố">
            <input className="partner-hotel-form-input" value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))} placeholder="Hà Nội" />
          </Field>
          <Field label="Quận/Huyện">
            <input className="partner-hotel-form-input" value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} placeholder="Hoàn Kiếm" />
          </Field>
        </div>

        <Field label="Địa chỉ chi tiết">
          <input className="partner-hotel-form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Số 1, Phố ABC, Phường XYZ..." />
        </Field>

        <Field label="Loại hình lưu trú">
          <select className="partner-hotel-form-input" value={form.hotelType} onChange={e => setForm(f => ({ ...f, hotelType: e.target.value }))}>
            {hotelTypes.map(t => <option key={t} value={t}>{HOTEL_TYPE_LABELS[t] || t}</option>)}
          </select>
        </Field>

        <Field label="Mô tả giới thiệu">
          <textarea className="partner-hotel-form-input" style={{ height: 120, resize: "vertical" }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Chia sẻ những đặc điểm nổi bật của khách sạn..." />
        </Field>

        <Field label="Tiện ích & Dịch vụ">
          <div className="partner-hotel-amenity-wrap">
            {amenities.map(a => (
              <label key={a.key} className={`partner-hotel-amenity-label${form.amenities.includes(a.key) ? " selected" : ""}`}>
                <input type="checkbox" style={{ display: "none" }} checked={form.amenities.includes(a.key)} onChange={() => toggleAmenity(a.key)} />
                <a.Icon size={16} />
                {a.label}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Hình ảnh khách sạn (Chọn nhiều hình)">
          <div className="partner-hotel-img-grid">
            {form.images?.map((img, idx) => (
              <div key={idx} className="partner-hotel-img-thumb">
                <img src={img} alt="" />
                <button
                  onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))}
                  className="partner-hotel-img-remove"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <label className="partner-hotel-img-add">
              <Plus size={24} />
              <div className="partner-hotel-img-add-label">Thêm ảnh</div>
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
          <p className="partner-hotel-img-hint">Hỗ trợ định dạng JPG, PNG. Tối đa 5MB mỗi ảnh.</p>
        </Field>

        <div className="partner-hotel-form-actions">
          <Btn variant="ghost" onClick={onCancel}>Hủy bỏ</Btn>
          <Btn onClick={onSubmit} disabled={saving || !form.name.trim()}>
            {saving ? "Đang xử lý..." : "Lưu thông tin"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

export default function PartnerHotels() {
  const rrNavigate = useNavigate();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); 
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [catalog, setCatalog] = useState({ hotelTypes: HOTEL_TYPES, hotelAmenities: AMENITIES.map(a => a.key) });
  const [error, setError] = useState("");
  const pageSize = 8;

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await partnerService.getMyHotels();
      setHotels(Array.isArray(data) ? data : []);
    } catch (e) {
      setHotels([]);
      setError(e.message || "Không thể tải dữ liệu khách sạn.");
    }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    partnerService.getCatalogOptions()
      .then((data) => setCatalog({
        hotelTypes: Array.isArray(data?.hotelTypes) && data.hotelTypes.length ? data.hotelTypes : HOTEL_TYPES,
        hotelAmenities: Array.isArray(data?.hotelAmenities) && data.hotelAmenities.length ? data.hotelAmenities : AMENITIES.map(a => a.key),
      }))
      .catch(() => {});
  }, []);

  const hotelTypeOptions = Array.isArray(catalog.hotelTypes) && catalog.hotelTypes.length ? catalog.hotelTypes : HOTEL_TYPES;
  const amenityOptions = AMENITIES.filter((amenity) => catalog.hotelAmenities?.includes(amenity.key));

  const filteredHotels = hotels.filter(h => 
    (h.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.province?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function openAdd() { setForm({ ...EMPTY_FORM, images: [] }); setModal("add"); }
  function openEdit(hotel) {
    setSelected(hotel);
    const images = Array.isArray(hotel.imageUrls) ? hotel.imageUrls : (Array.isArray(hotel.images) ? hotel.images : []);
    setForm({
      name: hotel.name || "", province: hotel.province || "", district: hotel.district || "",
      address: hotel.address || "", hotelType: hotel.hotelType || "HOTEL",
      description: hotel.description || "", amenities: hotel.amenities ? [...hotel.amenities] : [],
      images,
    });
    setModal("edit");
  }
  function openDelete(hotel) { setSelected(hotel); setModal("delete"); }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { ...form, imageUrls: form.images || [] };
      delete payload.images;
      if (modal === "add") await partnerService.createHotel(payload);
      else await partnerService.updateHotel(selected.id, payload);
      setModal(null);
      load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await partnerService.deleteHotel(selected.id);
      setModal(null);
      load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="partner-hotel-root">
      <PageHeader
        title="Quản lý khách sạn của tôi"
        subtitle="Quản lý thông tin, phòng và dịch vụ cho các cơ sở lưu trú bạn sở hữu"
        action={
          <button onClick={openAdd} className="partner-hotel-add-btn">
            <Plus size={20} /> Thêm khách sạn mới
          </button>
        }
      />

      {/* Filter Bar */}
      <div className="partner-hotel-filter-bar">
        <div className="partner-hotel-filter-search-wrap">
          <Search size={20} color="#94a3b8" className="partner-hotel-filter-search-icon" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm nhanh khách sạn theo tên, tỉnh thành hoặc quận huyện..."
            className="partner-hotel-filter-search-input"
          />
        </div>
        <div className="partner-hotel-filter-count-wrap">
          <div className="partner-hotel-filter-divider" />
          <div className="partner-hotel-filter-count">
            <span className="partner-hotel-filter-count-num">{filteredHotels.length}</span> KẾT QUẢ
          </div>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="partner-hotel-loading">
          <div className="ui-spinner" />
          Đang đồng bộ dữ liệu khách sạn...
        </div>
      ) : filteredHotels.length === 0 ? (
        <div className="partner-hotel-empty">
          <Building2 size={64} color="#e2e8f0" style={{ marginBottom: 20 }} />
          <h3 className="partner-hotel-empty-title">Không tìm thấy khách sạn nào</h3>
          <p className="partner-hotel-empty-desc">
            Dường như bạn chưa có khách sạn nào hoặc không có kết quả phù hợp với từ khóa tìm kiếm.
          </p>
          <Btn onClick={openAdd}>Thêm khách sạn ngay</Btn>
        </div>
      ) : (
        <div className="partner-hotel-grid">
          {filteredHotels.slice((page - 1) * pageSize, page * pageSize).map((h) => (
            <div key={h.id} className="partner-hotel-card">
              {/* Card Image */}
              <div className="partner-hotel-card-img-wrap">
                {getHotelImageUrl(h) ? (
                  <img src={getHotelImageUrl(h)} alt={h.name} className="partner-hotel-card-img" />
                ) : (
                  <div className="partner-hotel-card-img" style={{ alignItems: "center", background: "#f8fafc", color: "#cbd5e1", display: "flex", justifyContent: "center" }}>
                    <Building2 size={46} />
                  </div>
                )}
                <span className="partner-hotel-card-type-badge">
                  {(HOTEL_TYPE_LABELS[h.hotelType] || h.hotelType || "KHÁCH SẠN").toUpperCase()}
                </span>
                <button onClick={() => openEdit(h)} className="partner-hotel-card-edit-btn">
                  <Edit2 size={18} color="#475569" />
                </button>
              </div>

              {/* Card Content */}
              <div className="partner-hotel-card-body">
                <div className="partner-hotel-card-header">
                  <h3 className="partner-hotel-card-name">{h.name}</h3>
                  <div className="partner-hotel-card-rating">
                    <Star size={16} fill="#f59e0b" />
                    <span className="partner-hotel-card-rating-val">4.9</span>
                  </div>
                </div>

                <div className="partner-hotel-card-location">
                  <MapPin size={16} color="#BE1E2E" />
                  {h.district}, {h.province}
                </div>

                <div className="partner-hotel-card-amenities">
                  {h.amenities?.slice(0, 4).map(a => {
                    const am = AMENITIES.find(x => x.key === a);
                    return (
                      <span key={a} className="partner-hotel-card-chip">
                        {am && <am.Icon size={14} color="#BE1E2E" />}
                        {am?.label || a}
                      </span>
                    );
                  })}
                  {h.amenities?.length > 4 && <span className="partner-hotel-card-chip-more">+{h.amenities.length - 4}</span>}
                </div>

                {/* Card Actions */}
                <div className="partner-hotel-card-actions">
                  <button
                    onClick={() => rrNavigate(`/partner/rooms?hotelId=${h.id}`)}
                    className="partner-hotel-card-btn partner-hotel-card-btn-manage"
                  >
                    <Layout size={18} /> Quản lý phòng
                  </button>
                  <button
                    onClick={() => openDelete(h)}
                    className="partner-hotel-card-btn partner-hotel-card-btn-delete"
                  >
                    <Trash2 size={18} /> Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredHotels.length > pageSize && (
        <div className="ui-pagination">
          {[...Array(Math.ceil(filteredHotels.length / pageSize))].map((_, i) => (
            <button
              key={i}
              onClick={() => { setPage(i + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className={`ui-page-btn${page === i + 1 ? " active" : ""}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Modals */}
      {(modal === "add" || modal === "edit") && (
        <HotelForm
          title={modal === "add" ? "Thêm khách sạn mới" : "Cập nhật thông tin khách sạn"}
          form={form} setForm={setForm} onSubmit={handleSave} onCancel={() => setModal(null)} saving={saving}
          hotelTypes={hotelTypeOptions}
          amenities={amenityOptions.length ? amenityOptions : AMENITIES}
        />
      )}

      {modal === "delete" && (
        <Modal title="Xác nhận xóa khách sạn" onClose={() => setModal(null)} width={440}>
          <div>
            <div className="partner-hotel-delete-icon-wrap">
              <Trash2 size={32} color="#ef4444" />
            </div>
            <h3 className="partner-hotel-delete-title">Bạn chắc chắn muốn xóa?</h3>
            <p className="partner-hotel-delete-desc">
              Tất cả dữ liệu liên quan đến khách sạn <strong>"{selected?.name}"</strong> bao gồm danh sách phòng và lịch đặt sẽ bị xóa vĩnh viễn.
            </p>
            <div className="partner-hotel-delete-actions">
              <button onClick={() => setModal(null)} className="partner-hotel-delete-cancel-btn">Hủy bỏ</button>
              <button onClick={handleDelete} disabled={saving} className="partner-hotel-delete-confirm-btn">
                {saving ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
