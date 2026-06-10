import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  TILE_URL, TILE_ATTRIBUTION, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM,
} from "../../config/mapsConfig";
import { pricePillIcon, pinIcon } from "./markerIcon";

/** Rút gọn giá tiền cho pin: 1.250.000 → "1,25tr". */
function formatPricePill(price) {
  if (!price || price <= 0) return "—";
  if (price >= 1_000_000) {
    const m = price / 1_000_000;
    return `${m.toFixed(m >= 10 ? 0 : 2).replace(/\.?0+$/, "")}tr`;
  }
  if (price >= 1000) return `${Math.round(price / 1000)}k`;
  return String(price);
}

/**
 * Bản đồ kết quả tìm kiếm kiểu Booking.com (OpenStreetMap): mỗi khách sạn là một pin giá.
 * Click pin → popup ảnh + tên + giá + nút xem. Hỗ trợ "tìm khi di chuyển bản đồ".
 *
 * props:
 *  - hotels: danh sách khách sạn (cần latitude/longitude để hiện pin)
 *  - activeId: id khách sạn đang hover ở danh sách (để nhấn mạnh pin)
 *  - onView(hotel): mở trang chi tiết
 *  - searchOnMove: bật tìm theo vùng khi kéo/zoom
 *  - onBoundsChange(bbox): callback khi user di chuyển bản đồ (lúc searchOnMove bật)
 *  - searchPoint: { lat, lng } tâm tìm kiếm khi user click lên bản đồ (có thể null)
 *  - radiusKm: bán kính vùng tìm quanh searchPoint
 *  - onPointSelect(lat, lng): callback khi user click/kéo ghim tâm tìm kiếm
 */
export default function HotelResultsMap({
  hotels = [], activeId, onView, searchOnMove, onBoundsChange,
  searchPoint = null, radiusKm = 2, onPointSelect, height = "100%",
}) {
  const withCoords = useMemo(
    () => hotels.filter(
      (h) => typeof h.latitude === "number" && typeof h.longitude === "number" &&
             !Number.isNaN(h.latitude) && !Number.isNaN(h.longitude)
    ),
    [hotels]
  );

  const [selectedId, setSelectedId] = useState(null);

  const center = withCoords.length
    ? [withCoords[0].latitude, withCoords[0].longitude]
    : [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng];

  return (
    <div style={{ height, minHeight: 320, borderRadius: 14, overflow: "hidden", border: "1px solid #e2e8f0" }}>
      <MapContainer
        center={center}
        zoom={withCoords.length ? 13 : DEFAULT_MAP_ZOOM}
        scrollWheelZoom
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

        <FitToMarkers hotels={withCoords} enabled={!searchOnMove && !searchPoint} />
        <BoundsWatcher enabled={searchOnMove} onBoundsChange={onBoundsChange} />
        <ClickToSearch onPointSelect={onPointSelect} />
        <FocusPoint point={searchPoint} radiusKm={radiusKm} />

        {searchPoint && (
          <>
            <Circle
              center={[searchPoint.lat, searchPoint.lng]}
              radius={radiusKm * 1000}
              pathOptions={{ color: "#BE1E2E", weight: 1.5, fillColor: "#BE1E2E", fillOpacity: 0.08 }}
            />
            <Marker
              position={[searchPoint.lat, searchPoint.lng]}
              icon={pinIcon({ color: "#BE1E2E", borderColor: "#7f1d1d", size: 30 })}
              draggable
              zIndexOffset={2000}
              eventHandlers={{
                dragend: (e) => {
                  const ll = e.target.getLatLng();
                  onPointSelect?.(ll.lat, ll.lng);
                },
              }}
            >
              <Popup>Tâm tìm kiếm — kéo để dời, kết quả trong bán kính {radiusKm}km</Popup>
            </Marker>
          </>
        )}

        {withCoords.map((h) => {
          const isActive = h.id === activeId || h.id === selectedId;
          return (
            <Marker
              key={h.id}
              position={[h.latitude, h.longitude]}
              icon={pricePillIcon({ label: formatPricePill(h.price), active: isActive })}
              zIndexOffset={isActive ? 1000 : 0}
              eventHandlers={{ click: () => setSelectedId(h.id) }}
            >
              <Popup>
                <div style={{ width: 220, cursor: "pointer" }} onClick={() => onView?.(h)}>
                  {h.imageUrl && (
                    <img
                      src={h.imageUrl}
                      alt={h.name}
                      style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 8, display: "block", marginBottom: 8 }}
                    />
                  )}
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#1e293b", marginBottom: 2 }}>{h.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{h.address}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 900, color: "#BE1E2E", fontSize: 15 }}>
                      {h.price > 0 ? h.price.toLocaleString("vi-VN") : "—"} ₫
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onView?.(h); }}
                      style={{ background: "#BE1E2E", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      Xem
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

/** Tự động fit khung nhìn để chứa tất cả pin (khi KHÔNG ở chế độ tìm theo vùng). */
function FitToMarkers({ hotels, enabled }) {
  const map = useMap();
  const signature = hotels.map((h) => h.id).join(",");
  useEffect(() => {
    if (!map || !enabled || hotels.length === 0) return;
    if (hotels.length === 1) {
      map.setView([hotels[0].latitude, hotels[0].longitude], 14);
      return;
    }
    const bounds = L.latLngBounds(hotels.map((h) => [h.latitude, h.longitude]));
    map.fitBounds(bounds, { padding: [48, 48] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, enabled, signature]);
  return null;
}

/** Click lên bản đồ → chọn tâm tìm kiếm (tìm theo bán kính quanh điểm). */
function ClickToSearch({ onPointSelect }) {
  useMapEvents({
    click(e) { onPointSelect?.(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

/** Khung nhìn bám theo vùng bán kính khi đổi tâm/bán kính tìm kiếm. */
function FocusPoint({ point, radiusKm }) {
  const map = useMap();
  const lat = point?.lat;
  const lng = point?.lng;
  useEffect(() => {
    if (!map || lat == null || lng == null) return;
    // toBounds(sizeMet) tạo khung vuông cạnh = đường kính → vừa khít vòng tròn.
    const bounds = L.latLng(lat, lng).toBounds(radiusKm * 2000);
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, lat, lng, radiusKm]);
  return null;
}

/** Báo bbox cho parent khi user kéo/zoom bản đồ (chỉ khi searchOnMove bật). */
function BoundsWatcher({ enabled, onBoundsChange }) {
  const cbRef = useRef(onBoundsChange);
  useEffect(() => { cbRef.current = onBoundsChange; });
  const interacted = useRef(false);

  const map = useMapEvents({
    dragstart() { interacted.current = true; },
    zoomstart() { interacted.current = true; },
    moveend() {
      if (!enabled || !interacted.current) return;
      const b = map.getBounds();
      if (!b) return;
      const ne = b.getNorthEast();
      const sw = b.getSouthWest();
      cbRef.current?.({
        swLat: sw.lat, swLng: sw.lng, neLat: ne.lat, neLng: ne.lng,
      });
    },
  });
  return null;
}
