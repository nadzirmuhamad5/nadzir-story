"use client";

// ---------------------------------------------------------------------------
// Nadzir Story Web Studio — SPA tunggal di route /
// view "landing"  : halaman produk (komponen LandingPage)
// view "studio"   : aplikasi studio AI yang berfungsi penuh (StudioApp)
// ---------------------------------------------------------------------------

import { useState } from "react";
import LandingPage from "@/components/landing/landing-page";
import StudioApp from "@/components/studio/studio-app";

export default function Page() {
  const [view, setView] = useState<"landing" | "studio">("landing");

  if (view === "studio") {
    return <StudioApp onBack={() => setView("landing")} />;
  }
  return <LandingPage onOpenStudio={() => setView("studio")} />;
}
