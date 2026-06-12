import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, X, Send, Star, Hotel, CalendarDays, BedDouble, CreditCard, MapPin } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useAuth } from "../contexts/AuthContext";
import { chatService } from "../services/chatService";
import { C } from "../lib/constants";

function formatVnd(n) {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(n))}₫`;
}

// Nhãn tiếng Việt cho trạng thái booking hiển thị trên thẻ partner.
const BOOKING_STATUS_LABEL = {
  PENDING_PAYMENT: "Chờ thanh toán",
  CONFIRMED: "Đã xác nhận",
  CHECKED_IN: "Đã nhận phòng",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã huỷ",
  REFUNDED: "Đã hoàn tiền",
};

// Nhãn tab partner theo path, dùng làm ngữ cảnh "đối tác đang xem trang …".
const PARTNER_PAGE_LABEL = {
  "/partner": "Tổng quan",
  "/partner/hotels": "Cơ sở của tôi",
  "/partner/rooms": "Quản lý phòng",
  "/partner/calendar": "Lịch phòng & giá",
  "/partner/bookings": "Danh sách booking",
  "/partner/reviews": "Đánh giá",
  "/partner/revenue": "Doanh thu",
};

// Trang ẩn widget (luồng xác thực).
const HIDDEN_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

// Chip đặc biệt: cần lấy geolocation trước khi gửi.
const NEARBY_CHIP = "📍 Khách sạn gần tôi";

function newSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `s-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Chat Widget nổi dùng chung 2 role. Tự chọn endpoint theo userType:
 * - PARTNER  → /api/chat/partner (cần JWT)
 * - khác/guest → /api/chat/customer (public)
 * Ẩn với ADMIN và trên các trang auth.
 */
