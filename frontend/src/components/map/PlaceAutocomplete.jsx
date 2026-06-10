import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { NOMINATIM_SEARCH_URL } from "../../config/mapsConfig";

/**
 * Ô tìm địa điểm gợi ý dùng Nominatim (OpenStreetMap) — miễn phí, giới hạn Việt Nam.
 *
 * Khi chọn 1 gợi ý → trả về { name, location:{lat,lng}, bbox:{swLat,swLng,neLat,neLng} }.
 * bbox lấy từ boundingbox của Nominatim. Có debounce 400ms để tôn trọng giới hạn tốc độ.
 */
export default function PlaceAutocomplete({ onPlaceSelect, placeholder = "Tìm địa điểm, thành phố, khách sạn..." }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);
  const cbRef = useRef(onPlaceSelect);
  cbRef.current = onPlaceSelect;

  // Đóng dropdown khi click ra ngoài.
  useEffect(() => {
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Debounce tìm kiếm.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q, format: "json", addressdetails: "0", limit: "6", countrycodes: "vn",
        });
        const res = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
          headers: { Accept: "application/json" },
        });
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  function handlePick(item) {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    // boundingbox Nominatim: [south, north, west, east] (chuỗi).
    const bb = item.boundingbox?.map(Number);
    let bbox;
    if (bb && bb.length === 4) {
      bbox = { swLat: bb[0], neLat: bb[1], swLng: bb[2], neLng: bb[3] };
    } else {
      const d = 0.045; // ~5km
      bbox = { swLat: lat - d, neLat: lat + d, swLng: lng - d, neLng: lng + d };
    }
    setQuery(item.display_name.split(",")[0]);
    setOpen(false);
    cbRef.current?.({ name: item.display_name, location: { lat, lng }, bbox });
  }

  return (
    <div ref={boxRef} style={{ position: "relative", flex: 1, minWidth: 220 }}>
      <div style={{ position: "relative" }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "10px 12px 10px 36px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {open && (results.length > 0 || loading) && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 1000,
            overflow: "hidden",
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {loading && results.length === 0 && (
            <div style={{ padding: "10px 14px", fontSize: 13, color: "#94a3b8" }}>Đang tìm...</div>
          )}
          {results.map((item) => (
            <button
              key={item.place_id}
              type="button"
              onClick={() => handlePick(item)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                border: "none",
                borderBottom: "1px solid #f1f5f9",
                background: "#fff",
                fontSize: 13,
                color: "#334155",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >
              {item.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
