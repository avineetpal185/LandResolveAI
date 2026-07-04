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

export default function GoogleLoginButton({ setUser }: any) {
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    window.onNativeGoogleSignIn = async (userData: any) => {
      setIsSigningIn(true);
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
        setUser(dbUser);
        localStorage.setItem("landresolve_user", JSON.stringify(dbUser));

        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: `✅ Welcome ${dbUser.name}`,
          })
        );
      } catch (err) {
        console.error("Native Google login error:", err);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: `⚠️ Login failed. Try again.`,
          })
        );
      } finally {
        setIsSigningIn(false);
      }
    };

    return () => {
      window.onNativeGoogleSignIn = undefined;
    };
  }, [setUser]);

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
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: `⏳ Signing you in...`,
          })
        );

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
              detail: `✅ Welcome ${dbUser.name}`,
            })
          );
        } catch (err) {
          console.error("Google login backend error:", err);
          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail: `⚠️ Login failed. Try again.`,
            })
          );
        } finally {
          setIsSigningIn(false);
        }
      }}
      onError={() => {
        console.log("Login Failed");
      }}
    />
  );
}