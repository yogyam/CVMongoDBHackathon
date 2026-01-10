'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push(user.role === 'CLIENT' ? '/client' : '/freelancer');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        {/* Animated background effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-card border border-border">
              <span className="text-2xl">✦</span>
              <span className="text-sm font-semibold tracking-wider uppercase text-muted">Multi-Agent Protocol</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-foreground">Syntropy</span>
            <br />
            <span className="text-foreground">Protocol</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted mb-12 max-w-2xl mx-auto leading-relaxed">
            AI agents negotiate requirements, verify quality, and automate payments.
            <span className="text-foreground font-semibold"> Clients only see verified work.</span>
          </p>

          {/* Agent Pills */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <div className="glass-card px-4 py-2">
              <span className="text-sm font-medium">Architect Agent</span>
            </div>
            <div className="glass-card px-4 py-2">
              <span className="text-sm font-medium">Critic Agent</span>
            </div>
            <div className="glass-card px-4 py-2">
              <span className="text-sm font-medium">Mediator Agent</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn btn-primary text-lg px-8 py-4">
              Get Started
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link href="/login" className="btn btn-secondary text-lg px-8 py-4">
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="relative z-10 mt-24 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto px-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-2">Gatekeeper Pattern</h3>
            <p className="text-muted text-sm">AI critics verify work quality. Only submissions scoring ≥8/10 reach clients.</p>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-2">Multi-Agent Coordination</h3>
            <p className="text-muted text-sm">Specialized agents collaborate via MongoDB to handle the full project lifecycle.</p>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-2">Autonomous Payments</h3>
            <p className="text-muted text-sm">USDC escrow with automatic release upon verified work approval.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-5xl mx-auto flex justify-between items-center text-sm text-muted">
          <span>© 2026 Syntropy Protocol</span>
          <span>Built with Fireworks AI + MongoDB</span>
        </div>
      </footer>
    </div>
  );
}
