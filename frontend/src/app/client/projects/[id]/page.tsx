'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { projects as projectsApi, revisions as revisionsApi, Project, Revision } from '@/lib/api';
import { ScoreBadge } from '@/components';

export default function ClientProjectDetailPage() {
    const { id } = useParams();
    const { token } = useAuth();
    const router = useRouter();

    const [project, setProject] = useState<Project | null>(null);
    const [revisions, setRevisions] = useState<Revision[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [showFeedbackModal, setShowFeedbackModal] = useState<'approve' | 'changes' | null>(null);
    const [selectedRevision, setSelectedRevision] = useState<Revision | null>(null);

    useEffect(() => {
        if (token && id) {
            Promise.all([
                projectsApi.get(id as string, token),
                revisionsApi.list(id as string, token)
            ])
                .then(([projectRes, revisionsRes]) => {
                    setProject(projectRes.project);
                    setRevisions(revisionsRes.revisions);
                })
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [token, id]);

    const handleApprove = async () => {
        if (!token || !selectedRevision) return;
        setActionLoading(true);
        try {
            await projectsApi.approve(id as string, selectedRevision._id, feedback, token);
            router.push('/client');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to approve');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRequestChanges = async () => {
        if (!token || !selectedRevision || !feedback) return;
        setActionLoading(true);
        try {
            await projectsApi.requestChanges(id as string, selectedRevision._id, feedback, token);
            setShowFeedbackModal(null);
            // Refresh data
            const revisionsRes = await revisionsApi.list(id as string, token);
            setRevisions(revisionsRes.revisions);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to request changes');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="animate-fade-in">
                <div className="glass-card p-12 text-center">
                    <div className="animate-pulse text-primary text-xl">Loading project...</div>
                </div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="animate-fade-in">
                <div className="glass-card p-12 text-center">
                    <div className="text-danger">{error || 'Project not found'}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <button onClick={() => router.back()} className="text-muted hover:text-foreground mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <div className="text-sm text-muted font-mono mb-1">{project.project_code}</div>
                    <h1 className="text-3xl font-bold">{project.title}</h1>
                </div>
                <div className="text-right">
                    <div className="badge badge-primary mb-2">{project.status.replace(/_/g, ' ')}</div>
                    <div className="text-2xl font-bold">${project.budget_usdc} <span className="text-sm text-muted">USDC</span></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Requirements */}
                    {project.requirements && (
                        <div className="glass-card p-6">
                            <h2 className="text-xl font-semibold mb-4">Requirements</h2>
                            <div className="prose prose-invert prose-sm max-w-none">
                                <p className="whitespace-pre-wrap text-muted">{project.requirements.structured_brief}</p>
                            </div>

                            {project.requirements.acceptance_criteria && project.requirements.acceptance_criteria.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="font-semibold mb-3">Acceptance Criteria</h3>
                                    <ul className="space-y-2">
                                        {project.requirements.acceptance_criteria.map((criterion, i) => (
                                            <li key={i} className="flex items-start gap-3 text-sm text-muted">
                                                <span className="text-success mt-0.5">✓</span>
                                                {criterion}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Revisions */}
                    <div className="glass-card p-6">
                        <h2 className="text-xl font-semibold mb-4">Verified Submissions</h2>

                        {revisions.length === 0 ? (
                            <div className="text-center py-8 text-muted">
                                <div className="text-3xl mb-2">📋</div>
                                <p>No verified submissions yet</p>
                                <p className="text-sm">You&apos;ll see work here once it passes quality verification (score ≥ 8)</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {revisions.map((revision) => (
                                    <div key={revision._id} className="p-4 rounded-xl bg-card border border-border">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <div className="font-semibold">Revision #{revision.revision_number}</div>
                                                <div className="text-sm text-muted">
                                                    {new Date(revision.submitted_at).toLocaleString()}
                                                </div>
                                            </div>
                                            <ScoreBadge score={revision.critic_score} size="sm" />
                                        </div>

                                        {revision.notes && (
                                            <p className="text-sm text-muted mb-3">{revision.notes}</p>
                                        )}

                                        <div className="text-sm mb-4">
                                            <span className="text-muted">Files: </span>
                                            {revision.files.map(f => f.filename).join(', ')}
                                        </div>

                                        {revision.status === 'REVIEWED' && (
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => {
                                                        setSelectedRevision(revision);
                                                        setShowFeedbackModal('approve');
                                                    }}
                                                    className="btn btn-primary flex-1"
                                                >
                                                    ✓ Approve
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedRevision(revision);
                                                        setShowFeedbackModal('changes');
                                                    }}
                                                    className="btn btn-secondary flex-1"
                                                >
                                                    Request Changes
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Project Info */}
                    <div className="glass-card p-6">
                        <h3 className="font-semibold mb-4">Project Info</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted">Status</span>
                                <span>{project.status.replace(/_/g, ' ')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Freelancer</span>
                                <span className="truncate ml-2">{project.freelancer_email}</span>
                            </div>
                            {project.requirements?.estimated_hours && (
                                <div className="flex justify-between">
                                    <span className="text-muted">Est. Hours</span>
                                    <span>{project.requirements.estimated_hours}h</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted">Current Revision</span>
                                <span>#{project.current_revision || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tech Stack */}
                    {project.requirements?.technical_stack && project.requirements.technical_stack.length > 0 && (
                        <div className="glass-card p-6">
                            <h3 className="font-semibold mb-4">Tech Stack</h3>
                            <div className="flex flex-wrap gap-2">
                                {project.requirements.technical_stack.map((tech, i) => (
                                    <span key={i} className="badge badge-secondary">{tech}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Feedback Modal */}
            {showFeedbackModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
                    <div className="glass-card p-6 max-w-md w-full">
                        <h3 className="text-xl font-semibold mb-4">
                            {showFeedbackModal === 'approve' ? 'Approve Work' : 'Request Changes'}
                        </h3>

                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="input min-h-[120px] resize-none mb-4"
                            placeholder={showFeedbackModal === 'approve' ? 'Optional feedback...' : 'Describe the changes needed...'}
                            required={showFeedbackModal === 'changes'}
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowFeedbackModal(null);
                                    setFeedback('');
                                }}
                                className="btn btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={showFeedbackModal === 'approve' ? handleApprove : handleRequestChanges}
                                disabled={actionLoading || (showFeedbackModal === 'changes' && !feedback)}
                                className="btn btn-primary flex-1"
                            >
                                {actionLoading ? 'Processing...' : showFeedbackModal === 'approve' ? 'Approve' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
