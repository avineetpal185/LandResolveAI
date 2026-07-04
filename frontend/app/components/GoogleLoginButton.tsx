"use client";

import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

export default function GoogleLoginButton({ setUser }: any) {
  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {

        if (!credentialResponse.credential) return;

        const userInfo: any = jwtDecode(
          credentialResponse.credential
        );

        const userData = ({
          name: userInfo.name,
          email: userInfo.email,
          picture: userInfo.picture,
        });
        const response = await fetch(
          "https://landresolveai.onrender.com/auth/google",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(userData),
          }
        );
        
        const dbUser = await response.json();
        console.log("DB USER =", dbUser);
        
        setUser(dbUser);
        
        localStorage.setItem(
          "landresolve_user",
          JSON.stringify(dbUser)
        );

        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: `✅ Welcome back ${dbUser.name}`
          })
        );

        console.log("Logged In");
      }}
      onError={() => {
        console.log("Login Failed");
      }}
    />
  );
}