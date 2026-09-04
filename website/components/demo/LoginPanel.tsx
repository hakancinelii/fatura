import type { EnvironmentKey, UserData } from "fatura";

interface LoginPanelProps {
    env: EnvironmentKey;
    userName: string;
    password: string;
    token: string | null;
    loading: boolean;
    userData: UserData | null;
    onEnvChange: (env: EnvironmentKey) => void;
    onUserNameChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    onLogin: () => Promise<void>;
    onLogout: () => Promise<void>;
}

export function LoginPanel({
    env,
    userName,
    password,
    token,
    loading,
    userData,
    onEnvChange,
    onUserNameChange,
    onPasswordChange,
    onLogin,
    onLogout,
}: LoginPanelProps) {
    return (
        <section className="section-block" style={{ display: "grid", gap: "0.8rem" }}>
            <h2 className="section-title" style={{ fontSize: "1.35rem" }}>
                GİB girişi
            </h2>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                    type="button"
                    className={env === "TEST" ? "btn-primary" : "btn-ghost"}
                    onClick={() => onEnvChange("TEST")}
                >
                    TEST ortamı
                </button>
                <button
                    type="button"
                    className={env === "PROD" ? "btn-primary" : "btn-ghost"}
                    onClick={() => onEnvChange("PROD")}
                >
                    PROD ortamı
                </button>
            </div>

            <label>
                <div className="text-muted" style={{ marginBottom: "0.3rem" }}>
                    Kullanıcı kodu
                </div>
                <input
                    className="field"
                    value={userName}
                    onChange={(event) => onUserNameChange(event.target.value)}
                    placeholder="Örn. VKN/TCKN kullanıcı kodu"
                />
            </label>

            <label>
                <div className="text-muted" style={{ marginBottom: "0.3rem" }}>
                    Parola
                </div>
                <input
                    className="field"
                    type="password"
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    placeholder="GİB portal parolası"
                />
            </label>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button className="btn-primary" type="button" onClick={onLogin} disabled={loading}>
                    Giriş yap
                </button>
                <button className="btn-ghost" type="button" onClick={onLogout} disabled={loading || !token}>
                    Çıkış yap
                </button>
            </div>

            <div
                style={{
                    border: "1px solid var(--line)",
                    borderRadius: "12px",
                    padding: "0.65rem 0.8rem",
                    background: token ? "rgba(16,60,30,0.6)" : "rgba(16,20,18,0.85)",
                }}
            >
                {token ? (
                    <div style={{ display: "grid", gap: "0.4rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "1.2rem" }}>✅</span>
                            <span style={{ fontWeight: 700, color: "#4ade80", fontSize: "1rem" }}>
                                Bağlı
                            </span>
                            <span
                                style={{
                                    fontSize: "0.72rem",
                                    background: env === "PROD" ? "rgba(248,113,113,0.2)" : "rgba(56,189,248,0.2)",
                                    color: env === "PROD" ? "#f87171" : "#38bdf8",
                                    padding: "2px 8px",
                                    borderRadius: 6,
                                    fontWeight: 600,
                                }}
                            >
                                {env}
                            </span>
                        </div>
                        {userData ? (
                            <div style={{ display: "grid", gap: "0.25rem", fontSize: "0.88rem" }}>
                                {userData.title && (
                                    <div>
                                        <span className="text-muted">Firma: </span>
                                        <strong style={{ color: "#e2e8f0" }}>{userData.title}</strong>
                                    </div>
                                )}
                                {(userData.name || userData.surname) && (
                                    <div>
                                        <span className="text-muted">Ad Soyad: </span>
                                        <span style={{ color: "#e2e8f0" }}>{[userData.name, userData.surname].filter(Boolean).join(" ")}</span>
                                    </div>
                                )}
                                {userData.taxIDOrTRID && (
                                    <div>
                                        <span className="text-muted">VKN/TCKN: </span>
                                        <span style={{ fontFamily: "var(--font-mono)", color: "#e2e8f0" }}>{userData.taxIDOrTRID}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-muted" style={{ fontSize: "0.82rem", margin: 0 }}>
                                Profil bilgileri yükleniyor…
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        <p className="text-muted">Oturum Durumu</p>
                        <p style={{ marginTop: "0.3rem", fontSize: "0.88rem", color: "#94a3b8" }}>
                            Henüz giriş yapılmadı
                        </p>
                    </>
                )}
            </div>
        </section>
    );
}
