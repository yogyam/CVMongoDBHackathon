'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { projects as projectsApi, Project } from '@/lib/api';
import { ProjectCard } from '@/components';

export default function ClientDashboard() {
    const { token } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (token) {
            projectsApi.list(token)
                .then(res => setProjects(res.projects))
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [token]);

    const activeProjects = projects.filter(p => !['COMPLETED', 'APPROVED'].includes(p.status));
    const completedProjects = projects.filter(p => ['COMPLETED', 'APPROVED'].includes(p.status));

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Mission Control</h1>
                <p className="text-muted">Monitor your projects and agent activity</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="glass-card p-5">
                    <div className="text-3xl font-bold text-foreground">{projects.length}</div>
                    <div className="text-sm text-muted">Total Projects</div>
                </div>
                <div className="glass-card p-5">
                    <div className="text-3xl font-bold text-warning">{activeProjects.length}</div>
                    <div className="text-sm text-muted">Active</div>
                </div>
                <div className="glass-card p-5">
                    <div className="text-3xl font-bold text-success">{completedProjects.length}</div>
                    <div className="text-sm text-muted">Completed</div>
                </div>
                <div className="glass-card p-5">
                    <div className="text-3xl font-bold text-secondary">
                        ${projects.reduce((sum, p) => sum + (p.budget_usdc || 0), 0)}
                    </div>
                    <div className="text-sm text-muted">Total Budget</div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger">
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading ? (
                <div className="glass-card p-12 text-center">
                    <div className="animate-pulse text-primary text-xl">Loading projects...</div>
                </div>
            ) : projects.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
                    <p className="text-muted mb-6">Create your first project to get started</p>
                    <a href="/client/projects/new" className="btn btn-primary">
                        Create Project
                    </a>
                </div>
            ) : (
                <>
                    {/* Active Projects */}
                    {activeProjects.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold mb-4">Active Projects</h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {activeProjects.map((project, i) => (
                                    <div key={project._id || project.id} style={{ animationDelay: `${i * 0.1}s` }}>
                                        <ProjectCard project={project} role="CLIENT" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Completed Projects */}
                    {completedProjects.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Completed</h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {completedProjects.map((project, i) => (
                                    <div key={project._id || project.id} style={{ animationDelay: `${i * 0.1}s` }}>
                                        <ProjectCard project={project} role="CLIENT" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
