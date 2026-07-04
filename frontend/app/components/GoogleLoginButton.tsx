"use client";

import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    AndroidBridge?: {
      triggerGoogleSignIn: () => void;
    };
    onNativeGoogleSignIn?: (userData: any) => void;
  }
}

async function handleLoginResponse(
  userData: any,
  setUser: any,
  setShowWelcomeModal: (name: string) => void
) {
  window.dispatchEvent(
    new CustomEvent("show-toast", {
      detail: `⏳ Signing you in...`,
    })
  );

  try {
    const response = await fetch(
      "https://landresolveai.onrender.com/auth/google",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      }
    );

    if (!response.ok) throw new Error(`Backend returned ${response.status}`);

    const dbUser = await response.json();

    // Log the user in immediately — for BOTH new and existing accounts.
    setUser(dbUser);
    localStorage.setItem("landresolve_user", JSON.stringify(dbUser));

    if (dbUser.is_new) {
      // Brand new account — user is already logged in, just show the
      // welcome popup on top. No second sign-in required.
      setShowWelcomeModal(dbUser.name);
    } else {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: `✅ Welcome back ${dbUser.name}`,
        })
      );
    }
  } catch (err) {
    console.error("Google login backend error:", err);
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: `⚠️ Login failed. Try again.`,
      })
    );
  }
}

export default function GoogleLoginButton({ setUser, setShowWelcomeModal }: any) {
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    window.onNativeGoogleSignIn = async (userData: any) => {
      setIsSigningIn(true);
      await handleLoginResponse(userData, setUser, setShowWelcomeModal);
      setIsSigningIn(false);
    };

    return () => {
      window.onNativeGoogleSignIn = undefined;
    };
  }, [setUser, setShowWelcomeModal]);

  if (typeof window !== "undefined" && window.AndroidBridge) {
    return (
      <button
        disabled={isSigningIn}
        onClick={() => {
          if (isSigningIn) return;
          window.AndroidBridge?.triggerGoogleSignIn();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          borderRadius: "8px",
          border: "1px solid #444",
          background: isSigningIn ? "#ccc" : "#fff",
          color: "#333",
          fontWeight: 600,
          fontSize: "13px",
          cursor: isSigningIn ? "not-allowed" : "pointer",
          opacity: isSigningIn ? 0.6 : 1,
        }}
      >
        {isSigningIn ? "Signing in..." : "Sign in with Google"}
      </button>
    );
  }

  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        if (!credentialResponse.credential) return;

        setIsSigningIn(true);

        const userInfo: any = jwtDecode(credentialResponse.credential);

        const userData = {
          name: userInfo.name,
          email: userInfo.email,
          picture: userInfo.picture,
        };

        await handleLoginResponse(userData, setUser, setShowWelcomeModal);
        setIsSigningIn(false);
      }}
      onError={() => {
        console.log("Login Failed");
      }}
    />
  );
}