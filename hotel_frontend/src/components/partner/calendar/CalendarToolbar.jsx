import { Building2, Hotel, CircleDollarSign, Calendar as CalIcon, ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";

export default function CalendarToolbar({
  hotels, rooms,
  selectedHotelId, selectedRoomId,
  onHotelChange, onRoomChange,
  year, month, monthNames,
  todayMonth, todayYear,
  onPrevMonth, onNextMonth, onToday,
  onMonthUpdate, onRangeUpdate,
  disabled,
}) {
  const isCurrentMonth = year === todayYear && month === todayMonth;

  return (
    <div className="pct-root">

      {/* ── Hotel selector ── */}
      <div className="pct-select-group">
        <span className="pct-group-label">Khách sạn</span>
        <div className="pct-select-wrap">
          <Building2 size={13} className="pct-select-icon" />
          <select
            className="pct-select"
            value={selectedHotelId}
            onChange={e => onHotelChange(e.target.value)}
            aria-label="Chọn khách sạn"
          >
            {!hotels.length && <option value="">Chưa có khách sạn</option>}
            {hotels.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Room type selector ── */}
      <div className="pct-select-group">
        <span className="pct-group-label">Loại phòng</span>
        <div className="pct-select-wrap">
          <Hotel size={13} className="pct-select-icon" />
          <select
            className="pct-select"
            value={selectedRoomId}
            onChange={e => onRoomChange(e.target.value)}
            aria-label="Chọn loại phòng"
          >
            {!rooms.length && <option value="">Chưa có phòng</option>}
            {rooms.map(r => (
              <option key={r.id} value={r.id}>
                {r.name}{r.quantity ? ` · ${r.quantity} phòng` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="pct-divider" />

      {/* ── Bulk action buttons ── */}
      <button
        type="button"
        onClick={onMonthUpdate}
        disabled={disabled}
        className="pct-btn pct-btn--primary"
        aria-label="Cập nhật giá cho toàn tháng"
      >
        <CircleDollarSign size={14} /> Cập nhật tháng
      </button>

      <button
        type="button"
        onClick={onRangeUpdate}
        disabled={disabled}
        className="pct-btn pct-btn--dark"
        aria-label="Cập nhật theo khoảng ngày"
      >
        <CalIcon size={14} /> Khoảng ngày
      </button>

      {/* ── Push month nav to right ── */}
      <div className="pct-spacer" />

      {/* ── Month navigation ── */}
      <div className="pct-month-nav">
        <button
          type="button"
          onClick={onPrevMonth}
          className="pct-nav-btn"
          aria-label="Tháng trước"
        >
          <ChevronLeft size={17} />
        </button>

        <button
          type="button"
          onClick={onToday}
          className={`pct-month-label${isCurrentMonth ? " pct-month-label--current" : ""}`}
          title="Click để về tháng hiện tại"
        >
          <CalendarClock size={13} />
          {monthNames[month]} {year}
        </button>

        <button
          type="button"
          onClick={onNextMonth}
          className="pct-nav-btn"
          aria-label="Tháng sau"
        >
          <ChevronRight size={17} />
        </button>
      </div>

    </div>
  );
}
