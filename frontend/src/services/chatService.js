import apiClient from "./apiClient";
import { getToken } from "./authStorage";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * Gọi chatbot backend. apiClient đã unwrap envelope → trả thẳng { reply, sessionId }.
 * - customer: endpoint public (vẫn chạy được khi chưa đăng nhập).
 * - partner: token tự gắn bởi request interceptor.
 */
export const chatService = {
  customer({ message, sessionId, context, confirm }) {
    return apiClient.post("/api/chat/customer", { message, sessionId, context, confirm });
  },
  partner({ message, sessionId, context, confirm }) {
    return apiClient.post("/api/chat/partner", { message, sessionId, context, confirm });
  },

  /**
   * Streaming qua SSE (fetch + ReadableStream — axios không stream được trong browser).
   * Gọi callback: onDelta(text), onTool({name}), onCards({items,checkIn,...}),
   * onConfirm({name,summary}) (thao tác ghi chờ xác nhận), onDone({sessionId}).
   * Throw nếu response không OK (vd 401/5xx) để caller fallback sang endpoint non-stream.
   * customer cũng gắn token nếu có (endpoint vẫn public) để cá nhân hoá đơn của khách đã đăng nhập.
   */
  streamCustomer(args) {
    return streamChat("/api/chat/customer/stream", args, true);
  },
  streamPartner(args) {
    return streamChat("/api/chat/partner/stream", args, true);
  },
};

async function streamChat(path, { message, sessionId, context, confirm, onDelta, onTool, onCards, onConfirm, onDone }, withAuth) {
  const headers = { "Content-Type": "application/json", Accept: "text/event-stream" };
  if (withAuth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message, sessionId, context, confirm }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`Stream HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // SSE: các event ngăn cách bởi dòng trống; mỗi event có dòng "event:" và "data:".
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      dispatchEvent(rawEvent, { onDelta, onTool, onCards, onConfirm, onDone });
    }
  }
}

function dispatchEvent(rawEvent, { onDelta, onTool, onCards, onConfirm, onDone }) {
  let eventName = "message";
  const dataLines = [];
  for (const line of rawEvent.split("\n")) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return;

  let payload;
  try {
    payload = JSON.parse(dataLines.join("\n"));
  } catch {
    return;
  }

  if (eventName === "delta") onDelta?.(payload.text ?? "");
  else if (eventName === "tool") onTool?.(payload);
  else if (eventName === "cards") onCards?.(payload);
  else if (eventName === "confirm") onConfirm?.(payload);
  else if (eventName === "done") onDone?.(payload);
}

export default chatService;
