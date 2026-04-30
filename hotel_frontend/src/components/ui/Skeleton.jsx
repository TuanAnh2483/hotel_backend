export default function Skeleton({ width, height, borderRadius = "8px", className = "", style = {} }) {
  return (
    <div
      className={`animate-shimmer ${className}`}
      style={{
        width: width || "100%",
        height: height || "1rem",
        borderRadius,
        ...style,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #edd8da", padding: "14px 16px", flex: "0 0 260px" }}>
      <Skeleton height="180px" borderRadius="12px" style={{ marginBottom: 14 }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <Skeleton width="60%" height="16px" />
        <Skeleton width="20%" height="16px" />
      </div>
      <Skeleton width="40%" height="12px" style={{ marginBottom: 16 }} />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Skeleton width="50%" height="20px" />
        <Skeleton width="30px" height="30px" borderRadius="6px" />
      </div>
    </div>
  );
}

export function SkeletonRow({ cols = 5 }) {
  return (
    <tr style={{ borderBottom: "1px solid #f5f5f5" }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: "16px 14px" }}>
          <Skeleton width="80%" height="14px" />
        </td>
      ))}
    </tr>
  );
}
