import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { S, SubmitButton, ImgSide } from "../components/auth/AuthShared";
import { authService } from "../services/authService";

const statusCopy = {
  loading: {
    title: "Đang xác thực email",
    message: "Vui lòng chờ trong giây lát.",
  },
  success: {
    title: "Xác thực email thành công",
    message: "Tài khoản của bạn đã sẵn sàng. Bạn có thể đăng nhập bằng email và mật khẩu đã đăng ký.",
  },
  alreadyVerified: {
    title: "Email đã được xác thực",
    message: "Tài khoản này đã được xác thực trước đó. Bạn có thể đăng nhập để tiếp tục.",
  },
  error: {
    title: "Không thể xác thực email",
    message: "Link xác thực không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại email mới nhất hoặc đăng ký lại.",
  },
};

function formatVerifiedAt(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function mapVerifyResult(data) {
  if (data?.message === "Email is already verified") return "alreadyVerified";
  return "success";
}

export default function VerifyEmailPage({ setPage }) {
  const [status, setStatus] = useState("loading");
  const [verifiedAt, setVerifiedAt] = useState("");
  const hasRequested = useRef(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");

    if (!token) {
      setStatus("error");
      return;
    }

    if (hasRequested.current) return;
    hasRequested.current = true;

    authService.verifyEmail({ token })
      .then((data) => {
        setStatus(mapVerifyResult(data));
        setVerifiedAt(formatVerifiedAt(data?.verifiedAt));
      })
      .catch(() => {
        setStatus("error");
      });
  }, []);

  const copy = statusCopy[status];
  const isLoading = status === "loading";
  const isSuccess = status === "success" || status === "alreadyVerified";
  const Icon = isLoading ? LoaderCircle : isSuccess ? CheckCircle2 : XCircle;
  const iconColor = isLoading ? "#64748b" : isSuccess ? "#16a34a" : "#BE1E2E";

  return (
    <div style={S.authWrap}>
      <ImgSide />
      <div style={S.formSide}>
        <div style={{ ...S.formBox, textAlign: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: isSuccess ? "#dcfce7" : isLoading ? "#f1f5f9" : "#fee2e2",
              color: iconColor,
              marginBottom: 20,
            }}
          >
            <Icon size={38} strokeWidth={2.2} className={isLoading ? "verify-email-spin" : ""} />
          </div>

          <h1 style={S.title}>{copy.title}</h1>
          <p style={{ ...S.sub, marginBottom: verifiedAt ? 10 : 24 }}>{copy.message}</p>

          {verifiedAt && (
            <p style={{ color: "#64748b", fontSize: 13, fontWeight: 700, margin: "0 0 24px" }}>
              Thời gian xác thực: {verifiedAt}
            </p>
          )}

          {isLoading ? (
            <SubmitButton label="Đang xử lý..." disabled />
          ) : (
            <SubmitButton
              label={isSuccess ? "Đăng nhập ngay" : "Về trang đăng ký"}
              onClick={() => setPage(isSuccess ? "login" : "register")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
