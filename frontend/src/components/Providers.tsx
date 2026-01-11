"use client";

import { CDPReactProvider } from "@coinbase/cdp-react";
import { theme } from "./theme";

interface ProvidersProps {
  children: React.ReactNode;
}

// CDP Configuration
const CDP_CONFIG = {
  projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID || "",
  appName: "Syntropy Protocol",
  appLogoUrl: "/logo.svg",
};

export default function Providers({ children }: ProvidersProps) {
  if (!CDP_CONFIG.projectId) {
    console.error("⚠️ NEXT_PUBLIC_CDP_PROJECT_ID is not set in environment variables");
    console.error("📝 Please add NEXT_PUBLIC_CDP_PROJECT_ID to your .env.local file");
    console.error("🔗 Get your Project ID from: https://portal.cdp.coinbase.com");
    
    // Return children without CDP provider if project ID is missing
    // This prevents network errors when CDP tries to connect
    return <>{children}</>;
  }

  return (
    <CDPReactProvider config={CDP_CONFIG} theme={theme}>
      {children}
    </CDPReactProvider>
  );
}
