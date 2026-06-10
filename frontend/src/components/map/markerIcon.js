import L from "leaflet";

/**
 * Tạo icon pin dạng SVG (divIcon) — tránh phải dùng ảnh marker mặc định của Leaflet
 * (vốn hay lỗi đường dẫn khi build với Vite). Pin nhọn đáy, đầu tròn.
 */
export function pinIcon({ color = "#2563eb", borderColor = "#1e40af", size = 34 } = {}) {
  const w = size;
  const h = Math.round(size * 1.3);
  const html = `
    <svg width="${w}" height="${h}" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 20 12 20s12-11.5 12-20C24 5.37 18.63 0 12 0z"
            fill="${color}" stroke="${borderColor}" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="#ffffff"/>
    </svg>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [w, h],
    iconAnchor: [w / 2, h], // đáy pin trùng toạ độ
    popupAnchor: [0, -h + 6],
  });
}

/**
 * Icon "viên giá tiền" cho bản đồ kết quả tìm kiếm (kiểu Booking.com).
 * label: chuỗi giá rút gọn (vd "1,25tr"). active: nhấn mạnh khi hover/chọn.
 */
export function pricePillIcon({ label, active = false }) {
  const text = String(label ?? "");
  const bg = active ? "#BE1E2E" : "#ffffff";
  const fg = active ? "#ffffff" : "#BE1E2E";
  const scale = active ? 1.1 : 1;

  // Kích thước cố định để canh TÂM pin trùng toạ độ và đặt mũi nhọn ngay dưới điểm.
  // Bề rộng ước lượng theo độ dài nhãn (không thể đo DOM lúc tạo icon).
  const w = Math.ceil(text.length * 7.4) + 24;
  const pillH = 26;   // chiều cao viên giá
  const tail = 5;     // phần mũi nhọn nhô ra dưới

  const html = `
    <div style="
      position:relative;display:flex;justify-content:center;
      transform:scale(${scale});transform-origin:50% 100%;
      transition:transform .12s ease;">
      <div style="
        position:relative;z-index:1;background:${bg};color:${fg};
        border:1.5px solid #BE1E2E;border-radius:100px;
        padding:4px 11px;white-space:nowrap;letter-spacing:.2px;
        font:800 12.5px/1.2 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
        box-shadow:0 3px 8px rgba(0,0,0,0.20),0 1px 2px rgba(0,0,0,0.12);">${text}</div>
      <div style="
        position:absolute;bottom:-4px;left:50%;width:9px;height:9px;background:${bg};
        border-right:1.5px solid #BE1E2E;border-bottom:1.5px solid #BE1E2E;
        transform:translateX(-50%) rotate(45deg);"></div>
    </div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [w, pillH + tail],
    iconAnchor: [w / 2, pillH + tail], // mũi nhọn (tâm-đáy) trùng toạ độ
    popupAnchor: [0, -(pillH + tail) - 2],
  });
}
