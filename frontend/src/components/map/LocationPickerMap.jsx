import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { MapPin, Crosshair } from "lucide-react";
import {
  TILE_URL, TILE_ATTRIBUTION, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, NOMINATIM_SEARCH_URL,
} from "../../config/mapsConfig";
import { pinIcon } from "./markerIcon";

/**
 * Map picker cho partner/admin (OpenStreetMap): click/kéo pin để ghim vị trí khách sạn,
 * hoặc bấm "Định vị từ địa chỉ" để geocode qua Nominatim.
 *
 * Geocoding dùng free-text + "nới lỏng dần" (đường→quận→tỉnh) — hợp với dữ liệu OSM ở VN,
 * có province trong chuỗi để chống nhầm sang tỉnh khác. Trả về DANH SÁCH ứng viên (limit=5)
 * để người dùng chọn đúng, thay vì máy tự lấy kết quả đầu (vốn hay sai với địa chỉ VN).
 *
 * props:
 *  - latitude, longitude: toạ độ hiện tại (có thể null)
 *  - address: số nhà + tên đường (dùng cho geocode)
 *  - district: quận/huyện (tuỳ chọn — tăng độ chính xác)
 *  - province: tỉnh/thành (tuỳ chọn — chống nhầm sang tỉnh khác)
 *  - onChange({ latitude, longitude })
 */
export default function LocationPickerMap({
  latitude, longitude, address, district, province, onChange, height = 300,
}) {
  const hasCoords =
    typeof latitude === "number" && typeof longitude === "number" &&
    !Number.isNaN(latitude) && !Number.isNaN(longitude);

  const position = hasCoords ? [latitude, longitude] : null;
  const markerIcon = pinIcon({ color: "#BE1E2E", borderColor: "#7f1d1d" });

  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [message, setMessage] = useState("");

  const canGeocode = [address, district, province].some((s) => s && s.trim());

  // Ghim toạ độ (click bản đồ / kéo pin) → đồng thời xoá danh sách ứng viên cũ.
  function placeAt(lat, lng) {
    onChange({ latitude: lat, longitude: lng });
    setCandidates([]);
    setMessage("");
  }

  async function runGeocode() {
    if (!canGeocode || loading) return;
    setLoading(true);
    setMessage("");
    setCandidates([]);
    try {
      const results = await geocodeVN({ street: address, district, province });
      if (results.length === 0) {
        setMessage("Không tìm thấy địa chỉ này. Hãy click thẳng lên bản đồ để ghim vị trí.");
      } else if (results.length === 1) {
        applyCandidate(results[0]);
      } else {
        setCandidates(results);
        setMessage("Tìm thấy nhiều vị trí — chọn đúng chỗ trong danh sách bên dưới:");
      }
    } catch {
      setMessage("Lỗi mạng khi định vị. Hãy thử lại hoặc click lên bản đồ.");
    } finally {
      setLoading(false);
    }
  }

  function applyCandidate(c) {
    placeAt(parseFloat(c.lat), parseFloat(c.lon));
  }

  return (
    <div>
      <div style={{ height, borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <MapContainer
          center={position || [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng]}
          zoom={position ? 16 : DEFAULT_MAP_ZOOM}
          scrollWheelZoom
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          <ClickToPlace onPlace={placeAt} />
          {position && (
            <Marker
              position={position}
              icon={markerIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const ll = e.target.getLatLng();
                  placeAt(ll.lat, ll.lng);
                },
              }}
            />
          )}
          <MapPanner position={position} />
        </MapContainer>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={runGeocode}
          disabled={!canGeocode || loading}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 8, border: "1px solid #BE1E2E",
            background: !canGeocode || loading ? "#f1f5f9" : "#fff5f5",
            color: !canGeocode || loading ? "#94a3b8" : "#BE1E2E",
            fontSize: 13, fontWeight: 600,
            cursor: !canGeocode || loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? <MapPin size={15} /> : <Crosshair size={15} />}
          {loading ? "Đang định vị..." : "Định vị từ địa chỉ"}
        </button>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>
          {position
            ? `Đã ghim: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} — kéo pin để chỉnh`
            : "Click lên bản đồ hoặc bấm “Định vị từ địa chỉ” để ghim vị trí"}
        </span>
      </div>

      {message && (
        <p style={{ fontSize: 12.5, color: candidates.length ? "#475569" : "#b45309", marginTop: 8, marginBottom: candidates.length ? 6 : 0 }}>
          {message}
        </p>
      )}

      {candidates.length > 0 && (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
          {candidates.map((c, i) => (
            <button
              key={c.place_id || i}
              type="button"
              onClick={() => applyCandidate(c)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 8, width: "100%",
                textAlign: "left", padding: "10px 12px", background: "#fff",
                border: "none", borderTop: i === 0 ? "none" : "1px solid #f1f5f9",
                cursor: "pointer", fontSize: 13, color: "#334155", lineHeight: 1.4,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#fff5f5"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
            >
              <MapPin size={15} color="#BE1E2E" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{c.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Click lên bản đồ → đặt toạ độ. */
function ClickToPlace({ onPlace }) {
  useMapEvents({
    click(e) {
      onPlace(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Di chuyển bản đồ tới vị trí mới khi toạ độ thay đổi do geocode/chọn ứng viên. */
function MapPanner({ position }) {
  const map = useMap();
  const lat = position ? position[0] : null;
  const lng = position ? position[1] : null;
  useEffect(() => {
    if (map && lat != null && lng != null) map.panTo([lat, lng]);
  }, [map, lat, lng]);
  return null;
}

/** Gọi Nominatim với bộ tham số cho trước → trả mảng kết quả (rỗng nếu lỗi/không có). */
async function nominatim(params) {
  const usp = new URLSearchParams({
    format: "json",
    addressdetails: "1",
    limit: "5",
    countrycodes: "vn",
    "accept-language": "vi",
    ...params,
  });
  const res = await fetch(`${NOMINATIM_SEARCH_URL}?${usp.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Geocode địa chỉ VN bằng free-text (Nominatim tối ưu cho kiểu này — query CÓ CẤU TRÚC
 * street/county/state hầu như không khớp cấp hành chính VN, hay trả 0 hoặc sai khu).
 *
 * Chiến lược "nới lỏng dần": thử từ chi tiết → khái quát để vẫn có điểm khởi đầu khi
 * địa chỉ chi tiết không tìm thấy:
 *   1) "số nhà + đường, quận, tỉnh"   (chính xác nhất)
 *   2) "quận, tỉnh"                    (về tâm quận)
 *   3) "tỉnh"                          (về tâm tỉnh)
 * Dừng ngay khi có kết quả → thường chỉ tốn 1 request. Province trong chuỗi giúp chống
 * nhầm sang tỉnh khác.
 */
async function geocodeVN({ street, district, province }) {
  const [s, d, p] = [street, district, province].map((x) => (x || "").trim());
  const queries = [
    [s, d, p], // đường, quận, tỉnh
    [d, p],    // quận, tỉnh
    [p],       // tỉnh
  ];
  for (const parts of queries) {
    const text = [...parts.filter(Boolean), "Việt Nam"].join(", ");
    if (text === "Việt Nam") continue; // không có gì để tìm
    const results = await nominatim({ q: text });
    if (results.length) return results;
  }
  return [];
}
