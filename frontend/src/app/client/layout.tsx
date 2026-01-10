'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components';

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                router.push('/login');
            } else if (user.role !== 'CLIENT') {
                router.push('/freelancer');
            }
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-primary text-xl">Loading...</div>
            </div>
        );
    }

    if (!user || user.role !== 'CLIENT') {
        return null;
    }

    return (
        <div className="min-h-screen">
            <Sidebar />
            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
