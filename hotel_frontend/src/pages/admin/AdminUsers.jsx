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
  }
  if (key === "password") {
  }
  if (key === "confirmPassword") {
  }
  return "";
}
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
        action={
          <Btn onClick={() => { setForm(EMPTY_FORM); setError(""); setFieldErrors({}); setModal(true); }}>
          </Btn>
        }
      />

      {/* Summary cards */}
      <div className="admin-users-summary-grid">
        {[
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
        </div>

        {loading ? (
        ) : (
          <>
            <Table
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
                </div>
              </Btn>,
            ])}
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
            </div>
            {form.avatarPreview && (
              <button
                onClick={() => setForm(prev => ({ ...prev, avatarPreview: null }))}
                className="admin-users-modal-avatar-remove-btn"
              >
              </button>
            )}
          </div>

            <Input value={form.email} onChange={upd("email")} type="email" placeholder="example@email.com" />
            {fieldErrors.email && <div style={{ color: "#c62828", fontSize: 12, marginTop: 4 }}>{fieldErrors.email}</div>}
          </FormField>
            {fieldErrors.password && <div style={{ color: "#c62828", fontSize: 12, marginTop: 4 }}>{fieldErrors.password}</div>}
          </FormField>
            {fieldErrors.confirmPassword && <div style={{ color: "#c62828", fontSize: 12, marginTop: 4 }}>{fieldErrors.confirmPassword}</div>}
          </FormField>
            <Select value={form.userType} onChange={upd("userType")}>
            </Select>
          </FormField>
          <div className="admin-users-modal-actions">
            <Btn disabled={saving || !form.email || !form.password || Object.values(fieldErrors).some(Boolean)} onClick={handleCreate}>
            </Btn>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
