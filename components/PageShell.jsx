"use client";

import { useEffect } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import Background from "./Background";

export default function PageShell({ children }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-mouse", "true");
  }, []);

  return (
    <div className="min-h-screen text-white">
      <Background />
      <Navbar />
      <div className="relative z-10 pb-[80px] md:pb-0">{children}</div>
      <div className="relative z-10">
        <Footer />
      </div>
      <BottomNav />
    </div>
  );
}