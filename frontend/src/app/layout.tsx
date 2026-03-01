import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DoppelMind — Mystery Investigation Game",
  description:
    "An AI-powered murder mystery interrogation game. Interrogate suspects and find the killer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${pressStart.variable} ${vt323.variable}`}>
      <body className="antialiased bg-void text-cream">{children}</body>
    </html>
  );
}
