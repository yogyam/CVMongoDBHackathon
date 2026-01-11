'use client';

import { useState } from 'react';
import { useEvmAddress } from '@coinbase/cdp-hooks';
import { AuthButton } from '@coinbase/cdp-react';
import { useIsSignedIn } from '@coinbase/cdp-hooks';
import axios from 'axios';
import { User } from '@/lib/api';

interface CoinbaseWalletSectionProps {
    user: User | null;
    token: string | null;
}

export default function CoinbaseWalletSection({ user, token }: CoinbaseWalletSectionProps) {
    const { evmAddress } = useEvmAddress();
    const { isSignedIn } = useIsSignedIn();
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleLinkWallet = async () => {
        if (!evmAddress) {
            setError('Please connect your wallet first');
            return;
        }

        const authToken = token || localStorage.getItem('token') || localStorage.getItem('syntropy_token');
        if (!authToken) {
            setError('Please sign in first');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/link-wallet`,
                {
                    wallet_address: evmAddress,
                    wallet_network: 'base-sepolia',
                },
                {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                }
            );

            setSuccess('Wallet linked successfully!');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (err) {
            console.error('Link wallet error:', err);
            const errorMessage = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
                : undefined;
            setError(errorMessage || 'Failed to link wallet. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnectWallet = async () => {
        const authToken = token || localStorage.getItem('token') || localStorage.getItem('syntropy_token');
        if (!authToken) {
            setError('Please sign in first');
            return;
        }

        if (!confirm('Are you sure you want to disconnect your wallet? You will need to reconnect it to receive automatic payments.')) {
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/link-wallet`,
                {
                    wallet_address: '',
                },
                {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                }
            );

            setSuccess('Wallet disconnected successfully!');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (err) {
            console.error('Disconnect wallet error:', err);
            const errorMessage = err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
                : undefined;
            setError(errorMessage || 'Failed to disconnect wallet. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const isWalletLinked = user?.wallet_address && evmAddress && 
        user.wallet_address.toLowerCase() === evmAddress.toLowerCase();

    return (
        <>
            {error && (
                <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded text-danger text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded text-success text-sm">
                    {success}
                </div>
            )}

            {!isSignedIn ? (
                <div className="space-y-4">
                    <p className="text-muted">
                        Connect your Coinbase wallet to enable automatic payments via x402 protocol.
                    </p>
                    <div className="flex justify-center">
                        <AuthButton />
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Connected Wallet Info */}
                    <div className="p-4 bg-card border border-border rounded">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="text-sm font-medium mb-1">Connected Wallet</div>
                                <div className="text-xs text-muted font-mono">
                                    {evmAddress}
                                </div>
                            </div>
                            {isWalletLinked && (
                                <span className="px-2 py-1 text-xs bg-success/10 border border-success/30 rounded text-success">
                                    Linked
                                </span>
                            )}
                        </div>

                        {user?.wallet_address && user.wallet_address.toLowerCase() !== evmAddress?.toLowerCase() && (
                            <div className="mt-3 p-3 bg-warning/10 border border-warning/30 rounded text-sm text-warning">
                                Different wallet connected. Link this wallet to update your account.
                            </div>
                        )}
                    </div>

                    {/* Link/Update Wallet Button */}
                    {!isWalletLinked ? (
                        <button
                            onClick={handleLinkWallet}
                            disabled={loading || !evmAddress}
                            className="btn btn-primary w-full"
                        >
                            {loading ? 'Linking...' : 'Link Wallet to Account'}
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <div className="p-3 bg-success/10 border border-success/30 rounded text-sm text-success">
                                Your wallet is linked and ready for automatic payments.
                            </div>
                            <button
                                onClick={handleDisconnectWallet}
                                disabled={loading}
                                className="btn btn-secondary w-full"
                            >
                                {loading ? 'Disconnecting...' : 'Disconnect Wallet'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
