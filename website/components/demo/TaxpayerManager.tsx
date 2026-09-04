"use client";

import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import type { EnvironmentKey } from "fatura";

export interface TaxpayerItem {
    id: number;
    title: string;
    taxID: string;
    userName: string;
    password: string;
    env: EnvironmentKey;
}

interface TaxpayerManagerProps {
    onSelectTaxpayer: (taxpayer: TaxpayerItem) => void;
    activeUserName?: string;
    loading?: boolean;
}

const STORAGE_KEY = "fatura_saved_taxpayers_v1";

export function TaxpayerManager({ onSelectTaxpayer, activeUserName, loading }: TaxpayerManagerProps) {
    const [taxpayers, setTaxpayers] = useState<TaxpayerItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [parseError, setParseError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // LocalStorage'dan kayıtlı mükellefleri yükle
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setTaxpayers(parsed);
                }
            }
        } catch {
            // ignore
        }
    }, []);

    // Mükellef listesini kaydet
    const saveTaxpayers = (list: TaxpayerItem[]) => {
        setTaxpayers(list);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch {
            // ignore
        }
    };

    const handleFileUpload = async (file: File) => {
        setParseError(null);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const raw: unknown[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });

            if (raw.length < 2) {
                setParseError("Yüklenen Excel dosyasında mükellef verisi bulunamadı.");
                return;
            }

            // Başlık satırını atla
            const list: TaxpayerItem[] = raw
                .slice(1)
                .filter((r) => r.some((cell) => String(cell).trim() !== ""))
                .map((r, i) => {
                    const title = String(r[0] ?? "").trim();
                    const taxID = String(r[1] ?? "").trim();
                    const userName = String(r[2] ?? "").trim();
                    const password = String(r[3] ?? "").trim();
                    const envRaw = String(r[4] ?? "PROD").trim().toUpperCase();
                    const env: EnvironmentKey = envRaw === "TEST" ? "TEST" : "PROD";

                    return {
                        id: i + 1,
                        title: title || `Mükellef #${i + 1}`,
                        taxID,
                        userName,
                        password,
                        env,
                    };
                })
                .filter((t) => t.userName && t.password);

            if (list.length === 0) {
                setParseError("Dosyada geçerli kullanıcı adı ve şifre içeren mükellef bulunamadı.");
                return;
            }

            saveTaxpayers(list);
        } catch (err) {
            setParseError(err instanceof Error ? err.message : "Excel dosyası işlenirken hata oluştu.");
        }
    };

    const handleClear = () => {
        if (confirm("Kayıtlı mükellef listesini silmek istediğinize emin misiniz?")) {
            saveTaxpayers([]);
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    const filtered = taxpayers.filter((t) => {
        const query = searchQuery.toLowerCase();
        return (
            t.title.toLowerCase().includes(query) ||
            t.taxID.toLowerCase().includes(query) ||
            t.userName.toLowerCase().includes(query)
        );
    });

    return (
        <section className="section-block" style={{ display: "grid", gap: "1.2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.8rem" }}>
                <div>
                    <h2 className="section-title" style={{ fontSize: "1.35rem", margin: 0 }}>
                        🏢 Mali Müşavir Mükellef Listesi
                    </h2>
                    <p className="text-muted" style={{ margin: "0.3rem 0 0 0", fontSize: "0.88rem" }}>
                        Mükelleflerinizin VEDOP / GİB giriş bilgilerini Excel ile yükleyin, tek tıkla aralarında geçiş yapın.
                    </p>
                </div>

                <div style={{ display: "flex", gap: "0.6rem" }}>
                    <a
                        href="/mukellef-sablonu.xlsx"
                        download="mukellef-sablonu.xlsx"
                        className="btn-ghost"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", textDecoration: "none" }}
                    >
                        ⬇ Excel Şablonunu İndir
                    </a>
                    {taxpayers.length > 0 && (
                        <button type="button" onClick={handleClear} className="btn-ghost" style={{ color: "#f87171" }}>
                            Listeyi Temizle
                        </button>
                    )}
                </div>
            </div>

            {/* Dosya Yükleme Alanı */}
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) void handleFileUpload(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                    border: `2px dashed ${isDragOver ? "var(--accent)" : "var(--line)"}`,
                    borderRadius: "14px",
                    padding: "1.5rem",
                    textAlign: "center",
                    cursor: "pointer",
                    background: isDragOver ? "rgba(56, 189, 248, 0.08)" : "var(--bg-soft)",
                    transition: "all 0.2s",
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: "none" }}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFileUpload(file);
                    }}
                />
                <div style={{ fontSize: "2rem", marginBottom: "0.4rem" }}>📊</div>
                <div style={{ fontWeight: 600, color: "var(--text-heading)" }}>
                    Mükellef Listesi Excel Dosyasını Buraya Sürükleyin veya Seçin
                </div>
                <div className="text-muted" style={{ fontSize: "0.82rem", marginTop: "0.3rem" }}>
                    .xlsx veya .xls formatı (Mükellef Adı, VKN, Kullanıcı Kodu, Parola)
                </div>
            </div>

            {parseError && (
                <div
                    style={{
                        padding: "0.75rem 1rem",
                        borderRadius: "10px",
                        background: "var(--danger-bg)",
                        border: "1px solid var(--danger-border)",
                        color: "var(--danger)",
                        fontSize: "0.88rem",
                    }}
                >
                    ⚠️ {parseError}
                </div>
            )}

            {/* Mükellef Listesi & Arama */}
            {taxpayers.length > 0 && (
                <div style={{ display: "grid", gap: "0.9rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                        <input
                            className="field"
                            placeholder="🔍 Mükellef adı, VKN veya kullanıcı kodu ile ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ maxWidth: "420px" }}
                        />
                        <span className="text-muted" style={{ fontSize: "0.88rem" }}>
                            Toplam <strong>{taxpayers.length}</strong> mükellef kayıtlı ({filtered.length} gösteriliyor)
                        </span>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "650px" }}>
                            <thead>
                                <tr style={{ textAlign: "left", color: "var(--muted)", borderBottom: "1px solid var(--line)" }}>
                                    <th style={{ padding: "0.7rem 0.6rem" }}>Mükellef Ünvanı / Adı</th>
                                    <th style={{ padding: "0.7rem 0.6rem" }}>VKN / TCKN</th>
                                    <th style={{ padding: "0.7rem 0.6rem" }}>Kullanıcı Kodu</th>
                                    <th style={{ padding: "0.7rem 0.6rem" }}>Ortam</th>
                                    <th style={{ padding: "0.7rem 0.6rem", textAlign: "right" }}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((t) => {
                                    const isActive = activeUserName === t.userName;
                                    return (
                                        <tr
                                            key={t.id}
                                            style={{
                                                borderBottom: "1px solid var(--table-border)",
                                                background: isActive ? "rgba(56, 189, 248, 0.08)" : "transparent",
                                            }}
                                        >
                                            <td style={{ padding: "0.75rem 0.6rem", fontWeight: 600, color: "var(--text-heading)" }}>
                                                {t.title}
                                            </td>
                                            <td style={{ padding: "0.75rem 0.6rem", fontFamily: "var(--font-mono)", fontSize: "0.88rem", color: "var(--muted)" }}>
                                                {t.taxID || "-"}
                                            </td>
                                            <td style={{ padding: "0.75rem 0.6rem", fontFamily: "var(--font-mono)", fontSize: "0.88rem", color: "var(--accent)" }}>
                                                {t.userName}
                                            </td>
                                            <td style={{ padding: "0.75rem 0.6rem" }}>
                                                <span
                                                    style={{
                                                        fontSize: "0.75rem",
                                                        padding: "2px 8px",
                                                        borderRadius: "6px",
                                                        fontWeight: 600,
                                                        background: t.env === "PROD" ? "rgba(248, 113, 113, 0.15)" : "rgba(56, 189, 248, 0.15)",
                                                        color: t.env === "PROD" ? "var(--danger)" : "var(--accent)",
                                                    }}
                                                >
                                                    {t.env}
                                                </span>
                                            </td>
                                            <td style={{ padding: "0.75rem 0.6rem", textAlign: "right" }}>
                                                <button
                                                    type="button"
                                                    disabled={loading}
                                                    onClick={() => onSelectTaxpayer(t)}
                                                    className={isActive ? "btn-ghost" : "btn-primary"}
                                                    style={{
                                                        padding: "0.35rem 0.9rem",
                                                        fontSize: "0.82rem",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {isActive ? "✓ Aktif Giriş" : "⚡ Giriş Yap"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
}
