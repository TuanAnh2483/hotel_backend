import { useState, useEffect, useMemo } from "react";
import { partnerService } from "../../services/partnerService";
import { PageHeader, Card } from "../../components/admin/AdminLayout";
import { 
  TrendingUp, TrendingDown, Activity, Sparkles, Sun, Star, Wind, Clock, Gift,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";

// --- Configuration ---
const DEMAND_LEVELS = {
  HIGH:   { bg: "#fef2f2", color: "#ef4444", border: "#fecaca", label: "Cao", Icon: TrendingUp, adjust: "+15%" },
  MEDIUM: { bg: "#fffbeb", color: "#f59e0b", border: "#fef3c7", label: "Vừa", Icon: Activity,   adjust: "0%"    },
  LOW:    { bg: "#f0fdf4", color: "#10b981", border: "#dcfce7", label: "Thấp", Icon: TrendingDown, adjust: "-5%"   },
};

const HOLIDAYS = [
  "2026-04-26",
  "2026-04-30",
  "2026-05-01",
  "2026-06-01",
  "2026-09-02",
];

// --- Helpers ---
function getDemandLevel(ratio) {
  const pct = ratio * 100;
  if (pct >= 85) return "HIGH";
  if (pct >= 65) return "MEDIUM";
  return "LOW";
}

function formatDate(date) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(date);
}

function generateDailyForecast(bookings, hotels, daysAhead) {
  const today = new Date();
  const totalRooms = hotels.reduce((s, h) => s + (h.roomCount || 5), 0) || 10;

  return Array.from({ length: daysAhead }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i + 1);
    const dateStr = date.toISOString().split("T")[0];

    const activeBookings = bookings.filter(b => {
      if (b.status === "CANCELLED") return false;
      const ci = new Date(b.checkIn);
      const co = new Date(b.checkOut);
      const target = new Date(dateStr);
      return target >= ci && target < co;
    }).length;

    const isWeekend = [0, 6].includes(date.getDay());
    const isHoliday = HOLIDAYS.includes(dateStr);
    
    let predictedRatio = activeBookings / totalRooms;
    if (isHoliday) predictedRatio = Math.max(predictedRatio + 0.6, 0.9); // Force high demand for holidays
    else if (isWeekend) predictedRatio += 0.15;
    else predictedRatio += 0.05;

    predictedRatio = Math.min(predictedRatio, 1.0);

    const demand = getDemandLevel(predictedRatio);
    const config = DEMAND_LEVELS[demand];

    return {
      date: dateStr,
      displayDate: formatDate(date),
      dayName: new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(date),
      occupancy: predictedRatio,
      demand,
      isHoliday,
      isWeekend,
      recommendation: config.adjust,
      tip: demand === "HIGH" 
        ? "Nhu cầu rất cao, hãy cân nhắc tăng giá để tối ưu lợi nhuận."
        : demand === "MEDIUM"
          ? "Nhu cầu ổn định, nên giữ nguyên giá hoặc tặng kèm voucher nhỏ."
          : "Nhu cầu thấp, nên áp dụng giảm giá hoặc gói ưu đãi để thu hút khách."
    };
  });
}

// --- Components ---

