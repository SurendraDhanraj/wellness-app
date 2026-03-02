"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Plus, Edit2, ToggleLeft, ToggleRight } from "lucide-react";
import { AdminBottomNav } from "@/components/BottomNav";

type ConfigType = "businessUnits" | "departments" | "locations";
const TABS: { id: ConfigType; label: string }[] = [
    { id: "businessUnits", label: "Business Units" },
    { id: "departments", label: "Departments" },
    { id: "locations", label: "Locations" },
];

export default function AdminConfigPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);
    const [tab, setTab] = useState<ConfigType>("businessUnits");
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        const a = JSON.parse(stored);
        if (a.role === "employee") { router.replace("/dashboard"); return; }
        setAuth(a);
    }, [router]);

    const businessUnits = useQuery(api.config.getBusinessUnits) || [];
    const departments = useQuery(api.config.getDepartments) || [];
    const locations = useQuery(api.config.getLocations) || [];

    const createBU = useMutation(api.config.createBusinessUnit);
    const updateBU = useMutation(api.config.updateBusinessUnit);
    const toggleBU = useMutation(api.config.toggleBusinessUnit);
    const createDept = useMutation(api.config.createDepartment);
    const updateDept = useMutation(api.config.updateDepartment);
    const toggleDept = useMutation(api.config.toggleDepartment);
    const createLoc = useMutation(api.config.createLocation);
    const updateLoc = useMutation(api.config.updateLocation);
    const toggleLoc = useMutation(api.config.toggleLocation);

    const items = tab === "businessUnits" ? businessUnits : tab === "departments" ? departments : locations;

    const openCreate = () => { setEditing(null); setName(""); setShowModal(true); };
    const openEdit = (item: any) => { setEditing(item); setName(item.name); setShowModal(true); };

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            if (editing) {
                if (tab === "businessUnits") await updateBU({ id: editing._id, name });
                else if (tab === "departments") await updateDept({ id: editing._id, name });
                else await updateLoc({ id: editing._id, name });
            } else {
                if (tab === "businessUnits") await createBU({ name });
                else if (tab === "departments") await createDept({ name });
                else await createLoc({ name });
            }
            setShowModal(false);
        } finally { setSaving(false); }
    };

    const handleToggle = async (item: any) => {
        if (tab === "businessUnits") await toggleBU({ id: item._id, isActive: !item.isActive });
        else if (tab === "departments") await toggleDept({ id: item._id, isActive: !item.isActive });
        else await toggleLoc({ id: item._id, isActive: !item.isActive });
    };

    return (
        <div className="admin-container">
            <header className="top-bar admin">
                <button onClick={() => router.push("/admin/manage")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-admin-text-muted)" }}>←</button>
                <h1 className="top-bar-title" style={{ color: "var(--color-admin-text)" }}>Configuration</h1>
                <button className="btn btn-primary btn-sm" onClick={openCreate} id="add-config-btn"><Plus size={16} /> Add</button>
            </header>

            <main className="admin-content">
                <div className="segmented" style={{ marginBottom: "var(--spacing-md)" }}>
                    {TABS.map((t) => <button key={t.id} className={`seg-btn ${tab === t.id ? "active" : ""}`} style={{ color: tab === t.id ? "var(--color-primary)" : "var(--color-admin-text-muted)", fontSize: 12 }} onClick={() => setTab(t.id)} id={`config-tab-${t.id}`}>{t.label}</button>)}
                </div>

                {items.length === 0 ? (
                    <div className="empty-state">
                        <p className="empty-state-title" style={{ color: "var(--color-admin-text)" }}>No {TABS.find(t => t.id === tab)?.label} yet</p>
                        <p className="empty-state-body" style={{ color: "var(--color-admin-text-muted)" }}>Click "Add" to create your first entry.</p>
                    </div>
                ) : (
                    items.map((item: any) => (
                        <div key={item._id} className="list-item admin" id={`config-${item._id}`}>
                            <div style={{ width: 40, height: 40, borderRadius: "var(--radius-sm)", background: item.isActive ? "var(--color-primary)22" : "var(--color-admin-surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <span style={{ fontSize: 16, fontWeight: 700, color: item.isActive ? "var(--color-primary)" : "var(--color-admin-text-muted)" }}>{item.name[0]}</span>
                            </div>
                            <div className="list-item-content">
                                <p className="list-item-title admin">{item.name}</p>
                                <span className={`badge ${item.isActive ? "badge-success" : "badge-secondary"}`}>{item.isActive ? "Active" : "Inactive"}</span>
                            </div>
                            <div style={{ display: "flex", gap: 4 }}>
                                <button onClick={() => openEdit(item)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-admin-text-muted)", padding: 6 }} id={`edit-config-${item._id}`}><Edit2 size={16} /></button>
                                <button onClick={() => handleToggle(item)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }} id={`toggle-config-${item._id}`}>
                                    {item.isActive ? <ToggleRight size={22} color="var(--color-success)" /> : <ToggleLeft size={22} color="var(--color-admin-text-muted)" />}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </main>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-sheet admin" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-handle" style={{ background: "var(--color-admin-border)" }} />
                        <h2 className="modal-title admin">{editing ? "Edit" : "Add"} {TABS.find(t => t.id === tab)?.label?.replace(/s$/, "")}</h2>
                        <div className="input-group">
                            <label className="input-label admin">Name *</label>
                            <input className="input admin" value={name} onChange={(e) => setName(e.target.value)} placeholder={`e.g. ${tab === "businessUnits" ? "Upstream Operations" : tab === "departments" ? "Human Resources" : "Point Lisas Plant"}`} id="config-name" />
                        </div>
                        <button className="btn btn-primary btn-full btn-lg" onClick={handleSave} disabled={!name.trim() || saving} id="save-config-btn">{saving ? "Saving…" : editing ? "Update" : "Create"}</button>
                    </div>
                </div>
            )}

            <AdminBottomNav />
        </div>
    );
}
