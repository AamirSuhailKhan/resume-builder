"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface EmailCaptureBarProps {
  source: string;
  metadata?: Record<string, any>;
  delayMs?: number;
}

export default function EmailCaptureBar({
  source,
  metadata = {},
  delayMs = 3000,
}: EmailCaptureBarProps) {
  const { data: session, status } = useSession() as any;
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // 1. Do not show if user is logged in
    if (status === "authenticated" || session?.user) {
      return;
    }

    // 2. Check if already submitted
    const isCaptured = localStorage.getItem("email_captured");
    if (isCaptured === "true") {
      return;
    }

    // 3. Check if dismissed within the last 7 days
    const dismissedTime = localStorage.getItem("email_capture_dismissed");
    if (dismissedTime) {
      const parsedTime = parseInt(dismissedTime, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - parsedTime < sevenDays) {
        return;
      }
    }

    // 4. Trigger delay to show component
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [session, status, delayMs]);

  const handleDismiss = () => {
    localStorage.setItem("email_capture_dismissed", Date.now().toString());
    setIsVisible(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/v1/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source,
          metadata: {
            ...metadata,
            capturedAt: new Date().toISOString(),
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsSuccess(true);
        localStorage.setItem("email_captured", "true");
        localStorage.setItem("captured_email", email);
        
        // Hide after 4 seconds of success state display
        setTimeout(() => {
          setIsVisible(false);
        }, 4000);
      } else {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setErrorMsg("Network error. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        width: "100%",
        backgroundColor: "#ffffff",
        borderTop: "1px solid #e2e8f0",
        boxShadow: "0 -4px 20px -2px rgba(0, 0, 0, 0.08)",
        transform: isVisible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 350ms cubic-bezier(0.16, 1, 0.3, 1)",
        padding: "16px 24px",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        {isSuccess ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#059669",
              fontWeight: 600,
              fontSize: "16px",
              width: "100%",
              justifyContent: "center",
              padding: "4px 0",
            }}
          >
            <span style={{ fontSize: "18px" }}>✓</span> You're in! Check your inbox for your saved results.
          </div>
        ) : (
          <>
            {/* Left Content */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "280px" }}>
              <span style={{ fontSize: "20px" }}>📧</span>
              <div>
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "15px" }}>
                  Save your results + get weekly market updates
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Join 12,000+ Indian engineers receiving premium salary benchmarks & ATS secrets.
                </div>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flex: "1",
                maxWidth: "600px",
                justifyContent: "flex-end",
              }}
            >
              <div style={{ position: "relative", width: "100%", maxWidth: "340px" }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    color: "#1e293b",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#4f46e5";
                    e.target.style.boxShadow = "0 0 0 2px rgba(79, 70, 229, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#cbd5e1";
                    e.target.style.boxShadow = "none";
                  }}
                />
                {errorMsg && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "-20px",
                      left: "4px",
                      fontSize: "11px",
                      color: "#dc2626",
                    }}
                  >
                    {errorMsg}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  backgroundColor: "#4f46e5",
                  color: "#ffffff",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "background-color 200ms ease",
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#4338ca")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#4f46e5")}
              >
                {isSubmitting ? "Saving..." : "Get updates →"}
              </button>
            </form>

            {/* Dismiss Cross */}
            <button
              onClick={handleDismiss}
              aria-label="Dismiss"
              style={{
                background: "transparent",
                border: "none",
                fontSize: "20px",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "4px 8px",
                transition: "color 150ms ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#475569")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#94a3b8")}
            >
              ×
            </button>
          </>
        )}
      </div>
    </div>
  );
}
