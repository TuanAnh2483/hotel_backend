import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, Send } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { chatService } from "../services/chatService";
import { C } from "../lib/constants";

// Trang ẩn widget (luồng xác thực).
const HIDDEN_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

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

  const role = user?.userType === "PARTNER" ? "partner" : "customer";
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

  async function handleSend(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    setMessages((prev) => [...prev, { from: "user", text }]);
    setInput("");
    setIsLoading(true);
    setStatus("");

    let received = false;
    try {
      const streamFn = role === "partner" ? chatService.streamPartner : chatService.streamCustomer;
      await streamFn({
        message: text,
        sessionId: sessionId.current,
        onDelta: (piece) => {
          received = true;
          setStatus("");
          appendDelta(piece);
        },
        onTool: () => setStatus("Đang tra cứu…"),
        onDone: (d) => {
          if (d?.sessionId) sessionId.current = d.sessionId;
        },
      });
      endStreaming();
      if (!received) setMessages((prev) => [...prev, { from: "bot", text: "…" }]);
    } catch {
      // Stream lỗi (vd 401/mạng). Nếu đã có một phần trả lời thì giữ nguyên; nếu chưa,
      // fallback gọi endpoint non-stream (đi qua apiClient → có token refresh).
      if (received) {
        endStreaming();
      } else {
        try {
          const call = role === "partner" ? chatService.partner : chatService.customer;
          const res = await call({ message: text, sessionId: sessionId.current });
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
              <div
                key={i}
                className="hh-chat-row"
                style={{ justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}
              >
                <div
                  className="hh-chat-bubble"
                  style={
                    m.from === "user"
                      ? { background: C.primary, color: "#fff", borderBottomRightRadius: 4 }
                      : { background: "#F1F1F3", color: C.text, borderBottomLeftRadius: 4 }
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}

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
`;
