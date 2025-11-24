// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import React from "react";
import "@/styles/mobile.css";

export const metadata: Metadata = {
  title: "EliteShred Dashboard",
  description: "Client Dashboard für EliteShred Coaching",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#000000",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* GLOBALER WRAPPER */}
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* GLOBALER HEADER MIT LOGO */}
          <header
            style={{
              width: "100%",
              padding: "10px 20px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              background:
                "radial-gradient(circle at top left, #000000ff, #000000 60%)",
              position: "sticky",
              top: 0,
              zIndex: 50,
            }}
          >
            <img
              src="/logo.png" // oder "/logo1.png", falls du das andere nutzen willst
              alt="EliteShred Logo"
              style={{
                height: 36,
                objectFit: "contain",
                filter: "brightness(1.2)",
              }}
            />
          </header>

          {/* SEITENINHALT */}
          <main style={{ flex: 1 }}>{children}</main>
        </div>
      </body>
    </html>
  );
}
