import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAppNavigate } from "../hooks/useAppNavigate";
import PartnerSidebar from "../components/partner/PartnerSidebar";
import "./partner/PartnerLayout.css";

const SELECTED_HOTEL_KEY = "partner_selected_hotel_id";

export default function PartnerLayout() {
  const { user } = useAuth();
  const navigate = useAppNavigate();
  const { pathname } = useLocation();

  const [selectedHotelId, setSelectedHotelId] = useState(() => {
    const saved = localStorage.getItem(SELECTED_HOTEL_KEY);
    return saved ? Number(saved) : null;
  });

  useEffect(() => {
    if (selectedHotelId != null) {
      localStorage.setItem(SELECTED_HOTEL_KEY, selectedHotelId);
    }
  }, [selectedHotelId]);

  return (
    <div className="partner-root">
      <PartnerSidebar
        selectedHotelId={selectedHotelId}
        onSelectHotel={setSelectedHotelId}
      />
      <div className="partner-main">
        <div className="partner-content">
          <Outlet context={{ selectedHotelId, setSelectedHotelId }} />
        </div>
      </div>
    </div>
  );
}