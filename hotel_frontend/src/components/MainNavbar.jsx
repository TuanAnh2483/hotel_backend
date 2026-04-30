import { useState, useEffect, useRef } from "react";
import { C, S, LOGO_IMG } from "./auth/AuthShared";
import { 
  User, 
  LogOut, 
  LayoutDashboard, 
  Moon, 
  Sun, 
  Globe, 
  ChevronDown,
  ClipboardList
} from "lucide-react";

const BASE_LINKS = [
  { label: "Trang chủ",          page: "home"                    },
  { label: "Khách sạn",          page: "hotels"                  },
  { label: "Đặt phòng của tôi",  page: "my-bookings"             },
];

const PARTNER_LINKS = [
  { label: "Trang chủ",   page: "partner-dashboard" },
  { label: "Khách sạn của tôi", page: "partner-hotels"    },
  { label: "Loại phòng", page: "partner-rooms"     },
  { label: "Lịch & Vận hành", page: "partner-calendar"  },
  { label: "Booking",     page: "partner-bookings"  },
  { label: "Doanh thu",   page: "partner-revenue"   },
  { label: "AI Dự báo",  page: "partner-forecast"  },
];

const ROLE_LABEL = {
  CUSTOMER: "Khách hàng",
  PARTNER:  "Đối tác",
  ADMIN:    "Quản trị viên",
};

const ROLE_STYLE = {
  CUSTOMER: { background: "#e8f4ff", color: "#1565c0" },
  PARTNER:  { background: "#FFF1F2", color: "#BE1E2E" },
  ADMIN:    { background: "#fce4ec", color: "#BE1E2E" },
};

