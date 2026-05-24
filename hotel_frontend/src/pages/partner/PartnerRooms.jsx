import { useState, useEffect } from "react";
import {
  useMyHotels, useCatalogOptions, usePartnerRooms, partnerKeys,
  useCreateRoom, useUpdateRoom, useDeleteRoom,
  useUploadRoomImages, useDeleteRoomImage,
} from "../../hooks/usePartnerQueries";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useOutletContext, useLocation, useNavigate } from "react-router-dom";
import { partnerService } from "../../services/partnerService"; // only used in queryClient.fetchQuery below
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
  Bed, Users, Home, Edit3, Trash2, Search, Plus,
  Grid, TrendingUp, TrendingDown,
  MapPin, Building2, Sparkles, Minus, Box, AlertTriangle,
  Copy, CalendarDays, Power, Wrench, ChevronRight, DoorOpen,
} from "lucide-react";
import { ROOM_AMENITY_KEYS } from "../../utils/amenityConfig";
import "../../styles/pages/partner/PartnerRooms.css";
import { useLang } from "../../contexts/LanguageContext";

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

const HOTEL_TYPE_LABELS = {
  HOTEL: "Khách sạn", RESORT: "Resort", VILLA: "Villa",
  APARTMENT: "Căn hộ", HOMESTAY: "Homestay", HOSTEL: "Hostel", GUEST_HOUSE: "Nhà khách",
};

const EMPTY_FORM = {
  name: "", capacity: 2, quantity: 1, price: 500000,
  roomCategory: "STANDARD", bedType: "DOUBLE", amenities: [], customAmenities: [],
  images: [], description: "",
};

function getRoomImageUrl(room) {
  const imageUrls = getRoomImageUrls(room);
  return room?.coverImageUrl || imageUrls[0] || "";
}

