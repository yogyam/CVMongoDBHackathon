'use client';

import { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class CDPErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
        console.error('CDP Error Boundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="p-4 bg-danger/10 border border-danger/30 rounded text-sm text-danger">
                    <div className="font-semibold mb-2">Coinbase Wallet Error</div>
                    <div className="text-xs">
                        {this.state.error?.message || 'An error occurred while loading Coinbase wallet features.'}
                        <div className="mt-2">
                            Please ensure <code className="bg-danger/20 px-1 rounded">NEXT_PUBLIC_CDP_PROJECT_ID</code> is set in your <code className="bg-danger/20 px-1 rounded">.env.local</code> file.
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
