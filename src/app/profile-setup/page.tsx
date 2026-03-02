"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Camera, User } from "lucide-react";

const STEPS = ["Personal Info", "Organisation", "Review"];

export default function ProfileSetupPage() {
    const router = useRouter();
    const businessUnits = useQuery(api.config.getBusinessUnits) || [];
    const departments = useQuery(api.config.getDepartments) || [];
    const locations = useQuery(api.config.getLocations) || [];
    const updateProfile = useMutation(api.users.updateUserProfile);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState(0);
    const [form, setForm] = useState({
        firstName: "", surname: "", dateOfBirth: "",
        gender: "" as "male" | "female" | "other" | "",
        height: "", heightUnit: "cm" as "cm" | "ft",
        businessUnitId: "", departmentId: "", locationId: "",
        avatarUrl: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [seeded, setSeeded] = useState(false);

    const auth = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("heritage_auth") || "null") : null;

    // Fetch existing profile data from Convex
    const userProfile = useQuery(api.users.getUserById, auth ? { userId: auth.id } : "skip");

    // Pre-populate form from saved profile data
    useEffect(() => {
        if (!seeded && userProfile) {
            setForm((prev) => ({
                ...prev,
                firstName: userProfile.firstName || "",
                surname: userProfile.surname || "",
                dateOfBirth: userProfile.dateOfBirth || "",
                gender: (userProfile.gender as any) || "",
                height: userProfile.height ? String(userProfile.height) : "",
                heightUnit: (userProfile.heightUnit as "cm" | "ft") || "cm",
                businessUnitId: userProfile.businessUnitId || "",
                departmentId: userProfile.departmentId || "",
                locationId: userProfile.locationId || "",
                avatarUrl: userProfile.avatarUrl || "",
            }));
            setSeeded(true);
        }
    }, [userProfile, seeded]);

    const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const url = URL.createObjectURL(f);
        set("avatarUrl", url);
    };

    const handleNext = () => {
        if (step === 0) {
            if (!form.firstName || !form.surname || !form.dateOfBirth || !form.gender) { setError("Please fill all required fields."); return; }
        }
        if (step === 1) {
            if (!form.businessUnitId || !form.departmentId || !form.locationId || !form.height) { setError("Please fill all required fields."); return; }
        }
        setError("");
        setStep(step + 1);
    };

    const handleSubmit = async () => {
        if (!auth) { router.push("/login"); return; }
        setLoading(true);
        try {
            await updateProfile({
                userId: auth.id,
                firstName: form.firstName,
                surname: form.surname,
                dateOfBirth: form.dateOfBirth,
                gender: form.gender as "male" | "female" | "other",
                height: parseFloat(form.height),
                heightUnit: form.heightUnit,
                businessUnitId: form.businessUnitId as any,
                departmentId: form.departmentId as any,
                locationId: form.locationId as any,
                avatarUrl: form.avatarUrl || undefined,
            });
            auth.isProfileComplete = true;
            auth.firstName = form.firstName;
            auth.surname = form.surname;
            localStorage.setItem("heritage_auth", JSON.stringify(auth));
            router.push("/dashboard");
        } catch (e: any) {
            setError(e.message || "Failed to save profile.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-container" style={{ background: "var(--color-surface)", minHeight: "100dvh" }}>
            {/* Header */}
            <div style={{ padding: "var(--spacing-md) var(--spacing-md) 0", paddingTop: "max(var(--spacing-md), env(safe-area-inset-top, var(--spacing-md)))" }}>
                <div style={{ textAlign: "center", marginBottom: "var(--spacing-lg)" }}>
                    <p style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em" }}>Step {step + 1} of {STEPS.length}</p>
                    <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{STEPS[step]}</h1>
                </div>
                {/* Progress dots */}
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: "var(--spacing-xl)" }}>
                    {STEPS.map((_, i) => (
                        <div key={i} style={{ height: 8, borderRadius: "999px", background: i <= step ? "var(--color-primary)" : "var(--color-border)", transition: "all 0.3s", width: i === step ? 24 : 8 }} />
                    ))}
                </div>
            </div>

            <div style={{ padding: "0 var(--spacing-md) var(--spacing-xl)" }}>
                {error && <div className="alert alert-error">{error}</div>}

                {/* Step 0: Personal Info */}
                {step === 0 && (
                    <div className="slide-up">
                        {/* Avatar upload */}
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={handleAvatarChange}
                            id="avatar-upload-input"
                        />
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "var(--spacing-xl)" }}>
                            <div
                                style={{ width: 100, height: 100, borderRadius: "50%", background: "var(--color-primary-light)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", cursor: "pointer" }}
                                onClick={() => avatarInputRef.current?.click()}
                                id="avatar-upload-btn"
                            >
                                {form.avatarUrl
                                    ? <img src={form.avatarUrl} style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover" }} alt="avatar" />
                                    : <User size={40} color="var(--color-primary)" />}
                                <div style={{ position: "absolute", bottom: 0, right: 0, width: 30, height: 30, background: "var(--color-primary)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid white" }}>
                                    <Camera size={14} color="white" />
                                </div>
                            </div>
                            <p style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>Upload Photo</p>
                            <p style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                                {form.avatarUrl ? "Tap to change photo" : "Show us your smile!"}
                            </p>
                        </div>

                        <div className="input-group">
                            <label className="input-label">First Name *</label>
                            <input className="input" placeholder="e.g. Jane" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} id="first-name" />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Surname *</label>
                            <input className="input" placeholder="e.g. Doe" value={form.surname} onChange={(e) => set("surname", e.target.value)} id="surname" />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Date of Birth *</label>
                            <input className="input" type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} id="dob" />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Gender *</label>
                            <div className="segmented">
                                {(["male", "female", "other"] as const).map((g) => (
                                    <button key={g} type="button" className={`seg-btn ${form.gender === g ? "active" : ""}`} onClick={() => set("gender", g)} id={`gender-${g}`}>
                                        {g.charAt(0).toUpperCase() + g.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 1: Organisation */}
                {step === 1 && (
                    <div className="slide-up">
                        <div className="input-group">
                            <label className="input-label">Business Unit *</label>
                            <select className="input select" value={form.businessUnitId} onChange={(e) => set("businessUnitId", e.target.value)} id="business-unit">
                                <option value="">Select Business Unit</option>
                                {businessUnits.filter((b) => b.isActive).map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Department *</label>
                            <select className="input select" value={form.departmentId} onChange={(e) => set("departmentId", e.target.value)} id="department">
                                <option value="">Select Department</option>
                                {departments.filter((d) => d.isActive).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Location *</label>
                            <select className="input select" value={form.locationId} onChange={(e) => set("locationId", e.target.value)} id="location">
                                <option value="">Select Office Location</option>
                                {locations.filter((l) => l.isActive).map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Height *</label>
                            <div style={{ display: "flex", gap: 8 }}>
                                <input className="input" type="number" placeholder="Enter height" value={form.height} onChange={(e) => set("height", e.target.value)} style={{ flex: 1 }} id="height" />
                                <div className="segmented" style={{ width: 100, flexShrink: 0 }}>
                                    {(["cm", "ft"] as const).map((u) => (
                                        <button key={u} type="button" className={`seg-btn ${form.heightUnit === u ? "active" : ""}`} onClick={() => set("heightUnit", u)}>{u}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Review */}
                {step === 2 && (
                    <div className="slide-up">
                        <div className="card" style={{ marginBottom: "var(--spacing-md)" }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "var(--spacing-md)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Personal</p>
                            {[["Name", `${form.firstName} ${form.surname}`], ["Date of Birth", form.dateOfBirth], ["Gender", form.gender], ["Height", `${form.height} ${form.heightUnit}`]].map(([l, v]) => (
                                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
                                    <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{l}</span>
                                    <span style={{ fontSize: 14, fontWeight: 600 }}>{v}</span>
                                </div>
                            ))}
                        </div>
                        <div className="card">
                            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "var(--spacing-md)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Organisation</p>
                            {[
                                ["Business Unit", businessUnits.find((b) => b._id === form.businessUnitId)?.name || "—"],
                                ["Department", departments.find((d) => d._id === form.departmentId)?.name || "—"],
                                ["Location", locations.find((l) => l._id === form.locationId)?.name || "—"],
                            ].map(([l, v]) => (
                                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
                                    <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{l}</span>
                                    <span style={{ fontSize: 14, fontWeight: 600 }}>{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div style={{ display: "flex", gap: "var(--spacing-sm)", marginTop: "var(--spacing-xl)" }}>
                    {step > 0 && (
                        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setStep(step - 1)}>← Back</button>
                    )}
                    {step < STEPS.length - 1 ? (
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleNext} id={`profile-next-${step}`}>
                            Continue →
                        </button>
                    ) : (
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading} id="profile-submit">
                            {loading ? "Saving..." : "Save Profile 🎉"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
