'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { projects as projectsApi, Project } from '@/lib/api';
import { ProjectCard } from '@/components';
import Link from 'next/link';

export default function ClientProjectsPage() {
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
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">My Projects</h1>
                    <p className="text-muted">View and manage all your projects</p>
                </div>
                <Link href="/client/projects/new" className="btn btn-primary">
                    Create New Project
                </Link>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-pulse text-primary text-xl">Loading projects...</div>
                </div>
            ) : error ? (
                <div className="glass-card p-6 text-center">
                    <div className="text-danger mb-2">Error loading projects</div>
                    <p className="text-muted">{error}</p>
                </div>
            ) : projects.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
                    <p className="text-muted mb-6">Get started by creating your first project</p>
                    <Link href="/client/projects/new" className="btn btn-primary">
                        Create Your First Project
                    </Link>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Active Projects */}
                    {activeProjects.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Active Projects</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {activeProjects.map((project, i) => (
                                    <ProjectCard key={project._id || project.id || i} project={project} role="CLIENT" />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Completed Projects */}
                    {completedProjects.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Completed Projects</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {completedProjects.map((project, i) => (
                                    <ProjectCard key={project._id || project.id || i} project={project} role="CLIENT" />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
