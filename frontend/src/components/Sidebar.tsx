'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface NavItem {
    label: string;
    href: string;
    icon: string;
}

const clientNav: NavItem[] = [
    { label: 'Dashboard', href: '/client', icon: '' },
    { label: 'Projects', href: '/client/projects', icon: '' },
    { label: 'Create Project', href: '/client/projects/new', icon: '' },
    { label: 'Settings', href: '/settings', icon: '' },
];

const freelancerNav: NavItem[] = [
    { label: 'Dashboard', href: '/freelancer', icon: '' },
    { label: 'My Projects', href: '/freelancer/projects', icon: '' },
    { label: 'Settings', href: '/settings', icon: '' },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const navItems = user?.role === 'CLIENT' ? clientNav : freelancerNav;

    return (
        <div className="sidebar">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded border border-border flex items-center justify-center bg-card">
                    <span className="text-foreground font-bold text-lg">S</span>
                </div>
                <div>
                    <div className="font-bold text-lg text-foreground">Syntropy</div>
                    <div className="text-xs text-muted">Protocol</div>
                </div>
            </Link>

            {/* User Info */}
            <div className="glass-card p-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center bg-card">
                        <span className="text-xs uppercase">{user?.role === 'CLIENT' ? 'C' : 'F'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{user?.full_name}</div>
                        <div className="text-xs text-muted">{user?.role}</div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/client' && item.href !== '/freelancer' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded transition-all ${isActive
                                    ? 'text-foreground border-l-2 border-foreground'
                                    : 'text-muted hover:text-foreground'
                                }`}
                        >
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom section */}
            <div className="mt-auto pt-4 border-t border-border">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-4 py-3 rounded w-full text-muted hover:text-foreground transition-all"
                >
                    <span className="font-medium">Sign Out</span>
                </button>
            </div>
        </div>
    );
}
