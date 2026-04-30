import { useNavigate } from "react-router-dom";

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f8fa", fontFamily: "'Segoe UI',sans-serif" }}>
      <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🚫</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1a1a1a", marginBottom: 8 }}>Không có quyền truy cập</h1>
        <p style={{ fontSize: 15, color: "#666", marginBottom: 28 }}>Bạn không có quyền xem trang này.</p>
        <button
          onClick={() => navigate("/")}
          style={{ background: "#BE1E2E", color: "#fff", border: "none", borderRadius: 10, padding: "12px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
        >
          Về trang chủ
        </button>
      </div>
    </div>
  );
}
