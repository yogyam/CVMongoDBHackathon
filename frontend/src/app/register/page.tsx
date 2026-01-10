'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<'CLIENT' | 'FREELANCER'>('CLIENT');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await register(email, password, role, fullName);
            router.push('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-secondary/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6 text-muted hover:text-foreground transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </Link>
                    <h1 className="text-3xl font-bold mb-2">Create Account</h1>
                    <p className="text-muted">Join Syntropy Protocol</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="glass-card p-8">
                    {error && (
                        <div className="mb-6 p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
                            {error}
                        </div>
                    )}

                    {/* Role Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-3">I am a</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setRole('CLIENT')}
                                className={`p-4 rounded-xl border-2 transition-all ${role === 'CLIENT'
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-muted'
                                    }`}
                            >
                                <div className="text-2xl mb-2">💼</div>
                                <div className="font-semibold">Client</div>
                                <div className="text-xs text-muted mt-1">Hire talent</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('FREELANCER')}
                                className={`p-4 rounded-xl border-2 transition-all ${role === 'FREELANCER'
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-muted'
                                    }`}
                            >
                                <div className="text-2xl mb-2">👩‍💻</div>
                                <div className="font-semibold">Freelancer</div>
                                <div className="text-xs text-muted mt-1">Do great work</div>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium mb-2">
                                Full Name
                            </label>
                            <input
                                id="fullName"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="input"
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-2">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input"
                                placeholder="••••••••"
                                minLength={6}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full mt-6"
                    >
                        {loading ? (
                            <span className="animate-pulse">Creating account...</span>
                        ) : (
                            'Create Account'
                        )}
                    </button>

                    <p className="text-center mt-6 text-sm text-muted">
                        Already have an account?{' '}
                        <Link href="/login" className="text-primary hover:text-primary-hover font-medium">
                            Sign in
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
