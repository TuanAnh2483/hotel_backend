import { useState, useEffect } from "react";
import AdminLayout, {
  AP, PageHeader, Card, Badge, Btn, SearchInput,
  Table, Modal, FormField, Input, Select,
} from "../../components/admin/AdminLayout";
import { adminService } from "../../services/adminService";

const HOTEL_TYPES = ["HOTEL", "RESORT", "VILLA", "APARTMENT", "HOMESTAY", "HOSTEL", "GUEST_HOUSE"];
const HOTEL_TYPE_LABEL = {
  HOTEL: "Khách sạn", RESORT: "Resort", VILLA: "Biệt thự",
  APARTMENT: "Căn hộ", HOMESTAY: "Homestay", HOSTEL: "Hostel", GUEST_HOUSE: "Nhà nghỉ",
};
const EMPTY_FORM = { name: "", province: "", district: "", address: "", hotelType: "HOTEL", description: "" };

export default function AdminHotels({ navigate, user, onLogout }) {
  const [hotels, setHotels]   = useState([]);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [acting, setActing]   = useState(false);
  const [error, setError]     = useState("");
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    adminService.getHotels().then(data => { setHotels(data); setLoading(false); });
  }, []);

  const filtered = hotels.filter(h => {
    const q = search.toLowerCase();
    const matchQ = !q || (h.name || "").toLowerCase().includes(q) || (h.province || "").toLowerCase().includes(q);
    const matchType = !filterType || h.hotelType === filterType;
    return matchQ && matchType;
  });

  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const openEdit = h => {
    setError("");
    setSelected(h);
    setForm({ name: h.name || "", province: h.province || "", district: h.district || "", address: h.address || "", hotelType: h.hotelType || "HOTEL", description: h.description || "" });
    setModal("edit");
  };
  const openDel = h => { setError(""); setSelected(h); setModal("delete"); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.province.trim() || !form.district.trim() || !form.address.trim() || !selected?.id) return;
    setActing(true);
    setError("");
    try {
      const updated = await adminService.updateHotel(selected.id, form);
      setHotels(prev => prev.map(h => h.id === selected.id ? updated : h));
      setModal(null);
    } catch (e) {
      setError(e.message || "Không thể cập nhật khách sạn.");
    } finally {
      setActing(false);
    }
  };

  const handleDelete = async () => {
    setActing(true);
    setError("");
    try {
      await adminService.deleteHotel(selected.id);
      setHotels(prev => prev.filter(h => h.id !== selected.id));
      setModal(null);
    } catch (e) {
      setError(e.message || "Không thể xóa khách sạn.");
    } finally {
      setActing(false);
    }
  };

  const counts = {
    total:  hotels.length,
    active: hotels.filter(h => h.status === "ACTIVE").length,
    avg:    hotels.length ? (hotels.reduce((s, h) => s + (Number(h.ratingAvg) || 0), 0) / hotels.length).toFixed(1) : "—",
  };

  return (
    <AdminLayout page="admin-hotels" navigate={navigate} user={user} onLogout={onLogout}>
      <PageHeader
        title="Quản lý khách sạn"
        subtitle="Danh sách tất cả khách sạn trong hệ thống"
      />

      {error && (
        <div style={{ background: "#ffebee", color: "#c62828", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16, fontWeight: 700 }}>
          {error}
        </div>
      )}

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Tổng khách sạn", value: counts.total,  color: AP,        icon: "🏨" },
          { label: "Đang hoạt động", value: counts.active, color: "#2e7d32", icon: "✅" },
          { label: "Đánh giá TB",    value: counts.avg,    color: "#f5a623", icon: "⭐" },
        ].map(c => (
          <div key={c.label} style={{
            background: "#fff", borderRadius: 12, padding: "16px 20px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)", border: "1px solid #f0f0f0",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <span style={{ fontSize: 24 }}>{c.icon}</span>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2, fontWeight: 600 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo tên, tỉnh thành..." />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              style={{ padding: "9px 12px", borderRadius: 9, border: "1px solid #e5e5e5", fontSize: 13, background: "#f8f9fa", cursor: "pointer" }}
            >
              <option value="">Tất cả loại</option>
              {HOTEL_TYPES.map(t => <option key={t} value={t}>{HOTEL_TYPE_LABEL[t]}</option>)}
            </select>
          </div>
          <span style={{ fontSize: 12, color: "#aaa", fontWeight: 600 }}>{filtered.length} kết quả</span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "#bbb" }}>Đang tải dữ liệu...</div>
        ) : (
          <>
            <Table
              headers={["#ID", "Tên khách sạn", "Địa điểm", "Loại", "Đánh giá", "Trạng thái", "Thao tác"]}
              rows={filtered.slice((page - 1) * pageSize, page * pageSize).map(h => [
              <span style={{ color: "#bbb", fontSize: 12, fontFamily: "monospace" }}>#{h.id}</span>,
              <div>
                <div style={{ fontWeight: 700, color: "#1a1a1a" }}>{h.name}</div>
                {h.description && <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{h.description.slice(0, 50)}{h.description.length > 50 ? "…" : ""}</div>}
              </div>,
              <span style={{ fontSize: 12, color: "#666" }}>
                {[h.district, h.province].filter(Boolean).join(", ") || "—"}
              </span>,
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                background: "#f0f4ff", color: "#4361ee",
              }}>{HOTEL_TYPE_LABEL[h.hotelType] || h.hotelType || "—"}</span>,
              <span style={{ fontWeight: 700, color: "#f5a623" }}>
                {h.ratingAvg > 0 ? `⭐ ${Number(h.ratingAvg).toFixed(1)}` : "—"}
                {h.ratingCount > 0 && <span style={{ color: "#aaa", fontWeight: 400, fontSize: 11 }}> ({h.ratingCount})</span>}
              </span>,
              <Badge status={h.status || "ACTIVE"} />,
              <div style={{ display: "flex", gap: 6 }}>
                <Btn small variant="action" onClick={() => openEdit(h)}>Sửa</Btn>
                <Btn small variant="danger" onClick={() => openDel(h)}>Xóa</Btn>
              </div>,
            ])}
              empty="Không tìm thấy khách sạn nào"
            />

            {/* Pagination */}
            {filtered.length > pageSize && (
              <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "24px 0", borderTop: "1px solid #f5f5f5", marginTop: 10 }}>
                {[...Array(Math.ceil(filtered.length / pageSize))].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setPage(i + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    style={{
                      width: 34, height: 34, borderRadius: 8, border: "1px solid #e0e0e0",
                      background: page === i + 1 ? AP : "#fff",
                      color: page === i + 1 ? "#fff" : "#666",
                      fontWeight: 800, fontSize: 13, cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Edit modal */}
      {modal === "edit" && (
        <Modal title="✏️ Chỉnh sửa khách sạn" onClose={() => setModal(null)} width={520}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <FormField label="Tên khách sạn" required>
                <Input value={form.name} onChange={upd("name")} placeholder="VD: Grand Palace Hotel" />
              </FormField>
            </div>
            <div style={{ paddingRight: 8 }}>
              <FormField label="Tỉnh / Thành phố" required>
                <Input value={form.province} onChange={upd("province")} placeholder="VD: Hà Nội" />
              </FormField>
            </div>
            <div style={{ paddingLeft: 8 }}>
              <FormField label="Quận / Huyện" required>
                <Input value={form.district} onChange={upd("district")} placeholder="VD: Hoàn Kiếm" />
              </FormField>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <FormField label="Địa chỉ cụ thể" required>
                <Input value={form.address} onChange={upd("address")} placeholder="Số nhà, đường..." />
              </FormField>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <FormField label="Loại hình">
                <Select value={form.hotelType} onChange={upd("hotelType")}>
                  {HOTEL_TYPES.map(t => <option key={t} value={t}>{HOTEL_TYPE_LABEL[t]}</option>)}
                </Select>
              </FormField>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <FormField label="Mô tả">
                <textarea
                  value={form.description}
                  onChange={upd("description")}
                  placeholder="Mô tả ngắn về khách sạn..."
                  rows={3}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8,
                    border: "1px solid #e0e0e0", fontSize: 13, resize: "vertical",
                    boxSizing: "border-box", fontFamily: "inherit",
                  }}
                />
              </FormField>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Hủy</Btn>
            <Btn disabled={acting || !form.name.trim() || !form.province.trim() || !form.district.trim() || !form.address.trim()} onClick={handleSave}>
              {acting ? "Đang lưu..." : "Lưu thay đổi"}
            </Btn>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {modal === "delete" && (
        <Modal title="🗑️ Xóa khách sạn" onClose={() => setModal(null)}>
          <div style={{ textAlign: "center", padding: "12px 0 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <p style={{ fontSize: 14, color: "#333", margin: "0 0 6px" }}>
              Bạn có chắc muốn xóa khách sạn
            </p>
            <p style={{ fontSize: 15, fontWeight: 800, color: AP, margin: 0 }}>"{selected?.name}"?</p>
            <p style={{ fontSize: 12, color: "#aaa", marginTop: 8 }}>Thao tác này không thể hoàn tác.</p>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Hủy</Btn>
            <Btn variant="danger" disabled={acting} onClick={handleDelete}>
              {acting ? "Đang xóa..." : "Xác nhận xóa"}
            </Btn>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
