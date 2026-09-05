import { ExecutivePortal } from "@/components/dashboard/ExecutivePortal";
import { PortalAuthGate } from "@/components/auth/PortalAuthGate";

export const metadata = {
    title: "Fatura Paneli | Çineli SMMM",
    description: "e-Arşiv fatura oluşturma, mükellef yönetimi ve toplu fatura paneli.",
};

export default function DemoPage() {
    return (
        <PortalAuthGate>
            <ExecutivePortal />
        </PortalAuthGate>
    );
}
