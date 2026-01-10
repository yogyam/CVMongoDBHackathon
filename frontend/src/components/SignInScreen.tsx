"use client";

import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import Link from "next/link";

interface SignInScreenProps {
  onShowRegister?: () => void;
}

export default function SignInScreen({ onShowRegister }: SignInScreenProps) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Syntropy Protocol
          </h1>
          <p className="text-gray-600">
            Autonomous mediation for freelance projects
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Sign in with your Coinbase wallet to continue. If you don't have an account yet, you'll be able to create one after connecting.
            </p>
          </div>

          <div className="flex flex-col items-center space-y-4">
            <AuthButton />
            
            {onShowRegister && (
              <button
                onClick={onShowRegister}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                New to Syntropy? Register here
              </button>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
              By connecting, you agree to Syntropy's Terms of Service
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
