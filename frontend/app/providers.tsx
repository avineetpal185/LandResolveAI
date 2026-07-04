"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GoogleOAuthProvider clientId="71509408558-s4gkbkjpfl4m2b9u11qdrrkkp9aj09bg.apps.googleusercontent.com">
      {children}
    </GoogleOAuthProvider>
  );
}