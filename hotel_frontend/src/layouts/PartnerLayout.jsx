import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAppNavigate } from "../hooks/useAppNavigate";
import MainNavbar from "../components/MainNavbar";
import Footer from "../components/Footer";
import "./partner/PartnerLayout.css";

const PATH_TO_PAGE = {
  "/partner":          "partner-dashboard",
  "/partner/hotels":   "partner-hotels",
  "/partner/rooms":    "partner-rooms",
  "/partner/calendar": "partner-calendar",
  "/partner/bookings": "partner-bookings",
  "/partner/revenue":  "partner-revenue",
  "/partner/forecast": "partner-forecast",
  "/partner/refunds":  "partner-refunds",
};

export default function PartnerLayout() {
  const { user, logout } = useAuth();
  const navigate = useAppNavigate();
  const { pathname } = useLocation();
  const active = PATH_TO_PAGE[pathname] || "partner-dashboard";

  return (
    <div className="partner-root">
      <MainNavbar active={active} navigate={navigate} user={user} onLogout={logout} />
      <div className="partner-content">
        <Outlet />
      </div>
      <Footer navigate={navigate} />
    </div>
  );
}
