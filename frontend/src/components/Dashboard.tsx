"use client";

import { useEvmAddress } from "@coinbase/cdp-hooks";
import { useState, useEffect } from "react";
import axios from "axios";

interface User {
  id: string;
  email: string;
  role: "CLIENT" | "FREELANCER";
  full_name: string;
  wallet_address?: string;
}

interface DashboardProps {
  evmAddress?: string;
}

export default function Dashboard({ evmAddress }: DashboardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("syntropy_token");
        if (!token) return;

        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setUser(response.data.user);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Syntropy Protocol</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>
              )}
              {evmAddress && (
                <div className="px-3 py-1 bg-blue-50 rounded-lg">
                  <p className="text-xs font-mono text-blue-600">
                    {evmAddress.slice(0, 6)}...{evmAddress.slice(-4)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Syntropy</h2>
          {user && (
            <div className="space-y-2">
              <p className="text-gray-600">
                <span className="font-semibold">Name:</span> {user.full_name}
              </p>
              <p className="text-gray-600">
                <span className="font-semibold">Email:</span> {user.email}
              </p>
              <p className="text-gray-600">
                <span className="font-semibold">Role:</span> {user.role}
              </p>
              {user.wallet_address && (
                <p className="text-gray-600">
                  <span className="font-semibold">Wallet:</span>{" "}
                  <span className="font-mono text-sm">{user.wallet_address}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Placeholder for project dashboard content */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {user?.role === "CLIENT" ? "Your Projects" : "Assigned Projects"}
          </h3>
          <p className="text-gray-500">Dashboard content coming soon...</p>
        </div>
      </main>
    </div>
  );
}
