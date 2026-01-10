"use client";

import { useIsSignedIn, useEvmAddress } from "@coinbase/cdp-hooks";
import { useState, useEffect } from "react";
import SignInScreen from "./SignInScreen";
import RegisterScreen from "./RegisterScreen";
import Dashboard from "./Dashboard";

export default function ClientApp() {
  const { isSignedIn, isLoading: authLoading } = useIsSignedIn();
  const { evmAddress } = useEvmAddress();
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user has a Syntropy account
  useEffect(() => {
    const checkAccount = async () => {
      if (!isSignedIn || !evmAddress) {
        setHasAccount(false);
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("syntropy_token");
        if (!token) {
          setHasAccount(false);
          setLoading(false);
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Check if wallet is linked
          if (data.user?.wallet_address?.toLowerCase() === evmAddress.toLowerCase()) {
            setHasAccount(true);
          } else {
            // Wallet connected but not linked to account
            setHasAccount(false);
          }
        } else {
          setHasAccount(false);
        }
      } catch (error) {
        console.error("Error checking account:", error);
        setHasAccount(false);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAccount();
    }
  }, [isSignedIn, evmAddress, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <SignInScreen onShowRegister={() => setShowRegister(true)} />;
  }

  if (showRegister || !hasAccount) {
    return (
      <RegisterScreen
        evmAddress={evmAddress}
        onBack={() => setShowRegister(false)}
        onRegistered={() => {
          setHasAccount(true);
          setShowRegister(false);
        }}
      />
    );
  }

  return <Dashboard evmAddress={evmAddress} />;
}
