"use client";

import { useEffect } from "react";

const INSTAGRAM_APP = "instagram://story-camera";
const INSTAGRAM_WEB = "https://www.instagram.com/";

/**
 * Email-safe bridge: https link works in every mail client, then we try the
 * Instagram app (story camera when available) and fall back to Instagram web.
 * Meta does not allow preloading a story image from email.
 */
export default function InstagramPostRedirectPage() {
  useEffect(() => {
    const fallback = window.setTimeout(() => {
      window.location.replace(INSTAGRAM_WEB);
    }, 900);

    try {
      window.location.href = INSTAGRAM_APP;
    } catch {
      window.location.replace(INSTAGRAM_WEB);
    }

    return () => window.clearTimeout(fallback);
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        display: "grid",
        placeItems: "center",
        background: "#f6f2eb",
        color: "#2a2622",
        fontFamily:
          "Georgia, 'Times New Roman', Times, serif",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div>
        <p style={{ fontSize: 22, margin: "0 0 8px" }}>Opening Instagram…</p>
        <p
          style={{
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: 14,
            color: "#5c554c",
            margin: "0 0 20px",
            lineHeight: 1.5,
          }}
        >
          If nothing happens, tap below. Save your story image from the email
          first, then post from your camera roll.
        </p>
        <a
          href={INSTAGRAM_WEB}
          style={{
            display: "inline-block",
            background: "#2a2622",
            color: "#f6f2eb",
            textDecoration: "none",
            padding: "12px 18px",
            borderRadius: 999,
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Open Instagram
        </a>
      </div>
    </main>
  );
}
