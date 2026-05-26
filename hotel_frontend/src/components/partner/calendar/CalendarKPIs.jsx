import { useMemo } from "react";
import { BedDouble, CheckCircle2, TrendingUp, CircleDollarSign } from "lucide-react";
import { fmtCompact, calcOccPct } from "./calendarUtils";

const TONES = {
  red:   { bg: "#FFF1F2", fg: "#BE1E2E" },
  green: { bg: "#ECFDF5", fg: "#059669" },
  blue:  { bg: "#EFF6FF", fg: "#2563EB" },
  amber: { bg: "#FFFBEB", fg: "#D97706" },
};

function KpiCard({ icon: Icon, tone, label, value, sub, loading }) {
  const t = TONES[tone];
  return (
    <div className="pck-card">
      <div className="pck-icon" style={{ background: t.bg, color: t.fg }}>
        <Icon size={20} />
      </div>
      <div className="pck-body">
        <div className="pck-label">{label}</div>
        <div className="pck-value" style={{ color: t.fg }}>
          {loading ? <span className="pck-skeleton" /> : value}
        </div>
        {sub && <div className="pck-hint">{loading ? "" : sub}</div>}
      </div>
    </div>
  );
}

export default function CalendarKPIs({ items, defaultQuantity, basePrice, todayIso, loading }) {
  const m = useMemo(() => {
    if (!items.length || !defaultQuantity) return null;

    const open         = items.filter(i => !i.closed);
    const bookedNights = open.reduce((s, i) => s + (i.bookedRooms || i.blockedRooms || 0), 0);
    const totalSlots   = open.length * defaultQuantity;
    const avgOcc       = totalSlots > 0 ? Math.round(bookedNights / totalSlots * 100) : 0;
    const estRev       = items.reduce((s, i) => {
      const booked = i.bookedRooms || i.blockedRooms || 0;
      return s + booked * (i.price || basePrice || 0);
    }, 0);
    const adr = bookedNights > 0 ? Math.round(estRev / bookedNights) : 0;

    const nearlyFull = items.filter(
      i => !i.closed && calcOccPct(i.bookedRooms || i.blockedRooms || 0, defaultQuantity) >= 80,
    ).length;

    const todayItem   = items.find(i => i.date === todayIso);
    const todayVacant = todayItem && !todayItem.closed
      ? (todayItem.sellableRooms ?? Math.max(0, defaultQuantity - (todayItem.blockedRooms || 0)))
      : null;

    return { bookedNights, totalSlots, avgOcc, estRev, adr, nearlyFull, totalDays: items.length, todayVacant };
  }, [items, defaultQuantity, basePrice, todayIso]);

  return (
    <div className="pck-grid">
      <KpiCard
        icon={BedDouble} tone="red" label="Phòng đã đặt" loading={loading}
        value={m ? String(m.bookedNights) : "—"}
        sub={m ? `Trong ${m.totalDays} ngày của tháng` : undefined}
      />
      <KpiCard
        icon={CheckCircle2} tone="green" label="Phòng trống hôm nay" loading={loading}
        value={m ? (m.todayVacant !== null ? String(m.todayVacant) : "—") : "—"}
        sub={m ? (m.todayVacant !== null ? `Trên tổng ${defaultQuantity || 0} phòng` : "Hôm nay không thuộc tháng này") : undefined}
      />
      <KpiCard
        icon={TrendingUp} tone="blue" label="Công suất TB" loading={loading}
        value={m ? `${m.avgOcc}%` : "—"}
        sub={m ? `${m.bookedNights} / ${m.totalSlots} phòng-đêm` : undefined}
      />
      <KpiCard
        icon={CircleDollarSign} tone="amber" label="Doanh thu ước tính" loading={loading}
        value={m ? fmtCompact(m.estRev) : "—"}
        sub={m && m.adr > 0 ? `ADR ${fmtCompact(m.adr)}` : "Chưa có đặt phòng"}
      />
    </div>
  );
}
