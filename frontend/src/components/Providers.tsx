"use client";

import { CDPReactProvider } from "@coinbase/cdp-react";
import { theme } from "./theme";

interface ProvidersProps {
  children: React.ReactNode;
}

// CDP Configuration
const CDP_CONFIG = {
  projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID || "",
  appName: "OverHeadAI",
  appLogoUrl: "/logo.svg",
};

export default function Providers({ children }: ProvidersProps) {
  if (!CDP_CONFIG.projectId) {
    console.error("NEXT_PUBLIC_CDP_PROJECT_ID is not set in environment variables");
  }

  return (
    <CDPReactProvider config={CDP_CONFIG} theme={theme}>
      {children}
    </CDPReactProvider>
  );
}
