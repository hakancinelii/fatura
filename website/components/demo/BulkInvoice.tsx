"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { formatDateTR, formatTimeTR } from "@/lib/utils";
import type { InvoiceDetails } from "fatura";

// ─── Types ────────────────────────────────────────────────────────────────────

type RowStatus = "idle" | "processing" | "success" | "error";

interface BulkRow {
    id: number;
    taxIDOrTRID: string;
    title: string;
    date: string;
    time: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    status: RowStatus;
    error?: string;
    uuid?: string;
}

interface BulkInvoiceProps {
    disabled: boolean;
    loading: boolean;
    onBulkCreate: (
        rows: InvoiceDetails[],
        sign: boolean,
        strategy: "sequential" | "two-phase",
    ) => Promise<Array<{ uuid: string; error?: string }>>;
}

// ─── Excel / CSV Parser ───────────────────────────────────────────────────────

function normalizeExcelDate(val: unknown): string {
    if (val === null || val === undefined || val === "") {
        return formatDateTR();
    }
    if (typeof val === "number") {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return formatDateTR(date);
    }
    const str = String(val).trim();
    const parts = str.split(/[./-]/);
    if (parts.length === 3) {
        if (parts[0].length === 4) {
            return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
        }
        return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2]}`;
    }
    return str || formatDateTR();
}

function normalizeExcelTime(val: unknown): string {
    if (val === null || val === undefined || val === "") {
        return formatTimeTR();
    }
    if (typeof val === "number" && val >= 0 && val < 1) {
        const totalSeconds = Math.round(val * 86400);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    const str = String(val).trim();
    if (/^\d{1,2}:\d{2}$/.test(str)) {
        return `${str}:00`;
    }
    const num = Number(str);
    if (!isNaN(num) && num >= 0 && num < 1 && str.includes(".")) {
        const totalSeconds = Math.round(num * 86400);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return str || formatTimeTR();
}

function parseWorkbook(file: File): Promise<BulkRow[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

                // Skip header row (row 0)
                const rows: BulkRow[] = raw
                    .slice(1)
                    .filter((r) => r.some((cell) => String(cell).trim() !== ""))
                    .map((r, i) => {
                        const qty = Number(r[5]) || 1;
                        const price = Number(r[6]) || 0;
                        const vat = Number(r[7]) || 20;
                        return {
                            id: i,
                            taxIDOrTRID: String(r[0] ?? "").trim(),
                            title: String(r[1] ?? "").trim(),
                            date: normalizeExcelDate(r[2]),
                            time: normalizeExcelTime(r[3]),
                            itemName: String(r[4] ?? "Hizmet").trim(),
                            quantity: qty,
                            unitPrice: price,
                            vatRate: vat,
                            status: "idle" as RowStatus,
                        };
                    });
                resolve(rows);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error("Dosya okunamadı."));
        reader.readAsArrayBuffer(file);
    });
}

// ─── Row helpers ──────────────────────────────────────────────────────────────

function rowToInvoiceDetails(row: BulkRow): InvoiceDetails {
    const price = row.quantity * row.unitPrice;
    const vatAmount = (price * row.vatRate) / 100;
    return {
        date: row.date,
        time: row.time,
        taxIDOrTRID: row.taxIDOrTRID,
        title: row.title,
        items: [
            {
                name: row.itemName,
                quantity: row.quantity,
                unitPrice: row.unitPrice,
                price,
                VATRate: row.vatRate,
                VATAmount: vatAmount,
            },
        ],
        grandTotal: price,
        totalVAT: vatAmount,
        grandTotalInclVAT: price + vatAmount,
        paymentTotal: price + vatAmount,
    };
}

function statusBadge(status: RowStatus) {
    const map: Record<RowStatus, { label: string; color: string; bg: string }> = {
        idle: { label: "Bekliyor", color: "#94a3b8", bg: "rgba(100,116,139,0.15)" },
        processing: { label: "⏳ İşleniyor", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
        success: { label: "✅ Başarılı", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
        error: { label: "❌ Hata", color: "#f87171", bg: "rgba(248,113,113,0.12)" },
    };
    const s = map[status];
    return (
        <span
            style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 6,
                color: s.color,
                background: s.bg,
                whiteSpace: "nowrap",
            }}
        >
            {s.label}
        </span>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BulkInvoice({ disabled, loading, onBulkCreate }: BulkInvoiceProps) {
    const [rows, setRows] = useState<BulkRow[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [signAfterCreate, setSignAfterCreate] = useState(false);
    const [signingStrategy, setSigningStrategy] = useState<"sequential" | "two-phase">("sequential");
    const [done, setDone] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const total = rows.length;
    const successCount = rows.filter((r) => r.status === "success").length;
    const errorCount = rows.filter((r) => r.status === "error").length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    // ── File handling ──────────────────────────────────────────────────────────

    async function handleFile(file: File) {
        setParseError(null);
        setDone(0);
        try {
            const parsed = await parseWorkbook(file);
            if (parsed.length === 0) {
                setParseError("Dosyada veri satırı bulunamadı. Başlık satırının altına veri ekleyin.");
                return;
            }
            setRows(parsed);
        } catch {
            setParseError("Dosya okunamadı. Lütfen geçerli bir .xlsx veya .csv dosyası seçin.");
        }
    }

    function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) void handleFile(file);
        e.target.value = "";
    }

    function onDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void handleFile(file);
    }

    // ── Bulk create ───────────────────────────────────────────────────────────

    async function handleBulkCreate() {
        if (disabled || running || rows.length === 0) return;
        setRunning(true);
        setDone(0);

        // Reset statuses
        setRows((prev) => prev.map((r) => ({ ...r, status: "idle", error: undefined, uuid: undefined })));

        const invoices = rows.map(rowToInvoiceDetails);

        try {
            const results = await onBulkCreate(invoices, signAfterCreate, signingStrategy);

            setRows((prev) =>
                prev.map((r, i) => {
                    const res = results[i];
                    if (!res) return { ...r, status: "error", error: "Yanıt alınamadı" };
                    if (res.error) return { ...r, status: "error", error: res.error };
                    return { ...r, status: "success", uuid: res.uuid };
                }),
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
            setRows((prev) => prev.map((r) => (r.status === "processing" ? { ...r, status: "error", error: msg } : r)));
        } finally {
            setRunning(false);
        }
    }

    // ── Reset ─────────────────────────────────────────────────────────────────

    function handleReset() {
        setRows([]);
        setParseError(null);
        setDone(0);
    }

    // ── Inline row edit ───────────────────────────────────────────────────────

    function updateRow<K extends keyof BulkRow>(id: number, key: K, value: BulkRow[K]) {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
    }

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <section className="section-block" style={{ display: "grid", gap: "1.2rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                <h2 className="section-title" style={{ fontSize: "1.3rem", margin: 0 }}>
                    📎 Toplu Fatura Kes
                </h2>
                <a
                    href="/fatura-sablonu.xlsx"
                    download
                    style={{
                        fontSize: "0.82rem",
                        color: "#38bdf8",
                        textDecoration: "none",
                        border: "1px solid rgba(56,189,248,0.3)",
                        borderRadius: 8,
                        padding: "4px 12px",
                    }}
                >
                    ⬇ Şablon İndir (.xlsx)
                </a>
            </div>

            {/* Drag & Drop Zone */}
            {rows.length === 0 && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        border: `2px dashed ${dragOver ? "#38bdf8" : "rgba(148,163,184,0.35)"}`,
                        borderRadius: 16,
                        padding: "3rem 2rem",
                        textAlign: "center",
                        cursor: "pointer",
                        background: dragOver ? "rgba(56,189,248,0.06)" : "rgba(15,23,42,0.4)",
                        transition: "all 0.2s",
                        display: "grid",
                        gap: "0.6rem",
                    }}
                >
                    <div style={{ fontSize: "2.5rem" }}>📂</div>
                    <div style={{ fontWeight: 600, fontSize: "1rem" }}>Excel veya CSV dosyasını buraya sürükleyin</div>
                    <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                        ya da tıklayın &mdash; <strong>.xlsx</strong> ve <strong>.csv</strong> desteklenmektedir
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.78rem", marginTop: "0.4rem" }}>
                        Sütun sırası: VKN/TCKN | Ünvan | Tarih | Saat | Mal/Hizmet | Miktar | Birim Fiyat | KDV%
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.csv,.xls"
                        style={{ display: "none" }}
                        onChange={onFileChange}
                    />
                </div>
            )}

            {/* Parse error */}
            {parseError && (
                <div style={{ color: "#f87171", background: "rgba(248,113,113,0.08)", borderRadius: 10, padding: "0.7rem 1rem", fontSize: "0.88rem" }}>
                    ⚠️ {parseError}
                </div>
            )}

            {/* Rows Table */}
            {rows.length > 0 && (
                <>
                    {/* Summary bar */}
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontWeight: 600 }}>{total} satır yüklendi</span>
                        {done > 0 && (
                            <>
                                <span style={{ color: "#4ade80" }}>✅ {successCount} başarılı</span>
                                {errorCount > 0 && <span style={{ color: "#f87171" }}>❌ {errorCount} hata</span>}
                            </>
                        )}
                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={running}
                            style={{
                                marginLeft: "auto",
                                background: "transparent",
                                border: "1px solid rgba(148,163,184,0.3)",
                                color: "#94a3b8",
                                borderRadius: 8,
                                padding: "4px 12px",
                                cursor: "pointer",
                                fontSize: "0.82rem",
                            }}
                        >
                            🗑 Temizle
                        </button>
                    </div>

                    {/* Progress bar */}
                    {running && (
                        <div style={{ background: "rgba(30,41,59,0.8)", borderRadius: 999, height: 8, overflow: "hidden" }}>
                            <div
                                style={{
                                    height: "100%",
                                    width: `${progress}%`,
                                    background: "linear-gradient(90deg, #38bdf8, #818cf8)",
                                    transition: "width 0.4s ease",
                                    borderRadius: 999,
                                }}
                            />
                        </div>
                    )}

                    {/* Table */}
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--line)", color: "#94a3b8" }}>
                                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600 }}>#</th>
                                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600 }}>VKN/TCKN</th>
                                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600 }}>Ünvan</th>
                                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600 }}>Tarih</th>
                                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600 }}>Mal/Hizmet</th>
                                    <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>Miktar</th>
                                    <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>Birim Fiyat</th>
                                    <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>KDV%</th>
                                    <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>Toplam (KDV dahil)</th>
                                    <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 600 }}>Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => {
                                    const price = row.quantity * row.unitPrice;
                                    const vat = (price * row.vatRate) / 100;
                                    const total = price + vat;
                                    return (
                                        <tr
                                            key={row.id}
                                            style={{
                                                borderBottom: "1px solid rgba(148,163,184,0.1)",
                                                background:
                                                    row.status === "success"
                                                        ? "rgba(74,222,128,0.04)"
                                                        : row.status === "error"
                                                          ? "rgba(248,113,113,0.06)"
                                                          : row.status === "processing"
                                                            ? "rgba(251,191,36,0.05)"
                                                            : "transparent",
                                            }}
                                        >
                                            <td style={{ padding: "6px 8px", color: "#64748b" }}>{row.id + 1}</td>
                                            <td style={{ padding: "6px 8px" }}>
                                                <input
                                                    className="field"
                                                    value={row.taxIDOrTRID}
                                                    disabled={running}
                                                    onChange={(e) => updateRow(row.id, "taxIDOrTRID", e.target.value)}
                                                    style={{ width: 110, padding: "2px 6px", fontSize: "0.8rem" }}
                                                />
                                            </td>
                                            <td style={{ padding: "6px 8px" }}>
                                                <input
                                                    className="field"
                                                    value={row.title}
                                                    disabled={running}
                                                    onChange={(e) => updateRow(row.id, "title", e.target.value)}
                                                    style={{ width: 140, padding: "2px 6px", fontSize: "0.8rem" }}
                                                />
                                            </td>
                                            <td style={{ padding: "6px 8px" }}>
                                                <input
                                                    className="field"
                                                    value={row.date}
                                                    disabled={running}
                                                    onChange={(e) => updateRow(row.id, "date", e.target.value)}
                                                    style={{ width: 100, padding: "2px 6px", fontSize: "0.8rem" }}
                                                />
                                            </td>
                                            <td style={{ padding: "6px 8px" }}>
                                                <input
                                                    className="field"
                                                    value={row.itemName}
                                                    disabled={running}
                                                    onChange={(e) => updateRow(row.id, "itemName", e.target.value)}
                                                    style={{ width: 120, padding: "2px 6px", fontSize: "0.8rem" }}
                                                />
                                            </td>
                                            <td style={{ padding: "6px 8px", textAlign: "right" }}>
                                                <input
                                                    className="field"
                                                    type="number"
                                                    value={row.quantity}
                                                    disabled={running}
                                                    onChange={(e) => updateRow(row.id, "quantity", Number(e.target.value))}
                                                    style={{ width: 60, padding: "2px 6px", fontSize: "0.8rem", textAlign: "right" }}
                                                />
                                            </td>
                                            <td style={{ padding: "6px 8px", textAlign: "right" }}>
                                                <input
                                                    className="field"
                                                    type="number"
                                                    value={row.unitPrice}
                                                    disabled={running}
                                                    onChange={(e) => updateRow(row.id, "unitPrice", Number(e.target.value))}
                                                    style={{ width: 90, padding: "2px 6px", fontSize: "0.8rem", textAlign: "right" }}
                                                />
                                            </td>
                                            <td style={{ padding: "6px 8px", textAlign: "right" }}>
                                                <input
                                                    className="field"
                                                    type="number"
                                                    value={row.vatRate}
                                                    disabled={running}
                                                    onChange={(e) => updateRow(row.id, "vatRate", Number(e.target.value))}
                                                    style={{ width: 55, padding: "2px 6px", fontSize: "0.8rem", textAlign: "right" }}
                                                />
                                            </td>
                                            <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                                                {total.toFixed(2)} ₺
                                            </td>
                                            <td style={{ padding: "6px 8px", textAlign: "center" }}>
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                                    {statusBadge(row.status)}
                                                    {row.status === "error" && row.error && (
                                                        <span style={{ fontSize: "0.7rem", color: "#f87171", maxWidth: 140, textAlign: "center" }}>
                                                            {row.error}
                                                        </span>
                                                    )}
                                                    {row.status === "success" && row.uuid && (
                                                        <span style={{ fontSize: "0.68rem", color: "#4ade80", fontFamily: "var(--font-mono)" }}>
                                                            {row.uuid.slice(0, 8)}…
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Grand total */}
                    <div
                        style={{
                            border: "1px solid var(--line)",
                            borderRadius: 12,
                            padding: "0.65rem 1rem",
                            fontFamily: "var(--font-mono)",
                            background: "rgba(16,20,18,0.75)",
                            fontSize: "0.85rem",
                            display: "flex",
                            gap: "1.5rem",
                            flexWrap: "wrap",
                        }}
                    >
                        {(() => {
                            const grandTotal = rows.reduce((sum, r) => {
                                const p = r.quantity * r.unitPrice;
                                return sum + p + (p * r.vatRate) / 100;
                            }, 0);
                            return (
                                <>
                                    <span>📄 <strong>{rows.length}</strong> fatura</span>
                                    <span>💰 Genel Toplam: <strong>{grandTotal.toFixed(2)} ₺</strong></span>
                                </>
                            );
                        })()}
                    </div>

                    {/* Sign option + strategy + Submit */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer" }}>
                            <input
                                type="checkbox"
                                checked={signAfterCreate}
                                onChange={(e) => setSignAfterCreate(e.target.checked)}
                                disabled={running}
                            />
                            <span className="text-muted" style={{ fontSize: "0.88rem" }}>
                                Oluşturduktan sonra imzala{" "}
                                <span style={{ color: "#f87171" }}>(mali kayıt oluşturur — dikkatli kullanın)</span>
                            </span>
                        </label>

                        {/* Signing strategy — only shown when sign is enabled */}
                        {signAfterCreate && (
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "0.6rem",
                                    maxWidth: 520,
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setSigningStrategy("sequential")}
                                    disabled={running}
                                    style={{
                                        border: `2px solid ${
                                            signingStrategy === "sequential"
                                                ? "#38bdf8"
                                                : "rgba(148,163,184,0.25)"
                                        }`,
                                        borderRadius: 10,
                                        padding: "0.6rem 0.8rem",
                                        background:
                                            signingStrategy === "sequential"
                                                ? "rgba(56,189,248,0.1)"
                                                : "rgba(15,23,42,0.4)",
                                        color: signingStrategy === "sequential" ? "#38bdf8" : "#94a3b8",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        fontSize: "0.83rem",
                                        transition: "all 0.2s",
                                    }}
                                >
                                    <div style={{ fontWeight: 700, marginBottom: 3 }}>🔄 Sırayla</div>
                                    <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>
                                        Her fatura oluşturulur ve hemen imzalanır. Hata izolasyonu vardır.
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setSigningStrategy("two-phase")}
                                    disabled={running}
                                    style={{
                                        border: `2px solid ${
                                            signingStrategy === "two-phase"
                                                ? "#818cf8"
                                                : "rgba(148,163,184,0.25)"
                                        }`,
                                        borderRadius: 10,
                                        padding: "0.6rem 0.8rem",
                                        background:
                                            signingStrategy === "two-phase"
                                                ? "rgba(129,140,248,0.1)"
                                                : "rgba(15,23,42,0.4)",
                                        color: signingStrategy === "two-phase" ? "#818cf8" : "#94a3b8",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        fontSize: "0.83rem",
                                        transition: "all 0.2s",
                                    }}
                                >
                                    <div style={{ fontWeight: 700, marginBottom: 3 }}>⚡ 2 Aşamalı</div>
                                    <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>
                                        Önce tüm taslaklar, sonra hepsi imzalanır. Daha hızlı ama riskli.
                                    </div>
                                </button>
                            </div>
                        )}

                        <button
                            id="bulk-invoice-submit"
                            type="button"
                            className="btn-primary"
                            disabled={disabled || running || loading || rows.length === 0}
                            onClick={() => void handleBulkCreate()}
                            style={{ maxWidth: 320 }}
                        >
                            {running ? `⏳ İşleniyor… (${done}/${total})` : `🚀 ${rows.length} Fatura Oluştur`}
                        </button>
                    </div>
                </>
            )}
        </section>
    );
}
