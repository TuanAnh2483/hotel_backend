// Cấu hình bản đồ dùng OpenStreetMap (Leaflet) — miễn phí, không cần API key/billing.
// Tile bản đồ lấy từ máy chủ OSM; geocoding/tìm địa điểm dùng Nominatim.

// Toạ độ trung tâm mặc định (Việt Nam) khi chưa có khách sạn nào để căn bản đồ.
export const DEFAULT_MAP_CENTER = { lat: 16.047079, lng: 108.20623 };
export const DEFAULT_MAP_ZOOM = 6;

// Tile layer OpenStreetMap (yêu cầu hiển thị attribution theo điều khoản OSM).
export const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Nominatim — dịch vụ geocoding/tìm địa điểm miễn phí của OSM.
export const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
