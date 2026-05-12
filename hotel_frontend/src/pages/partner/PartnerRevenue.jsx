import { useState, useEffect } from "react";
import { partnerService } from "../../services/partnerService";
import { PageHeader, Card } from "../../components/admin/AdminLayout";
import { 
  Calendar, Download, Filter
} from "lucide-react";
import "../../styles/pages/PartnerRevenue.css";

// --- Helpers ---
function fmtPrice(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " tỷ";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + " tr";
  return new Intl.NumberFormat("vi-VN").format(n);
}

const MONTH_NAMES = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];

function groupByMonth(bookings) {
  const map = {};
  for (const b of bookings) {
    if (b.status !== "CONFIRMED" && b.status !== "COMPLETED") continue;
    const key = String(b.checkIn || b.createdAt || "").slice(0, 7); // YYYY-MM
    if (!key) continue;
    if (!map[key]) map[key] = { revenue: 0, count: 0 };
    map[key].revenue += b.totalPrice || 0;
    map[key].count   += 1;
  }
  return map;
}

export default function PartnerRevenue() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        let all = [];
        let page = 1;
        while (true) {
          const data = await partnerService.getBookings({ page, size: 50 });
          const items = data?.items || [];
          all = all.concat(items);
          if (!data?.hasNext || page >= 10) break; 
          page++;
        }
        setBookings(all);
      } catch {
        setBookings([]);
      }
      finally { setLoading(false); }
    }
    loadAll();
  }, []);

  const grouped = groupByMonth(bookings);

  // Build 12-month rows for selected year
  const months = MONTH_NAMES.map((label, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    return { label, key, revenue: grouped[key]?.revenue || 0, count: grouped[key]?.count || 0 };
  });

  const totalRevenue = months.reduce((s, m) => s + m.revenue, 0);
  const maxRevenue   = Math.max(...months.map(m => m.revenue), 1);

  // Summary stats
  const confirmedAll = bookings.filter(b => b.status === "CONFIRMED" || b.status === "COMPLETED");
  const cancelledAll = bookings.filter(b => b.status === "CANCELLED");
  const cancellationRate = confirmedAll.length + cancelledAll.length > 0
    ? `${((cancelledAll.length / (confirmedAll.length + cancelledAll.length)) * 100).toFixed(1)}%`
    : "0%";

  const years = [...new Set(
    Object.keys(grouped).map(k => k.slice(0, 4)).filter(Boolean)
  )].sort().reverse();
  if (!years.includes(String(year))) years.unshift(String(year));

  return (
    <div style={{ paddingBottom: 60 }}>
      <PageHeader 
        action={
          <button style={{ 
            padding: "10px 18px", borderRadius: 10, background: "#fff", color: "#475569", 
            border: "1px solid #e2e8f0", fontWeight: 700, fontSize: 13, cursor: "pointer", 
            display: "flex", alignItems: "center", gap: 8 
          }}>
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="partner-revenue-stat-grid">
        {[
          { 
          },
          { 
          },
          { 
          },
        ].map((c) => (
          <div key={c.label} style={{ 
            background: "#fff", borderRadius: 20, padding: "24px", border: "1px solid #f1f5f9", 
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)", position: "relative", overflow: "hidden" 
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 800, letterSpacing: 0.5 }}>{c.label}</div>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <c.Icon size={18} color={c.color} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>{c.value}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>
              {c.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Main Chart Card */}
      <Card style={{ marginBottom: 32, padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
          <div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <Calendar size={14} color="#64748b" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <select
                style={{ padding: "8px 12px 8px 34px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", background: "#f8fafc", cursor: "pointer", fontWeight: 600 }}
                value={year}
                onChange={e => setYear(Number(e.target.value))}
              >
              </select>
            </div>
          </div>
        </div>

        <Card title="Phân tích doanh thu 12 tháng" icon={TrendingUp}>
        {loading ? (
        ) : (
          <div className="partner-revenue-chart-container">
            <div className="partner-revenue-chart-grid">
              <div style={{ position: "absolute", inset: "0 0 30px 0", display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
                {[0, 1, 2, 3].map(i => <div key={i} className="partner-revenue-grid-line" />)}
              </div>
              
              {months.map((m) => {
                const pct = maxRevenue > 0 ? (m.revenue / maxRevenue) * 210 : 0;
                const isActive = m.revenue > 0;
                return (
                  <div key={m.key} className="partner-revenue-chart-column">
                    {isActive && (
                      <div className="partner-revenue-bar-label">
                        {fmtPrice(m.revenue)}
                      </div>
                    )}
                    <div
                      className="partner-revenue-chart-bar"
                      style={{
                        height: Math.max(pct, 6),
                        background: isActive ? "linear-gradient(to top, #BE1E2E, #EF4444)" : "#f1f5f9"
                      }}
                    />
                    <span className={`partner-revenue-month-label ${isActive ? "partner-revenue-month-label-active" : ""}`}>
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </Card>

    {/* Detailed Table */}
      <div className="partner-revenue-table-wrapper">
        <div className="partner-revenue-table-header">
          <div className="partner-revenue-table-filter">
          </div>
        </div>
        <table className="partner-revenue-table">
          <thead>
            <tr style={{ background: "#f8fafc" }}>
                <th key={h} style={{ padding: "14px 24px", textAlign: "left", fontWeight: 700, color: "#94a3b8", fontSize: 11, letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.filter(m => m.revenue > 0 || m.count > 0).map((m) => (
              <tr key={m.key} className="partner-revenue-table-row" style={{ borderBottom: "1px solid #f8fafc" }}>
                <td style={{ padding: "16px 24px", fontWeight: 700, color: "#1e293b" }}>{m.label} / {year}</td>
                <td style={{ padding: "16px 24px", color: "#475569" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#BE1E2E" }} />
                    {m.count} giao dịch
                  </div>
                </td>
                <td style={{ padding: "16px 24px", color: "#BE1E2E", fontWeight: 800 }}>
                  {new Intl.NumberFormat("vi-VN").format(m.revenue)} ₫
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 10, maxWidth: 100 }}>
                      <div style={{ 
                        height: "100%", borderRadius: 10, background: "#BE1E2E", 
                        width: totalRevenue > 0 ? `${(m.revenue / totalRevenue) * 100}%` : "0%" 
                      }} />
                    </div>
                    <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>
                      {totalRevenue > 0 ? ((m.revenue / totalRevenue) * 100).toFixed(1) + "%" : "—"}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {months.every(m => m.revenue === 0) && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
                  Chưa có dữ liệu giao dịch cho năm {year}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
