import type { InvoiceListItem } from "fatura";

interface DateRange {
    startDate: string;
    endDate: string;
}

interface InvoiceListProps {
    title: string;
    invoices: InvoiceListItem[];
    range: DateRange;
    loading: boolean;
    disabled: boolean;
    emptyMessage: string;
    onRangeChange: (range: DateRange) => void;
    onLoad: () => Promise<void>;
}

export function InvoiceList({
    title,
    invoices,
    range,
    loading,
    disabled,
    emptyMessage,
    onRangeChange,
    onLoad,
}: InvoiceListProps) {
    return (
        <section className="section-block" style={{ display: "grid", gap: "0.8rem" }}>
            <h2 className="section-title" style={{ fontSize: "1.3rem" }}>
                {title}
            </h2>

            <div
                style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
            >
                <label>
                    <div className="text-muted" style={{ marginBottom: "0.3rem" }}>
                        Başlangıç (GG/AA/YYYY)
                    </div>
                    <input
                        className="field"
                        value={range.startDate}
                        onChange={(event) => onRangeChange({ ...range, startDate: event.target.value })}
                    />
                </label>
                <label>
                    <div className="text-muted" style={{ marginBottom: "0.3rem" }}>
                        Bitiş (GG/AA/YYYY)
                    </div>
                    <input
                        className="field"
                        value={range.endDate}
                        onChange={(event) => onRangeChange({ ...range, endDate: event.target.value })}
                    />
                </label>
            </div>

            <button className="btn-primary" type="button" onClick={onLoad} disabled={disabled || loading}>
                Listeyi getir
            </button>

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "680px" }}>
                    <thead>
                        <tr style={{ textAlign: "left", color: "var(--muted)" }}>
                            <th style={{ padding: "0.6rem", borderBottom: "1px solid var(--line)" }}>Tarih</th>
                            <th style={{ padding: "0.6rem", borderBottom: "1px solid var(--line)" }}>Belge No / UUID</th>
                            <th style={{ padding: "0.6rem", borderBottom: "1px solid var(--line)" }}>Firma / Kişi</th>
                            <th style={{ padding: "0.6rem", borderBottom: "1px solid var(--line)" }}>Durum</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map((invoice, idx) => {
                            const date = String(invoice.faturaTarihi || invoice.belgeTarihi || "-");
                            const docOrUuid = String(invoice.belgeNumarasi || invoice.ettn || "-");
                            const party = String(
                                invoice.saticiUnvan ||
                                invoice.aliciUnvan ||
                                [invoice.aliciAdi, invoice.aliciSoyadi].filter(Boolean).join(" ") ||
                                "-"
                            );
                            const status = String(invoice.onayDurumu || "-");

                            return (
                                <tr key={(invoice.ettn || invoice.belgeNumarasi || idx) + date}>
                                    <td style={{ padding: "0.6rem", borderBottom: "1px solid rgba(42,52,65,0.4)" }}>
                                        {date}
                                    </td>
                                    <td
                                        style={{
                                            padding: "0.6rem",
                                            borderBottom: "1px solid rgba(42,52,65,0.4)",
                                            fontFamily: "var(--font-mono)",
                                            fontSize: "0.8rem",
                                        }}
                                    >
                                        {docOrUuid}
                                    </td>
                                    <td style={{ padding: "0.6rem", borderBottom: "1px solid rgba(42,52,65,0.4)" }}>
                                        {party}
                                    </td>
                                    <td style={{ padding: "0.6rem", borderBottom: "1px solid rgba(42,52,65,0.4)" }}>
                                        {status}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {invoices.length === 0 ? <p className="text-muted">{emptyMessage}</p> : null}
        </section>
    );
}
