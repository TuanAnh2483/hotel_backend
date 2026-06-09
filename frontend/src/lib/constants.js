// Brand & UI color tokens for React inline styles.
// Giá trị khớp với CSS custom properties trong index.css.
// Quy tắc: trong JSX dùng C.* hoặc "var(--*)" cho inline styles.
//          trong CSS files luôn dùng var(--*).
export const C = {
  // ── Brand ─────────────────────────────────────────────────
  primary:      "#BE1E2E",  // var(--primary)
  primaryHover: "#A01925",  // var(--primary-hover)
  primaryLight: "#fdf4f5",  // var(--primary-light)
  inputBg:      "#fdf4f5",
  inputBorder:  "#f2c4c8",
  link:         "#BE1E2E",

  // ── Text ──────────────────────────────────────────────────
  text:         "#111827",  // var(--text-main)
  textMuted:    "#4B5563",  // var(--text-muted)
  textLight:    "#6B7280",  // var(--text-light)

  // ── Surface ───────────────────────────────────────────────
  white:        "#FFFFFF",  // var(--surface)
  bgPage:       "#F8F9FA",  // var(--background)
  bgSecondary:  "#F7F7F7",  // var(--secondary)
  bgCard:       "#f8fafc",  // card inner backgrounds (Tailwind slate-50)

  // ── Border ────────────────────────────────────────────────
  border:       "#E5E7EB",  // var(--border)
};
