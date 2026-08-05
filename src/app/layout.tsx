import type { Metadata } from "next";
import { Stethoscope } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "UltraTab | Cardiología",
  description: "CRM Bacteriológico / Cardiológico con dictado por voz",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <header className="header">
          <div className="container header-content" style={{ justifyContent: 'center' }}>
            <div className="logo">
              <Stethoscope size={28} color="var(--primary-dark)" />
              <span style={{ color: 'var(--primary-dark)', fontWeight: 800 }}>UltraTab</span>
            </div>
          </div>
        </header>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
