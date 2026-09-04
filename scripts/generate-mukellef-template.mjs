import * as XLSX from "../website/node_modules/xlsx/xlsx.mjs";
import * as path from "node:path";
import * as fs from "node:fs";

// Mükellef Listesi Şablonu
const headers = [
    "Mükellef Ünvanı / Adı Soyadı",
    "VKN / TCKN",
    "Kullanıcı Kodu (Kullanıcı Adı)",
    "Parola (Şifre)",
    "Ortam (PROD veya TEST)",
];

const sampleData = [
    [
        "BİLİCİLER TURİZM OTOMOTİV LTD. ŞTİ.",
        "1748678338",
        "17404599",
        "123456",
        "PROD",
    ],
    [
        "MR FORTY TRAVEL TURİZM LTD. ŞTİ.",
        "6232283883",
        "62325502",
        "147258",
        "PROD",
    ],
    [
        "ÖRNEK DANIŞMANLIK A.Ş.",
        "1234567890",
        "12345678",
        "parola123",
        "TEST",
    ],
];

const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

// Kolon genişlikleri
ws["!cols"] = [
    { wch: 40 }, // Ünvan
    { wch: 16 }, // VKN
    { wch: 28 }, // Kullanıcı Kodu
    { wch: 20 }, // Şifre
    { wch: 24 }, // Ortam
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Mükellefler");

const publicDir = path.resolve("website/public");
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

const outputPath = path.join(publicDir, "mukellef-sablonu.xlsx");
const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
fs.writeFileSync(outputPath, buf);
console.log("Mükellef şablonu başarıyla oluşturuldu:", outputPath);
