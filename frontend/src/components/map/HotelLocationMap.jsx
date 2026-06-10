import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { TILE_URL, TILE_ATTRIBUTION } from "../../config/mapsConfig";
import { pinIcon } from "./markerIcon";

/**
 * Bản đồ hiển thị vị trí của MỘT khách sạn (dùng cho trang chi tiết) — OpenStreetMap.
 *
 * Fallback an toàn: khách sạn chưa có toạ độ (lat/lng null) → hiển thị khối thay thế
 * chỉ có địa chỉ, không tải bản đồ.
 */
export default function HotelLocationMap({ latitude, longitude, name, address, height = 320 }) {
  const hasCoords =
    typeof latitude === "number" && typeof longitude === "number" &&
    !Number.isNaN(latitude) && !Number.isNaN(longitude);

  if (!hasCoords) {
    return (
      <div
        style={{
          height,
          borderRadius: 12,
          background: "#f1f5f9",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          color: "#64748b",
          textAlign: "center",
          padding: 16,
        }}
      >
        <span style={{ fontSize: 28 }}>📍</span>
        <strong style={{ color: "#334155" }}>{name}</strong>
        {address && <span style={{ fontSize: 14 }}>{address}</span>}
      </div>
    );
  }

  const position = [latitude, longitude];

  return (
    <div style={{ height, borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" }}>
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={false}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <Marker position={position} icon={pinIcon({ color: "#2563eb", borderColor: "#1e40af" })}>
          {name && <Popup>{name}</Popup>}
        </Marker>
      </MapContainer>
    </div>
  );
}