export default function ChatWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const role = user?.userType === "PARTNER" ? "partner" : "customer";

  // Ngữ cảnh trang gửi kèm mỗi tin nhắn.
  // Customer: hotelId khi đang ở /hotels/:id ("phòng này / đặt phòng này").
  // Partner: tab đang mở + bookingId khi ở /partner/bookings/:id ("đơn này").
  const pageContext = useMemo(() => {
    const path = location.pathname;
    if (role === "partner") {
      const bk = path.match(/^\/partner\/bookings\/(\d+)/);
      if (bk) return { bookingId: Number(bk[1]), page: "Chi tiết booking" };
      const page = PARTNER_PAGE_LABEL[path] || (path.startsWith("/partner") ? "Trang đối tác" : null);
      return page ? { page } : null;
    }
    const m = path.match(/^\/hotels\/(\d+)/);
    return m ? { hotelId: Number(m[1]) } : null;
  }, [location.pathname, role]);

  // Câu gợi ý bấm sẵn (hiển thị khi hội thoại mới mở).
  const chips = useMemo(() => {
    if (role === "partner") {
      return ["Tổng quan hôm nay", "Xu hướng doanh thu 6 tháng", "Phòng trống 7 ngày tới", "Booking sắp check-in"];
    }
    const base = [NEARBY_CHIP, "Tìm phòng có hồ bơi ở Đà Nẵng cuối tuần này", "Tra cứu đơn của tôi", "Chính sách huỷ phòng"];
    if (pageContext) base.unshift("Phòng khách sạn này còn trống không?");
    return base;
  }, [role, pageContext]);
  const botName = role === "partner" ? "Trợ lý đối tác" : "Trợ lý HotelHub";
  const greeting =
    role === "partner"
      ? "Chào bạn 👋 Mình có thể giúp xem doanh thu, phòng trống, booking sắp tới hoặc block phòng. Bạn cần gì?"
      : "Chào bạn 👋 Mình là trợ lý đặt phòng HotelHub. Bạn muốn tìm phòng, tra cứu booking hay hỏi chính sách khách sạn?";

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(""); // trạng thái khi bot gọi tool (vd "Đang tra cứu…")

  const sessionId = useRef(newSessionId());
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const pendingCardsRef = useRef([]); // thẻ KS gom trong lượt hiện tại, gắn vào bot message khi xong
  const pendingConfirmRef = useRef(null); // thẻ xác nhận (thao tác ghi) gom trong lượt, gắn khi xong
  const userLocRef = useRef(null); // {lat,lng} khi khách cho phép định vị (tính năng "gần tôi")

  // Đổi role (đăng nhập/đăng xuất) → reset hội thoại + session mới để không lẫn ngữ cảnh.
  useEffect(() => {
    sessionId.current = newSessionId();
    setMessages([]);
  }, [role]);

  // Mở widget lần đầu (chưa có tin) → thêm lời chào.
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ from: "bot", text: greeting }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Auto scroll xuống tin mới nhất.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isOpen]);

  // Focus input khi mở.
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Nối delta vào bubble bot đang stream (tạo mới nếu chưa có).
  function appendDelta(piece) {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.from === "bot" && last.streaming) {
        next[next.length - 1] = { ...last, text: last.text + piece };
      } else {
        next.push({ from: "bot", text: piece, streaming: true });
      }
      return next;
    });
  }

  function endStreaming() {
    setMessages((prev) =>
      prev.map((m, i) => (i === prev.length - 1 && m.streaming ? { ...m, streaming: false } : m))
    );
  }

  // Gắn thẻ KS gom được trong lượt vào bot message cuối (tạo mới nếu lượt chỉ có thẻ, chưa có text).
  function attachPendingCards() {
    const cards = pendingCardsRef.current;
    pendingCardsRef.current = [];
    if (!cards.length) return;
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.from === "bot") next[next.length - 1] = { ...last, cards };
      else next.push({ from: "bot", text: "", cards });
      return next;
    });
  }

  // Gắn thẻ xác nhận (thao tác ghi đang chờ) vào bot message cuối.
  function attachPendingConfirm() {
    const c = pendingConfirmRef.current;
    pendingConfirmRef.current = null;
    if (!c) return;
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.from === "bot") next[next.length - 1] = { ...last, confirm: c };
      else next.push({ from: "bot", text: "", confirm: c });
      return next;
    });
  }

  // Ngữ cảnh gửi kèm mỗi lượt: trang đang xem + toạ độ khách (nếu đã cho phép định vị, chỉ customer).
  function buildContext() {
    const base = pageContext ? { ...pageContext } : {};
    if (role === "customer" && userLocRef.current) {
      base.lat = userLocRef.current.lat;
      base.lng = userLocRef.current.lng;
    }
    return Object.keys(base).length ? base : null;
  }

  // Mở trang chi tiết KS từ thẻ, mang theo tiêu chí ngày/khách để trang đặt prefill.
  function openHotel(card) {
    const params = new URLSearchParams();
    if (card.checkIn) params.set("checkIn", card.checkIn);
    if (card.checkOut) params.set("checkOut", card.checkOut);
    if (card.guests != null) params.set("guests", String(card.guests));
    const qs = params.toString();
    navigate(`/hotels/${card.hotelId}${qs ? `?${qs}` : ""}`);
    setIsOpen(false);
  }

  // Điều hướng từ thẻ.
  function openCard(card) {
    if (card._kind === "payment") navigate(`/payment/${card.bookingId}`);
    else if (card._kind === "booking") navigate(`/partner/bookings/${card.bookingId}`);
    else if (card._kind === "room") navigate(`/partner/calendar`);
    else openHotel(card);
    setIsOpen(false);
  }

  // Gửi 1 lượt: tin thường (text) hoặc phản hồi nút xác nhận (confirm = true/false).
  async function submitTurn({ text, confirm }) {
    const msg = (text ?? "").trim();
    if (isLoading) return;
    if (!msg && confirm === undefined) return;

    const userBubble = msg || (confirm ? "Xác nhận" : "Huỷ");
    setMessages((prev) => [...prev, { from: "user", text: userBubble }]);
    setInput("");
    setIsLoading(true);
    setStatus("");
    pendingCardsRef.current = [];
    pendingConfirmRef.current = null;

    const ctx = buildContext();
    let received = false;
    try {
      const streamFn = role === "partner" ? chatService.streamPartner : chatService.streamCustomer;
      await streamFn({
        message: userBubble,
        sessionId: sessionId.current,
        context: ctx,
        confirm,
        onDelta: (piece) => {
          received = true;
          setStatus("");
          appendDelta(piece);
        },
        onTool: () => setStatus("Đang xử lý…"),
        onCards: (payload) => {
          const items = payload?.items || [];
          if (!items.length) return;
          pendingCardsRef.current = [
            ...pendingCardsRef.current,
            ...items.map((it) => ({
              ...it,
              _kind: payload.kind || "hotel",
              checkIn: payload.checkIn,
              checkOut: payload.checkOut,
              guests: payload.guests,
            })),
          ];
        },
        onConfirm: (payload) => {
          pendingConfirmRef.current = payload;
        },
        onDone: (d) => {
          if (d?.sessionId) sessionId.current = d.sessionId;
        },
      });
      const hadCards = pendingCardsRef.current.length > 0;
      const hadConfirm = !!pendingConfirmRef.current;
      endStreaming();
      attachPendingCards();
      attachPendingConfirm();
      if (!received && !hadCards && !hadConfirm) {
        setMessages((prev) =>
          prev[prev.length - 1]?.from === "bot" ? prev : [...prev, { from: "bot", text: "…" }]
        );
      }
    } catch {
      // Stream lỗi (vd 401/mạng). Nếu đã có một phần trả lời thì giữ nguyên; nếu chưa,
      // fallback gọi endpoint non-stream (đi qua apiClient → có token refresh).
      if (received) {
        endStreaming();
        attachPendingCards();
        attachPendingConfirm();
      } else {
        try {
          const call = role === "partner" ? chatService.partner : chatService.customer;
          const res = await call({ message: userBubble, sessionId: sessionId.current, context: ctx, confirm });
          if (res?.sessionId) sessionId.current = res.sessionId;
          setMessages((prev) => [...prev, { from: "bot", text: res?.reply || "…" }]);
        } catch {
          setMessages((prev) => [
            ...prev,
            { from: "bot", text: "Xin lỗi, có lỗi xảy ra. Bạn thử lại sau nhé." },
          ]);
        }
      }
    } finally {
      setIsLoading(false);
      setStatus("");
    }
  }

  function sendMessage(text) {
    submitTurn({ text });
  }

  // Bấm Có/Không trên thẻ xác nhận: đánh dấu đã xử lý rồi gửi phản hồi xác nhận.
  function respondConfirm(idx, accept) {
    if (isLoading) return;
    setMessages((prev) =>
      prev.map((m, j) => (j === idx ? { ...m, confirm: { ...m.confirm, handled: true } } : m))
    );
    submitTurn({ text: accept ? "Xác nhận" : "Huỷ", confirm: accept });
  }

  // Chip "gần tôi": xin vị trí trình duyệt rồi gửi yêu cầu (buildContext tự kèm lat/lng).
  function findNearby() {
    if (isLoading) return;
    if (!navigator.geolocation) {
      submitTurn({ text: "Tìm khách sạn gần tôi" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLocRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        submitTurn({ text: "Tìm khách sạn gần tôi" });
      },
      () => {
        setMessages((prev) => [
          ...prev,
          { from: "bot", text: "Mình chưa lấy được vị trí của bạn. Bạn cho phép truy cập vị trí, hoặc nói rõ khu vực muốn ở nhé." },
        ]);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }

  function handleSend(e) {
    e?.preventDefault();
    sendMessage(input);
  }

  if (user?.userType === "ADMIN") return null;
  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;

  return (
    <>
      <style>{CHAT_CSS}</style>

      {/* Cửa sổ chat */}
      {isOpen && (
        <div className="hh-chat-window" role="dialog" aria-label={botName}>
          <div className="hh-chat-header" style={{ background: C.primary }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MessageCircle size={18} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>{botName}</span>
            </div>
            <button className="hh-chat-icon-btn" onClick={() => setIsOpen(false)} aria-label="Đóng">
              <X size={18} />
            </button>
          </div>

          <div className="hh-chat-body">
            {messages.map((m, i) => (
              <div key={i}>
                {(m.text || m.from === "user") && (
                  <div
                    className="hh-chat-row"
                    style={{ justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}
                  >
                    <div
                      className={`hh-chat-bubble${m.from === "bot" ? " hh-md" : ""}`}
                      style={
                        m.from === "user"
                          ? { background: C.primary, color: "#fff", borderBottomRightRadius: 4 }
                          : { background: "#F1F1F3", color: C.text, borderBottomLeftRadius: 4 }
                      }
                    >
                      {m.from === "bot" ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{ a: (props) => <a {...props} target="_blank" rel="noreferrer" /> }}
                        >
                          {m.text}
                        </ReactMarkdown>
                      ) : (
                        m.text
                      )}
                    </div>
                  </div>
                )}

                {m.from === "bot" && m.cards?.length > 0 && (
                  <div className="hh-chat-cards">
                    {m.cards.map((card, ci) => (
                      <button
                        key={ci}
                        type="button"
                        className={`hh-card${card._kind === "booking" || card._kind === "room" || card._kind === "payment" ? " hh-card-info" : ""}`}
                        onClick={() => openCard(card)}
                      >
                        {card._kind === "payment" ? (
                          <>
                            <div className="hh-card-icon"><CreditCard size={20} color={C.primary} /></div>
                            <div className="hh-card-body">
                              <div className="hh-card-name">Đã giữ phòng — chờ thanh toán</div>
                              {card.totalPrice != null && (
                                <div className="hh-card-loc">Tổng tiền: {formatVnd(card.totalPrice)}</div>
                              )}
                              <span className="hh-card-cta">Thanh toán ngay →</span>
                            </div>
                          </>
                        ) : card._kind === "booking" ? (
                          <>
                            <div className="hh-card-icon"><CalendarDays size={20} color={C.primary} /></div>
                            <div className="hh-card-body">
                              <div className="hh-card-name">{card.customerName || "Khách"}</div>
                              {card.hotelName && <div className="hh-card-loc">{card.hotelName}</div>}
                              <div className="hh-card-meta">
                                <span className="hh-card-dates">{card.checkIn} → {card.checkOut}</span>
                                {card.status && (
                                  <span className="hh-badge">{BOOKING_STATUS_LABEL[card.status] || card.status}</span>
                                )}
                              </div>
                              <span className="hh-card-cta">Mở chi tiết →</span>
                            </div>
                          </>
                        ) : card._kind === "room" ? (
                          <>
                            <div className="hh-card-icon"><BedDouble size={20} color={C.primary} /></div>
                            <div className="hh-card-body">
                              <div className="hh-card-name">{card.roomName}</div>
                              {card.hotelName && <div className="hh-card-loc">{card.hotelName}</div>}
                              <div className="hh-card-meta">
                                <span className="hh-card-dates">Còn bán: <b>{card.minSellable}</b> phòng</span>
                              </div>
                              <span className="hh-card-cta">Mở lịch phòng →</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div
                              className="hh-card-img"
                              style={card.image ? { backgroundImage: `url(${card.image})` } : undefined}
                            >
                              {!card.image && <Hotel size={20} color="#B9BDC4" />}
                            </div>
                            <div className="hh-card-body">
                              <div className="hh-card-name">{card.name}</div>
                              {card.location && <div className="hh-card-loc">{card.location}</div>}
                              <div className="hh-card-meta">
                                {card.rating > 0 && (
                                  <span className="hh-card-rating">
                                    <Star size={12} fill="#F5A623" color="#F5A623" /> {Number(card.rating).toFixed(1)}
                                  </span>
                                )}
                                {card.fromPrice != null && (
                                  <span className="hh-card-price">
                                    {formatVnd(card.fromPrice)}
                                    <small>/đêm</small>
                                  </span>
                                )}
                              </div>
                              <span className="hh-card-cta">Xem &amp; đặt →</span>
                            </div>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {m.from === "bot" && m.confirm && (
                  <div className="hh-chat-confirm">
                    <button
                      type="button"
                      className="hh-confirm-btn hh-confirm-yes"
                      disabled={m.confirm.handled || isLoading}
                      onClick={() => respondConfirm(i, true)}
                    >
                      ✅ Xác nhận
                    </button>
                    <button
                      type="button"
                      className="hh-confirm-btn hh-confirm-no"
                      disabled={m.confirm.handled || isLoading}
                      onClick={() => respondConfirm(i, false)}
                    >
                      ❌ Huỷ
                    </button>
                  </div>
                )}
              </div>
            ))}

            {messages.length <= 1 && !isLoading && (
              <div className="hh-chat-chips">
                {chips.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    className="hh-chip"
                    onClick={() => (c === NEARBY_CHIP ? findNearby() : sendMessage(c))}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {isLoading &&
              !(messages[messages.length - 1]?.from === "bot" && messages[messages.length - 1]?.text) && (
                <div className="hh-chat-row" style={{ justifyContent: "flex-start" }}>
                  <div
                    className="hh-chat-bubble"
                    style={{ background: "#F1F1F3", color: C.text, display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span className="hh-chat-typing">
                      <span></span><span></span><span></span>
                    </span>
                    {status && <span style={{ fontSize: 12, color: "#6B7280" }}>{status}</span>}
                  </div>
                </div>
              )}
            <div ref={endRef} />
          </div>

          <form className="hh-chat-input" onSubmit={handleSend}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập tin nhắn…"
              aria-label="Nhập tin nhắn"
            />
            <button
              type="submit"
              className="hh-chat-send"
              style={{ background: C.primary }}
              disabled={isLoading || !input.trim()}
              aria-label="Gửi"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Nút nổi */}
      <button
        className="hh-chat-launcher"
        style={{ background: C.primary }}
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Thu gọn trợ lý" : "Mở trợ lý"}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </>
  );
}

const CHAT_CSS = `
.hh-chat-launcher{
  position:fixed; right:24px; bottom:24px; z-index:1000;
  width:56px; height:56px; border-radius:50%; border:none; cursor:pointer;
  color:#fff; display:flex; align-items:center; justify-content:center;
  box-shadow:0 6px 20px rgba(0,0,0,.25); transition:transform .15s ease;
}
.hh-chat-launcher:hover{ transform:scale(1.06); }
.hh-chat-window{
  position:fixed; right:24px; bottom:92px; z-index:1000;
  width:360px; max-width:calc(100vw - 32px); height:500px; max-height:calc(100vh - 130px);
  background:#fff; border-radius:16px; overflow:hidden;
  display:flex; flex-direction:column;
  box-shadow:0 12px 40px rgba(0,0,0,.22); border:1px solid #ECECEC;
}
.hh-chat-header{
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 14px; color:#fff;
}
.hh-chat-icon-btn{ background:transparent; border:none; color:#fff; cursor:pointer; display:flex; padding:2px; }
.hh-chat-body{ flex:1; overflow-y:auto; padding:14px; background:#FAFAFB; display:flex; flex-direction:column; gap:10px; }
.hh-chat-row{ display:flex; }
.hh-chat-bubble{
  max-width:78%; padding:9px 12px; border-radius:14px; font-size:14px; line-height:1.45;
  white-space:pre-wrap; word-break:break-word;
}
.hh-chat-input{ display:flex; gap:8px; padding:10px; border-top:1px solid #EEE; background:#fff; }
.hh-chat-input input{
  flex:1; border:1px solid #E2E2E6; border-radius:20px; padding:9px 14px; font-size:14px; outline:none;
}
.hh-chat-input input:focus{ border-color:#BE1E2E; }
.hh-chat-send{
  border:none; color:#fff; width:38px; height:38px; border-radius:50%; cursor:pointer;
  display:flex; align-items:center; justify-content:center; flex:0 0 auto;
}
.hh-chat-send:disabled{ opacity:.5; cursor:not-allowed; }
.hh-chat-typing{ display:inline-flex; gap:4px; align-items:center; height:18px; }
.hh-chat-typing span{
  width:6px; height:6px; border-radius:50%; background:#9AA0A6; display:inline-block;
  animation:hh-chat-bounce 1.2s infinite ease-in-out both;
}
.hh-chat-typing span:nth-child(1){ animation-delay:-.24s; }
.hh-chat-typing span:nth-child(2){ animation-delay:-.12s; }
@keyframes hh-chat-bounce{ 0%,80%,100%{ transform:scale(.6); opacity:.5; } 40%{ transform:scale(1); opacity:1; } }

/* Markdown trong bubble bot: gọn margin, link đúng màu thương hiệu */
.hh-md > :first-child{ margin-top:0; }
.hh-md > :last-child{ margin-bottom:0; }
.hh-md p{ margin:0 0 6px; }
.hh-md ul,.hh-md ol{ margin:4px 0; padding-left:18px; }
.hh-md li{ margin:2px 0; }
.hh-md a{ color:#BE1E2E; text-decoration:underline; }
.hh-md code{ background:#E7E7EA; padding:1px 4px; border-radius:4px; font-size:12px; }

/* Thẻ khách sạn có nút đặt */
.hh-chat-cards{ display:flex; flex-direction:column; gap:8px; margin:2px 0 2px; }
.hh-card{
  display:flex; gap:10px; text-align:left; cursor:pointer;
  background:#fff; border:1px solid #E6E6EA; border-radius:12px; padding:8px;
  transition:box-shadow .15s ease, border-color .15s ease;
}
.hh-card:hover{ box-shadow:0 4px 14px rgba(0,0,0,.1); border-color:#BE1E2E; }
.hh-card-img{
  flex:0 0 72px; width:72px; height:72px; border-radius:9px; background:#F1F1F3;
  background-size:cover; background-position:center;
  display:flex; align-items:center; justify-content:center;
}
.hh-card-body{ flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.hh-card-name{ font-weight:700; font-size:13px; color:#1F2937; line-height:1.3;
  overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.hh-card-loc{ font-size:11.5px; color:#6B7280; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hh-card-meta{ display:flex; align-items:center; gap:10px; margin-top:1px; }
.hh-card-rating{ display:inline-flex; align-items:center; gap:3px; font-size:12px; color:#374151; font-weight:600; }
.hh-card-price{ font-size:13px; font-weight:700; color:#BE1E2E; }
.hh-card-price small{ font-weight:500; color:#9AA0A6; font-size:10.5px; }
.hh-card-cta{ margin-top:2px; font-size:12px; font-weight:600; color:#BE1E2E; }

/* Thẻ partner (booking/room): icon thay ảnh */
.hh-card-icon{
  flex:0 0 44px; width:44px; height:44px; border-radius:9px; background:#FBEAEC;
  display:flex; align-items:center; justify-content:center;
}
.hh-card-dates{ font-size:12px; color:#374151; }
.hh-badge{
  font-size:11px; font-weight:600; color:#374151; background:#EEF0F3;
  border-radius:10px; padding:1px 8px;
}

/* Nút xác nhận Có/Không cho thao tác ghi */
.hh-chat-confirm{ display:flex; gap:8px; margin:4px 0 2px; }
.hh-confirm-btn{
  border:1px solid #E2E2E6; background:#fff; cursor:pointer; font-weight:600;
  border-radius:16px; padding:7px 14px; font-size:12.5px; line-height:1.2;
  transition:background .15s ease, border-color .15s ease, opacity .15s ease;
}
.hh-confirm-yes{ color:#fff; background:#BE1E2E; border-color:#BE1E2E; }
.hh-confirm-yes:hover:not(:disabled){ background:#A01825; }
.hh-confirm-no:hover:not(:disabled){ background:#F1F1F3; }
.hh-confirm-btn:disabled{ opacity:.5; cursor:not-allowed; }

/* Chips gợi ý câu hỏi */
.hh-chat-chips{ display:flex; flex-wrap:wrap; gap:8px; margin-top:4px; }
.hh-chip{
  border:1px solid #E2E2E6; background:#fff; color:#374151; cursor:pointer;
  border-radius:16px; padding:7px 12px; font-size:12.5px; line-height:1.2;
  transition:background .15s ease, border-color .15s ease;
}
.hh-chip:hover{ background:#FBEAEC; border-color:#BE1E2E; color:#BE1E2E; }
`;
