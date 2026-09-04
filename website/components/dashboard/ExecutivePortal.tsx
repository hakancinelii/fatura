"use client";

import { useState, useMemo, useEffect } from "react";
import type { EnvironmentKey, InvoiceDetails, InvoiceListItem, UserData } from "fatura";
import { createBrowserFaturaClient } from "@/lib/fatura-browser";
import { formatDateTR } from "@/lib/utils";
import { TaxpayerManager, type TaxpayerItem } from "@/components/demo/TaxpayerManager";
import { BulkInvoice } from "@/components/demo/BulkInvoice";
import { InvoiceForm } from "@/components/demo/InvoiceForm";
import { InvoiceList } from "@/components/demo/InvoiceList";
import { InvoiceActions } from "@/components/demo/InvoiceActions";
import { UserProfile } from "@/components/demo/UserProfile";
import { LoginPanel } from "@/components/demo/LoginPanel";

const tabs = [
    { id: "taxpayers", label: "🏢 Mükelleflerim", icon: "🏢" },
    { id: "bulk", label: "📎 Toplu Fatura", icon: "📎" },
    { id: "create", label: "✍️ Hızlı Fatura Kes", icon: "✍️" },
    { id: "outgoing", label: "📑 Kesilen Faturalar", icon: "📑" },
    { id: "incoming", label: "📥 Gelen Faturalar", icon: "📥" },
    { id: "actions", label: "⚙️ GİB İşlemleri & SMS", icon: "⚙️" },
    { id: "profile", label: "👤 Mükellef Profili", icon: "👤" },
    { id: "login", label: "🔐 Manuel Giriş", icon: "🔐" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const STORAGE_KEY = "fatura_saved_taxpayers_v1";

function toPreview(value: unknown): string {
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
}

export function ExecutivePortal() {
    const [activeTab, setActiveTab] = useState<TabId>("taxpayers");
    const [env, setEnv] = useState<EnvironmentKey>("PROD");
    const [userName, setUserName] = useState("");
    const [password, setPassword] = useState("");
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string>("");
    const [activity, setActivity] = useState<string[]>([]);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [savedTaxpayers, setSavedTaxpayers] = useState<TaxpayerItem[]>([]);
    const [selectedTaxpayerTitle, setSelectedTaxpayerTitle] = useState<string>("");

    const today = formatDateTR();
    const [outgoingRange, setOutgoingRange] = useState({ startDate: today, endDate: today });
    const [incomingRange, setIncomingRange] = useState({ startDate: today, endDate: today });
    const [outgoingInvoices, setOutgoingInvoices] = useState<InvoiceListItem[]>([]);
    const [incomingInvoices, setIncomingInvoices] = useState<InvoiceListItem[]>([]);

    const client = useMemo(() => createBrowserFaturaClient(env), [env]);

    // Kayıtlı mükellefleri oku
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setSavedTaxpayers(parsed);
                }
            }
        } catch {
            // ignore
        }
    }, []);

    const appendActivity = (message: string) => {
        const timestamp = new Date().toLocaleTimeString("tr-TR", { hour12: false });
        setActivity((prev) => [timestamp + " | " + message, ...prev].slice(0, 20));
    };

    const runAction = async (label: string, action: () => Promise<unknown>) => {
        setLoading(true);
        setError(null);
        try {
            const result = await action();
            if (typeof result !== "undefined") {
                setPreview(toPreview(result));
            }
            appendActivity(label + " başarılı.");
        } catch (cause) {
            const message = cause instanceof Error ? cause.message : "Bilinmeyen hata";
            setError(message);
            appendActivity(label + " hatası: " + message);
        } finally {
            setLoading(false);
        }
    };

    const requireToken = (): string => {
        if (token === null) {
            throw new Error("Bu işlem için önce bir mükellefe giriş yapmalısınız.");
        }
        return token;
    };

    const handleLogin = async () => {
        await runAction("Giriş", async () => {
            const nextToken = await client.getToken(userName, password);
            setToken(nextToken);
            try {
                const profile = await client.getUserData(nextToken);
                setUserData(profile);
                setSelectedTaxpayerTitle(profile.title || [profile.name, profile.surname].filter(Boolean).join(" "));
            } catch {
                // ignore
            }
            return { token: nextToken.slice(0, 16) + "...", env };
        });
    };

    const handleSelectTaxpayer = async (taxpayer: TaxpayerItem) => {
        setUserName(taxpayer.userName);
        setPassword(taxpayer.password);
        setEnv(taxpayer.env);
        setSelectedTaxpayerTitle(taxpayer.title);
        const targetClient = createBrowserFaturaClient(taxpayer.env);

        await runAction(`Giriş (${taxpayer.title})`, async () => {
            const nextToken = await targetClient.getToken(taxpayer.userName, taxpayer.password);
            setToken(nextToken);

            try {
                const profile = await targetClient.getUserData(nextToken);
                setUserData(profile);
            } catch {
                // ignore
            }

            return {
                mükellef: taxpayer.title,
                vkn: taxpayer.taxID,
                token: nextToken.slice(0, 16) + "...",
                env: taxpayer.env,
            };
        });
    };

    const handleLogout = async () => {
        await runAction("Çıkış", async () => {
            if (token) {
                try {
                    await client.logout(token);
                } catch {
                    // ignore
                }
            }
            setToken(null);
            setUserData(null);
            setSelectedTaxpayerTitle("");
            return { status: "Çıkış yapıldı" };
        });
    };

    const handleFetchUser = async () => {
        await runAction("Profil bilgilerini getir", async () => {
            const activeToken = requireToken();
            const profile = await client.getUserData(activeToken);
            setUserData(profile);
            return profile;
        });
    };

    const handleUpdateUser = async () => {
        await runAction("Profil güncelle", async () => {
            const activeToken = requireToken();
            if (userData === null) {
                throw new Error("Güncelleme için önce profili getirmeniz gerekir.");
            }
            const result = await client.updateUserData(activeToken, userData);
            return result;
        });
    };

    const handleBulkCreate = async (
        invoices: InvoiceDetails[],
        sign: boolean,
        strategy: "sequential" | "two-phase" = "sequential",
    ): Promise<Array<{ uuid: string; error?: string }>> => {
        const results: Array<{ uuid: string; error?: string }> = [];
        const activeToken = requireToken();

        if (!sign || strategy === "sequential") {
            for (const invoiceDetails of invoices) {
                try {
                    const draft = await client.createDraftInvoice(activeToken, invoiceDetails);
                    if (sign) {
                        const found = await client.findInvoice(activeToken, draft);
                        if (found !== undefined) {
                            await client.signDraftInvoice(activeToken, found);
                        }
                    }
                    results.push({ uuid: draft.uuid });
                    appendActivity(`Fatura oluşturuldu: ${draft.uuid.slice(0, 8)}…`);
                } catch (cause) {
                    const message = cause instanceof Error ? cause.message : "Bilinmeyen hata";
                    results.push({ uuid: "", error: message });
                    appendActivity(`Fatura hatası: ${message}`);
                }
            }
        } else {
            const drafts: Array<{ uuid: string; date: string } | null> = [];
            for (const invoiceDetails of invoices) {
                try {
                    const draft = await client.createDraftInvoice(activeToken, invoiceDetails);
                    drafts.push(draft);
                    appendActivity(`Taslak oluşturuldu: ${draft.uuid.slice(0, 8)}…`);
                } catch (cause) {
                    const message = cause instanceof Error ? cause.message : "Bilinmeyen hata";
                    drafts.push(null);
                    appendActivity(`Taslak hatası: ${message}`);
                }
            }

            for (const draft of drafts) {
                if (!draft) {
                    results.push({ uuid: "", error: "Taslak oluşturulamadı" });
                    continue;
                }
                try {
                    const found = await client.findInvoice(activeToken, draft);
                    if (found !== undefined) {
                        await client.signDraftInvoice(activeToken, found);
                    }
                    results.push({ uuid: draft.uuid });
                    appendActivity(`İmzalandı: ${draft.uuid.slice(0, 8)}…`);
                } catch (cause) {
                    const message = cause instanceof Error ? cause.message : "Bilinmeyen hata";
                    results.push({ uuid: draft.uuid, error: message });
                    appendActivity(`İmzalama hatası: ${message}`);
                }
            }
        }
        return results;
    };

    const handleCreateInvoice = async (invoiceDetails: InvoiceDetails, sign: boolean) => {
        await runAction("Taslak oluştur", async () => {
            const activeToken = requireToken();
            const draft = await client.createDraftInvoice(activeToken, invoiceDetails);

            let signed = false;
            if (sign) {
                const found = await client.findInvoice(activeToken, draft);
                if (typeof found === "undefined") {
                    throw new Error("Taslak bulundu ancak imza adımında tekrar bulunamadı.");
                }
                await client.signDraftInvoice(activeToken, found);
                signed = true;
            }

            const downloadURL = client.getDownloadURL(activeToken, draft.uuid, { signed });
            return { draft, signed, downloadURL };
        });
    };

    const handleLoadOutgoing = async () => {
        await runAction("Kesilen faturalar", async () => {
            const activeToken = requireToken();
            const invoices = await client.getAllInvoicesByDateRange(activeToken, outgoingRange);
            setOutgoingInvoices(invoices);
            return invoices;
        });
    };

    const handleLoadIncoming = async () => {
        await runAction("Gelen faturalar", async () => {
            const activeToken = requireToken();
            try {
                const invoices = await client.getAllInvoicesIssuedToMeByDateRange(activeToken, incomingRange);
                setIncomingInvoices(invoices);
                return invoices;
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                if (msg.includes("NullPointerException")) {
                    setIncomingInvoices([]);
                    throw new Error(
                        "GİB portalında bu tarih aralığında adınıza düzenlenmiş e-Arşiv fatura bulunamadı ya da girilen tarih geçersiz.",
                    );
                }
                throw err;
            }
        });
    };

    const handleFindInvoice = async (uuid: string, date: string) => {
        await runAction("Taslak bul", async () => {
            const activeToken = requireToken();
            const result = await client.findInvoice(activeToken, { uuid, date });
            if (typeof result === "undefined") {
                throw new Error("Belirtilen tarih ve UUID ile taslak bulunamadı.");
            }
            return result;
        });
    };

    const handleSignInvoice = async (uuid: string, date: string) => {
        await runAction("Taslak imzala", async () => {
            const activeToken = requireToken();
            const found = await client.findInvoice(activeToken, { uuid, date });
            if (typeof found === "undefined") {
                throw new Error("İmzalama için taslak bulunamadı.");
            }
            return client.signDraftInvoice(activeToken, found);
        });
    };

    const handleCancelInvoice = async (uuid: string, date: string, reason: string) => {
        await runAction("Taslak iptal et", async () => {
            const activeToken = requireToken();
            const found = await client.findInvoice(activeToken, { uuid, date });
            if (typeof found === "undefined") {
                throw new Error("İptal için taslak bulunamadı.");
            }
            return client.cancelDraftInvoice(activeToken, reason, found);
        });
    };

    const handleGetHTML = async (uuid: string, signed: boolean) => {
        await runAction("HTML getir", async () => {
            const activeToken = requireToken();
            return client.getInvoiceHTML(activeToken, uuid, { signed });
        });
    };

    const handleGetDownloadURL = async (uuid: string, signed: boolean) => {
        await runAction("İndirme bağlantısı", async () => {
            const activeToken = requireToken();
            return client.getDownloadURL(activeToken, uuid, { signed });
        });
    };

    const handleLookupRecipient = async (taxID: string) => {
        await runAction("Alıcı sorgula", async () => {
            const activeToken = requireToken();
            return client.getRecipientDataByTaxIDOrTRID(activeToken, taxID);
        });
    };

    const handleSendSMS = async (phone: string) => {
        await runAction("SMS gönder", async () => {
            const activeToken = requireToken();
            return client.sendSignSMSCode(activeToken, phone);
        });
    };

    const handleVerifySMS = async (smsCode: string, operationId: string) => {
        await runAction("SMS onayla", async () => {
            const activeToken = requireToken();
            return client.verifySignSMSCode(activeToken, smsCode, operationId);
        });
    };

    return (
        <div style={{ display: "grid", gap: "1.2rem" }}>
            {/* Üst Yönetici Bilgi Kartı (Executive Header & Active Taxpayer Bar) */}
            <section
                style={{
                    background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.9) 100%)",
                    border: "1px solid rgba(56, 189, 248, 0.25)",
                    borderRadius: "18px",
                    padding: "1.4rem 1.6rem",
                    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.45)",
                    display: "grid",
                    gap: "1rem",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.2rem" }}>
                            <span style={{ fontSize: "1.3rem" }}>🏛️</span>
                            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", color: "#f8fafc" }}>
                                Çineli SMMM
                            </h1>
                            <span
                                style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    padding: "3px 10px",
                                    borderRadius: "8px",
                                    background: "rgba(56, 189, 248, 0.15)",
                                    color: "#38bdf8",
                                    border: "1px solid rgba(56, 189, 248, 0.3)",
                                }}
                            >
                                Mali Müşavirlik Fatura Portalı
                            </span>
                        </div>
                        <p className="text-muted" style={{ margin: 0, fontSize: "0.88rem" }}>
                            Tüm mükelleflerinizin e-Arşiv faturalarını tek merkezden yönetin, Excel ile toplu fatura kesin.
                        </p>
                    </div>

                    {/* Hızlı Mükellef Seçici Dropdown */}
                    {savedTaxpayers.length > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <span className="text-muted" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                                ⚡ Hızlı Mükellef Seç:
                            </span>
                            <select
                                className="field"
                                value={userName}
                                onChange={(e) => {
                                    const selected = savedTaxpayers.find((t) => t.userName === e.target.value);
                                    if (selected) void handleSelectTaxpayer(selected);
                                }}
                                style={{
                                    maxWidth: "260px",
                                    padding: "0.45rem 0.8rem",
                                    fontSize: "0.85rem",
                                    fontWeight: 600,
                                    borderColor: token ? "#38bdf8" : undefined,
                                }}
                            >
                                <option value="">-- Mükellef Seçiniz --</option>
                                {savedTaxpayers.map((t) => (
                                    <option key={t.id} value={t.userName}>
                                        {t.title} ({t.userName})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Aktif Oturum Durum Çubuğu */}
                <div
                    style={{
                        padding: "0.9rem 1.2rem",
                        borderRadius: "14px",
                        background: token ? "rgba(16, 60, 30, 0.45)" : "rgba(30, 41, 59, 0.5)",
                        border: `1px solid ${token ? "rgba(74, 222, 128, 0.3)" : "rgba(148, 163, 184, 0.2)"}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "0.8rem",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                            <span
                                style={{
                                    display: "inline-block",
                                    width: 10,
                                    height: 10,
                                    borderRadius: "50%",
                                    background: token ? "#4ade80" : "#94a3b8",
                                    boxShadow: token ? "0 0 10px #4ade80" : "none",
                                }}
                            />
                            <strong style={{ color: token ? "#4ade80" : "#94a3b8", fontSize: "0.92rem" }}>
                                {token ? "GİB Bağlantısı Aktif" : "Oturum Açılmadı"}
                            </strong>
                        </div>

                        {token && (
                            <span
                                style={{
                                    fontSize: "0.72rem",
                                    background: env === "PROD" ? "rgba(248,113,113,0.2)" : "rgba(56,189,248,0.2)",
                                    color: env === "PROD" ? "#f87171" : "#38bdf8",
                                    padding: "2px 8px",
                                    borderRadius: 6,
                                    fontWeight: 700,
                                }}
                            >
                                {env}
                            </span>
                        )}

                        {userData ? (
                            <div style={{ display: "flex", gap: "0.8rem", alignItems: "center", flexWrap: "wrap", fontSize: "0.88rem" }}>
                                <span style={{ color: "#f8fafc", fontWeight: 700 }}>
                                    {userData.title || selectedTaxpayerTitle || [userData.name, userData.surname].filter(Boolean).join(" ")}
                                </span>
                                {userData.taxIDOrTRID && (
                                    <span style={{ fontFamily: "var(--font-mono)", color: "#94a3b8" }}>
                                        VKN/TCKN: <strong style={{ color: "#38bdf8" }}>{userData.taxIDOrTRID}</strong>
                                    </span>
                                )}
                                {userData.taxOffice && (
                                    <span className="text-muted" style={{ fontSize: "0.82rem" }}>
                                        ({userData.taxOffice})
                                    </span>
                                )}
                            </div>
                        ) : selectedTaxpayerTitle ? (
                            <span style={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.88rem" }}>
                                {selectedTaxpayerTitle}
                            </span>
                        ) : null}
                    </div>

                    {token && (
                        <button
                            type="button"
                            onClick={handleLogout}
                            disabled={loading}
                            className="btn-ghost"
                            style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem", color: "#f87171" }}
                        >
                            Çıkış Yap
                        </button>
                    )}
                </div>
            </section>

            {/* Navigasyon Sekmeleri */}
            <section
                style={{
                    background: "rgba(15, 23, 42, 0.7)",
                    borderRadius: "14px",
                    border: "1px solid rgba(148, 163, 184, 0.15)",
                    padding: "0.5rem",
                }}
            >
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    {tabs.map((tab) => {
                        const active = tab.id === activeTab;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                className={active ? "btn-primary" : "btn-ghost"}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: "0.55rem 1rem",
                                    fontSize: "0.88rem",
                                    fontWeight: active ? 700 : 500,
                                    borderRadius: "10px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.4rem",
                                    transition: "all 0.15s ease",
                                }}
                            >
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Hata Bildirimi */}
            {error !== null && (
                <section
                    className="section-block"
                    style={{ borderColor: "rgba(239,68,68,0.5)", color: "#fecaca", background: "rgba(46,11,11,0.78)" }}
                >
                    ⚠️ {error}
                </section>
            )}

            {/* Sekme İçerikleri */}
            {activeTab === "taxpayers" && (
                <TaxpayerManager
                    onSelectTaxpayer={handleSelectTaxpayer}
                    activeUserName={userName}
                    loading={loading}
                />
            )}

            {activeTab === "bulk" && (
                <BulkInvoice
                    disabled={token === null}
                    loading={loading}
                    onBulkCreate={handleBulkCreate}
                />
            )}

            {activeTab === "create" && (
                <InvoiceForm loading={loading} disabled={token === null} onCreate={handleCreateInvoice} />
            )}

            {activeTab === "outgoing" && (
                <InvoiceList
                    title="Kesilen Faturalar"
                    invoices={outgoingInvoices}
                    range={outgoingRange}
                    loading={loading}
                    disabled={token === null}
                    emptyMessage="Seçilen tarih aralığında kesilmiş fatura kaydı bulunamadı."
                    onRangeChange={setOutgoingRange}
                    onLoad={handleLoadOutgoing}
                />
            )}

            {activeTab === "incoming" && (
                <InvoiceList
                    title="Adınıza Düzenlenen Belgeler (Gelen Faturalar)"
                    invoices={incomingInvoices}
                    range={incomingRange}
                    loading={loading}
                    disabled={token === null}
                    emptyMessage="Seçilen tarih aralığında gelen fatura bulunamadı."
                    onRangeChange={setIncomingRange}
                    onLoad={handleLoadIncoming}
                />
            )}

            {activeTab === "actions" && (
                <InvoiceActions
                    token={token}
                    loading={loading}
                    onFind={handleFindInvoice}
                    onSign={handleSignInvoice}
                    onCancel={handleCancelInvoice}
                    onGetHTML={handleGetHTML}
                    onGetDownloadURL={handleGetDownloadURL}
                    onLookupRecipient={handleLookupRecipient}
                    onSendSMS={handleSendSMS}
                    onVerifySMS={handleVerifySMS}
                />
            )}

            {activeTab === "profile" && (
                <UserProfile
                    token={token}
                    loading={loading}
                    userData={userData}
                    onFetch={handleFetchUser}
                    onSave={handleUpdateUser}
                    onChange={setUserData}
                />
            )}

            {activeTab === "login" && (
                <LoginPanel
                    env={env}
                    userName={userName}
                    password={password}
                    token={token}
                    loading={loading}
                    userData={userData}
                    onEnvChange={setEnv}
                    onUserNameChange={setUserName}
                    onPasswordChange={setPassword}
                    onLogin={handleLogin}
                    onLogout={handleLogout}
                />
            )}

            {/* Alt Çıktı & İşlem Günlüğü (Collapsible Console) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
                <section className="section-block" style={{ display: "grid", gap: "0.65rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>📊 Çıktı / Yanıt</h3>
                        {preview && (
                            <button
                                type="button"
                                onClick={() => setPreview("")}
                                className="btn-ghost"
                                style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                            >
                                Temizle
                            </button>
                        )}
                    </div>
                    <pre
                        style={{
                            margin: 0,
                            border: "1px solid var(--line)",
                            borderRadius: "12px",
                            padding: "0.8rem",
                            overflowX: "auto",
                            maxHeight: "240px",
                            background: "rgba(9, 13, 11, 0.85)",
                            color: "#bae6fd",
                            fontSize: "0.81rem",
                            fontFamily: "var(--font-mono)",
                        }}
                    >
                        {preview || "Henüz bir yanıt yok."}
                    </pre>
                </section>

                <section className="section-block" style={{ display: "grid", gap: "0.6rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>📝 İşlem Günlüğü</h3>
                        {activity.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setActivity([])}
                                className="btn-ghost"
                                style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                            >
                                Temizle
                            </button>
                        )}
                    </div>
                    <ul
                        style={{
                            margin: 0,
                            paddingLeft: "1.2rem",
                            display: "grid",
                            gap: "0.35rem",
                            maxHeight: "240px",
                            overflowY: "auto",
                        }}
                    >
                        {activity.map((item, index) => (
                            <li
                                key={item + String(index)}
                                className="text-muted"
                                style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}
                            >
                                {item}
                            </li>
                        ))}
                        {activity.length === 0 ? <li className="text-muted">Henüz işlem yapılmadı.</li> : null}
                    </ul>
                </section>
            </div>
        </div>
    );
}
