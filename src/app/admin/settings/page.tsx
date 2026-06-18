"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { LogOut, Shield, ChevronRight, Users, Settings, ClipboardList, Database, Upload, X, Check, AlertCircle, Copy, Download, Search } from "lucide-react";
import { AdminBottomNav } from "@/components/BottomNav";

export default function AdminSettingsPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Bulk Import states
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvText, setCsvText] = useState("");
    const [parsedUsers, setParsedUsers] = useState<any[]>([]);
    const [importing, setImporting] = useState(false);
    const [importResults, setImportResults] = useState<any[] | null>(null);
    const [importError, setImportError] = useState("");

    // Role Management states
    const [activeTab, setActiveTab] = useState<"general" | "roles">("general");
    const [searchQuery, setSearchQuery] = useState("");
    const [editingUser, setEditingUser] = useState<any>(null);
    const [selectedRole, setSelectedRole] = useState<"super_admin" | "admin" | "employee">("employee");
    const [updatingRole, setUpdatingRole] = useState(false);

    // User Edit & Delete states
    const [editFirstName, setEditFirstName] = useState("");
    const [editSurname, setEditSurname] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editGender, setEditGender] = useState<"male" | "female" | "other">("other");
    const [editDateOfBirth, setEditDateOfBirth] = useState("");
    const [deletingUser, setDeletingUser] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Administrative reset password states
    const [adminResetPassword, setAdminResetPassword] = useState("");
    const [adminResetForceChange, setAdminResetForceChange] = useState(true);
    const [adminResetPasswordProcessing, setAdminResetPasswordProcessing] = useState(false);

    const batchInvite = useAction(api.auth.batchInviteEmployees);
    const allUsers = useQuery(api.users.getAllUsers) || [];
    const adminUpdateUser = useMutation(api.users.superAdminUpdateUser);
    const adminDeleteUser = useMutation(api.users.deleteUser);
    const adminResetUserPasswordAction = useAction(api.auth.adminResetUserPassword);

    const handleAdminResetPasswordSubmit = async () => {
        if (!editingUser || !adminResetPassword.trim() || adminResetPasswordProcessing) return;
        setAdminResetPasswordProcessing(true);
        try {
            const token = auth?.token || "";
            const res = await adminResetUserPasswordAction({
                userId: editingUser._id,
                newPassword: adminResetPassword.trim(),
                mustChangePassword: adminResetForceChange,
                adminToken: token,
            });

            if (res.success) {
                alert("Password reset successfully!");
                setAdminResetPassword("");
            } else {
                alert(res.error || "Failed to reset password.");
            }
        } catch (err: any) {
            alert(err.message || "An unexpected error occurred during password reset.");
        } finally {
            setAdminResetPasswordProcessing(false);
        }
    };

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        try {
            const a = JSON.parse(stored);
            if (!a || a.role === "employee") { router.replace("/dashboard"); return; }
            setAuth(a);
        } catch (e) {
            localStorage.removeItem("heritage_auth");
            router.replace("/login");
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("heritage_auth");
        router.replace("/login");
    };


    // Normalize any common date format to YYYY-MM-DD
    const normalizeDate = (raw: string): string => {
        if (!raw || !raw.trim()) return "";
        const s = raw.trim();

        // Already ISO: YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

        // YYYY/MM/DD
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replace(/\//g, "-");

        // DD/MM/YYYY or DD-MM-YYYY (most common in TT)
        const dmySlash = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
        if (dmySlash) {
            const [, d, m, y] = dmySlash;
            return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        }

        // Try native Date as last resort (handles "08 Aug 1977" etc)
        const fallback = new Date(s);
        if (!isNaN(fallback.getTime())) {
            return fallback.toISOString().split("T")[0];
        }

        return s; // return as-is if all else fails
    };

    // Safely format a stored dateOfBirth string for display
    const formatDateDisplay = (dob: string): string => {
        if (!dob) return "";
        const iso = normalizeDate(dob);
        const d = new Date(iso + "T00:00:00");
        if (isNaN(d.getTime())) return dob; // show raw if still unparseable
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    };

    const parseCSV = (text: string) => {
        const lines = text.split(/\r?\n/);
        const parsed: any[] = [];
        
        let startIdx = 0;
        if (lines.length > 0) {
            const firstLine = lines[0].toLowerCase();
            if (firstLine.includes("email") || firstLine.includes("surname") || firstLine.includes("firstname") || firstLine.includes("gender")) {
                startIdx = 1;
            }
        }

        for (let i = startIdx; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));
            if (parts.length < 5) continue;

            const [surname, firstName, genderRaw, dateOfBirth, email] = parts;
            
            let gender: "male" | "female" | "other" = "other";
            const gLow = genderRaw.toLowerCase();
            if (gLow === "male" || gLow === "m") gender = "male";
            else if (gLow === "female" || gLow === "f") gender = "female";

            parsed.push({
                surname,
                firstName,
                gender,
                dateOfBirth: normalizeDate(dateOfBirth),
                email,
            });
        }
        return parsed;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCsvFile(file);
        setImportError("");
        setImportResults(null);
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setCsvText(text);
            try {
                const users = parseCSV(text);
                setParsedUsers(users);
                if (users.length === 0) {
                    setImportError("No valid rows found in the CSV. Please check the format.");
                }
            } catch (err) {
                setImportError("Failed to parse CSV file.");
            }
        };
        reader.readAsText(file);
    };

    const handleImportSubmit = async () => {
        if (parsedUsers.length === 0 || importing) return;
        setImporting(true);
        setImportError("");
        try {
            const res = await batchInvite({
                adminToken: auth?.token || "",
                employees: parsedUsers,
            });
            if (res.success) {
                setImportResults(res.results || []);
                setParsedUsers([]);
                setCsvFile(null);
            } else {
                setImportError(res.error || "Failed to import users.");
            }
        } catch (err: any) {
            setImportError(err.message || "An unexpected error occurred during import.");
        } finally {
            setImporting(false);
        }
    };

    const handleCopyCredentials = () => {
        if (!importResults) return;
        const text = importResults
            .filter(r => r.success)
            .map(r => `Email: ${r.email} | Name: ${r.firstName} ${r.surname} | Temp Password: ${r.tempPassword}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        alert("Credentials copied to clipboard!");
    };

    const handleDownloadCredentials = () => {
        if (!importResults) return;
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Email,Surname,Firstname,Temporary Password\n";
        importResults
            .filter(r => r.success)
            .forEach(r => {
                csvContent += `"${r.email}","${r.surname}","${r.firstName}","${r.tempPassword}"\n`;
            });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "wellness_temp_passwords.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUserSave = async () => {
        if (!editingUser || updatingRole) return;
        if (!editEmail.trim()) {
            alert("Email is required.");
            return;
        }
        setUpdatingRole(true);
        try {
            await adminUpdateUser({
                userId: editingUser._id,
                email: editEmail.trim().toLowerCase(),
                firstName: editFirstName.trim() || undefined,
                surname: editSurname.trim() || undefined,
                gender: editGender || undefined,
                dateOfBirth: editDateOfBirth.trim() || undefined,
                role: selectedRole,
            });
            setEditingUser(null);
            alert("User updated successfully!");
        } catch (err: any) {
            alert(err.message || "Failed to update user.");
        } finally {
            setUpdatingRole(false);
        }
    };

    const handleUserDelete = async () => {
        if (!editingUser || deletingUser) return;
        setDeletingUser(true);
        try {
            await adminDeleteUser({ userId: editingUser._id });
            setEditingUser(null);
            setShowDeleteConfirm(false);
            alert("User deleted successfully!");
        } catch (err: any) {
            alert(err.message || "Failed to delete user.");
        } finally {
            setDeletingUser(false);
        }
    };

    const filteredUsers = allUsers.filter((user: any) => {
        if (!user) return false;
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        const fullName = `${user.firstName || ""} ${user.surname || ""}`.toLowerCase();
        const email = (user.email || "").toLowerCase();
        return fullName.includes(query) || email.includes(query);
    });

    if (!auth) return null;

    const initials = `${(auth.firstName || auth.email?.[0] || "A")[0]}`.toUpperCase();

    return (
        <div className="admin-container">
            <header className="top-bar admin">
                <div style={{ width: 24 }} />
                <h1 className="top-bar-title" style={{ color: "var(--color-admin-text)" }}>Settings</h1>
                <div style={{ width: 24 }} />
            </header>

            <main className="admin-content">
                {auth.role === "super_admin" && (
                    <div className="segmented" style={{ marginBottom: "var(--spacing-md)" }}>
                        <button className={`seg-btn ${activeTab === "general" ? "active" : ""}`} onClick={() => setActiveTab("general")} style={{ color: activeTab === "general" ? "var(--color-primary)" : "var(--color-admin-text-muted)" }}>General</button>
                        <button className={`seg-btn ${activeTab === "roles" ? "active" : ""}`} onClick={() => setActiveTab("roles")} style={{ color: activeTab === "roles" ? "var(--color-primary)" : "var(--color-admin-text-muted)" }}>Role Management</button>
                    </div>
                )}

                {activeTab === "general" ? (
                    <>
                        {/* Admin avatar card */}
                        <div className="card admin" style={{ textAlign: "center", padding: "var(--spacing-xl)", marginBottom: "var(--spacing-md)" }}>
                            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--spacing-md)", fontSize: 26, fontWeight: 700, color: "white" }}>
                                {initials}
                            </div>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-admin-text)" }}>
                                {auth.firstName ? `${auth.firstName} ${auth.surname}` : auth.email}
                            </h2>
                            <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginTop: 4 }}>{auth.email}</p>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: "var(--spacing-sm)", background: "var(--color-primary)22", color: "var(--color-primary)", borderRadius: "var(--radius-full)", padding: "4px 12px", fontSize: 12, fontWeight: 600 }}>
                                <Shield size={12} /> {auth.role === "super_admin" ? "Super Admin" : "Administrator"}
                            </div>
                        </div>

                        {/* Quick links */}
                        <h2 className="section-title admin" style={{ marginBottom: "var(--spacing-sm)" }}>Administration</h2>
                        {[
                            { label: "Verify Submissions", icon: ClipboardList, href: "/admin/verify" },
                            { label: "Manage Activities", icon: Settings, href: "/admin/manage" },
                            { label: "Configuration", icon: Database, href: "/admin/config" },
                            ...(auth.role === "super_admin" ? [
                                { label: "Bulk User Import (CSV)", icon: Users, id: "bulk-import" },
                                { label: "Manage Admins", icon: Users, href: "/admin/admins" }
                            ] : []),
                        ].map((item) => {
                            const IconComponent = item.icon;
                            return (
                                <div key={item.label} className="list-item admin" style={{ cursor: "pointer" }} onClick={() => {
                                    if (item.id === "bulk-import") {
                                        setShowBulkImport(true);
                                    } else if (item.href) {
                                        router.push(item.href);
                                    }
                                }}>
                                    <div className="icon-wrap admin"><IconComponent size={18} /></div>
                                    <div className="list-item-content"><p className="list-item-title admin">{item.label}</p></div>
                                    <ChevronRight size={16} color="var(--color-admin-text-muted)" />
                                </div>
                            );
                        })}

                        {/* Sign out */}
                        <div style={{ marginTop: "var(--spacing-xl)" }}>
                            <button
                                onClick={() => setShowLogoutConfirm(true)}
                                id="admin-logout-btn"
                                style={{ width: "100%", background: "#DC262611", color: "#DC2626", border: "1px solid #DC262633", fontWeight: 700, borderRadius: "var(--radius-lg)", padding: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", fontSize: 15 }}
                            >
                                <LogOut size={18} /> Sign Out
                            </button>
                        </div>
                    </>
                ) : (
                    <div>
                        {/* Search Bar */}
                        <div className="input-group" style={{ marginBottom: "var(--spacing-md)" }}>
                            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                <input 
                                    className="input admin" 
                                    type="text"
                                    placeholder="Search by name or email..." 
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)} 
                                    id="user-search-input"
                                    style={{ paddingLeft: 40 }}
                                />
                                <Search size={16} color="var(--color-admin-text-muted)" style={{ position: "absolute", left: 14 }} />
                            </div>
                        </div>

                        {/* User List */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
                            {filteredUsers.length === 0 ? (
                                <div className="empty-state">
                                    <p className="empty-state-title" style={{ color: "var(--color-admin-text)" }}>No users found</p>
                                    <p className="empty-state-body" style={{ color: "var(--color-admin-text-muted)" }}>Try adjusting your search criteria.</p>
                                </div>
                            ) : (
                                filteredUsers.map((user: any) => {
                                    const userInitials = `${(user.firstName || user.email?.[0] || "U")[0]}`.toUpperCase();
                                    return (
                                        <div 
                                            key={user._id} 
                                            className="list-item admin" 
                                            style={{ cursor: "pointer", transition: "background 150ms" }}
                                            onClick={() => {
                                                setEditingUser(user);
                                                setSelectedRole(user.role);
                                                setEditFirstName(user.firstName || "");
                                                setEditSurname(user.surname || "");
                                                setEditEmail(user.email || "");
                                                setEditGender(user.gender || "other");
                                                setEditDateOfBirth(user.dateOfBirth || "");
                                                setShowDeleteConfirm(false);
                                            }}
                                            id={`user-item-${user._id}`}
                                        >
                                            <div style={{ width: 40, height: 40, borderRadius: "50%", background: user.role === "super_admin" ? "var(--color-primary)" : user.role === "admin" ? "var(--color-secondary)" : "var(--color-admin-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                                                {userInitials}
                                            </div>
                                            <div className="list-item-content">
                                                <p className="list-item-title admin" style={{ fontWeight: 600 }}>
                                                    {user.firstName ? `${user.firstName} ${user.surname}` : "Profile Incomplete"}
                                                </p>
                                                <p className="list-item-subtitle admin" style={{ fontSize: 12, color: "var(--color-admin-text-muted)" }}>{user.email}</p>
                                                {user.dateOfBirth && (
                                                    <p style={{ fontSize: 11, color: "var(--color-admin-text-muted)", marginTop: 2 }}>
                                                        DOB: {formatDateDisplay(user.dateOfBirth)}
                                                    </p>
                                                )}
                                            </div>
                                            <span className={`badge ${
                                                user.role === "super_admin" ? "badge-error" : 
                                                user.role === "admin" ? "badge-warning" : "badge-success"
                                            }`} style={{ fontSize: 10, padding: "2px 8px" }}>
                                                {user.role === "super_admin" ? "Super Admin" : 
                                                 user.role === "admin" ? "Admin" : "Employee"}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Confirm modal */}
            {showLogoutConfirm && (
                <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
                    <div className="modal-sheet admin" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                        <div className="modal-handle" style={{ background: "var(--color-admin-border)" }} />
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#DC262622", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--spacing-md)" }}>
                            <LogOut size={24} color="#DC2626" />
                        </div>
                        <h2 className="modal-title admin">Sign Out?</h2>
                        <p style={{ fontSize: 14, color: "var(--color-admin-text-muted)", marginBottom: "var(--spacing-xl)" }}>
                            You will be returned to the login screen.
                        </p>
                        <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
                            <button onClick={() => setShowLogoutConfirm(false)} id="cancel-admin-logout-btn"
                                style={{ flex: 1, background: "var(--color-admin-card)", color: "var(--color-admin-text)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 600, cursor: "pointer" }}>
                                Cancel
                            </button>
                            <button onClick={handleLogout} id="confirm-admin-logout-btn"
                                style={{ flex: 1, background: "#DC2626", color: "white", border: "none", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 700, cursor: "pointer" }}>
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Import Modal */}
            {showBulkImport && (
                <div className="modal-overlay" onClick={() => { if (!importing) setShowBulkImport(false); }}>
                    <div className="modal-sheet admin" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "85dvh", display: "flex", flexDirection: "column" }}>
                        <div className="modal-handle" style={{ background: "var(--color-admin-border)" }} />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-md)" }}>
                            <h2 className="modal-title admin" style={{ marginBottom: 0 }}>Bulk User Import</h2>
                            <button 
                                onClick={() => { if (!importing) setShowBulkImport(false); }} 
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-admin-text-muted)" }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {!importResults ? (
                            <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
                                <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginBottom: "var(--spacing-md)", lineHeight: 1.5 }}>
                                    Upload a CSV file containing employee details. The CSV should have the following column structure (the first row is skipped if it contains headers):
                                </p>
                                <div style={{ background: "var(--color-admin-bg)", padding: "10px var(--spacing-sm)", borderRadius: "var(--radius-sm)", fontSize: 12, fontFamily: "monospace", color: "var(--color-primary)", border: "1px solid var(--color-admin-border)", marginBottom: "var(--spacing-md)", overflowX: "auto" }}>
                                    Surname, Firstname, gender, date of birth, email
                                </div>

                                <div className="input-group">
                                    <label className="upload-zone" style={{ borderStyle: "dashed", borderColor: "var(--color-admin-border)", background: "var(--color-admin-surface)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "var(--spacing-xl) var(--spacing-md)", cursor: "pointer", borderRadius: "var(--radius-md)" }}>
                                        <Upload size={32} color="var(--color-primary)" />
                                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-admin-text)" }}>
                                            {csvFile ? csvFile.name : "Select CSV File"}
                                        </span>
                                        <span style={{ fontSize: 11, color: "var(--color-admin-text-muted)" }}>
                                            {csvFile ? `${(csvFile.size / 1024).toFixed(1)} KB` : "Click to browse and upload file"}
                                        </span>
                                        <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: "none" }} />
                                    </label>
                                </div>

                                {importError && (
                                    <div style={{ display: "flex", gap: 8, background: "#DC262622", border: "1px solid #DC262644", color: "#DC2626", borderRadius: "var(--radius-md)", padding: "10px 14px", fontSize: 13, marginBottom: "var(--spacing-md)" }}>
                                        <AlertCircle size={18} style={{ flexShrink: 0 }} />
                                        <span>{importError}</span>
                                    </div>
                                )}

                                {parsedUsers.length > 0 && (
                                    <div style={{ marginTop: "var(--spacing-md)" }}>
                                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-admin-text)", marginBottom: "var(--spacing-xs)" }}>
                                            Preview ({parsedUsers.length} users parsed)
                                        </h3>
                                        <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-md)", background: "var(--color-admin-bg)" }}>
                                            {parsedUsers.map((u, i) => (
                                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: i < parsedUsers.length - 1 ? "1px solid var(--color-admin-border)" : "none", fontSize: 12 }}>
                                                    <div>
                                                        <p style={{ fontWeight: 600, color: "var(--color-admin-text)" }}>{u.firstName} {u.surname}</p>
                                                        <p style={{ color: "var(--color-admin-text-muted)" }}>{u.email}</p>
                                                    </div>
                                                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--color-admin-surface)", color: "var(--color-admin-text-muted)", textTransform: "capitalize" }}>
                                                        {u.gender}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: "flex", gap: "var(--spacing-sm)", marginTop: "var(--spacing-lg)" }}>
                                    <button 
                                        onClick={() => { setCsvFile(null); setParsedUsers([]); setImportError(""); }} 
                                        disabled={importing || parsedUsers.length === 0}
                                        style={{ flex: 1, background: "var(--color-admin-surface)", color: "var(--color-admin-text-muted)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 600, cursor: "pointer", opacity: parsedUsers.length === 0 ? 0.5 : 1 }}
                                    >
                                        Clear
                                    </button>
                                    <button 
                                        onClick={handleImportSubmit} 
                                        disabled={importing || parsedUsers.length === 0}
                                        style={{ flex: 2, background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: parsedUsers.length === 0 ? 0.5 : 1 }}
                                    >
                                        {importing ? "Importing…" : `Import ${parsedUsers.length} Users`}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                                <div style={{ textAlign: "center", padding: "var(--spacing-md) 0" }}>
                                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--color-success)22", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--spacing-sm)" }}>
                                        <Check size={24} color="var(--color-success)" />
                                    </div>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-admin-text)" }}>Import Complete</h3>
                                    <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", marginTop: 4 }}>
                                        Successfully imported {importResults.filter(r => r.success).length} of {importResults.length} users.
                                    </p>
                                </div>

                                <div style={{ display: "flex", gap: "var(--spacing-xs)", marginBottom: "var(--spacing-md)" }}>
                                    <button 
                                        onClick={handleCopyCredentials} 
                                        style={{ flex: 1, background: "var(--color-admin-surface)", color: "var(--color-admin-text)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}
                                    >
                                        <Copy size={14} /> Copy Passwords
                                    </button>
                                    <button 
                                        onClick={handleDownloadCredentials} 
                                        style={{ flex: 1, background: "var(--color-admin-surface)", color: "var(--color-admin-text)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}
                                    >
                                        <Download size={14} /> Download CSV
                                    </button>
                                </div>

                                <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-md)", background: "var(--color-admin-bg)", marginBottom: "var(--spacing-md)" }}>
                                    {importResults.map((r, i) => (
                                        <div key={i} style={{ padding: "10px 12px", borderBottom: i < importResults.length - 1 ? "1px solid var(--color-admin-border)" : "none", fontSize: 12 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                <p style={{ fontWeight: 600, color: r.success ? "var(--color-admin-text)" : "#DC2626" }}>
                                                    {r.success ? `${r.firstName} ${r.surname}` : r.email}
                                                </p>
                                                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: r.success ? "var(--color-success)22" : "#DC262622", color: r.success ? "var(--color-success)" : "#DC2626", fontWeight: 600 }}>
                                                    {r.success ? "Success" : "Failed"}
                                                </span>
                                            </div>
                                            {r.success ? (
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, background: "var(--color-admin-surface)", padding: "4px 8px", borderRadius: 4 }}>
                                                    <span style={{ color: "var(--color-admin-text-muted)", fontSize: 11 }}>{r.email}</span>
                                                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--color-primary)", letterSpacing: 0.5 }}>{r.tempPassword}</span>
                                                </div>
                                            ) : (
                                                <p style={{ color: "#DC2626", fontSize: 11, marginTop: 2 }}>{r.error}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <button 
                                    onClick={() => { setImportResults(null); setShowBulkImport(false); }} 
                                    style={{ background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 700, cursor: "pointer", width: "100%" }}
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Manage User Modal */}
            {editingUser && (
                <div className="modal-overlay" onClick={() => { if (!updatingRole && !deletingUser) setEditingUser(null); }}>
                    <div className="modal-sheet admin" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90dvh", display: "flex", flexDirection: "column" }}>
                        <div className="modal-handle" style={{ background: "var(--color-admin-border)" }} />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-md)" }}>
                            <h2 className="modal-title admin" style={{ marginBottom: 0 }}>Manage User</h2>
                            <button 
                                onClick={() => { if (!updatingRole && !deletingUser) setEditingUser(null); }} 
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-admin-text-muted)" }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        {!showDeleteConfirm ? (
                            <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <div className="input-group" style={{ flex: 1 }}>
                                        <label className="input-label admin">First Name</label>
                                        <input className="input admin" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} placeholder="First Name" id="edit-user-first-name" />
                                    </div>
                                    <div className="input-group" style={{ flex: 1 }}>
                                        <label className="input-label admin">Surname</label>
                                        <input className="input admin" value={editSurname} onChange={(e) => setEditSurname(e.target.value)} placeholder="Surname" id="edit-user-surname" />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label admin">Email *</label>
                                    <input className="input admin" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" id="edit-user-email" />
                                </div>

                                <div className="input-group">
                                    <label className="input-label admin">Gender</label>
                                    <div className="segmented" style={{ background: "var(--color-admin-bg)" }}>
                                        <button type="button" className={`seg-btn ${editGender === "male" ? "active" : ""}`} onClick={() => setEditGender("male")} style={{ fontSize: 12, color: editGender === "male" ? "var(--color-primary)" : "var(--color-admin-text-muted)" }}>Male</button>
                                        <button type="button" className={`seg-btn ${editGender === "female" ? "active" : ""}`} onClick={() => setEditGender("female")} style={{ fontSize: 12, color: editGender === "female" ? "var(--color-primary)" : "var(--color-admin-text-muted)" }}>Female</button>
                                        <button type="button" className={`seg-btn ${editGender === "other" ? "active" : ""}`} onClick={() => setEditGender("other")} style={{ fontSize: 12, color: editGender === "other" ? "var(--color-primary)" : "var(--color-admin-text-muted)" }}>Other</button>
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label admin">Date of Birth</label>
                                    <input className="input admin" type="date" value={normalizeDate(editDateOfBirth)} onChange={(e) => setEditDateOfBirth(e.target.value)} id="edit-user-dob" />
                                    {editDateOfBirth && (
                                        <p style={{ fontSize: 12, color: "var(--color-admin-text-muted)", marginTop: 4 }}>
                                            📅 {formatDateDisplay(editDateOfBirth)}
                                        </p>
                                    )}
                                </div>

                                <div className="input-group">
                                    <label className="input-label admin">Assign Role</label>
                                    <div className="segmented" style={{ background: "var(--color-admin-bg)" }}>
                                        <button type="button" className={`seg-btn ${selectedRole === "employee" ? "active" : ""}`} onClick={() => setSelectedRole("employee")} style={{ fontSize: 11, color: selectedRole === "employee" ? "var(--color-primary)" : "var(--color-admin-text-muted)" }}>Employee</button>
                                        <button type="button" className={`seg-btn ${selectedRole === "admin" ? "active" : ""}`} onClick={() => setSelectedRole("admin")} style={{ fontSize: 11, color: selectedRole === "admin" ? "var(--color-primary)" : "var(--color-admin-text-muted)" }}>Admin</button>
                                        <button type="button" className={`seg-btn ${selectedRole === "super_admin" ? "active" : ""}`} onClick={() => setSelectedRole("super_admin")} style={{ fontSize: 11, color: selectedRole === "super_admin" ? "var(--color-primary)" : "var(--color-admin-text-muted)" }}>Super Admin</button>
                                    </div>
                                </div>

                                {/* Password Reset Fallback Section */}
                                <div style={{ marginTop: "var(--spacing-lg)", borderTop: "1px solid var(--color-admin-border)", paddingTop: "var(--spacing-md)" }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--color-admin-text)", marginBottom: 8 }}>Administrative Password Reset</h4>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <input 
                                            type="text" 
                                            className="input admin" 
                                            style={{ flex: 1, margin: 0, fontSize: 13 }} 
                                            placeholder="New custom password" 
                                            value={adminResetPassword}
                                            onChange={(e) => setAdminResetPassword(e.target.value)}
                                            id="admin-user-reset-pw"
                                        />
                                        <button 
                                            type="button"
                                            className="btn btn-secondary" 
                                            style={{ padding: "0 14px", fontSize: 12, height: 42, display: "flex", alignItems: "center", justifyContent: "center" }}
                                            onClick={handleAdminResetPasswordSubmit}
                                            disabled={!adminResetPassword.trim() || adminResetPasswordProcessing}
                                            id="admin-user-reset-pw-submit"
                                        >
                                            {adminResetPasswordProcessing ? "Resetting…" : "Reset"}
                                        </button>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                                        <input 
                                            type="checkbox" 
                                            id="admin-reset-force-change" 
                                            checked={adminResetForceChange}
                                            onChange={(e) => setAdminResetForceChange(e.target.checked)}
                                            style={{ width: "auto", margin: 0 }}
                                        />
                                        <label htmlFor="admin-reset-force-change" style={{ fontSize: 11, color: "var(--color-admin-text-muted)", cursor: "pointer", userSelect: "none" }}>
                                            Force password change on next login
                                        </label>
                                    </div>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: "var(--spacing-lg)" }}>
                                    <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
                                        <button 
                                            onClick={() => setEditingUser(null)} 
                                            style={{ flex: 1, background: "var(--color-admin-surface)", color: "var(--color-admin-text-muted)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 600, cursor: "pointer" }}
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={handleUserSave} 
                                            disabled={updatingRole}
                                            style={{ flex: 2, background: "var(--color-primary)", color: "white", border: "none", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 700, cursor: "pointer" }}
                                        >
                                            {updatingRole ? "Saving…" : "Save Changes"}
                                        </button>
                                    </div>

                                    <button 
                                        onClick={() => setShowDeleteConfirm(true)}
                                        style={{ background: "#DC262611", color: "#DC2626", border: "1px solid #DC262633", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 700, cursor: "pointer", fontSize: 14, marginTop: 8 }}
                                    >
                                        Delete User Account
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: "center", padding: "var(--spacing-lg) 0" }}>
                                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#DC262622", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--spacing-md)" }}>
                                    <AlertCircle size={28} color="#DC2626" />
                                </div>
                                <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-admin-text)" }}>Delete User Account?</h3>
                                <p style={{ fontSize: 13, color: "var(--color-admin-text-muted)", margin: "8px 0 var(--spacing-xl)", lineHeight: 1.5 }}>
                                    Are you sure you want to permanently delete **{editingUser.email}**? This action cannot be undone and will delete all user data.
                                </p>
                                <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
                                    <button 
                                        onClick={() => setShowDeleteConfirm(false)} 
                                        disabled={deletingUser}
                                        style={{ flex: 1, background: "var(--color-admin-surface)", color: "var(--color-admin-text)", border: "1px solid var(--color-admin-border)", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 600, cursor: "pointer" }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleUserDelete} 
                                        disabled={deletingUser}
                                        style={{ flex: 1, background: "#DC2626", color: "white", border: "none", borderRadius: "var(--radius-lg)", padding: "12px", fontWeight: 700, cursor: "pointer" }}
                                    >
                                        {deletingUser ? "Deleting…" : "Confirm Delete"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <AdminBottomNav />
        </div>
    );
}
