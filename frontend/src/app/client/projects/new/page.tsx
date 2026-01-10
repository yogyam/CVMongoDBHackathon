'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { projects as projectsApi } from '@/lib/api';

export default function NewProjectPage() {
    const { token } = useAuth();
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [freelancerEmail, setFreelancerEmail] = useState('');
    const [budget, setBudget] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!token) throw new Error('Not authenticated');

            await projectsApi.create({
                title,
                description,
                freelancer_email: freelancerEmail,
                budget_usdc: parseFloat(budget)
            }, token);

            router.push('/client');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create project');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
                <p className="text-muted">The Architect Agent will convert your description into structured requirements</p>
            </div>

            <form onSubmit={handleSubmit} className="glass-card p-8">
                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium mb-2">
                            Project Title
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="input"
                            placeholder="E-commerce Landing Page"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium mb-2">
                            Description
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="input min-h-[150px] resize-none"
                            placeholder="Describe your project. Be as detailed as you like - our Architect Agent will help refine the requirements."
                            required
                        />
                        <p className="text-xs text-muted mt-2">
                            💡 The Architect Agent will analyze this and generate acceptance criteria
                        </p>
                    </div>

                    <div>
                        <label htmlFor="freelancer" className="block text-sm font-medium mb-2">
                            Freelancer Email
                        </label>
                        <input
                            id="freelancer"
                            type="email"
                            value={freelancerEmail}
                            onChange={(e) => setFreelancerEmail(e.target.value)}
                            className="input"
                            placeholder="freelancer@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="budget" className="block text-sm font-medium mb-2">
                            Budget (USDC)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
                            <input
                                id="budget"
                                type="number"
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                className="input pl-8"
                                placeholder="500"
                                min="1"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 mt-8">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="btn btn-secondary flex-1"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary flex-1"
                    >
                        {loading ? (
                            <span className="animate-pulse">Creating...</span>
                        ) : (
                            <>
                                <span>🚀</span>
                                Create Project
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Info Card */}
            <div className="glass-card p-6 mt-6">
                <h3 className="font-semibold mb-3">What happens next?</h3>
                <div className="space-y-3 text-sm text-muted">
                    <div className="flex gap-3">
                        <span className="text-primary">1.</span>
                        <span>🏗️ Architect Agent generates structured requirements</span>
                    </div>
                    <div className="flex gap-3">
                        <span className="text-primary">2.</span>
                        <span>The freelancer receives the project and starts working</span>
                    </div>
                    <div className="flex gap-3">
                        <span className="text-primary">3.</span>
                        <span>🔍 Critic Agent verifies each submission (score ≥ 8 = visible to you)</span>
                    </div>
                    <div className="flex gap-3">
                        <span className="text-primary">4.</span>
                        <span>📧 Mediator Agent notifies you when quality work is ready</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
