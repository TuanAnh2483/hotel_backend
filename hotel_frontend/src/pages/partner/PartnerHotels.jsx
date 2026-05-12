import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { partnerService } from "../../services/partnerService";
import {
  createExistingImageItems,
  createPendingImageItems,
  existingImageUrlsFromItems,
  imageItemUrl,
  pendingImageFilesFromItems,
  revokePendingImageUrls,
} from "../../utils/imageFormItems";
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
  const imageUrls = getHotelImageUrls(hotel);
  return hotel?.coverImageUrl || imageUrls[0] || "";
}

function getHotelImageUrls(hotel) {
  const imageUrls = Array.isArray(hotel?.imageUrls) ? hotel.imageUrls : [];
  const legacyImages = Array.isArray(hotel?.images) ? hotel.images : [];
  return imageUrls.length ? imageUrls : legacyImages;
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
        </Field>

        <div className="partner-hotel-form-grid">
          </Field>
          </Field>
        </div>

        </Field>

          <select className="partner-hotel-form-input" value={form.hotelType} onChange={e => setForm(f => ({ ...f, hotelType: e.target.value }))}>
          </select>
        </Field>

        </Field>

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

          <div className="partner-hotel-img-grid">
            {form.images?.map((img, idx) => {
              const url = imageItemUrl(img);
              return (
              <div key={img?.id || url || idx} className="partner-hotel-img-thumb">
                <img src={url} alt="" />
                <button
                  onClick={() => setForm(f => {
                    const images = [...(f.images || [])];
                    const [removed] = images.splice(idx, 1);
                    revokePendingImageUrls([removed]);
                    return { ...f, images };
                  })}
                  className="partner-hotel-img-remove"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              );
            })}
            <label className="partner-hotel-img-add">
              <Plus size={24} />
              <input
                type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: "none" }}
                onChange={e => {
                  const images = createPendingImageItems(e.target.files);
                  setForm(f => ({ ...f, images: [...(f.images || []), ...images] }));
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </Field>

        <div className="partner-hotel-form-actions">
          <Btn onClick={onSubmit} disabled={saving || !form.name.trim()}>
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

  function openAdd() {
    revokePendingImageUrls(form.images);
    setSelected(null);
    setForm({ ...EMPTY_FORM, images: [] });
    setModal("add");
  }
  function openEdit(hotel) {
    revokePendingImageUrls(form.images);
    setSelected(hotel);
    setForm({
      name: hotel.name || "", province: hotel.province || "", district: hotel.district || "",
      address: hotel.address || "", hotelType: hotel.hotelType || "HOTEL",
      description: hotel.description || "", amenities: hotel.amenities ? [...hotel.amenities] : [],
      images: createExistingImageItems(getHotelImageUrls(hotel)),
    });
    setModal("edit");
  }
  function openDelete(hotel) { setSelected(hotel); setModal("delete"); }

  function closeFormModal() {
    revokePendingImageUrls(form.images);
    setModal(null);
    setSelected(null);
    setForm({ ...EMPTY_FORM, images: [] });
  }

  async function deleteRemovedHotelImages(hotel, remainingImageUrls) {
    const remaining = new Set(remainingImageUrls);
    const removed = getHotelImageUrls(hotel).filter((url) => !remaining.has(url));
    for (const imageUrl of removed) {
      await partnerService.deleteHotelImage(hotel.id, imageUrl);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const images = form.images || [];
      const existingImageUrls = existingImageUrlsFromItems(images);
      const pendingFiles = pendingImageFilesFromItems(images);
      const payload = { ...form, imageUrls: existingImageUrls };
      delete payload.images;
      if (modal === "add") {
        const created = await partnerService.createHotel(payload);
        if (pendingFiles.length > 0) {
          await partnerService.uploadHotelImages(created.id, pendingFiles);
        }
      } else {
        await partnerService.updateHotel(selected.id, {
          ...payload,
          imageUrls: getHotelImageUrls(selected),
        });
        await deleteRemovedHotelImages(selected, existingImageUrls);
        if (pendingFiles.length > 0) {
          await partnerService.uploadHotelImages(selected.id, pendingFiles);
        }
      }
      revokePendingImageUrls(images);
      setModal(null);
      setSelected(null);
      setForm({ ...EMPTY_FORM, images: [] });
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
        action={
          <button onClick={openAdd} className="partner-hotel-add-btn">
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
            className="partner-hotel-filter-search-input"
          />
        </div>
        <div className="partner-hotel-filter-count-wrap">
          <div className="partner-hotel-filter-divider" />
          <div className="partner-hotel-filter-count">
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
        </div>
      ) : filteredHotels.length === 0 ? (
        <div className="partner-hotel-empty">
          <Building2 size={64} color="#e2e8f0" style={{ marginBottom: 20 }} />
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
                  {h.district}, {h.province}
                </div>

                <div className="partner-hotel-card-amenities">
                  {h.amenities?.slice(0, 4).map(a => {
                    const am = AMENITIES.find(x => x.key === a);
                    return (
                      <span key={a} className="partner-hotel-card-chip">
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
                  </button>
                  <button
                    onClick={() => openDelete(h)}
                    className="partner-hotel-card-btn partner-hotel-card-btn-delete"
                  >
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
          form={form} setForm={setForm} onSubmit={handleSave} onCancel={closeFormModal} saving={saving}
          hotelTypes={hotelTypeOptions}
          amenities={amenityOptions.length ? amenityOptions : AMENITIES}
        />
      )}

      {modal === "delete" && (
          <div>
            <div className="partner-hotel-delete-icon-wrap">
              <Trash2 size={32} color="#ef4444" />
            </div>
            <div className="partner-hotel-delete-actions">
              <button onClick={handleDelete} disabled={saving} className="partner-hotel-delete-confirm-btn">
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
