import "leaflet/dist/leaflet.css";

/**
 * Trước đây bọc app để load Google Maps JS API. Nay dùng Leaflet/OpenStreetMap —
 * không cần provider hay API key. Chỉ cần import CSS của Leaflet một lần ở đây.
 */
export default function MapsProvider({ children }) {
  return children;
}
