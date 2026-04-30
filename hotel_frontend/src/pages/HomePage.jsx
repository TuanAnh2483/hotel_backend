import { useState, useEffect } from "react";
import { C } from "../components/auth/AuthShared";
import MainNavbar from "../components/MainNavbar";
import Footer from "../components/Footer";
import { hotelService } from "../services/hotelService";
import HotelSearchResults from "../components/hotel/HotelSearchResults";
import { SkeletonCard } from "../components/ui/Skeleton";
import {
  IMG_HERO,
  IMG_HOTELS,
  IMG_DESTINATIONS,
  IMG_PROPERTY_TYPES,
} from "../assets/images/index.js";
import "../styles/pages/customer/HomePage.css";

const PLACEHOLDER_BG = "repeating-conic-gradient(#ccc 0% 25%,#e8e8e8 0% 50%) 0 0/20px 20px";
const DESTINATION_CARDS = [
  { id: "da-nang", name: "Đà Nẵng", searchKey: "Đà Nẵng", image: IMG_DESTINATIONS.DA_NANG, desc: "Khám phá chỗ nghỉ" },
  { id: "nha-trang", name: "Nha Trang", searchKey: "Nha Trang", image: IMG_DESTINATIONS.NHA_TRANG, desc: "Khám phá chỗ nghỉ" },
  { id: "hue", name: "Huế", searchKey: "Huế", image: IMG_DESTINATIONS.HUE, desc: "Khám phá chỗ nghỉ" },
  { id: "ninh-binh", name: "Ninh Bình", searchKey: "Ninh Bình", image: IMG_DESTINATIONS.NINH_BINH, desc: "Khám phá chỗ nghỉ" },
  { id: "can-tho", name: "Cần Thơ", searchKey: "Cần Thơ", image: IMG_DESTINATIONS.CAN_THO, desc: "Khám phá chỗ nghỉ" },
  { id: "phu-quoc", name: "Phú Quốc", searchKey: "Phú Quốc", image: IMG_DESTINATIONS.PHU_QUOC, desc: "Khám phá chỗ nghỉ" },
];
const DEFAULT_DESTINATIONS = DESTINATION_CARDS;
const FALLBACK_LOCATION_OPTIONS = [
  { province: "Hà Nội", districts: ["Quận Hoàn Kiếm", "Quận Ba Đình", "Quận Đống Đa", "Quận Cầu Giấy"] },
  ...DESTINATION_CARDS.map((item) => ({ province: item.searchKey, districts: [] })),
];
const PROPERTY_TYPE_CARDS = [
  { id: "HOTEL", label: "Khách sạn", image: IMG_PROPERTY_TYPES.HOTEL },
  { id: "APARTMENT", label: "Căn hộ", image: IMG_PROPERTY_TYPES.APARTMENT },
  { id: "RESORT", label: "Các resort", image: IMG_PROPERTY_TYPES.RESORT },
  { id: "VILLA", label: "Các biệt thự", image: IMG_PROPERTY_TYPES.VILLA },
  { id: "HOMESTAY", label: "Homestay", image: IMG_PROPERTY_TYPES.HOMESTAY },
  { id: "HOSTEL", label: "Hostel", image: IMG_PROPERTY_TYPES.HOSTEL },
];

// ── SVG icon set ──────────────────────────────────────────────────────
const PATHS = {
  pin:      "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
  map:      "M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z",
  calendar: "M19 3h-1V1h-2v2H8V1H6v2H5C3.9 4 3 4.9 3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v10zm0-12H5V6h14v1zm-7 4H7v5h5v-5z",
  people:   "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05C16.19 13.84 17 15 17 16.5V19h6v-2.5C23 14.17 18.33 13 16 13z",
  bed:      "M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7 4 8.34 4 10s1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z",
  search:   "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  arrow:    "M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z",
};

function Ic({ k, size = 14, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0, display: "block" }}>
      <path d={PATHS[k]} />
    </svg>
  );
}
// ─────────────────────────────────────────────────────────────────────

function ImgBox({ src, alt = "", h, style = {} }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return <img src={src} alt={alt} onError={() => setErr(true)} style={{ width: "100%", height: h || "100%", objectFit: "cover", display: "block", ...style }} />;
  }
  return <div style={{ width: "100%", height: h || "100%", background: PLACEHOLDER_BG, ...style }} />;
}

