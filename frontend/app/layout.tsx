import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Atualizado com o nome do seu sistema
export const metadata: Metadata = {
  title: "FinIA - Gestão Financeira",
  description: "Sistema robusto para Gestão Financeira Integrada",
};

// NOVO: Configuração obrigatória para celulares lerem o tamanho da tela corretamente
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* NOVO: Adicionado w-full e overflow-x-hidden para travar o layout na horizontal */}
      <body className="min-h-full flex flex-col w-full overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
