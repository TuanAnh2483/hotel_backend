import { useEffect, useState } from "react";
import { Calendar, MessageSquare, Star, Trash2 } from "lucide-react";
import { reviewService } from "../../services/reviewService";

function fmtDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
}

function Stars({ value }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          fill={star <= Number(value || 0) ? "#f59e0b" : "transparent"}
          color={star <= Number(value || 0) ? "#f59e0b" : "#cbd5e1"}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await reviewService.getMyReviews();
      setReviews(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Không thể tải đánh giá.");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(reviewId) {
    if (!window.confirm("Xóa đánh giá này?")) return;
    setDeleting(reviewId);
    try {
      await reviewService.deleteReview(reviewId);
      setReviews((items) => items.filter((item) => item.reviewId !== reviewId));
    } catch (e) {
      setError(e.message || "Không thể xóa đánh giá.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ color: "#1a1a1a", fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Đánh giá của tôi</h1>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
          Dữ liệu được lấy trực tiếp từ các đánh giá đã lưu trong hệ thống.
        </p>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, color: "#b91c1c", fontSize: 13, fontWeight: 700, marginBottom: 16, padding: "12px 14px" }}>
          {error}
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ color: "#94a3b8", fontWeight: 700, padding: 40, textAlign: "center" }}>
            Đang tải đánh giá...
          </div>
        ) : reviews.length === 0 ? (
          <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>
            <MessageSquare size={42} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <div style={{ color: "#0f172a", fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Chưa có đánh giá nào</div>
            <div style={{ fontSize: 13 }}>Các đánh giá sau khi bạn gửi sẽ hiển thị tại đây.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {reviews.map((review) => (
              <div key={review.reviewId} style={{ borderBottom: "1px solid #f1f5f9", padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
                  <div>
                    <div style={{ color: "#0f172a", fontSize: 16, fontWeight: 800 }}>{review.hotelName || "Khách sạn"}</div>
                    <div style={{ alignItems: "center", color: "#64748b", display: "flex", fontSize: 12, gap: 6, marginTop: 5 }}>
                      <Calendar size={14} />
                      {fmtDate(review.checkIn)} - {fmtDate(review.checkOut)}
                    </div>
                  </div>
                  <button
                    disabled={deleting === review.reviewId}
                    onClick={() => handleDelete(review.reviewId)}
                    style={{ alignItems: "center", alignSelf: "flex-start", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#b91c1c", cursor: "pointer", display: "flex", fontSize: 12, fontWeight: 800, gap: 6, padding: "8px 10px" }}
                  >
                    <Trash2 size={14} />
                    {deleting === review.reviewId ? "Đang xóa" : "Xóa"}
                  </button>
                </div>
                <Stars value={review.rating} />
                <p style={{ color: "#334155", fontSize: 14, lineHeight: 1.7, margin: "12px 0 0" }}>
                  {review.comment}
                </p>
                {review.partnerReply && (
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, color: "#334155", fontSize: 13, lineHeight: 1.7, marginTop: 14, padding: "12px 14px" }}>
                    <strong>Phản hồi từ đối tác:</strong> {review.partnerReply}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