const Field = ({ iconKey, label, children, flex }) => (
  <div className="customer-homepage-field" style={flex ? { flex } : undefined}>
    <div className="customer-homepage-field-label">
      <Ic k={iconKey} size={12} color="#BE1E2E" />
      {label}
    </div>
    {children}
  </div>
);

function SearchBar({ initial = {}, onSearch }) {
  const [locations, setLocations] = useState(FALLBACK_LOCATION_OPTIONS);
  const [q, setQ] = useState({
    province: initial.province || "",
    district: initial.district || "",
    checkIn:  initial.checkIn  || "",
    checkOut: initial.checkOut || "",
    guests:   initial.guests   || "",
    rooms:    initial.rooms    || "",
  });
  const [provinceErr, setProvinceErr] = useState(false);
  const selectedLocation = locations.find((item) => item.province === q.province);
  const districtOptions = selectedLocation?.districts || [];
  const visibleDistrictOptions = q.district && !districtOptions.includes(q.district)
    ? [q.district, ...districtOptions]
    : districtOptions;

  useEffect(() => {
    let active = true;
    hotelService.getLocations().then((items) => {
      if (active && items.length > 0) {
        setLocations(items);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const upd = k => e => {
    if (k === "province") setProvinceErr(false);
    setQ(p => ({ ...p, [k]: e.target.value }));
  };
  const updateProvince = e => {
    setProvinceErr(false);
    setQ(p => ({ ...p, province: e.target.value, district: "" }));
  };
  const clearAll = () => { setProvinceErr(false); setQ({ province: "", district: "", checkIn: "", checkOut: "", guests: "", rooms: "" }); };
  const hasData = !!(q.province || q.district || q.checkIn || q.checkOut || q.guests || q.rooms);
  const handleSearch = () => {
    if (!q.province.trim()) { setProvinceErr(true); return; }
    setProvinceErr(false);
    onSearch({ ...q, guests: Number(q.guests) || 2, rooms: Number(q.rooms) || 1 });
  };

  return (
    <div className="customer-homepage-searchbar-wrap">
      <div className={`customer-homepage-searchbar${provinceErr ? " has-error" : ""}`}>
        <Field iconKey="pin" label="TỈNH">
          <select className="customer-homepage-field-input customer-homepage-field-select" value={q.province} onChange={updateProvince}>
            <option value="">Chọn tỉnh / thành phố</option>
            {locations.map((item) => (
              <option key={item.province} value={item.province}>{item.province}</option>
            ))}
          </select>
        </Field>
        <Field iconKey="map" label="QUẬN / HUYỆN">
          <select
            className="customer-homepage-field-input customer-homepage-field-select"
            value={q.district}
            onChange={upd("district")}
            disabled={!q.province || visibleDistrictOptions.length === 0}
          >
            <option value="">Tất cả quận / huyện</option>
            {visibleDistrictOptions.map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </Field>
        <Field iconKey="calendar" label="NHẬN PHÒNG">
          <input className="customer-homepage-field-input" type="date" value={q.checkIn} onChange={upd("checkIn")} />
        </Field>
        <Field iconKey="calendar" label="TRẢ PHÒNG">
          <input className="customer-homepage-field-input" type="date" value={q.checkOut} onChange={upd("checkOut")} />
        </Field>
        <Field iconKey="people" label="KHÁCH" flex="0 0 120px">
          <input className="customer-homepage-field-input" type="number" min="1" placeholder="Nhập số khách" value={q.guests} onChange={upd("guests")} />
        </Field>
        <Field iconKey="bed" label="PHÒNG" flex="0 0 120px">
          <input className="customer-homepage-field-input" type="number" min="1" placeholder="Nhập số phòng" value={q.rooms} onChange={upd("rooms")} />
        </Field>
        {hasData && (
          <button onClick={clearAll} title="Xóa tất cả bộ lọc" className="customer-homepage-clear-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
        <div className="customer-homepage-searchbar-divider" />
        <button className="customer-homepage-search-btn" onClick={handleSearch}>
          <Ic k="search" size={15} color="#fff" />
          Tìm kiếm
        </button>
      </div>
      {provinceErr && (
        <div className="customer-homepage-error-tip">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#BE1E2E"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          Vui lòng nhập tỉnh / thành phố bạn muốn đến
        </div>
      )}
    </div>
  );
}

function HotelCard({ hotel, onView, imgUrl }) {
  const ratingText = hotel.rating > 0 ? hotel.rating.toFixed(1) : "Mới";

  return (
    <div className="customer-homepage-hotel-card" onClick={onView}>
      <div className="customer-homepage-hotel-card-media">
        <ImgBox src={imgUrl} alt={hotel.name} h={220} />
        <button className="customer-homepage-favorite-btn" type="button" aria-label="Lưu chỗ nghỉ" onClick={(e) => e.stopPropagation()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.8 4.6c-1.6-1.5-4.1-1.5-5.7 0L12 7.7 8.9 4.6c-1.6-1.5-4.1-1.5-5.7 0-1.7 1.6-1.7 4.3 0 5.9L12 19l8.8-8.5c1.7-1.6 1.7-4.3 0-5.9z" />
          </svg>
        </button>
      </div>
      <div className="customer-homepage-hotel-card-body">
        <span className="customer-homepage-hotel-card-badge">Gợi ý</span>
        <h3 className="customer-homepage-hotel-card-name">{hotel.name}</h3>
        <div className="customer-homepage-hotel-card-location">
          <Ic k="pin" size={12} color="#aaa" />
          {hotel.address}
        </div>
        <div className="customer-homepage-hotel-card-rating-row">
          <span className="customer-homepage-hotel-card-rating">{ratingText}</span>
          <span className="customer-homepage-hotel-card-rating-copy">
            {hotel.rating > 0 ? "Được đánh giá tốt" : "Chỗ nghỉ mới"}
          </span>
        </div>
        {hotel.availableUnits > 0 && (
          <div className="customer-homepage-hotel-card-availability">
            <Ic k="bed" size={12} color="#047857" />
            {hotel.availableUnits} phòng trống
          </div>
        )}
        <div className="customer-homepage-hotel-card-footer">
          {hotel.price > 0
            ? <div className="customer-homepage-hotel-card-price-wrap">
                <span className="customer-homepage-hotel-card-price-label">Bắt đầu từ</span>
                <span className="customer-homepage-hotel-card-price">
                  {hotel.price.toLocaleString("vi-VN")} ₫
                  <span className="customer-homepage-hotel-card-price-unit">/đêm</span>
                </span>
              </div>
            : <span className="customer-homepage-hotel-card-no-price">Liên hệ để biết giá</span>}
          <span className="customer-homepage-hotel-card-arrow-box">
            <Ic k="arrow" size={16} color={C.primary} />
          </span>
        </div>
      </div>
    </div>
  );
}

function DestinationCard({ item, onNavigate }) {
  return (
    <button className="customer-homepage-destination-card" type="button" onClick={onNavigate}>
      <ImgBox src={item.image} alt={item.name} h={150} />
      <span className="customer-homepage-destination-name">{item.name}</span>
      <span className="customer-homepage-destination-desc">{item.desc}</span>
    </button>
  );
}

function PropertyTypeCard({ item, onNavigate }) {
  return (
    <button className="customer-homepage-property-card" type="button" onClick={onNavigate}>
      <ImgBox src={item.image} alt={item.label} h={190} />
      <span className="customer-homepage-property-name">{item.label}</span>
    </button>
  );
}

export default function HomePage({ navigate, user, onLogout }) {
  const [hotels, setHotels] = useState([]);
  const [destinations, setDestinations] = useState(DEFAULT_DESTINATIONS);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [searchQuery, setSearchQuery] = useState(() => {
    try {
      const saved = sessionStorage.getItem("homeSearch");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleSearch = (q) => {
    setSearchQuery(q);
    sessionStorage.setItem("homeSearch", JSON.stringify(q));
  };

  const clearSearch = () => {
    setSearchQuery(null);
    sessionStorage.removeItem("homeSearch");
  };

  useEffect(() => {
    hotelService.searchHotels({ size: 8, sort: "recommended" })
      .then(({ hotels: h }) => setHotels(h.slice(0, 8)))
      .catch(() => {})
      .finally(() => setLoadingHotels(false));

    Promise.all(
      DESTINATION_CARDS.map((destination) =>
        hotelService.searchHotels({ province: destination.searchKey, size: 3, sort: "recommended" })
          .then(({ totalItems }) => ({
            ...destination,
            desc: totalItems > 0 ? `${totalItems} chỗ nghỉ` : destination.desc,
          }))
          .catch(() => destination)
      )
    ).then((items) => {
      const nextDestinations = items.filter(Boolean);
      if (nextDestinations.length > 0) {
        setDestinations(nextDestinations);
      }
    });
  }, []);

  return (
    <div className="customer-homepage">
      <MainNavbar active="home" navigate={navigate} user={user} onLogout={onLogout} />

      {/* ── Hero ── */}
      <div className="customer-homepage-hero">
        <ImgBox src={IMG_HERO} alt="hero" h={480} />
        <div className="customer-homepage-hero-overlay" />

        <div className="customer-homepage-hero-content">
          <h1 className="customer-homepage-hero-title">
            Tìm khách sạn lý tưởng<br />của bạn
          </h1>
          <p className="customer-homepage-hero-subtitle">
            Hàng nghìn lựa chọn lưu trú chất lượng trên khắp Việt Nam
          </p>
        </div>

        <div className="customer-homepage-searchbar-anchor">
          <SearchBar initial={searchQuery || {}} onSearch={handleSearch} />
        </div>
      </div>

      {searchQuery ? (
        <div className="customer-homepage-results-state">
          <div className="customer-homepage-results-header">
            <button onClick={clearSearch} className="customer-homepage-back-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Quay lại trang chủ
            </button>
          </div>
          <HotelSearchResults navigate={navigate} params={searchQuery} hideBanner={true} />
        </div>
      ) : (
        <>
          {/* ── Featured Hotels ── */}
          <div className="customer-homepage-section">
            <p className="customer-homepage-section-eyebrow">GỢI Ý HÀNG ĐẦU</p>
            <div className="customer-homepage-section-header">
              <div>
                <h2 className="customer-homepage-section-title">Nhà ở mà khách yêu thích</h2>
                <p className="customer-homepage-section-desc">Các chỗ nghỉ đang còn phòng và có giá tốt cho ngày gần nhất</p>
              </div>
              <a className="customer-homepage-view-all" onClick={() => navigate("hotels")}>
                Xem tất cả <Ic k="arrow" size={14} color={C.primary} />
              </a>
            </div>
            <div className="customer-homepage-hotels-row">
              {loadingHotels
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : hotels.map((h, i) => (
                    <HotelCard
                      key={h.id}
                      hotel={h}
                      imgUrl={h.imageUrl || IMG_HOTELS[i] || ""}
                      onView={() => navigate("hotel", { hotelId: h.id })}
                    />
                  ))
              }
              <div className="customer-homepage-more-card" onClick={() => navigate("hotels")}>
                <Ic k="arrow" size={22} color={C.primary} />
              </div>
            </div>
          </div>

          {/* ── Trending Destinations ── */}
          <div className="customer-homepage-section customer-homepage-discovery-section">
            <div className="customer-homepage-section-header">
              <div>
                <h2 className="customer-homepage-section-title">Khám phá Việt Nam</h2>
                <p className="customer-homepage-section-desc">Các điểm đến phổ biến có nhiều điều chờ đón bạn</p>
              </div>
            </div>
            <div className="customer-homepage-destination-row">
              {destinations.map((d) => (
                <DestinationCard
                  key={d.id}
                  item={d}
                  onNavigate={() => navigate("hotels", { province: d.searchKey })}
                />
              ))}
            </div>
          </div>

          <div className="customer-homepage-section customer-homepage-type-section">
            <div className="customer-homepage-section-header">
              <div>
                <h2 className="customer-homepage-section-title">Tìm theo loại chỗ nghỉ</h2>
                <p className="customer-homepage-section-desc">Chọn nhanh kiểu lưu trú phù hợp với chuyến đi của bạn</p>
              </div>
            </div>
            <div className="customer-homepage-property-row">
              {PROPERTY_TYPE_CARDS.map((item) => (
                <PropertyTypeCard
                  key={item.id}
                  item={item}
                  onNavigate={() => navigate("hotels", { province: "Hà Nội", hotelTypes: item.id })}
                />
              ))}
            </div>
          </div>
        </>
      )}

      <Footer />
    </div>
  );
}