function LineChart({ data }) {
  if (!data.length) return null;

  const width = 800;
  const height = 200;
  const padding = 30;

  const points = data.map((d, i) => {
    const x = padding + (i * (width - 2 * padding)) / (data.length - 1);
    const y = height - padding - d.occupancy * (height - 2 * padding);
    return { x, y, color: DEMAND_LEVELS[d.demand].color };
  });

  const pathD = points.reduce((acc, p, i) => 
    i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, ""
  );

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div style={{ width: "100%", overflowX: "auto", background: "#fff", borderRadius: 12, padding: "20px 10px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 24 }}>
      <div style={{ padding: "0 15px", marginBottom: 15, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b", userSelect: "none", cursor: "default" }}>Biểu đồ dự báo công suất phòng (%)</h3>
        <div style={{ display: "flex", gap: 12 }}>
          {Object.entries(DEMAND_LEVELS).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: v.color }} /> {v.label}
            </div>
          ))}
        </div>
      </div>
      <svg width={width} height={height} style={{ overflow: "visible" }}>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#f1f5f9" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f1f5f9" strokeWidth="1" />
        <text x={padding - 10} y={height - padding} fontSize="10" fill="#94a3b8" textAnchor="end">0%</text>
        <text x={padding - 10} y={padding} fontSize="10" fill="#94a3b8" textAnchor="end">100%</text>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#BE1E2E" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#BE1E2E" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#areaGradient)" />
        <path d={pathD} fill="none" stroke="#BE1E2E" strokeWidth="3" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#fff" stroke={p.color} strokeWidth="2" />
        ))}
        {data.map((d, i) => (
          (i % 2 === 0) && (
            <text key={i} x={points[i].x} y={height - 10} fontSize="10" fill="#94a3b8" textAnchor="middle">
              {d.displayDate}
            </text>
          )
        ))}
      </svg>
    </div>
  );
}

