'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth as authApi, User } from './api';

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, role: 'CLIENT' | 'FREELANCER', fullName: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = async () => {
        const storedToken = localStorage.getItem('token') || localStorage.getItem('syntropy_token');
        if (storedToken) {
            try {
                const res = await authApi.me(storedToken);
                setUser(res.user);
                setToken(storedToken);
            } catch {
                localStorage.removeItem('token');
                localStorage.removeItem('syntropy_token');
            } finally {
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshUser();
    }, []);

    const login = async (email: string, password: string) => {
        const res = await authApi.login({ email, password });
        localStorage.setItem('token', res.token);
        setToken(res.token);
        setUser(res.user);
    };

    const register = async (email: string, password: string, role: 'CLIENT' | 'FREELANCER', fullName: string) => {
        const res = await authApi.register({ email, password, role, full_name: fullName });
        localStorage.setItem('token', res.token);
        setToken(res.token);
        setUser(res.user);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
