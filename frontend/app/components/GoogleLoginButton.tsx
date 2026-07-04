"use client";

import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useEffect } from "react";

declare global {
  interface Window {
    AndroidBridge?: {
      triggerGoogleSignIn: () => void;
    };
    onNativeGoogleSignIn?: (userData: any) => void;
  }
}

export default function GoogleLoginButton({ setUser }: any) {
  useEffect(() => {
    window.onNativeGoogleSignIn = async (userData: any) => {
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
        setUser(dbUser);
        localStorage.setItem("landresolve_user", JSON.stringify(dbUser));

        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: `✅ Welcome back ${dbUser.name}`,
          })
        );
      } catch (err) {
        console.error("Native Google login error:", err);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: `⚠️ Login failed. Try again.`,
          })
        );
      }
    };

    return () => {
      window.onNativeGoogleSignIn = undefined;
    };
  }, [setUser]);

  if (typeof window !== "undefined" && window.AndroidBridge) {
    return (
      <button
        onClick={() => window.AndroidBridge?.triggerGoogleSignIn()}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          borderRadius: "8px",
          border: "1px solid #444",
          background: "#fff",
          color: "#333",
          fontWeight: 600,
          fontSize: "13px",
          cursor: "pointer",
        }}
      >
        Sign in with Google
      </button>
    );
  }

  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        if (!credentialResponse.credential) return;

        const userInfo: any = jwtDecode(credentialResponse.credential);

        const userData = {
          name: userInfo.name,
          email: userInfo.email,
          picture: userInfo.picture,
        };

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
          setUser(dbUser);
          localStorage.setItem("landresolve_user", JSON.stringify(dbUser));

          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail: `✅ Welcome back ${dbUser.name}`,
            })
          );
        } catch (err) {
          console.error("Google login backend error:", err);
          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail: `⚠️ Login failed. Try again.`,
            })
          );
        }
      }}
      onError={() => {
        console.log("Login Failed");
      }}
    />
  );
}