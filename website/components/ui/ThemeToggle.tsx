"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
    const [theme, setTheme] = useState<"dark" | "light">("dark");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const currentTheme = (document.documentElement.getAttribute("data-theme") as "dark" | "light") || "dark";
        setTheme(currentTheme);
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        document.documentElement.setAttribute("data-theme", nextTheme);
        try {
            localStorage.setItem("fatura_theme", nextTheme);
        } catch {
            // ignore
        }
    };

    if (!mounted) {
        return (
            <button
                type="button"
                className="btn-ghost theme-toggle-btn"
                aria-label="Tema Değiştir"
                style={{
                    width: "38px",
                    height: "38px",
                    padding: 0,
                    borderRadius: "50%",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                }}
            >
                🌙
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className="btn-ghost theme-toggle-btn"
            title={theme === "dark" ? "Gündüz Moduna Geç (Aydınlık)" : "Gece Moduna Geç (Karanlık)"}
            aria-label="Tema Değiştir"
            style={{
                width: "38px",
                height: "38px",
                padding: 0,
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.15rem",
                transition: "all 0.25s ease",
                cursor: "pointer",
            }}
        >
            {theme === "dark" ? "☀️" : "🌙"}
        </button>
    );
}
