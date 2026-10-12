import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nadzir Story — AI Story Studio: dari ide jadi film mini",
  description:
    "Studio web AI untuk kreator: tulis satu ide, AI menyusun naskah, karakter, adegan, gambar, dan video — langsung di browser tanpa instalasi. Gratis dan open source.",
  keywords: ["Nadzir Story", "AI story studio", "video AI", "Gemini", "Nano Banana", "Veo", "naskah AI", "storyboard"],
  authors: [{ name: "Nadzir" }],
  icons: {
    icon: "/app/logo.svg",
  },
  openGraph: {
    title: "Nadzir Story — AI Story Studio",
    description:
      "Tulis satu ide, studio web ini merangkai sisanya: naskah AI, karakter, adegan, gambar & video AI — langsung di browser.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
