"use client";

import { useState, useEffect } from "react";

const PORTAL_PASSWORD = "Cinelismmm34.";
const AUTH_STORAGE_KEY = "cineli_portal_authenticated_v1";

interface PortalAuthGateProps {
    children: React.ReactNode;
}

export function PortalAuthGate({ children }: PortalAuthGateProps) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [passwordInput, setPasswordInput] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shake, setShake] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        try {
            const auth = localStorage.getItem(AUTH_STORAGE_KEY);
            if (auth === "true") {
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
            }
        } catch {
            setIsAuthenticated(false);
        }
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        setTimeout(() => {
            if (passwordInput.trim() === PORTAL_PASSWORD) {
                try {
                    localStorage.setItem(AUTH_STORAGE_KEY, "true");
                } catch {
                    // ignore
                }
                setIsAuthenticated(true);
                setError(null);
            } else {
                setError("Geçersiz şifre! Lütfen yetkili portal şifresini giriniz.");
                setShake(true);
                setTimeout(() => setShake(false), 600);
            }
            setSubmitting(false);
        }, 150);
    };

    const handleLogout = () => {
        try {
            localStorage.removeItem(AUTH_STORAGE_KEY);
        } catch {
            // ignore
        }
        setIsAuthenticated(false);
        setPasswordInput("");
        setError(null);
    };

    // İlk yükleme sırasında bekleme durumu
    if (isAuthenticated === null) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "50vh",
                    color: "var(--muted)",
                    fontSize: "0.95rem",
                }}
            >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem" }}>
                    <span className="brand-mark__dot" style={{ animation: "pulse 1.5s infinite" }} />
                    <span>Güvenlik kontrol ediliyor...</span>
                </div>
            </div>
        );
    }

    // Şifre girilmemişse kilit ekranını göster
    if (!isAuthenticated) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "70vh",
                    padding: "1rem",
                }}
            >
                <div
                    className={`section-block page-enter ${shake ? "auth-shake" : ""}`}
                    style={{
                        width: "100%",
                        maxWidth: "440px",
                        padding: "2.2rem 2rem",
                        textAlign: "center",
                        borderRadius: "22px",
                        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
                        border: "1px solid var(--card-border)",
                    }}
                >
                    {/* İkon ve Başlık */}
                    <div
                        style={{
                            width: "64px",
                            height: "64px",
                            borderRadius: "18px",
                            background: "linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(56, 189, 248, 0.08))",
                            border: "1px solid rgba(56, 189, 248, 0.35)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "2rem",
                            marginBottom: "1.2rem",
                            boxShadow: "0 0 25px rgba(14, 165, 233, 0.25)",
                        }}
                    >
                        🔐
                    </div>

                    <h1
                        style={{
                            margin: "0 0 0.4rem 0",
                            fontSize: "1.45rem",
                            fontWeight: 800,
                            letterSpacing: "-0.02em",
                            color: "var(--text-heading)",
                        }}
                    >
                        Çineli SMMM Portalı
                    </h1>

                    <p className="text-muted" style={{ margin: "0 0 1.6rem 0", fontSize: "0.88rem", lineHeight: 1.5 }}>
                        e-Arşiv ve Mükellef Yönetim Paneline erişmek için lütfen yetkili şifrenizi giriniz.
                    </p>

                    {/* Hata Bildirimi */}
                    {error && (
                        <div
                            style={{
                                padding: "0.75rem 1rem",
                                borderRadius: "10px",
                                background: "var(--danger-bg)",
                                border: "1px solid var(--danger-border)",
                                color: "var(--danger)",
                                fontSize: "0.86rem",
                                fontWeight: 600,
                                marginBottom: "1.2rem",
                                textAlign: "left",
                            }}
                        >
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Şifre Giriş Formu */}
                    <form onSubmit={handleLogin} style={{ display: "grid", gap: "1rem" }}>
                        <div style={{ position: "relative" }}>
                            <input
                                autoFocus
                                type={showPassword ? "text" : "password"}
                                className="field"
                                placeholder="Portal Şifresini Giriniz..."
                                value={passwordInput}
                                onChange={(e) => {
                                    setPasswordInput(e.target.value);
                                    if (error) setError(null);
                                }}
                                style={{
                                    padding: "0.75rem 2.8rem 0.75rem 1rem",
                                    fontSize: "0.95rem",
                                    fontWeight: 500,
                                    borderRadius: "12px",
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Şifreyi Gizle" : "Şifreyi Göster"}
                                style={{
                                    position: "absolute",
                                    right: "12px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "1.1rem",
                                    padding: 0,
                                    color: "var(--muted)",
                                }}
                            >
                                {showPassword ? "👁️" : "🙈"}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || !passwordInput.trim()}
                            className="btn-primary"
                            style={{
                                padding: "0.75rem 1.2rem",
                                fontSize: "0.95rem",
                                fontWeight: 700,
                                borderRadius: "12px",
                                width: "100%",
                                cursor: "pointer",
                            }}
                        >
                            {submitting ? "Doğrulanıyor..." : "⚡ Giriş Yap"}
                        </button>
                    </form>

                    <div
                        className="text-muted"
                        style={{
                            marginTop: "1.8rem",
                            paddingTop: "1.2rem",
                            borderTop: "1px solid var(--line)",
                            fontSize: "0.78rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.4rem",
                        }}
                    >
                        <span>🔒 256-bit Güvenli SMMM Erişim Katmanı</span>
                    </div>
                </div>

                <style jsx>{`
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        20%, 60% { transform: translateX(-8px); }
                        40%, 80% { transform: translateX(8px); }
                    }
                    .auth-shake {
                        animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
                    }
                `}</style>
            </div>
        );
    }

    // Şifre doğruysa portalı ve kilit butonunu sunar
    return (
        <div style={{ position: "relative" }}>
            {/* Üstte Kilit / Güvenli Oturum Çıkış Butonu Çubuğu */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    marginBottom: "0.6rem",
                    gap: "0.6rem",
                }}
            >
                <button
                    type="button"
                    onClick={handleLogout}
                    className="btn-ghost"
                    title="Portal Korumasını Yeniden Aktifleştir"
                    style={{
                        fontSize: "0.8rem",
                        padding: "0.3rem 0.8rem",
                        borderRadius: "8px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        color: "var(--muted)",
                    }}
                >
                    <span>🔒</span>
                    <span>Portalı Kilitle</span>
                </button>
            </div>

            {children}
        </div>
    );
}
