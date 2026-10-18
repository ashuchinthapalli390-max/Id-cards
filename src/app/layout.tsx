import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeXa Agency | Intern ID Card Portal",
  description: "Official secure photograph collection and ID card issuance portal for CodeXa Agency interns.",
  robots: "noindex, nofollow",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Orbitron:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#070707] text-[#F7F7F7] antialiased selection:bg-[#D90429] selection:text-white bg-cyber-grid">
        {/* Ambient Top Glow from assests/css/codexa-theme.css */}
        <div className="ambient-glow glow-top" />
        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