function getRoomImageUrls(room) {
  const imageUrls = Array.isArray(room?.imageUrls) ? room.imageUrls : [];
  const legacyImages = Array.isArray(room?.images) ? room.images : [];
  return imageUrls.length ? imageUrls : legacyImages;
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

function HotelInfoPanel({ hotel }) {
  const { t } = useLang();
  const HOTEL_TYPE_LABELS = {
    HOTEL: t("pt_type_hotel"), RESORT: t("pt_type_resort"), VILLA: t("pt_type_villa"),
    APARTMENT: t("pt_type_apartment"), HOMESTAY: t("pt_type_homestay"), HOSTEL: t("pt_type_hostel"), GUEST_HOUSE: t("pt_type_guest_house"),
  };
  if (!hotel) return null;
  return (
    <div className="pr-hotel-info-panel">
      <div className="pr-hotel-info-header">
        <Building2 size={18} color="#BE1E2E" />
        <span className="pr-hotel-info-title">{t("pt_rooms_hotel_intro")}</span>
        {hotel.hotelType && (
          <span className="pr-hotel-type-badge">
            {HOTEL_TYPE_LABELS[hotel.hotelType] || hotel.hotelType}
          </span>
        )}
      </div>
      <div className="pr-hotel-info-name">{hotel.name}</div>
      {(hotel.address || hotel.district || hotel.province) && (
        <div className="pr-hotel-info-address">
          <MapPin size={13} color="#94a3b8" />
          {[hotel.address, hotel.district, hotel.province].filter(Boolean).join(", ")}
        </div>
      )}
      {hotel.description ? (
        <p className="pr-hotel-info-desc">{hotel.description}</p>
      ) : (
        <p className="pr-hotel-info-desc pr-hotel-info-desc--empty">{t("pt_rooms_hotel_no_desc")}</p>
      )}
    </div>
  );
}

function RoomForm({ form, setForm, onSubmit, onCancel, saving, title, categories, bedTypes, hotel, aiSuggestion, isAdd, saveError, onGoToServices, originalQuantity }) {
  const { t } = useLang();

  const isEntire = hotel?.bookingMode === "ENTIRE";
  const aiSuggestedPrice = aiSuggestion?.data?.suggestedPrice ?? null;
  const aiDelta = (aiSuggestedPrice !== null && form.price > 0) ? aiSuggestedPrice - form.price : null;
  const aiDeltaPct = (aiDelta !== null && form.price > 0) ? (aiDelta / form.price) * 100 : null;
  // Derive demand from % delta — matches PartnerForecast's effectiveDemand thresholds
  const aiDemand = aiDeltaPct !== null
    ? (aiDeltaPct >= 12 ? "HIGH" : aiDeltaPct >= -5 ? "MEDIUM" : "LOW")
    : "MEDIUM";
  const aiIsUp = aiDemand === "HIGH";
  const aiIsDown = aiDemand === "LOW";
  const AI_ROOM_SCHEMES = {
    HIGH:   { bg: "#FFF1F2", border: "#FECDD3", accent: "#BE1E2E", hint: "AI đề xuất tăng giá · thị trường đang tốt" },
    MEDIUM: { bg: "#FFFBEB", border: "#FDE68A", accent: "#D97706", hint: "AI đề xuất giá ổn định với thị trường hiện tại" },
    LOW:    { bg: "#F0FDF4", border: "#A7F3D0", accent: "#059669", hint: "AI đề xuất giảm giá · tối ưu công suất lấp phòng" },
  };
  const aiScheme = AI_ROOM_SCHEMES[aiDemand];

  return (
    <Modal title={title} onClose={onCancel} width={680}>
      <div className="pr-form-body">
        <HotelInfoPanel hotel={hotel} />

        <Field label={t("pt_rooms_name")} required>
          <input className="pr-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t("pt_rooms_name_ph")} />
        </Field>

        <div className="pr-form-grid-2">
          <Field label={t("pt_rooms_category")}>
            <select className="pr-input" value={form.roomCategory} onChange={e => setForm(f => ({ ...f, roomCategory: e.target.value }))}>
              {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
          <Field label={t("pt_rooms_bed_type")}>
            <select className="pr-input" value={form.bedType} onChange={e => setForm(f => ({ ...f, bedType: e.target.value }))}>
              {bedTypes.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
            </select>
          </Field>
        </div>

        <div className="pr-form-grid-3">
          <Field label={t("pt_rooms_capacity")}>
            <input className="pr-input" type="number" min="1" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
          </Field>
          <Field label={t("pt_rooms_quantity")}>
            <input
              className="pr-input"
              type="number"
              min="1"
              max={isEntire ? 1 : undefined}
              value={isEntire ? 1 : form.quantity}
              disabled={isEntire}
              onChange={e => setForm(f => ({ ...f, quantity: Math.max(1, Number(e.target.value)) }))}
            />
            {isEntire && (
              <div style={{ fontSize: 11.5, color: "#92400e", marginTop: 4 }}>
                Cơ sở thuê nguyên căn chỉ cho phép 1 phòng mỗi loại
              </div>
            )}
          </Field>
          <Field label={t("pt_rooms_price")}>
            <div className="pr-price-wrap">
              <input className="pr-input pr-input-icon-left" type="number" min="0" step="50000" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
              <TrendingUp size={16} color="#10b981" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
            </div>
          </Field>
        </div>

        {/* Quantity reduction warning */}
        {!isAdd && originalQuantity != null && form.quantity < originalQuantity && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 14px", background: "#fffbeb", borderRadius: 10, border: "1px solid #fde68a", fontSize: 12.5, color: "#92400e", fontWeight: 600 }}>
            <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
            Giảm số lượng phòng có thể xóa các phòng vật lý chưa sử dụng (AVAILABLE / đang dọn).
          </div>
        )}

        {/* AI suggestion error */}
        {aiSuggestion?.error && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", background: "#fff7ed", borderRadius: 12, border: "1px solid #fed7aa", fontSize: 12, color: "#c2410c" }}>
            <Sparkles size={12} style={{ opacity: 0.5 }} />
            Không thể tải gợi ý AI lúc này. Bạn có thể nhập giá thủ công.
          </div>
        )}

        {/* AI suggestion — full width below grid, no blank space issue */}
        {aiSuggestion && (aiSuggestion.loading || aiSuggestion.data) && (
          <div style={{ marginBottom: 4 }}>
            {aiSuggestion.loading ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 14px", background: "#f8fafc", borderRadius: 12,
                border: "1px solid #e2e8f0", fontSize: 12, color: "#94a3b8",
              }}>
                <Sparkles size={12} style={{ opacity: 0.35 }} />
                Đang phân tích dữ liệu 14 ngày tới...
              </div>
            ) : aiSuggestion.data && (
              <div style={{
                borderRadius: 14, background: aiScheme.bg,
                border: `1.5px solid ${aiScheme.border}`,
                padding: "10px 14px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
              }}>
                {/* Single row: badge · price · delta · spacer · apply */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <Sparkles size={11} color={aiScheme.accent} />
                    <span style={{ fontSize: 10, fontWeight: 900, color: aiScheme.accent, letterSpacing: 0.4, textTransform: "uppercase" }}>
                      {aiSuggestion.data.isAddSuggestion
                        ? "Tham khảo · cùng loại phòng"
                        : aiSuggestion.data.aiGenerated ? "Gemini AI" : "Thống kê"
                      }{!aiSuggestion.data.isAddSuggestion ? " · 14 ngày" : ""}
                    </span>
                  </div>
                  <span style={{ color: aiScheme.border, fontSize: 16, lineHeight: 1 }}>·</span>
                  <span style={{ fontSize: 17, fontWeight: 900, color: aiScheme.accent, flexShrink: 0 }}>
                    {new Intl.NumberFormat("vi-VN").format(aiSuggestion.data.suggestedPrice)} ₫
                  </span>
                  {aiDelta !== null && (
                    <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                      {aiIsUp
                        ? <TrendingUp size={12} color={aiScheme.accent} />
                        : aiIsDown
                        ? <TrendingDown size={12} color={aiScheme.accent} />
                        : <Minus size={11} color="#94a3b8" />}
                      <span style={{ fontSize: 11, fontWeight: 800, color: aiIsUp || aiIsDown ? aiScheme.accent : "#94a3b8" }}>
                        {aiIsUp ? "+" : ""}{Math.round(aiDelta).toLocaleString("vi-VN")} ₫
                        {aiDeltaPct !== null && ` (${aiIsUp ? "+" : ""}${aiDeltaPct.toFixed(1)}%)`}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, price: aiSuggestion.data.suggestedPrice }))}
                    style={{
                      marginLeft: "auto", flexShrink: 0,
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "5px 12px", borderRadius: 8, border: "none",
                      background: aiScheme.accent, color: "#fff",
                      fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                      boxShadow: `0 3px 8px ${aiScheme.accent}44`,
                    }}
                  >
                    Áp dụng
                  </button>
                </div>
                {/* Hint text */}
                <div style={{ fontSize: 11, color: aiScheme.accent, opacity: 0.75, marginTop: 5, fontWeight: 600 }}>
                  {aiSuggestion.data.isAddSuggestion
                    ? "Mức giá trung bình của các phòng cùng loại trong cơ sở này"
                    : aiScheme.hint
                  }
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pr-services-link-section">
          <div className="pr-services-link-info">
            <Wrench size={14} color="#475569" />
            <span>
              Tiện ích:{" "}
              <strong>{(form.amenities?.length || 0) + (form.customAmenities?.length || 0)}</strong> mục đã cấu hình
            </span>
          </div>
          <button
            type="button"
            className="pr-services-link-btn"
            onClick={() => { onCancel(); onGoToServices?.(); }}
          >
            Quản lý tiện ích <ChevronRight size={13} />
          </button>
        </div>

        <Field label={t("pt_rooms_desc")}>
          <textarea
            className="pr-input pr-textarea"
            value={form.description || ""}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder={t("pt_rooms_desc_ph")}
            rows={4}
          />
        </Field>

        <Field label={t("pt_rooms_images")}>
          <div className="pr-images-grid">
            {form.images?.map((img, idx) => {
              const url = imageItemUrl(img);
              return (
              <div key={img?.id || url || idx} className="pr-image-thumb">
                <img src={url} alt="" />
                <button
                  className="pr-image-delete-btn"
                  onClick={() => setForm(f => {
                    const images = [...(f.images || [])];
                    const [removed] = images.splice(idx, 1);
                    revokePendingImageUrls([removed]);
                    return { ...f, images };
                  })}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              );
            })}
            <label className="pr-image-add-label">
              <Plus size={24} />
              <div className="pr-image-add-text">{t("pt_rooms_img_add")}</div>
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
          <p className="pr-image-hint">{t("pt_rooms_img_hint")}</p>
        </Field>

        {saveError && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#b91c1c", fontSize: 13, fontWeight: 600, lineHeight: 1.5, padding: "10px 14px", marginBottom: 8 }}>
            {saveError}
          </div>
        )}
        <div className="pr-form-footer">
          <Btn variant="ghost" onClick={onCancel}>{t("adm_cancel")}</Btn>
          <Btn onClick={onSubmit} disabled={saving || !form.name.trim()}>
            {saving ? t("adm_processing") : t("pt_rooms_save")}
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
  const navigate = useNavigate();
  const { t } = useLang();
  const CATEGORIES = [
    { key: "STANDARD", label: t("pt_cat_standard") },
    { key: "DELUXE",   label: t("pt_cat_deluxe") },
    { key: "SUITE",    label: t("pt_cat_suite") },
    { key: "FAMILY",   label: t("pt_cat_family") },
  ];
  const BED_TYPES = [
    { key: "SINGLE", label: t("pt_bed_single") },
    { key: "DOUBLE", label: t("pt_bed_double") },
    { key: "TWIN",   label: t("pt_bed_twin") },
  ];
  const [sp] = useSearchParams();
  const { state: navState } = useLocation();
  const outletCtx = useOutletContext() || {};
  const { selectedHotelId: ctxHotelId, setSelectedHotelId: setCtxHotelId } = outletCtx;

  const queryClient = useQueryClient();
  const [selectedHotelId, setSelectedHotelId] = useState(
    () => sp.get("hotelId") || (ctxHotelId ? String(ctxHotelId) : "")
  );

  // Sync from sidebar hotel selection → local state
  useEffect(() => {
    if (ctxHotelId && !sp.get("hotelId")) {
      setSelectedHotelId(String(ctxHotelId));
    }
  }, [ctxHotelId]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectHotel(id) {
    setSelectedHotelId(id);
    setCtxHotelId?.(id ? Number(id) : null);
    // FIX BUG-008: Reset pagination when switching hotels so the user never lands
    // on a page that doesn't exist for the newly selected hotel's room count.
    setPage(1);
  }
  const [modal, setModal]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showNewBanner, setShowNewBanner] = useState(!!navState?.newProperty);
  const [page, setPage]         = useState(1);
  const [error, setError]       = useState("");
  const [searchText, setSearchText]     = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [roomAiSuggestion, setRoomAiSuggestion] = useState({ loading: false, data: null, error: false });
  const pageSize = 8;

  const { data: hotelData }   = useMyHotels();
  const { data: catalogData } = useCatalogOptions();
  const { data: roomData, isLoading: loading } = usePartnerRooms(selectedHotelId);

  const createRoom     = useCreateRoom();
  const updateRoom     = useUpdateRoom();
  const deleteRoomMut  = useDeleteRoom();
  const uploadImages   = useUploadRoomImages();
  const deleteImageMut = useDeleteRoomImage();

  const hotels = Array.isArray(hotelData) ? hotelData : [];
  const rooms  = Array.isArray(roomData)  ? roomData  : [];

  // Auto-select newly created hotel from wizard redirect
  useEffect(() => {
    if (navState?.newProperty && navState?.hotelId && hotels.length > 0) {
      const newId = String(navState.hotelId);
      if (hotels.find(h => String(h.id) === newId)) {
        selectHotel(newId);
      }
    }
  }, [hotels]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select first hotel when list loads and nothing is selected
  useEffect(() => {
    if (!selectedHotelId && hotels.length > 0) {
      selectHotel(String(hotels[0].id));
    }
  }, [hotels]); // eslint-disable-line react-hooks/exhaustive-deps

  const catalog = {
    roomCategories: Array.isArray(catalogData?.roomCategories) && catalogData.roomCategories.length ? catalogData.roomCategories : CATEGORIES.map(c => c.key),
    bedTypes:       Array.isArray(catalogData?.bedTypes)       && catalogData.bedTypes.length       ? catalogData.bedTypes       : BED_TYPES.map(b => b.key),
    roomAmenities:  Array.isArray(catalogData?.roomAmenities)  && catalogData.roomAmenities.length  ? catalogData.roomAmenities  : [...ROOM_AMENITY_KEYS],
  };

  const categoryOptions = catalog.roomCategories.map((key) => CATEGORIES.find((item) => item.key === key) || { key, label: key });
  const bedTypeOptions = catalog.bedTypes.map((key) => BED_TYPES.find((item) => item.key === key) || { key, label: key });

  const filteredRooms = rooms.filter(r => {
    const matchCategory = !categoryFilter || r.roomCategory === categoryFilter;
    const matchSearch = !searchText || r.name.toLowerCase().includes(searchText.toLowerCase());
    return matchCategory && matchSearch;
  });

  function toIsoDateLocal(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function openAdd() {
    revokePendingImageUrls(form.images);
    setSelected(null);
    setSaveError("");
    setForm({ ...EMPTY_FORM, images: [] });
    setRoomAiSuggestion({ loading: false, data: null, error: false });
    setModal("add");
  }

  // Cập nhật gợi ý giá tham khảo theo category khi ở modal Add
  useEffect(() => {
    if (modal !== "add") return;
    const sameCategory = rooms.filter(r => r.roomCategory === form.roomCategory && r.price > 0);
    if (sameCategory.length > 0) {
      const avg = Math.round(sameCategory.reduce((s, r) => s + r.price, 0) / sameCategory.length / 10000) * 10000;
      setRoomAiSuggestion({ loading: false, data: { suggestedPrice: avg, aiGenerated: false, isAddSuggestion: true }, error: false });
    } else {
      setRoomAiSuggestion({ loading: false, data: null, error: false });
    }
  }, [form.roomCategory, modal]); // eslint-disable-line react-hooks/exhaustive-deps
  async function openEdit(room) {
    revokePendingImageUrls(form.images);
    setSaveError("");
    setSelected(room);
    setForm({
      name: room.name || "", capacity: room.capacity || 2, quantity: room.quantity || 1, price: room.price || 0,
      roomCategory: room.roomCategory || "STANDARD", bedType: room.bedType || "DOUBLE",
      amenities: room.amenities ? room.amenities.filter(key => ROOM_AMENITY_KEYS.has(key)) : [],
      customAmenities: room.customAmenities ? [...room.customAmenities] : [],
      images: createExistingImageItems(getRoomImageUrls(room)),
      description: room.description || "",
    });
    setModal("edit");
    setRoomAiSuggestion({ loading: true, data: null, error: false });
    const today = new Date();
    const end = new Date(today.getTime() + 14 * 86400000);
    const from = toIsoDateLocal(today);
    const to   = toIsoDateLocal(end);
    queryClient.fetchQuery({
      queryKey: partnerKeys.priceSugs(room.id, from, to),
      queryFn:  () => partnerService.getPriceSuggestions(room.id, from, to),
      staleTime: 5 * 60 * 1000,
    }).then(result => {
      const items = (result?.items || []).filter(i => i.suggestedPrice > 0);
      if (items.length > 0) {
        const avg = Math.round(items.reduce((s, i) => s + i.suggestedPrice, 0) / items.length / 1000) * 1000;
        setRoomAiSuggestion({ loading: false, data: { suggestedPrice: avg, aiGenerated: items.some(i => i.aiGenerated) }, error: false });
      } else {
        setRoomAiSuggestion({ loading: false, data: null, error: false });
      }
    }).catch(() => setRoomAiSuggestion({ loading: false, data: null, error: true }));
  }
  function openDelete(room) { setSelected(room); setModal("delete"); }

  function openDuplicate(room) {
    revokePendingImageUrls(form.images);
    setSelected(null);
    setSaveError("");
    setForm({
      name: `${room.name} (bản sao)`,
      capacity: room.capacity || 2,
      quantity: room.quantity > 0 ? room.quantity : 1,
      price: room.price || 0,
      roomCategory: room.roomCategory || "STANDARD",
      bedType: room.bedType || "DOUBLE",
      amenities: room.amenities ? room.amenities.filter(k => ROOM_AMENITY_KEYS.has(k)) : [],
      customAmenities: room.customAmenities ? [...room.customAmenities] : [],
      images: [],
      description: room.description || "",
    });
    setRoomAiSuggestion({ loading: false, data: null, error: false });
    setModal("add");
  }

  async function handleDeactivate(room) {
    try {
      await updateRoom.mutateAsync({
        roomId: room.id, hotelId: selectedHotelId,
        name: room.name, capacity: room.capacity, quantity: 0,
        price: room.price, roomCategory: room.roomCategory, bedType: room.bedType,
        amenities: room.amenities || [], customAmenities: room.customAmenities || [],
        imageUrls: getRoomImageUrls(room),
        description: room.description || null,
      });
    } catch (e) { alert(e.message); }
  }

  function closeFormModal() {
    revokePendingImageUrls(form.images);
    setModal(null);
    setSelected(null);
    setForm({ ...EMPTY_FORM, images: [] });
    setRoomAiSuggestion({ loading: false, data: null, error: false });
  }

  async function handleSave() {
    if (!form.name.trim())                         { setSaveError("Vui lòng nhập tên loại phòng"); return; }
    if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0)
                                                   { setSaveError("Giá phòng phải là số nguyên ≥ 0"); return; }
    if (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 1)
                                                   { setSaveError("Sức chứa phải là số nguyên ≥ 1"); return; }
    if (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 1)
                                                   { setSaveError("Số lượng phòng phải là số nguyên ≥ 1"); return; }
    const currentHotel = hotels.find(h => String(h.id) === String(selectedHotelId));
    if (currentHotel?.bookingMode === "ENTIRE" && Number(form.quantity) > 1)
                                                   { setSaveError("Cơ sở thuê nguyên căn chỉ cho phép tối đa 1 phòng mỗi loại"); return; }
    setSaving(true);
    setSaveError("");
    try {
      const images = form.images || [];
      const existingImageUrls = existingImageUrlsFromItems(images);
      const pendingFiles = pendingImageFilesFromItems(images);
      const payload = { ...form, imageUrls: existingImageUrls };
      delete payload.images;
      if (!payload.description) payload.description = null;

      if (modal === "add") {
        const created = await createRoom.mutateAsync({ hotelId: selectedHotelId, ...payload });
        if (pendingFiles.length > 0) {
          await uploadImages.mutateAsync({ roomId: created.id, hotelId: selectedHotelId, files: pendingFiles });
        }
      } else {
        // existingImageUrls = ảnh cũ user GIỮ LẠI; payload đã chứa imageUrls đúng
        await updateRoom.mutateAsync({
          roomId: selected.id, hotelId: selectedHotelId,
          ...payload,
          // payload.imageUrls = existingImageUrls (đã tính ở trên), KHÔNG override bằng selected
        });
        // Xóa trên Cloudinary các ảnh bị remove khỏi form
        const remaining = new Set(existingImageUrls);
        const removed = getRoomImageUrls(selected).filter(url => !remaining.has(url));
        for (const imageUrl of removed) {
          await deleteImageMut.mutateAsync({ roomId: selected.id, hotelId: selectedHotelId, imageUrl });
        }
        if (pendingFiles.length > 0) {
          await uploadImages.mutateAsync({ roomId: selected.id, hotelId: selectedHotelId, files: pendingFiles });
        }
      }
      revokePendingImageUrls(images);
      setModal(null);
      setSelected(null);
      setForm({ ...EMPTY_FORM, images: [] });
      setRoomAiSuggestion({ loading: false, data: null, error: false });
    } catch (e) {
      const fieldErrors = e.details?.map(d => `${d.field}: ${d.message}`).join("; ");
      setSaveError(fieldErrors ? `${e.message} (${fieldErrors})` : e.message);
    }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await deleteRoomMut.mutateAsync({ roomId: selected.id, hotelId: selectedHotelId });
      setModal(null);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="pr-root">
      <PageHeader
        title={t("pt_rooms_title")}
        subtitle={t("pt_rooms_subtitle")}
        action={selectedHotelId && (
          <button className="pr-add-btn" onClick={openAdd}>
            <Plus size={20} /> {t("pt_rooms_add_btn")}
          </button>
        )}
      />

      {/* New property onboarding banner */}
      {showNewBanner && (
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          background: "linear-gradient(135deg, #fff5f5, #fff1f2)",
          border: "1px solid #fecaca", borderRadius: 14,
          padding: "16px 20px", marginBottom: 20,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "#BE1E2E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b", marginBottom: 3 }}>
              Cơ sở đã được tạo thành công!
            </div>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Hãy bổ sung <strong>ảnh</strong> và <strong>tiện ích</strong> cho từng loại phòng để tăng khả năng được đặt phòng.
            </div>
          </div>
          <button
            onClick={() => setShowNewBanner(false)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4, flexShrink: 0 }}
            title="Đóng"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hotel Selector — chip cards */}
      {hotels.length > 0 && (
        <div className="pr-hotel-chips-wrap">
          <div className="pr-hotel-chips-label">
            <Home size={16} color="#BE1E2E" /> Chọn cơ sở:
          </div>
          <div className="pr-hotel-chips-row">
            {hotels.map(h => {
              const thumb = h.coverImageUrl || (Array.isArray(h.imageUrls) ? h.imageUrls[0] : "");
              const active = String(h.id) === String(selectedHotelId);
              return (
                <button
                  key={h.id}
                  className={`pr-hotel-chip${active ? " pr-hotel-chip--active" : ""}`}
                  onClick={() => selectHotel(String(h.id))}
                >
                  <div className="pr-hotel-chip-thumb">
                    {thumb
                      ? <img src={thumb} alt={h.name} />
                      : <Building2 size={18} color="#94a3b8" />
                    }
                  </div>
                  <div className="pr-hotel-chip-info">
                    <div className="pr-hotel-chip-name">{h.name}</div>
                    {(h.district || h.province) && (
                      <div className="pr-hotel-chip-loc">
                        <MapPin size={10} /> {[h.district, h.province].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
          <h3 className="pr-empty-title">{t("pt_rooms_select_hotel")}</h3>
          <p className="pr-empty-desc">{t("pt_rooms_no_hotel")}</p>
        </Card>
      ) : loading ? (
        <div className="pr-loading">
          <div className="pr-spinner" />
          {t("pt_rooms_loading")}
        </div>
      ) : rooms.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "80px 20px", borderRadius: 20 }}>
          <div className="pr-empty-icon">
            <Bed size={40} color="#cbd5e1" />
          </div>
          <h3 className="pr-empty-title">{t("pt_rooms_empty_title")}</h3>
          <p className="pr-empty-desc">{t("pt_rooms_empty_desc")}</p>
          <Btn onClick={openAdd}>{t("pt_rooms_add_btn")}</Btn>
        </Card>
      ) : (
        <>
          {/* Filter bar */}
          <div className="pr-filter-bar">
            <div className="pr-filter-search-wrap">
              <Search size={15} color="#94a3b8" className="pr-filter-search-icon" />
              <input
                className="pr-filter-search"
                placeholder={t("pt_rooms_search_ph")}
                value={searchText}
                onChange={e => { setSearchText(e.target.value); setPage(1); }}
              />
            </div>
            <select
              className="pr-filter-cat-select"
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            >
              <option value="">{t("pt_rooms_all_categories")}</option>
              {categoryOptions.map(cat => (
                <option key={cat.key} value={cat.key}>{cat.label}</option>
              ))}
            </select>
            <div className="pr-filter-count">
              {filteredRooms.length} / {rooms.length} loại phòng
            </div>
          </div>

          {filteredRooms.length === 0 ? (
            <Card style={{ textAlign: "center", padding: "60px 20px", borderRadius: 20 }}>
              <div className="pr-empty-icon"><Search size={36} color="#cbd5e1" /></div>
              <h3 className="pr-empty-title">{t("pt_rooms_empty_title")}</h3>
              <p className="pr-empty-desc">{t("pt_rooms_empty_desc")}</p>
            </Card>
          ) : (
        <div className="pr-rooms-grid">
          {filteredRooms.slice((page - 1) * pageSize, page * pageSize).map((r) => (
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
                {r.quantity === 0 && (
                  <div className="pr-room-status-badge">
                    <Power size={11} /> Tạm ngừng
                  </div>
                )}
              </div>

              <div className="pr-room-body">
                <div className="pr-room-header">
                  <h3 className="pr-room-name">{r.name}</h3>
                </div>

                <div className="pr-room-meta-grid">
                  <div className="pr-room-meta-item">
                    <div className="pr-room-meta-icon"><Users size={14} color="#64748b" /></div>
                    {r.capacity} khách tối đa
                  </div>
                  <div className="pr-room-meta-item">
                    <div className="pr-room-meta-icon"><Bed size={14} color="#64748b" /></div>
                    {bedTypeOptions.find(b => b.key === r.bedType)?.label || r.bedType || "—"}
                  </div>
                  <div className="pr-room-meta-item">
                    <div className="pr-room-meta-icon"><Grid size={14} color="#64748b" /></div>
                    {r.quantity} phòng
                  </div>
                  <div className="pr-room-meta-item">
                    <div className="pr-room-meta-icon"><Wrench size={14} color="#64748b" /></div>
                    {(r.amenities?.length || 0) + (r.customAmenities?.length || 0)} tiện ích
                  </div>
                </div>

                {/* Unit availability badge */}
                {r.unitSummary && r.unitSummary.totalUnits > 0 && (
                  <div className="pr-unit-availability">
                    <span className="pr-unit-avail-dot" />
                    <span className="pr-unit-avail-text">
                      <strong>{r.unitSummary.availableUnits}</strong>/{r.unitSummary.totalUnits} phòng sẵn sàng
                    </span>
                    {r.unitSummary.maintenanceUnits > 0 && (
                      <span className="pr-unit-maint-badge">
                        ⚠ {r.unitSummary.maintenanceUnits} bảo trì
                      </span>
                    )}
                    {r.unitSummary.cleaningUnits > 0 && (
                      <span className="pr-unit-cleaning-badge">
                        🧹 {r.unitSummary.cleaningUnits} dọn phòng
                      </span>
                    )}
                  </div>
                )}
                {r.unitSummary && r.unitSummary.totalUnits === 0 && (
                  <div className="pr-unit-availability pr-unit-availability--none">
                    <DoorOpen size={13} color="#94a3b8" />
                    <span className="pr-unit-avail-text" style={{ color: "#94a3b8" }}>
                      Chưa tạo phòng cụ thể
                    </span>
                  </div>
                )}

                <div className="pr-room-actions">
                  <button className="pr-edit-btn" onClick={() => openEdit(r)}>
                    <Edit3 size={15} /> {t("adm_edit")}
                  </button>
                  {/* Nút quản lý phòng vật lý */}
                  <button
                    className="pr-units-btn"
                    onClick={() => navigate(`/partner/room-units?roomId=${r.id}&hotelId=${selectedHotelId}`)}
                    title="Quản lý phòng vật lý"
                  >
                    <DoorOpen size={15} />
                    {r.unitSummary?.totalUnits > 0
                      ? `${r.unitSummary.totalUnits} phòng`
                      : "Quản lý phòng"}
                  </button>
                  <div className="pr-room-quick-actions">
                    <button
                      className="pr-quick-btn"
                      title="Nhân bản phòng"
                      aria-label="Nhân bản phòng"
                      onClick={() => openDuplicate(r)}
                    >
                      <Copy size={14} aria-hidden="true" />
                    </button>
                    <button
                      className="pr-quick-btn"
                      title="Lịch & giá phòng"
                      aria-label="Xem lịch và giá phòng"
                      onClick={() => navigate(`/partner/calendar?roomId=${r.id}`)}
                    >
                      <CalendarDays size={14} aria-hidden="true" />
                    </button>
                    {r.quantity > 0 && (
                      <button
                        className="pr-quick-btn pr-quick-btn--deactivate"
                        title="Tạm dừng kinh doanh"
                        aria-label="Tạm dừng kinh doanh phòng này"
                        onClick={() => handleDeactivate(r)}
                      >
                        <Power size={14} aria-hidden="true" />
                      </button>
                    )}
                    <button
                      className="pr-quick-btn pr-quick-btn--delete"
                      title="Xóa phòng"
                      aria-label="Xóa phòng này"
                      onClick={() => openDelete(r)}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
          )}
        </>
      )}

      {/* Pagination */}
      {filteredRooms.length > pageSize && (
        <div className="pr-pagination">
          {[...Array(Math.ceil(filteredRooms.length / pageSize))].map((_, i) => (
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
          title={modal === "add" ? t("pt_rooms_form_add") : t("pt_rooms_form_edit")}
          form={form} setForm={setForm} onSubmit={handleSave} onCancel={closeFormModal} saving={saving}
          categories={categoryOptions}
          bedTypes={bedTypeOptions}
          hotel={hotels.find(h => String(h.id) === String(selectedHotelId)) || null}
          aiSuggestion={roomAiSuggestion}
          isAdd={modal === "add"}
          saveError={saveError}
          onGoToServices={() => navigate("/partner/services")}
          originalQuantity={modal === "edit" ? selected?.quantity : null}
        />
      )}

      {modal === "delete" && (
        <Modal title={t("pt_rooms_del_title")} onClose={() => setModal(null)} width={460}>
          <div className="pr-delete-modal-content">
            <div className="pr-delete-modal-icon">
              <Trash2 size={32} color="#ef4444" />
            </div>
            <h3 className="pr-delete-modal-title">{t("adm_confirm")}</h3>
            {/* FIX BUG-006: Replaced dangerouslySetInnerHTML with safe React element composition.
                Room names are partner-controlled input and must never be injected as raw HTML. */}
            <p className="pr-delete-modal-desc">
              {(() => {
                const template = t("pt_rooms_del_desc");
                const parts = template.split("{name}");
                return parts.length === 2
                  ? <>{parts[0]}<strong>&ldquo;{selected?.name}&rdquo;</strong>{parts[1]}</>
                  : template;
              })()}
            </p>
            <div className="pr-delete-cascade-warn">
              <AlertTriangle size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 700, color: "#92400e", marginBottom: 4 }}>Hành động này không thể hoàn tác</div>
                <div style={{ color: "#78350f", lineHeight: 1.5 }}>
                  Toàn bộ <strong>lịch giá</strong>, <strong>tồn kho</strong> và <strong>dữ liệu đặt phòng</strong> của loại phòng này sẽ bị xóa vĩnh viễn.
                </div>
              </div>
            </div>
            <div className="pr-delete-modal-actions">
              <button className="pr-delete-modal-cancel" onClick={() => setModal(null)}>{t("adm_cancel")}</button>
              <button className="pr-delete-modal-confirm" onClick={handleDelete} disabled={saving}>
                {saving ? t("adm_deleting") : t("pt_rooms_del_submit")}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