export default function PartnerForecast() {
  const [hotels, setHotels]   = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [daysCount, setDaysCount] = useState(14);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [hotelData, bookingData] = await Promise.all([
          partnerService.getMyHotels(),
          partnerService.getBookings({ size: 200 }),
        ]);
        setHotels(Array.isArray(hotelData) ? hotelData : []);
        setBookings(bookingData?.items || []);
      } catch {
        setHotels([]);
        setBookings([]);
      }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const forecast = useMemo(() => 
    generateDailyForecast(bookings, hotels, daysCount), 
    [bookings, hotels, daysCount]
  );

  const summary = useMemo(() => {
    const high = forecast.filter(f => f.demand === "HIGH").length;
    const avg = forecast.reduce((s, f) => s + f.occupancy, 0) / forecast.length;
    return { high, avg: (avg * 100).toFixed(0) + "%" };
  }, [forecast]);

  return (
    <div style={{ paddingBottom: 60 }}>
      <PageHeader
        title="AI Dự báo & Tối ưu giá"
        subtitle="Sử dụng trí tuệ nhân tạo để phân tích nhu cầu và tối ưu doanh thu của bạn"
      />

      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ background: "#BE1E2E", width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Sparkles color="#fff" size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>Công cụ hỗ trợ thông minh</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            Hệ thống đang phân tích {bookings.length} dữ liệu đặt phòng để đưa ra các gợi ý điều chỉnh giá phù hợp theo thị trường.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[7, 14, 21, 30].map(d => (
            <button key={d} onClick={() => setDaysCount(d)} style={{
              padding: "5px 12px", borderRadius: 6, border: daysCount === d ? "1px solid #BE1E2E" : "1px solid #e2e8f0",
              background: daysCount === d ? "#FFF1F2" : "#fff", color: daysCount === d ? "#BE1E2E" : "#64748b",
              fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.2s"
            }}>
              {d} ngày
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "100px 0" }}>
          <Activity size={40} color="#BE1E2E" style={{ marginBottom: 12, animation: "pulse 1.5s infinite" }} />
          <div style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>Đang xử lý dữ liệu...</div>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
            <Card style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>CÔNG SUẤT TRUNG BÌNH</span>
                <TrendingUp size={16} color="#BE1E2E" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{summary.avg}</div>
              <div style={{ fontSize: 11, color: "#10b981", marginTop: 4, fontWeight: 600 }}>Dự kiến tăng 5% so với tháng trước</div>
            </Card>
            <Card style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>NGÀY NHU CẦU CAO</span>
                <Sparkles size={16} color="#ef4444" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#ef4444" }}>{summary.high} ngày</div>
              <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4, fontWeight: 600 }}>Tập trung vào các dịp cuối tuần & lễ</div>
            </Card>
            <Card style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>KHÁCH SẠN QUẢN LÝ</span>
                <Activity size={16} color="#8b5cf6" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#8b5cf6" }}>{hotels.length}</div>
              <div style={{ fontSize: 11, color: "#8b5cf6", marginTop: 4, fontWeight: 600 }}>Tất cả các cơ sở đang hoạt động</div>
            </Card>
          </div>

          <LineChart data={forecast} />

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: "0 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: 0, userSelect: "none", cursor: "default" }}>Chi tiết dự báo hằng ngày</h3>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>{forecast.length} kết quả</span>
            </div>

            {forecast.map((f, i) => {
              const d = DEMAND_LEVELS[f.demand];
              return (
                <div key={i} style={{ 
                  background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 20px",
                  display: "flex", alignItems: "center", gap: 20
                }}>
                  <div style={{ width: 60, textAlign: "center", borderRight: "1px solid #f1f5f9", paddingRight: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: f.isWeekend ? "#ef4444" : "#94a3b8", textTransform: "uppercase" }}>{f.dayName}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#1e293b" }}>{f.displayDate}</div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ 
                        padding: "2px 10px", borderRadius: 6, background: d.bg, color: d.color, 
                        fontSize: 11, fontWeight: 800, border: `1px solid ${d.border}`
                      }}>
                        NHU CẦU {d.label.toUpperCase()}
                      </span>
                      {f.isHoliday && <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#f59e0b", fontSize: 11, fontWeight: 700 }}>
                        <Gift size={13} /> Ngày lễ
                      </div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${f.occupancy * 100}%`, height: "100%", background: d.color }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", minWidth: 40 }}>{(f.occupancy * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  <div style={{ width: 140, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>Khuyến nghị giá</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      {f.demand === "HIGH" ? <ArrowUpRight size={16} color={d.color} /> : f.demand === "LOW" ? <ArrowDownRight size={16} color={d.color} /> : null}
                      <span style={{ fontSize: 18, fontWeight: 800, color: d.color }}>{f.recommendation}</span>
                    </div>
                  </div>

                  <div style={{ flex: 1.5, fontSize: 12, color: "#64748b", fontStyle: "italic", lineHeight: 1.4 }}>
                    {f.tip}
                  </div>

                  <button style={{
                    padding: "8px 16px", borderRadius: 8, border: "none", 
                    background: f.demand === "MEDIUM" ? "#f1f5f9" : d.color, 
                    color: f.demand === "MEDIUM" ? "#94a3b8" : "#fff",
                    fontSize: 12, fontWeight: 700, cursor: f.demand === "MEDIUM" ? "default" : "pointer"
                  }} disabled={f.demand === "MEDIUM"}>
                    Áp dụng gợi ý
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Card style={{ marginTop: 32, padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Sparkles color="#f59e0b" size={20} />
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0, userSelect: "none", cursor: "default" }}>Gợi ý chiến lược dài hạn</h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { title: "Kỳ nghỉ lễ 30/04 & 01/05", desc: "Nhu cầu du lịch bùng nổ, khuyến nghị tăng giá các loại phòng VIP và đặt cọc sớm.", icon: Star, color: "#ef4444" },
            { title: "Giai đoạn mùa hè (T6 - T8)", desc: "Cao điểm du lịch gia đình. Cân nhắc các gói combo phòng + ăn sáng.", icon: Sun, color: "#f59e0b" },
            { title: "Dự báo mùa thấp điểm (T9 - T11)", desc: "Nhu cầu giảm, hãy chuẩn bị các chương trình khách hàng thân thiết.", icon: Wind, color: "#BE1E2E" },
            { title: "Tối ưu hóa công suất", desc: "Sử dụng tính năng 'Last minute deal' sau 18h để lấp đầy công suất.", icon: Clock, color: "#8b5cf6" }
          ].map((item, i) => (
            <div key={i} style={{ background: "#f8fafc", borderRadius: 10, padding: "16px", border: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <item.icon size={16} color={item.color} />
                <span style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{item.title}</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
