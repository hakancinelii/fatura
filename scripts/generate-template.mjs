// Script: generate-template.mjs
// Şablon Excel dosyasını oluşturur ve website/public/ klasörüne kaydeder

import * as XLSX from "xlsx";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, "../website/public/fatura-sablonu.xlsx");

// Başlık satırı
const headers = [
    "VKN / TCKN",
    "Alıcı Ünvanı",
    "Fatura Tarihi (GG/AA/YYYY)",
    "Saat (SS:DD:SS)",
    "Mal / Hizmet Adı",
    "Miktar",
    "Birim Fiyat (KDV hariç)",
    "KDV Oranı (%)",
];

// 3 örnek satır
const exampleRows = [
    ["11111111111", "ÖRNEK TİCARET LTD. ŞTİ.", "02/09/2025", "09:00:00", "Web Geliştirme Hizmeti", 1, 5000, 20],
    ["22222222222", "TEST DANIŞMANLIK A.Ş.", "02/09/2025", "10:00:00", "Danışmanlık", 2, 1500, 20],
    ["12345678901", "ALİ VELI", "02/09/2025", "11:00:00", "Grafik Tasarım", 3, 800, 10],
];

const wb = XLSX.utils.book_new();
const wsData = [headers, ...exampleRows];
const ws = XLSX.utils.aoa_to_sheet(wsData);

// Sütun genişliklerini ayarla
ws["!cols"] = [
    { wch: 16 }, // VKN
    { wch: 30 }, // Ünvan
    { wch: 26 }, // Tarih
    { wch: 16 }, // Saat
    { wch: 28 }, // Mal/Hizmet
    { wch: 10 }, // Miktar
    { wch: 22 }, // Birim Fiyat
    { wch: 14 }, // KDV
];

XLSX.utils.book_append_sheet(wb, ws, "Fatura Listesi");
XLSX.writeFile(wb, outputPath);

console.log("✅ Şablon oluşturuldu:", outputPath);