export default function MainNavbar({ active, navigate, user, onLogout }) {
  const [hovBtn, setHovBtn]         = useState(null);
  const [hovLink, setHovLink]       = useState(null);
  const [showMenu, setShowMenu]     = useState(false);
  const [isDark, setIsDark]         = useState(() => localStorage.getItem("theme") === "dark");
  const menuRef                     = useRef(null);

  const isPartner = user?.userType === "PARTNER";

  const navLinks = isPartner
    ? PARTNER_LINKS
    : [
        ...BASE_LINKS.filter(l => !l.authOnly || user),
        ...(user?.userType === "ADMIN" ? [{ label: "Quản lý", page: "admin-dashboard" }] : []),
      ];

  useEffect(() => {
    if (!showMenu) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  useEffect(() => {
    if (isDark) {
      // invert(0.92) turns #ffffff into #141414 (soft dark gray)
      // contrast(0.9) softens harsh texts
      document.documentElement.style.filter = "invert(0.92) hue-rotate(180deg) contrast(0.9)";
      document.documentElement.style.background = "#fff"; // Will be inverted to dark gray
      
      let style = document.getElementById("dark-mode-fixes");
      if (!style) {
        style = document.createElement("style");
        style.id = "dark-mode-fixes";
        style.innerHTML = `
          img, video, iframe {
            /* Reverse the parent invert exactly to keep true colors */
            filter: contrast(1.11) hue-rotate(180deg) invert(1) !important;
          }
          input { background-color: transparent !important; }
        `;
        document.head.appendChild(style);
      }
    } else {
      document.documentElement.style.filter = "";
      document.documentElement.style.background = "";
      const style = document.getElementById("dark-mode-fixes");
      if (style) style.remove();
    }
  }, [isDark]);

  const toggleDark = () => {
    setIsDark(p => {
      const next = !p;
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  return (
    <nav style={S.nav}>
      <button style={S.navLogoWrap} onClick={() => navigate("home")}>
        <img src={LOGO_IMG} alt="VLU Hotel Hub" style={S.navLogo} />
      </button>

      <ul style={{ ...S.navLinks, gap: isPartner ? 18 : 32 }}>
        {navLinks.map(({ label, page }) => {
          const isActive = active === page;
          const isHov    = hovLink === page;
          return (
            <li key={page}>
              <a
                style={{
                  ...S.navLink,
                  color: isActive || isHov ? C.primary : C.text,
                  fontWeight: isActive ? 700 : 500,
                  borderBottom: isActive || isHov ? `2px solid ${C.primary}` : "2px solid transparent",
                  paddingBottom: 3,
                  transition: "color 0.15s ease, border-color 0.15s ease",
                  cursor: "pointer",
                }}
                onClick={() => navigate(page)}
                onMouseEnter={() => setHovLink(page)}
                onMouseLeave={() => setHovLink(null)}
              >{label}</a>
            </li>
          );
        })}
      </ul>

      <div style={{ ...S.navActions, gap: 10 }}>
        <button style={S.iconBtn} onClick={toggleDark} title={isDark ? "Chế độ sáng" : "Chế độ tối"}>
          {isDark ? <Sun size={20} color="#1a1a1a" /> : <Moon size={20} color="#1a1a1a" />}
        </button>

        <button style={S.iconBtn} title="Ngôn ngữ">
          <Globe size={20} color="#1a1a1a" />
        </button>

        {user ? (
          <div ref={menuRef} style={{ position: "relative" }}>
            <div
              title={user.email}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", borderRadius: 20, cursor: "pointer", userSelect: "none", transition: "all 0.2s" }}
              onClick={() => setShowMenu(p => !p)}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div
                style={{ 
                  width: 32, height: 32, borderRadius: "50%", background: C.primary, 
                  display: "flex", alignItems: "center", justifyContent: "center", 
                  color: "#fff", fontWeight: 700, fontSize: 13,
                  boxShadow: "0 2px 8px rgba(190,30,46,0.2)"
                }}
              >
                {user.email?.[0]?.toUpperCase() ?? "U"}
              </div>
              <ChevronDown size={14} color="#666" style={{ transform: showMenu ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </div>
            {showMenu && (
              <div style={{ position: "absolute", right: 0, top: 46, background: "#fff", borderRadius: 14, boxShadow: "0 10px 40px rgba(0,0,0,0.12)", border: "1px solid rgba(0,0,0,0.06)", minWidth: 220, zIndex: 200, overflow: "hidden", animation: "fade-in-up 0.2s ease-out" }}>
                <style>{`
                  @keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                  .menu-item:hover { background: #f8f9fa !important; }
                `}</style>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", background: "linear-gradient(to bottom, #fff, #fdfdfd)" }}>
                  <p style={{ fontSize: 10, color: "#aaa", margin: 0, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700 }}>Tài khoản</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: "4px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
                  {user.userType && (
                    <span style={{ fontSize: 10, borderRadius: 6, padding: "2px 10px", fontWeight: 800, display: "inline-block", marginTop: 6, textTransform: "uppercase", ...(ROLE_STYLE[user.userType] || { background: "#f0f0f0", color: "#555" }) }}>
                      {ROLE_LABEL[user.userType] || user.userType}
                    </span>
                  )}
                </div>
                
                <div style={{ padding: "6px 0" }}>
                  {user?.userType === "PARTNER" && (
                    <button
                      className="menu-item"
                      style={{ width: "100%", padding: "12px 20px", background: "none", border: "none", textAlign: "left", fontSize: 13, cursor: "pointer", color: "#333", display: "flex", alignItems: "center", gap: 12, transition: "background 0.2s" }}
                      onClick={() => { navigate("partner-dashboard"); setShowMenu(false); }}
                    >
                      <LayoutDashboard size={16} color="#555" />
                      <span style={{ fontWeight: 500 }}>Bảng điều khiển</span>
                    </button>
                  )}
                  
                  {user?.userType === "ADMIN" && (
                    <button
                      className="menu-item"
                      style={{ width: "100%", padding: "12px 20px", background: "none", border: "none", textAlign: "left", fontSize: 13, cursor: "pointer", color: "#333", display: "flex", alignItems: "center", gap: 12, transition: "background 0.2s" }}
                      onClick={() => { navigate("admin-dashboard"); setShowMenu(false); }}
                    >
                      <LayoutDashboard size={16} color="#555" />
                      <span style={{ fontWeight: 500 }}>Quản trị hệ thống</span>
                    </button>
                  )}

                  <button
                    className="menu-item"
                    style={{ width: "100%", padding: "12px 20px", background: "none", border: "none", textAlign: "left", fontSize: 13, cursor: "pointer", color: "#333", display: "flex", alignItems: "center", gap: 12, transition: "background 0.2s" }}
                    onClick={() => { navigate("profile"); setShowMenu(false); }}
                  >
                    <User size={16} color="#555" />
                    <span style={{ fontWeight: 500 }}>Trang cá nhân</span>
                  </button>
                </div>

                <button
                  className="menu-item"
                  style={{ width: "100%", padding: "14px 20px", background: "none", border: "none", textAlign: "left", fontSize: 13, cursor: "pointer", color: C.primary, fontWeight: 700, borderTop: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 12, transition: "background 0.2s" }}
                  onClick={() => { if (onLogout) onLogout(); setShowMenu(false); }}
                >
                  <LogOut size={16} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <button
              style={{
                ...S.btnDefault,
                background: hovBtn === "login" ? C.primary : "#F7F7F7",
                color: hovBtn === "login" ? "#fff" : C.text,
                transition: "background 0.15s ease, color 0.15s ease",
              }}
              onClick={() => navigate("login")}
              onMouseEnter={() => setHovBtn("login")}
              onMouseLeave={() => setHovBtn(null)}
            >Đăng nhập</button>
            <button
              style={{
                ...S.btnDefault,
                background: hovBtn === "register" ? C.primary : "#F7F7F7",
                color: hovBtn === "register" ? "#fff" : C.text,
                border: "none",
                borderRadius: 8,
                transition: "background 0.15s ease, color 0.15s ease",
              }}
              onClick={() => navigate("register")}
              onMouseEnter={() => setHovBtn("register")}
              onMouseLeave={() => setHovBtn(null)}
            >Đăng kí</button>
          </>
        )}
      </div>
    </nav>
  );
}
