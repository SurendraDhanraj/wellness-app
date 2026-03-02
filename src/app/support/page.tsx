"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { HelpCircle, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { EmployeeBottomNav } from "@/components/BottomNav";

const FAQS = [
    { q: "How do I earn points?", a: "Enrol in wellness activities, complete them, upload proof, and earn points once an administrator verifies your submission." },
    { q: "How long does verification take?", a: "Administrators typically review submissions within 1–2 business days." },
    { q: "Can I submit proof after the activity deadline?", a: "Yes, you can submit proof at any time after completion." },
    { q: "How are badges awarded?", a: "Badges are automatically awarded when you reach specific milestones, such as earning a certain number of points or completing a set number of activities." },
    { q: "How does the leaderboard work?", a: "The leaderboard updates in real-time based on verified points. You can filter by Business Unit, Department, or Location." },
    { q: "Who can I contact for technical issues?", a: "Submit a support ticket below and an administrator will respond as soon as possible." },
];

export default function SupportPage() {
    const router = useRouter();
    const [auth, setAuth] = useState<any>(null);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [showTicket, setShowTicket] = useState(false);
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const createTicket = useMutation(api.support.createTicket);

    useEffect(() => {
        const stored = localStorage.getItem("heritage_auth");
        if (!stored) { router.replace("/login"); return; }
        setAuth(JSON.parse(stored));
    }, [router]);

    const myTickets = useQuery(api.support.getTickets, auth ? { userId: auth.id } : "skip") || [];

    const handleSubmit = async () => {
        if (!auth || !subject.trim() || !body.trim()) return;
        setSubmitting(true);
        try {
            await createTicket({ userId: auth.id, subject: subject.trim(), body: body.trim() });
            setSubmitted(true);
            setSubject(""); setBody(""); setShowTicket(false);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="app-container">
            <header className="top-bar">
                <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}>←</button>
                <h1 className="top-bar-title">Help &amp; Support</h1>
                <div style={{ width: 24 }} />
            </header>

            <main className="page-content">
                {submitted && <div className="alert alert-success">✅ Your ticket has been submitted! We&apos;ll get back to you soon.</div>}

                <h2 className="section-title" style={{ marginBottom: "var(--spacing-md)" }}>Frequently Asked Questions</h2>
                {FAQS.map((faq, i) => (
                    <div key={i} style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", marginBottom: "var(--spacing-sm)", overflow: "hidden" }}>
                        <button
                            onClick={() => setOpenFaq(openFaq === i ? null : i)}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "var(--spacing-md)", background: openFaq === i ? "var(--color-primary-light)" : "var(--color-surface)", border: "none", cursor: "pointer", textAlign: "left" }}
                        >
                            <HelpCircle size={18} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: openFaq === i ? "var(--color-primary)" : "var(--color-text-primary)" }}>{faq.q}</span>
                            {openFaq === i ? <ChevronDown size={16} color="var(--color-primary)" /> : <ChevronRight size={16} color="var(--color-text-muted)" />}
                        </button>
                        {openFaq === i && (
                            <p style={{ padding: "0 var(--spacing-md) var(--spacing-md)", fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{faq.a}</p>
                        )}
                    </div>
                ))}

                <div style={{ marginTop: "var(--spacing-xl)" }}>
                    <h2 className="section-title" style={{ marginBottom: "var(--spacing-sm)" }}>Still need help?</h2>
                    <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: "var(--spacing-md)" }}>Submit a support ticket and our team will respond within 1–2 business days.</p>
                    <button className="btn btn-primary btn-full" onClick={() => setShowTicket(true)} id="new-ticket-btn">
                        <Plus size={16} /> Submit a Ticket
                    </button>
                </div>

                {myTickets.length > 0 && (
                    <>
                        <h2 className="section-title" style={{ margin: "var(--spacing-xl) 0 var(--spacing-md)" }}>My Tickets</h2>
                        {myTickets.map((t: any) => (
                            <div key={t._id} className="card" style={{ marginBottom: "var(--spacing-sm)" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                                    <p style={{ fontWeight: 600, fontSize: 14 }}>{t.subject}</p>
                                    <span className={`badge ${t.status === "resolved" ? "badge-success" : t.status === "in_progress" ? "badge-warning" : "badge-secondary"}`}>{t.status}</span>
                                </div>
                                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: t.adminReply ? 8 : 0 }}>{t.body}</p>
                                {t.adminReply && (
                                    <div style={{ background: "var(--color-primary-light)", borderRadius: "var(--radius-sm)", padding: "8px var(--spacing-sm)", marginTop: 8 }}>
                                        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-primary)", marginBottom: 2 }}>Admin Response:</p>
                                        <p style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{t.adminReply}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </>
                )}
            </main>

            {showTicket && (
                <div className="modal-overlay" onClick={() => setShowTicket(false)}>
                    <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <h2 className="modal-title">Submit Support Ticket</h2>
                        <div className="input-group">
                            <label className="input-label">Subject</label>
                            <input className="input" placeholder="Brief description of your issue" value={subject} onChange={(e) => setSubject(e.target.value)} id="ticket-subject" />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Details</label>
                            <textarea className="input" placeholder="Describe your issue in detail..." value={body} onChange={(e) => setBody(e.target.value)} id="ticket-body" />
                        </div>
                        <button className="btn btn-primary btn-full btn-lg" onClick={handleSubmit} disabled={!subject.trim() || !body.trim() || submitting} id="submit-ticket-btn">
                            {submitting ? "Submitting…" : "Submit Ticket"}
                        </button>
                    </div>
                </div>
            )}

            <EmployeeBottomNav />
        </div>
    );
}
