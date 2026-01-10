'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { projects as projectsApi, Project } from '@/lib/api';
import { ProjectCard } from '@/components';

export default function FreelancerDashboard() {
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

    const needsWork = projects.filter(p => ['REQUIREMENTS_GENERATED', 'IN_PROGRESS'].includes(p.status));
    const inReview = projects.filter(p => p.status === 'IN_REVIEW');
    const completed = projects.filter(p => ['COMPLETED', 'APPROVED'].includes(p.status));

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">My Workspace</h1>
                <p className="text-muted">View assigned projects and submit your work</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="glass-card p-5">
                    <div className="text-3xl font-bold gradient-text">{projects.length}</div>
                    <div className="text-sm text-muted">Assigned Projects</div>
                </div>
                <div className="glass-card p-5">
                    <div className="text-3xl font-bold text-warning">{needsWork.length}</div>
                    <div className="text-sm text-muted">Needs Work</div>
                </div>
                <div className="glass-card p-5">
                    <div className="text-3xl font-bold text-primary">{inReview.length}</div>
                    <div className="text-sm text-muted">In Review</div>
                </div>
                <div className="glass-card p-5">
                    <div className="text-3xl font-bold text-success">{completed.length}</div>
                    <div className="text-sm text-muted">Completed</div>
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
                    <div className="text-4xl mb-4">📬</div>
                    <h3 className="text-xl font-semibold mb-2">No projects assigned</h3>
                    <p className="text-muted">You&apos;ll see projects here when clients assign work to you</p>
                </div>
            ) : (
                <>
                    {/* Needs Work */}
                    {needsWork.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <span className="text-warning">⚡</span>
                                Ready to Work
                            </h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {needsWork.map((project, i) => (
                                    <div key={project._id || project.id} style={{ animationDelay: `${i * 0.1}s` }}>
                                        <ProjectCard project={project} role="FREELANCER" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* In Review */}
                    {inReview.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <span className="text-primary">🔍</span>
                                Under Review
                            </h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {inReview.map((project, i) => (
                                    <div key={project._id || project.id} style={{ animationDelay: `${i * 0.1}s` }}>
                                        <ProjectCard project={project} role="FREELANCER" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Completed */}
                    {completed.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <span className="text-success">✓</span>
                                Completed
                            </h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {completed.map((project, i) => (
                                    <div key={project._id || project.id} style={{ animationDelay: `${i * 0.1}s` }}>
                                        <ProjectCard project={project} role="FREELANCER" />
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
