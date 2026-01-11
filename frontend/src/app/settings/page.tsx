'use client';

import { useAuth } from '@/lib/auth-context';
import { CDPErrorBoundary } from '@/components/CDPErrorBoundary';
import dynamic from 'next/dynamic';

// Check if CDP is configured at module level
const isCDPConfigured = typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_CDP_PROJECT_ID?.trim();

// Dynamically import CoinbaseWalletSection only when CDP is configured
// This prevents the hooks from being loaded when the provider isn't available
const CoinbaseWalletSection = isCDPConfigured
    ? dynamic(() => import('@/components/CoinbaseWalletSection'), { 
        ssr: false,
        loading: () => <div className="text-center py-4 text-muted">Loading wallet...</div>
    })
    : null;

export default function SettingsPage() {
    const { user, token } = useAuth();

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Settings</h1>
                <p className="text-muted">Manage your account and wallet connection</p>
            </div>

            {/* Account Info */}
            <div className="glass-card p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Account Information</h2>
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-muted">Email</span>
                        <span className="font-medium">{user?.email}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted">Name</span>
                        <span className="font-medium">{user?.full_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted">Role</span>
                        <span className="font-medium">{user?.role}</span>
                    </div>
                </div>
            </div>

            {/* Wallet Connection */}
            <div className="glass-card p-6">
                <h2 className="text-xl font-semibold mb-4">Coinbase Wallet</h2>
                
                {!isCDPConfigured ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-danger/10 border border-danger/30 rounded text-sm text-danger">
                            <div className="font-semibold mb-2">Configuration Required</div>
                            <div className="text-xs space-y-2">
                                <p>
                                    Coinbase wallet connection requires <code className="bg-danger/20 px-1 rounded">NEXT_PUBLIC_CDP_PROJECT_ID</code> to be set in your environment variables.
                                </p>
                                <div className="mt-3">
                                    <div className="font-medium mb-1">Steps to fix:</div>
                                    <ol className="list-decimal list-inside space-y-1 ml-2">
                                        <li>Create a <code className="bg-danger/20 px-1 rounded">.env.local</code> file in the <code className="bg-danger/20 px-1 rounded">frontend/</code> directory</li>
                                        <li>Add your Project ID: <code className="bg-danger/20 px-1 rounded">NEXT_PUBLIC_CDP_PROJECT_ID=your-project-id</code></li>
                                        <li>Get your Project ID from{' '}
                                            <a 
                                                href="https://portal.cdp.coinbase.com" 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="underline hover:text-danger-hover font-medium"
                                            >
                                                Coinbase CDP Portal
                                            </a>
                                        </li>
                                        <li>Restart your Next.js dev server (<code className="bg-danger/20 px-1 rounded">npm run dev</code>)</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : CoinbaseWalletSection ? (
                    <CDPErrorBoundary
                        fallback={
                            <div className="p-4 bg-danger/10 border border-danger/30 rounded text-sm text-danger">
                                <div className="font-semibold mb-2">Coinbase Wallet Error</div>
                                <div className="text-xs">
                                    Unable to load Coinbase wallet features. Please ensure your <code className="bg-danger/20 px-1 rounded">NEXT_PUBLIC_CDP_PROJECT_ID</code> is correctly set in your <code className="bg-danger/20 px-1 rounded">.env.local</code> file and restart your dev server.
                                </div>
                            </div>
                        }
                    >
                        <CoinbaseWalletSection user={user} token={token} />
                    </CDPErrorBoundary>
                ) : null}

                {/* Info Box */}
                <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded text-sm text-muted">
                    <div className="font-medium mb-2 text-primary">About Wallet Connection</div>
                    <ul className="space-y-1 text-xs">
                        <li>• Linked wallets enable automatic x402 payments when work passes quality threshold</li>
                        <li>• Clients: Wallet receives payment requests for escrow deposits</li>
                        <li>• Freelancers: Wallet receives automatic milestone payments</li>
                        <li>• You can update your wallet at any time</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
