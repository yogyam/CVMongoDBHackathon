"use client";

import { useState } from "react";
import axios from "axios";
import { useEvmAddress } from "@coinbase/cdp-hooks";

interface RegisterScreenProps {
  evmAddress?: string;
  onBack?: () => void;
  onRegistered?: () => void;
}

export default function RegisterScreen({
  evmAddress,
  onBack,
  onRegistered,
}: RegisterScreenProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "CLIENT" as "CLIENT" | "FREELANCER",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "linking">("form");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Step 1: Create account
      const registerResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`,
        formData
      );

      const { token } = registerResponse.data;

      // Store token
      localStorage.setItem("syntropy_token", token);

      // Step 2: Link wallet
      setStep("linking");

      if (evmAddress) {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/link-wallet`,
          {
            wallet_address: evmAddress,
            wallet_network: "base-sepolia",
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }

      // Success!
      if (onRegistered) {
        onRegistered();
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(
        err.response?.data?.error ||
          "Registration failed. Please try again."
      );
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  if (step === "linking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Linking Wallet...
          </h2>
          <p className="text-gray-600">
            Connecting your Coinbase wallet to your account
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Create Your Account
          </h1>
          <p className="text-sm text-gray-600">
            Your wallet is connected:{" "}
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
              {evmAddress?.slice(0, 6)}...{evmAddress?.slice(-4)}
            </span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              id="full_name"
              required
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              I am a...
            </label>
            <select
              id="role"
              required
              value={formData.role}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  role: e.target.value as "CLIENT" | "FREELANCER",
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="CLIENT">Client (Hiring)</option>
              <option value="FREELANCER">Freelancer (Working)</option>
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
