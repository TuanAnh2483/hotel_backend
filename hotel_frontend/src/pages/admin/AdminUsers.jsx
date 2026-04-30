import { useState, useEffect, useRef } from "react";
import AdminLayout, {
  AP, PageHeader, Card, Badge, Btn, SearchInput,
  Table, Modal, FormField, Input, Select,
} from "../../components/admin/AdminLayout";
import { adminService } from "../../services/adminService";
import { Users, CheckCircle, Lock, Unlock, Handshake } from "lucide-react";
import "../../styles/pages/admin/AdminUsers.css";

const EMPTY_FORM = { email: "", password: "", confirmPassword: "", userType: "CUSTOMER", avatarPreview: null };

function validateField(key, value, form) {
  if (key === "email") {
    if (!value) return "Email không được để trống";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Email không hợp lệ";
  }
  if (key === "password") {
    if (!value) return "Mật khẩu không được để trống";
    if (value.length < 8) return "Mật khẩu tối thiểu 8 ký tự";
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(value)) return "Mật khẩu phải có ít nhất 1 chữ cái và 1 chữ số";
  }
  if (key === "confirmPassword") {
    if (value !== form.password) return "Mật khẩu xác nhận không khớp";
  }
  return "";
}

export default function AdminUsers({ navigate, user, onLogout }) {
  const [users, setUsers]       = useState([]);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [toggling, setToggling] = useState(null);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const avatarInputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    const data = await adminService.getUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    !search || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    total:    users.length,
    active:   users.filter(u => u.status === "ACTIVE").length,
    locked:   users.filter(u => u.status !== "ACTIVE").length,
    partners: users.filter(u => u.userType === "PARTNER").length,
  };

  const handleToggle = async (userId) => {
    setToggling(userId);
    try {
      const updated = await adminService.toggleUserStatus(userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: updated.status } : u));
    } catch (e) { alert(e.message); }
    setToggling(null);
  };

  const handleCreate = async () => {
    const errs = {
      email: validateField("email", form.email, form),
      password: validateField("password", form.password, form),
      confirmPassword: validateField("confirmPassword", form.confirmPassword, form),
    };
    setFieldErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    setSaving(true); setError("");
    try {
      const created = await adminService.createUser({
        email: form.email,
        password: form.password,
        userType: form.userType
      });
      setUsers(prev => [created, ...prev]);
      setModal(false); setForm(EMPTY_FORM); setFieldErrors({});
    } catch (e) {
      setError(e.message || "Có lỗi xảy ra");
    }
    setSaving(false);
  };

  const upd = k => e => {
    const val = e.target.value;
    const next = { ...form, [k]: val };
    setForm(next);
    setFieldErrors(prev => ({ ...prev, [k]: validateField(k, val, next) }));
  };

  const handleAvatarChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(prev => ({ ...prev, avatarPreview: ev.target.result }));
    reader.readAsDataURL(file);
  };

  return (
    <AdminLayout page="admin-users" navigate={navigate} user={user} onLogout={onLogout}>
      <PageHeader
        title="Quản lý người dùng"
        subtitle="Xem và kiểm soát tài khoản người dùng trong hệ thống"
        action={
          <Btn onClick={() => { setForm(EMPTY_FORM); setError(""); setFieldErrors({}); setModal(true); }}>
            + Thêm người dùng
          </Btn>
        }
      />

      {/* Summary cards */}
      <div className="admin-users-summary-grid">
        {[
          { label: "Tổng tài khoản", value: counts.total,    icon: <Users size={24} color={AP} /> },
          { label: "Đang hoạt động", value: counts.active,   icon: <CheckCircle size={24} color={AP} /> },
          { label: "Bị khóa",        value: counts.locked,   icon: <Lock size={24} color={AP} /> },
          { label: "Đối tác",        value: counts.partners, icon: <Handshake size={24} color={AP} /> },
        ].map(c => (
          <div key={c.label} className="admin-users-summary-card">
            <div className="admin-users-summary-icon">{c.icon}</div>
            <div>
              <div className="admin-users-summary-value">{c.value}</div>
              <div className="admin-users-summary-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <div className="admin-users-toolbar">
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo email..." />
          <span className="admin-users-count">{filtered.length} người dùng</span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "#bbb" }}>Đang tải dữ liệu...</div>
        ) : (
          <>
            <Table
              headers={["#ID", "Email", "Loại tài khoản", "Trạng thái", "Ngày tạo", "Thao tác"]}
              rows={filtered.slice((page - 1) * pageSize, page * pageSize).map(u => [
              <span className="admin-users-cell-id">#{u.id}</span>,
              <div className="admin-users-cell-email">{u.email}</div>,
              <Badge status={u.userType} />,
              <Badge status={u.status} />,
              <span className="admin-users-cell-date">{u.createdAt || "—"}</span>,
              <Btn
                small
                variant="action"
                disabled={toggling === u.id || u.userType === "ADMIN"}
                onClick={() => handleToggle(u.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                  {toggling === u.id ? "..." : u.status === "ACTIVE" ? "Khóa" : "Mở khóa"}
                </div>
              </Btn>,
            ])}
              empty="Không tìm thấy người dùng nào"
            />

            {/* Pagination */}
            {filtered.length > pageSize && (
              <div className="ui-pagination">
                {[...Array(Math.ceil(filtered.length / pageSize))].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setPage(i + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className={`ui-page-btn${page === i + 1 ? " active" : ""}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Add user modal */}
      {modal && (
        <Modal title="Thêm người dùng mới" onClose={() => setModal(false)}>
          {error && (
            <div style={{ background: "#ffebee", color: "#c62828", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Avatar picker */}
          <div className="admin-users-modal-avatar-wrap">
            <div
              onClick={() => avatarInputRef.current?.click()}
              className={`admin-users-modal-avatar${form.avatarPreview ? " has-preview" : ""}`}
            >
              {form.avatarPreview
                ? <img src={form.avatarPreview} alt="avatar" />
                : <span style={{ fontSize: 32, color: "#fff" }}>👤</span>
              }
              <div className="admin-users-modal-avatar-overlay">📷</div>
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
            <div className="admin-users-modal-avatar-hint">
              {form.avatarPreview ? "Nhấp để thay đổi ảnh" : "Nhấp để chọn ảnh đại diện"}
            </div>
            {form.avatarPreview && (
              <button
                onClick={() => setForm(prev => ({ ...prev, avatarPreview: null }))}
                className="admin-users-modal-avatar-remove-btn"
              >
                Xoá ảnh
              </button>
            )}
          </div>

          <FormField label="Email" required>
            <Input value={form.email} onChange={upd("email")} type="email" placeholder="example@email.com" />
            {fieldErrors.email && <div style={{ color: "#c62828", fontSize: 12, marginTop: 4 }}>{fieldErrors.email}</div>}
          </FormField>
          <FormField label="Mật khẩu" required>
            <Input value={form.password} onChange={upd("password")} type="password" placeholder="Tối thiểu 8 ký tự, 1 chữ cái và 1 số" />
            {fieldErrors.password && <div style={{ color: "#c62828", fontSize: 12, marginTop: 4 }}>{fieldErrors.password}</div>}
          </FormField>
          <FormField label="Xác nhận mật khẩu" required>
            <Input value={form.confirmPassword} onChange={upd("confirmPassword")} type="password" placeholder="Nhập lại mật khẩu" />
            {fieldErrors.confirmPassword && <div style={{ color: "#c62828", fontSize: 12, marginTop: 4 }}>{fieldErrors.confirmPassword}</div>}
          </FormField>
          <FormField label="Loại tài khoản" required>
            <Select value={form.userType} onChange={upd("userType")}>
              <option value="CUSTOMER">Khách hàng (CUSTOMER)</option>
              <option value="PARTNER">Đối tác (PARTNER)</option>
            </Select>
          </FormField>
          <div className="admin-users-modal-actions">
            <Btn variant="ghost" onClick={() => setModal(false)}>Hủy</Btn>
            <Btn disabled={saving || !form.email || !form.password || Object.values(fieldErrors).some(Boolean)} onClick={handleCreate}>
              {saving ? "Đang tạo..." : "Tạo tài khoản"}
            </Btn>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
