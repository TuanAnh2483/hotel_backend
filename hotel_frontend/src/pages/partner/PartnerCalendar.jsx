import { useEffect, useMemo, useState } from "react";
import { partnerService } from "../../services/partnerService";
import { Badge, Btn, Card, Modal, PageHeader, Table } from "../../components/admin/AdminLayout";
import {
  AlertCircle,
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  DoorOpen,
  Hotel,
  Info,
  Layers3,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import "../../styles/pages/PartnerCalendar.css";

const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

const TABS = [
  { key: "CALENDAR", label: "Lịch phòng", icon: CalendarIcon },
  { key: "REFUNDS", label: "Yêu cầu hoàn tiền", icon: RefreshCcw },
];

const REFUND_FILTERS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Đã từ chối" },
];

function toIsoDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildMonthCells(year, month, itemsByDate) {
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstDay; i += 1) {
    cells.push({ key: `empty-${i}`, empty: true });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const iso = toIsoDate(date);
    cells.push({
      key: iso,
      empty: false,
      day,
      dayOfWeek,
      weekend: dayOfWeek === 0 || dayOfWeek === 6,
      iso,
      item: itemsByDate.get(iso) ?? null,
    });
  }

  return cells;
}

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return Number(value).toLocaleString("vi-VN") + " ₫";
}

function formatCompactCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  const amount = Number(value);
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}tr`;
  }
  if (amount >= 1_000) {
    return `${Math.round(amount / 1_000)}k`;
  }
  return String(amount);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("vi-VN");
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getWeekendDateRanges(year, month) {
  const totalDays = new Date(year, month + 1, 0).getDate();
  const weekendDates = [];

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendDates.push(date);
    }
  }

  const ranges = [];
  for (const date of weekendDates) {
    const iso = toIsoDate(date);
    const previousRange = ranges[ranges.length - 1];

    if (previousRange && toIsoDate(addDays(new Date(previousRange.endDate), 1)) === iso) {
      previousRange.endDate = iso;
    } else {
      ranges.push({ startDate: iso, endDate: iso });
    }
  }

  return ranges;
}

function metricCard(icon, label, value, hint, tone) {
  return { icon, label, value, hint, tone };
}

const METRIC_TONES = {
  red: { bg: "#FFF1F2", fg: "#BE1E2E" },
  green: { bg: "#ECFDF5", fg: "#059669" },
  amber: { bg: "#FFFBEB", fg: "#D97706" },
  blue: { bg: "#EFF6FF", fg: "#2563EB" },
};

const chipStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1,
};

const EMPTY_RATE_FORM = {
  startDate: "",
  endDate: "",
  price: "",
  minStay: "",
  availableRooms: "",
  closed: false,
  applyWeekendInMonth: false,
};

export default function PartnerCalendar() {
  const now = new Date();
  const [activeTab, setActiveTab] = useState("CALENDAR");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [hotels, setHotels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [calendar, setCalendar] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarReloadKey, setCalendarReloadKey] = useState(0);
  const [calendarError, setCalendarError] = useState("");
  const [rateModal, setRateModal] = useState(null);
  const [rateForm, setRateForm] = useState(EMPTY_RATE_FORM);
  const [savingRate, setSavingRate] = useState(false);
  const [refunds, setRefunds] = useState([]);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [refundStatusFilter, setRefundStatusFilter] = useState("");
  const [refundDetail, setRefundDetail] = useState(null);
  const [actingRefundId, setActingRefundId] = useState(null);

  const selectedHotel = hotels.find((hotel) => String(hotel.id) === String(selectedHotelId)) || null;
  const selectedRoom = rooms.find((room) => String(room.id) === String(selectedRoomId)) || null;

  useEffect(() => {
    let ignore = false;

    async function loadHotels() {
      try {
        const data = await partnerService.getMyHotels();
        if (ignore) {
          return;
        }
        const list = Array.isArray(data) ? data : [];
        setHotels(list);
        setSelectedHotelId((current) => {
          if (current && list.some((hotel) => String(hotel.id) === String(current))) {
            return current;
          }
          return list[0] ? String(list[0].id) : "";
        });
      } catch {
        if (!ignore) {
          setHotels([]);
          setSelectedHotelId("");
        }
      }
    }

    loadHotels();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadRooms() {
      if (!selectedHotelId) {
        setRooms([]);
        setSelectedRoomId("");
        return;
      }

      try {
        const data = await partnerService.getRooms(selectedHotelId);
        if (ignore) {
          return;
        }
        const list = Array.isArray(data) ? data : [];
        setRooms(list);
        setSelectedRoomId((current) => {
          if (current && list.some((room) => String(room.id) === String(current))) {
            return current;
          }
          return list[0] ? String(list[0].id) : "";
        });
      } catch {
        if (!ignore) {
          setRooms([]);
          setSelectedRoomId("");
        }
      }
    }

    loadRooms();
    return () => {
      ignore = true;
    };
  }, [selectedHotelId]);

  useEffect(() => {
    let ignore = false;

    async function loadCalendar() {
      if (!selectedRoomId) {
        setCalendar(null);
        return;
      }

      setCalendarLoading(true);
      setCalendarError("");
      try {
        const from = toIsoDate(new Date(year, month, 1));
        const to = toIsoDate(new Date(year, month + 1, 0));
        const data = await partnerService.getRoomCalendar(selectedRoomId, { from, to });
        if (!ignore) {
          setCalendar(data);
        }
      } catch (error) {
        if (!ignore) {
          setCalendar(null);
          setCalendarError(error.message || "Không thể tải lịch phòng.");
        }
      } finally {
        if (!ignore) {
          setCalendarLoading(false);
        }
      }
    }

    loadCalendar();
    return () => {
      ignore = true;
    };
  }, [selectedRoomId, year, month, calendarReloadKey]);

  useEffect(() => {
    let ignore = false;

    async function loadRefunds() {
      if (activeTab !== "REFUNDS") {
        return;
      }

      setRefundsLoading(true);
      try {
        const data = await partnerService.getRefunds({
          hotelId: selectedHotelId || undefined,
          status: refundStatusFilter || undefined,
        });
        if (!ignore) {
          setRefunds(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!ignore) {
          setRefunds([]);
        }
      } finally {
        if (!ignore) {
          setRefundsLoading(false);
        }
      }
    }

    loadRefunds();
    return () => {
      ignore = true;
    };
  }, [activeTab, selectedHotelId, refundStatusFilter]);

  const calendarItems = useMemo(() => calendar?.items || [], [calendar]);

  const itemsByDate = useMemo(() => {
    return new Map(calendarItems.map((item) => [item.date, item]));
  }, [calendarItems]);

  const monthCells = useMemo(() => {
    return buildMonthCells(year, month, itemsByDate);
  }, [itemsByDate, month, year]);

  const todayIso = toIsoDate(now);

  const calendarMetrics = useMemo(() => {
    if (calendarItems.length === 0) {
      return [
        metricCard(CalendarIcon, "Ngày trong tháng", 0, "Chưa có dữ liệu", "red"),
        metricCard(DoorOpen, "TB phòng bán được", "—", "Theo ngày", "green"),
        metricCard(AlertCircle, "Ngày đóng bán", 0, "closed = true", "amber"),
        metricCard(Layers3, "Ngày giá tùy chỉnh", 0, "hasCustomRate", "blue"),
      ];
    }

    const totalDays = calendarItems.length;
    const closedDays = calendarItems.filter((item) => item.closed).length;
    const customRateDays = calendarItems.filter((item) => item.hasCustomRate).length;
    const avgSellableRooms = Math.round(
      calendarItems.reduce((sum, item) => sum + (item.sellableRooms ?? 0), 0) / totalDays,
    );

    const minPrice = Math.min(...calendarItems.map((item) => Number(item.price || 0)).filter(Boolean));

    return [
      metricCard(CalendarIcon, "Ngày trong tháng", totalDays, selectedRoom?.name || "Phòng đã chọn", "red"),
      metricCard(DoorOpen, "TB phòng bán được", avgSellableRooms, `Giá thấp nhất ${formatCompactCurrency(minPrice)}`, "green"),
      metricCard(AlertCircle, "Ngày đóng bán", closedDays, "Không nhận booking mới", "amber"),
      metricCard(Layers3, "Ngày giá tùy chỉnh", customRateDays, "Khác giá cơ bản", "blue"),
    ];
  }, [calendarItems, selectedRoom]);

  const refundMetrics = useMemo(() => {
    const pendingCount = refunds.filter((refund) => refund.status === "PENDING").length;
    const approvedTotal = refunds
      .filter((refund) => refund.status === "APPROVED")
      .reduce((sum, refund) => sum + Number(refund.amount || 0), 0);
    const rejectedCount = refunds.filter((refund) => refund.status === "REJECTED").length;

    return [
      metricCard(Clock3, "Chờ xử lý", pendingCount, "Cần phản hồi từ đối tác", "amber"),
      metricCard(CircleDollarSign, "Đã hoàn", formatCurrency(approvedTotal), "Tổng tiền đã duyệt", "green"),
      metricCard(XCircle, "Từ chối", rejectedCount, "Yêu cầu không đạt điều kiện", "red"),
      metricCard(RefreshCcw, "Tổng yêu cầu", refunds.length, selectedHotel?.name || "Toàn bộ khách sạn", "blue"),
    ];
  }, [refunds, selectedHotel]);

  async function handleRefundAction(refundId, action) {
    if (action === "approve" && !window.confirm("Duyệt yêu cầu hoàn tiền này?")) {
      return;
    }
    if (action === "reject" && !window.confirm("Từ chối yêu cầu hoàn tiền này?")) {
      return;
    }

    setActingRefundId(refundId);
    try {
      const updated =
        action === "approve"
          ? await partnerService.approveRefund(refundId)
          : await partnerService.rejectRefund(refundId);

      setRefunds((current) =>
        current.map((refund) => (refund.id === refundId ? updated : refund)),
      );
      setRefundDetail((current) => (current?.id === refundId ? updated : current));
    } finally {
      setActingRefundId(null);
    }
  }

  function openDayRateModal(cell) {
    if (!selectedRoomId || cell.empty) {
      return;
    }

    const item = cell.item;
    setCalendarError("");
    setRateForm({
      startDate: cell.iso,
      endDate: cell.iso,
      price: String(item?.price ?? calendar?.basePrice ?? ""),
      minStay: item?.minStay ? String(item.minStay) : "",
      availableRooms: item?.availableRooms !== null && item?.availableRooms !== undefined
        ? String(item.availableRooms)
        : "",
      closed: Boolean(item?.closed),
      applyWeekendInMonth: false,
    });
    setRateModal({
      scope: "day",
      title: `Cập nhật giá ngày ${formatDate(cell.iso)}`,
      startDate: cell.iso,
      endDate: cell.iso,
      weekend: Boolean(cell.weekend),
    });
  }

  function openRangeRateModal() {
    if (!selectedRoomId) {
      return;
    }

    const startDate = toIsoDate(new Date(year, month, 1));
    const endDate = toIsoDate(new Date(year, month + 1, 0));
    setCalendarError("");
    setRateForm({
      startDate,
      endDate,
      price: String(calendar?.basePrice ?? selectedRoom?.price ?? ""),
      minStay: "",
      availableRooms: "",
      closed: false,
      applyWeekendInMonth: false,
    });
    setRateModal({
      scope: "range",
      title: "Cập nhật giá theo khoảng ngày",
      startDate,
      endDate,
      weekend: false,
    });
  }

  function openMonthRateModal() {
    if (!selectedRoomId) {
      return;
    }

    const startDate = toIsoDate(new Date(year, month, 1));
    const endDate = toIsoDate(new Date(year, month + 1, 0));
    setCalendarError("");
    setRateForm({
      startDate,
      endDate,
      price: String(calendar?.basePrice ?? selectedRoom?.price ?? ""),
      minStay: "",
      availableRooms: "",
      closed: false,
      applyWeekendInMonth: false,
    });
    setRateModal({
      scope: "month",
      title: `Cập nhật giá ${MONTH_NAMES[month]} ${year}`,
      startDate,
      endDate,
      weekend: false,
    });
  }

  async function handleSaveRate() {
    if (!rateModal || !selectedRoomId) {
      return;
    }

    const price = rateForm.price === "" ? null : Number(rateForm.price);
    const minStay = rateForm.minStay === "" ? null : Number(rateForm.minStay);
    const availableRooms = rateForm.availableRooms === "" ? null : Number(rateForm.availableRooms);
    const startDate = rateForm.startDate || rateModal.startDate;
    const endDate = rateForm.endDate || rateModal.endDate;

    if (!startDate || !endDate) {
      setCalendarError("Vui lòng chọn đủ từ ngày và đến ngày.");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setCalendarError("Đến ngày phải bằng hoặc sau từ ngày.");
      return;
    }
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      setCalendarError("Giá phải là số lớn hơn hoặc bằng 0.");
      return;
    }
    if (minStay !== null && (!Number.isInteger(minStay) || minStay < 1)) {
      setCalendarError("Min stay phải là số nguyên từ 1 trở lên.");
      return;
    }
    if (availableRooms !== null && (!Number.isInteger(availableRooms) || availableRooms < 0)) {
      setCalendarError("Số phòng bán được phải là số nguyên từ 0 trở lên.");
      return;
    }

    setSavingRate(true);
    setCalendarError("");
    try {
      const payload = {
        startDate,
        endDate,
        price,
        minStay,
        closed: rateForm.closed,
        availableRooms,
      };

      if (rateForm.applyWeekendInMonth && rateModal.weekend) {
        const weekendRanges = getWeekendDateRanges(year, month);
        await Promise.all(
          weekendRanges.map((range) =>
            partnerService.updateRoomCalendar(selectedRoomId, {
              ...payload,
              startDate: range.startDate,
              endDate: range.endDate,
            }),
          ),
        );
      } else {
        await partnerService.updateRoomCalendar(selectedRoomId, payload);
      }

      setRateModal(null);
      setCalendarReloadKey((value) => value + 1);
    } catch (error) {
      setCalendarError(error.message || "Không thể cập nhật giá phòng.");
    } finally {
      setSavingRate(false);
    }
  }

  function prevMonth() {
    if (month === 0) {
      setYear((value) => value - 1);
      setMonth(11);
      return;
    }
    setMonth((value) => value - 1);
  }

  function nextMonth() {
    if (month === 11) {
      setYear((value) => value + 1);
      setMonth(0);
      return;
    }
    setMonth((value) => value + 1);
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <PageHeader
        title="Lịch vận hành đối tác"
        subtitle="Lịch phòng bám theo tồn kho và giá theo ngày từ backend hiện tại."
      />

      <div
        style={{
          display: "inline-flex",
          gap: 10,
          padding: 8,
          marginBottom: 28,
          borderRadius: 18,
          background: "#fff",
          border: "1px solid #f1f5f9",
          boxShadow: "0 8px 30px rgba(15, 23, 42, 0.05)",
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 18px",
                borderRadius: 14,
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 800,
                background: active ? "#BE1E2E" : "transparent",
                color: active ? "#fff" : "#64748b",
                boxShadow: active ? "0 10px 24px rgba(190, 30, 46, 0.2)" : "none",
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "CALENDAR" ? (
        <section>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 18,
              marginBottom: 24,
            }}
          >
            {calendarMetrics.map((metric) => {
              const tone = METRIC_TONES[metric.tone];
              const Icon = metric.icon;
              return (
                <Card
                  key={metric.label}
                  style={{
                    borderRadius: 22,
                    padding: 22,
                    display: "flex",
                    gap: 16,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: tone.bg,
                      color: tone.fg,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={24} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 800, marginBottom: 4 }}>
                      {metric.label}
                    </div>
                    <div style={{ fontSize: 24, color: "#0f172a", fontWeight: 900, lineHeight: 1.15 }}>
                      {metric.value}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 5 }}>{metric.hint}</div>
                  </div>
                </Card>
              );
            })}
          </div>

          {calendarError && (
            <div className="partner-calendar-error">
              {calendarError}
            </div>
          )}

          <Card style={{ borderRadius: 26, padding: 0, overflow: "hidden" }}>
            <div
              style={{
                padding: "22px 24px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <div style={{ position: "relative" }}>
                  <Building2
                    size={16}
                    color="#94a3b8"
                    style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
                  />
                  <select
                    value={selectedHotelId}
                    onChange={(event) => setSelectedHotelId(event.target.value)}
                    style={{
                      minWidth: 240,
                      padding: "11px 14px 11px 42px",
                      borderRadius: 14,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0f172a",
                      outline: "none",
                    }}
                  >
                    {!hotels.length && <option value="">Chưa có khách sạn</option>}
                    {hotels.map((hotel) => (
                      <option key={hotel.id} value={hotel.id}>
                        {hotel.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ position: "relative" }}>
                  <Hotel
                    size={16}
                    color="#94a3b8"
                    style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
                  />
                  <select
                    value={selectedRoomId}
                    onChange={(event) => setSelectedRoomId(event.target.value)}
                    style={{
                      minWidth: 220,
                      padding: "11px 14px 11px 42px",
                      borderRadius: 14,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0f172a",
                      outline: "none",
                    }}
                  >
                    {!rooms.length && <option value="">Chưa có phòng</option>}
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={openMonthRateModal}
                  disabled={!selectedRoomId || calendarLoading}
                  className="partner-calendar-month-rate-btn"
                >
                  <CircleDollarSign size={16} />
                  Cập nhật giá tháng
                </button>

                <button
                  type="button"
                  onClick={openRangeRateModal}
                  disabled={!selectedRoomId || calendarLoading}
                  className="partner-calendar-range-rate-btn"
                >
                  <CalendarIcon size={16} />
                  Theo khoảng ngày
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: 8,
                  borderRadius: 16,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <button type="button" onClick={prevMonth} style={monthNavButtonStyle}>
                  <ChevronLeft size={18} />
                </button>
                <div style={{ minWidth: 180, textAlign: "center", fontSize: 16, fontWeight: 900, color: "#0f172a" }}>
                  {MONTH_NAMES[month]} {year}
                </div>
                <button type="button" onClick={nextMonth} style={monthNavButtonStyle}>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {!selectedRoomId ? (
              <div style={{ padding: 48, color: "#64748b", textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#334155", marginBottom: 6 }}>
                  Chưa có phòng để hiển thị lịch
                </div>
                <div style={{ fontSize: 13 }}>Hãy chọn khách sạn có loại phòng khả dụng.</div>
              </div>
            ) : calendarLoading ? (
              <div className="partner-calendar-loading">
                <div className="partner-calendar-spinner" />
                Đang tải lịch phòng...
              </div>
            ) : (
              <div style={{ padding: 24 }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    marginBottom: 18,
                    alignItems: "center",
                    color: "#64748b",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <span style={{ ...chipStyle, background: "#F8FAFC", color: "#475569" }}>
                    Giá cơ bản: {formatCurrency(calendar?.basePrice)}
                  </span>
                  <span style={{ ...chipStyle, background: "#F8FAFC", color: "#475569" }}>
                    Tổng số phòng: {calendar?.defaultQuantity ?? "—"}
                  </span>
                  <span style={{ ...chipStyle, background: "#FFF7ED", color: "#C2410C" }}>
                    <Info size={12} />
                    Ô ngày thể hiện giá và số phòng bán được theo backend
                  </span>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <div style={{ minWidth: 900 }}>
                    <div className="partner-calendar-grid">
                      {DAY_NAMES.map((dayName, dayIndex) => (
                        <div
                          key={dayName}
                          className={`partner-calendar-day-header${dayIndex === 0 || dayIndex === 6 ? " partner-calendar-day-header-weekend" : ""}`}
                        >
                          {dayName}
                        </div>
                      ))}
                    </div>

                    <div className="partner-calendar-days-grid">
                      {monthCells.map((cell) => {
                        if (cell.empty) {
                          return <div key={cell.key} className="partner-calendar-empty-cell" />;
                        }

                        const item = cell.item;
                        const isToday = cell.iso === todayIso;
                        const isClosed = Boolean(item?.closed);
                        const isWeekend = Boolean(cell.weekend);
                        const usesDefaultRate = !item?.hasCustomRate;
                        const displayedPrice = item?.price ?? calendar?.basePrice;
                        const sellable = item?.sellableRooms ?? 0;
                        const blocked = item?.blockedRooms ?? 0;
                        const totalRooms = calendar?.defaultQuantity ?? item?.availableRooms ?? 0;

                        return (
                          <div
                            key={cell.key}
                            className={`partner-calendar-cell${isWeekend ? " partner-calendar-cell-weekend" : ""}`}
                            onClick={() => openDayRateModal(cell)}
                            title="Click để cập nhật giá ngày này"
                            style={{
                              "--cell-bg": isToday ? "#FFF1F2" : isClosed ? "#fff7ed" : isWeekend ? "#f0f9ff" : "#fff",
                              "--cell-border": isToday ? "2px solid #BE1E2E" : isClosed ? "1px solid #fed7aa" : isWeekend ? "1px solid #bfdbfe" : "1px solid #f1f5f9",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                              <div style={{ fontSize: 19, fontWeight: 900, color: isToday ? "#BE1E2E" : "#0f172a" }}>
                                {cell.day}
                              </div>
                              {isClosed && (
                                <span style={{ ...chipStyle, background: "#FFF1F2", color: "#BE1E2E" }}>
                                  Đóng bán
                                </span>
                              )}
                            </div>

                            <div style={{ marginTop: 12, display: "grid", gap: 7, flex: 1 }}>
                              <div style={{ fontSize: 17, fontWeight: 900, color: "#0f172a" }}>
                                {formatCompactCurrency(displayedPrice)}
                              </div>
                              <div style={{ fontSize: 12, color: "#475569", fontWeight: 700 }}>
                                Bán được: {sellable}/{totalRooms}
                              </div>
                              <div style={{ fontSize: 12, color: "#64748b" }}>
                                Chặn: {blocked}
                              </div>
                              <div style={{ fontSize: 12, color: "#64748b" }}>
                                Min stay: {item?.minStay ?? "—"}
                              </div>
                            </div>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                              {item?.hasCustomRate && (
                                <span style={{ ...chipStyle, background: "#EFF6FF", color: "#2563EB" }}>Giá riêng</span>
                              )}
                              {usesDefaultRate && (
                                <span style={{ ...chipStyle, background: "#ECFDF5", color: "#047857" }}>Giá mặc định</span>
                              )}
                              {isWeekend && (
                                <span style={{ ...chipStyle, background: "#DBEAFE", color: "#1D4ED8" }}>Cuối tuần</span>
                              )}
                              {item?.hasInventoryRow && (
                                <span style={{ ...chipStyle, background: "#F8FAFC", color: "#475569" }}>Có row tồn</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </section>
      ) : (
        <section>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 18,
              marginBottom: 24,
            }}
          >
            {refundMetrics.map((metric) => {
              const tone = METRIC_TONES[metric.tone];
              const Icon = metric.icon;
              return (
                <Card
                  key={metric.label}
                  style={{
                    borderRadius: 22,
                    padding: 22,
                    display: "flex",
                    gap: 16,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: tone.bg,
                      color: tone.fg,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={24} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 800, marginBottom: 4 }}>
                      {metric.label}
                    </div>
                    <div style={{ fontSize: typeof metric.value === "string" ? 20 : 24, color: "#0f172a", fontWeight: 900, lineHeight: 1.15 }}>
                      {metric.value}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 5 }}>{metric.hint}</div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card style={{ borderRadius: 26 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 18,
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>Yêu cầu hoàn tiền</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  Dữ liệu lấy trực tiếp từ `/api/partner/refunds`
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <select
                  value={selectedHotelId}
                  onChange={(event) => setSelectedHotelId(event.target.value)}
                  style={selectFilterStyle}
                >
                  {!hotels.length && <option value="">Chưa có khách sạn</option>}
                  {hotels.map((hotel) => (
                    <option key={hotel.id} value={hotel.id}>
                      {hotel.name}
                    </option>
                  ))}
                </select>

                <select
                  value={refundStatusFilter}
                  onChange={(event) => setRefundStatusFilter(event.target.value)}
                  style={selectFilterStyle}
                >
                  {REFUND_FILTERS.map((option) => (
                    <option key={option.value || "all"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {refundsLoading ? (
              <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>Đang tải yêu cầu hoàn tiền...</div>
            ) : (
              <Table
                headers={["Mã", "Booking", "Khách sạn", "Khách hàng", "Số tiền", "Trạng thái", "Thao tác"]}
                rows={refunds.map((refund) => [
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#64748b" }}>#{refund.id}</span>,
                  <span style={{ fontWeight: 800, color: "#BE1E2E" }}>#{refund.bookingId}</span>,
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{refund.hotelName}</span>,
                  <span style={{ color: "#475569" }}>{refund.userEmail}</span>,
                  <span style={{ fontWeight: 800, color: "#0f172a" }}>{formatCurrency(refund.amount)}</span>,
                  <Badge status={refund.status} />,
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Btn small variant="ghost" onClick={() => setRefundDetail(refund)}>
                      Chi tiết
                    </Btn>
                    {refund.status === "PENDING" && (
                      <>
                        <Btn
                          small
                          variant="success"
                          loading={actingRefundId === refund.id}
                          onClick={() => handleRefundAction(refund.id, "approve")}
                        >
                          Duyệt
                        </Btn>
                        <Btn
                          small
                          variant="danger"
                          loading={actingRefundId === refund.id}
                          onClick={() => handleRefundAction(refund.id, "reject")}
                        >
                          Từ chối
                        </Btn>
                      </>
                    )}
                  </div>,
                ])}
                empty="Không có yêu cầu hoàn tiền nào."
              />
            )}
          </Card>
        </section>
      )}

      {rateModal && (
        <Modal title={rateModal.title} onClose={() => setRateModal(null)} width={560}>
          <div className="partner-calendar-rate-form">
            <div className="partner-calendar-rate-summary">
              <div>
                <div className="partner-calendar-rate-label">Phòng</div>
                <div className="partner-calendar-rate-value">{selectedRoom?.name || calendar?.roomName || "—"}</div>
              </div>
              <div>
                <div className="partner-calendar-rate-label">Khoảng ngày</div>
                <div className="partner-calendar-rate-value">
                  {formatDate(rateForm.startDate || rateModal.startDate)} - {formatDate(rateForm.endDate || rateModal.endDate)}
                </div>
              </div>
            </div>

            <div className="partner-calendar-rate-grid">
              {rateModal.scope === "range" && (
                <>
                  <label className="partner-calendar-rate-field">
                    <span>Từ ngày</span>
                    <input
                      type="date"
                      value={rateForm.startDate}
                      onChange={(event) => setRateForm((current) => ({ ...current, startDate: event.target.value }))}
                    />
                  </label>

                  <label className="partner-calendar-rate-field">
                    <span>Đến ngày</span>
                    <input
                      type="date"
                      value={rateForm.endDate}
                      onChange={(event) => setRateForm((current) => ({ ...current, endDate: event.target.value }))}
                    />
                  </label>
                </>
              )}

              <label className="partner-calendar-rate-field">
                <span>Giá bán</span>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={rateForm.price}
                  onChange={(event) => setRateForm((current) => ({ ...current, price: event.target.value }))}
                  placeholder={String(calendar?.basePrice ?? "")}
                />
              </label>

              <label className="partner-calendar-rate-field">
                <span>Min stay</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={rateForm.minStay}
                  onChange={(event) => setRateForm((current) => ({ ...current, minStay: event.target.value }))}
                  placeholder="Không đổi"
                />
              </label>

              <label className="partner-calendar-rate-field">
                <span>Số phòng bán được</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={rateForm.availableRooms}
                  onChange={(event) => setRateForm((current) => ({ ...current, availableRooms: event.target.value }))}
                  placeholder="Không đổi"
                />
              </label>

              <label className="partner-calendar-rate-toggle">
                <input
                  type="checkbox"
                  checked={rateForm.closed}
                  onChange={(event) => setRateForm((current) => ({ ...current, closed: event.target.checked }))}
                />
                <span>Đóng bán trong khoảng này</span>
              </label>

              {rateModal.weekend && (
                <label className="partner-calendar-rate-toggle partner-calendar-rate-toggle-weekend">
                  <input
                    type="checkbox"
                    checked={rateForm.applyWeekendInMonth}
                    onChange={(event) => setRateForm((current) => ({ ...current, applyWeekendInMonth: event.target.checked }))}
                  />
                  <span>Áp dụng những ngày cuối tuần trong tháng</span>
                </label>
              )}
            </div>

            <div className="partner-calendar-rate-note">
              {rateForm.applyWeekendInMonth && rateModal.weekend
                ? "Thao tác này chỉ áp dụng cho các ngày thứ 7 và chủ nhật trong tháng đang xem."
                : rateModal.scope === "month"
                  ? "Thao tác này áp dụng cho toàn bộ tháng đang xem. Các ngày chưa từng chỉnh sẽ chuyển sang dùng giá mới."
                  : rateModal.scope === "range"
                    ? "Thao tác này áp dụng liên tục từ ngày bắt đầu đến ngày kết thúc đã chọn."
                    : "Ngày chưa có giá riêng sẽ dùng giá mặc định của loại phòng. Lưu ở đây sẽ tạo giá riêng cho ngày được chọn."}
            </div>

            <div className="partner-calendar-rate-actions">
              <Btn variant="ghost" onClick={() => setRateModal(null)}>
                Hủy
              </Btn>
              <Btn loading={savingRate} onClick={handleSaveRate}>
                Lưu giá
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {refundDetail && (
        <Modal title={`Yêu cầu hoàn tiền #${refundDetail.id}`} onClose={() => setRefundDetail(null)} width={620}>
          <div style={{ display: "grid", gap: 18 }}>
            <div
              style={{
                padding: 18,
                borderRadius: 18,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 800, marginBottom: 5 }}>KHÁCH SẠN</div>
              <div style={{ fontSize: 20, color: "#0f172a", fontWeight: 900 }}>{refundDetail.hotelName}</div>
              <div style={{ fontSize: 14, color: "#475569", marginTop: 4 }}>{refundDetail.userEmail}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              {[
                ["Booking", `#${refundDetail.bookingId}`],
                ["Số tiền", formatCurrency(refundDetail.amount)],
                ["Check-in", formatDate(refundDetail.checkIn)],
                ["Check-out", formatDate(refundDetail.checkOut)],
                ["Yêu cầu lúc", formatDateTime(refundDetail.requestedAt)],
                ["Đã xử lý lúc", formatDateTime(refundDetail.reviewedAt)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", marginBottom: 5 }}>{label}</div>
                  <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 800 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>Trạng thái:</span>
              <Badge status={refundDetail.status} />
            </div>

            <div
              style={{
                padding: 18,
                borderRadius: 18,
                background: "#FFF7ED",
                border: "1px solid #FED7AA",
              }}
            >
              <div style={{ fontSize: 12, color: "#C2410C", fontWeight: 900, marginBottom: 8 }}>LÝ DO</div>
              <div style={{ fontSize: 14, color: "#7C2D12", lineHeight: 1.7 }}>{refundDetail.reason || "—"}</div>
              {refundDetail.note && (
                <>
                  <div style={{ fontSize: 12, color: "#C2410C", fontWeight: 900, marginTop: 14, marginBottom: 8 }}>
                    GHI CHÚ
                  </div>
                  <div style={{ fontSize: 14, color: "#7C2D12", lineHeight: 1.7 }}>{refundDetail.note}</div>
                </>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Btn variant="ghost" onClick={() => setRefundDetail(null)}>
                Đóng
              </Btn>
              {refundDetail.status === "PENDING" && (
                <>
                  <Btn
                    variant="danger"
                    loading={actingRefundId === refundDetail.id}
                    onClick={() => handleRefundAction(refundDetail.id, "reject")}
                  >
                    Từ chối
                  </Btn>
                  <Btn
                    loading={actingRefundId === refundDetail.id}
                    onClick={() => handleRefundAction(refundDetail.id, "approve")}
                  >
                    Duyệt hoàn tiền
                  </Btn>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const monthNavButtonStyle = {
  width: 40,
  height: 40,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#475569",
  cursor: "pointer",
};

const selectFilterStyle = {
  minWidth: 190,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#fff",
  fontSize: 14,
  fontWeight: 700,
  color: "#0f172a",
  outline: "none",
};
