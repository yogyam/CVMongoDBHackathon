'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { projects as projectsApi, revisions as revisionsApi, Project, Revision } from '@/lib/api';
import { ScoreBadge } from '@/components';

export default function FreelancerProjectDetailPage() {
    const { id } = useParams();
    const { token } = useAuth();
    const router = useRouter();

    const [project, setProject] = useState<Project | null>(null);
    const [revisions, setRevisions] = useState<Revision[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Submit form state
    const [showSubmitForm, setShowSubmitForm] = useState(false);
    const [files, setFiles] = useState([{ filename: '', content: '', language: 'javascript' }]);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

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

    const handleAddFile = () => {
        setFiles([...files, { filename: '', content: '', language: 'javascript' }]);
    };

    const handleRemoveFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleFileChange = (index: number, field: string, value: string) => {
        const updated = [...files];
        updated[index] = { ...updated[index], [field]: value };
        setFiles(updated);
    };

    const handleFileUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const filename = file.name;
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        
        // Check if it's an image file
        const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'];
        const isImage = imageExtensions.includes(ext);

        const reader = new FileReader();
        
        if (isImage) {
            // For images, read as base64 data URL
            reader.onload = (e) => {
                const content = e.target?.result as string; // base64 data URL
                const updated = [...files];
                updated[index] = {
                    filename,
                    content, // Store base64 data URL
                    language: 'image' // Special language marker for images
                };
                setFiles(updated);
            };
            reader.readAsDataURL(file);
        } else {
            // For text files, read as text
            reader.onload = (e) => {
                const content = e.target?.result as string;
                
                // Detect language from extension
                const languageMap: Record<string, string> = {
                    'js': 'javascript',
                    'jsx': 'jsx',
                    'ts': 'typescript',
                    'tsx': 'tsx',
                    'py': 'python',
                    'html': 'html',
                    'css': 'css',
                    'scss': 'css',
                    'sass': 'css',
                    'json': 'json',
                    'md': 'markdown',
                    'java': 'java',
                    'cpp': 'cpp',
                    'c': 'c',
                    'go': 'go',
                    'rs': 'rust',
                    'rb': 'ruby',
                    'php': 'php',
                    'swift': 'swift',
                    'kt': 'kotlin',
                };
                const detectedLanguage = languageMap[ext] || 'javascript';

                // Update the file entry
                const updated = [...files];
                updated[index] = {
                    filename,
                    content,
                    language: detectedLanguage
                };
                setFiles(updated);
            };
            reader.readAsText(file);
        }

        // Reset input so same file can be selected again
        event.target.value = '';
    };

    const handleSubmit = async () => {
        if (!token) return;

        const validFiles = files.filter(f => f.filename && f.content);
        if (validFiles.length === 0) {
            setError('Please add at least one file');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            await revisionsApi.submit({
                project_id: id as string,
                files: validFiles,
                notes
            }, token);

            // Refresh data
            const revisionsRes = await revisionsApi.list(id as string, token);
            setRevisions(revisionsRes.revisions);
            setShowSubmitForm(false);
            setFiles([{ filename: '', content: '', language: 'javascript' }]);
            setNotes('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit work');
        } finally {
            setSubmitting(false);
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

    if (!project) {
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
                <div className="flex items-center gap-4">
                    <div className="badge badge-primary">{project.status.replace(/_/g, ' ')}</div>
                    {['REQUIREMENTS_GENERATED', 'IN_PROGRESS', 'IN_REVIEW'].includes(project.status) && (
                        <button
                            onClick={() => setShowSubmitForm(true)}
                            className="btn btn-primary"
                        >
                            Submit Work
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Requirements */}
                    {project.requirements && (
                        <div className="glass-card p-6 border-l-2 border-l-primary">
                            <h2 className="text-xl font-semibold mb-4 text-primary">Requirements</h2>
                            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-muted">
                                {project.requirements.structured_brief}
                            </div>

                            {project.requirements.acceptance_criteria && project.requirements.acceptance_criteria.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="font-semibold mb-3 text-foreground">Acceptance Criteria</h3>
                                    <ul className="space-y-2">
                                        {project.requirements.acceptance_criteria.map((criterion, i) => (
                                            <li key={i} className="flex items-start gap-3 text-sm">
                                                <span className="text-primary mt-0.5 font-bold">•</span>
                                                <span className="text-foreground">{criterion}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {project.requirements.technical_stack && project.requirements.technical_stack.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="font-semibold mb-3 text-foreground">Tech Stack</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {project.requirements.technical_stack.map((tech, i) => (
                                            <span key={i} className="badge badge-secondary">{tech}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Revisions */}
                    <div className="glass-card p-6 border-l-2 border-l-secondary">
                        <h2 className="text-xl font-semibold mb-4 text-secondary">My Submissions</h2>

                        {revisions.length === 0 ? (
                            <div className="text-center py-8 text-muted">
                                <p>No submissions yet</p>
                                <p className="text-sm">Click "Submit Work" to upload your first revision</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {revisions.map((revision) => {
                                    const score = revision.critic_score;
                                    const borderColor = revision.status === 'PENDING_REVIEW' 
                                        ? 'border-info/30' 
                                        : score >= 0.8 
                                            ? 'border-success/30' 
                                            : score >= 0.5 
                                                ? 'border-warning/30' 
                                                : score > 0 
                                                    ? 'border-danger/30' 
                                                    : 'border-border';
                                    
                                    return (
                                    <div key={revision._id} className={`p-4 rounded-xl bg-card border ${borderColor}`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <div className="font-semibold">Revision #{revision.revision_number}</div>
                                                <div className="text-sm text-muted">
                                                    {new Date(revision.submitted_at).toLocaleString()}
                                                </div>
                                            </div>
                                            {/* Always show score */}
                                            <div className="flex flex-col items-end gap-2">
                                                {revision.status === 'PENDING_REVIEW' ? (
                                                    <div className="px-3 py-1 rounded text-xs bg-info/10 border border-info/30 text-info">
                                                        Pending Review
                                                    </div>
                                                ) : revision.critic_score > 0 ? (
                                                    <>
                                                        <ScoreBadge score={revision.critic_score} size="sm" />
                                                        <div className={`text-xs font-medium ${
                                                            score >= 0.8 ? 'text-success' : 
                                                            score >= 0.5 ? 'text-warning' : 'text-danger'
                                                        }`}>
                                                            {Math.round(revision.critic_score * 10)}/10
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-xs text-muted">No score yet</div>
                                                )}
                                            </div>
                                        </div>

                                        {revision.notes && (
                                            <p className="text-sm text-muted mb-3">{revision.notes}</p>
                                        )}

                                        <div className="text-sm mb-3">
                                            <span className="text-muted">Files: </span>
                                            {revision.files.map(f => f.filename).join(', ')}
                                        </div>

                                        {/* Score and Missing Items Section */}
                                        {revision.status === 'REVIEWED' && (
                                            <div className="mt-4 pt-4 border-t border-border space-y-4">
                                                {/* What's Missing Section - Blockers */}
                                                {revision.blockers && revision.blockers.length > 0 && (
                                                    <div className="p-3 bg-danger/10 border border-danger/30 rounded">
                                                        <div className="text-sm font-semibold text-danger mb-2">
                                                            What's Missing
                                                        </div>
                                                        <ul className="text-sm space-y-2">
                                                            {revision.blockers.map((b, i) => (
                                                                <li key={i} className="flex items-start gap-2 text-foreground">
                                                                    <span className="text-danger mt-0.5">•</span>
                                                                    <span>{b}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        <div className="text-xs text-muted mt-2">
                                                            Fix these issues to improve your score
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Suggestions */}
                                                {revision.suggestions && revision.suggestions.length > 0 && (
                                                    <div className="p-3 bg-warning/5 border border-warning/20 rounded">
                                                        <div className="text-sm font-medium mb-2 text-warning">Improvements</div>
                                                        <ul className="text-sm space-y-1">
                                                            {revision.suggestions.map((s, i) => (
                                                                <li key={i} className="flex items-start gap-2 text-foreground">
                                                                    <span className="text-warning mt-0.5">•</span> {s}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Feedback */}
                                                {revision.critic_feedback && (
                                                    <div className="p-3 bg-primary/5 border border-primary/20 rounded">
                                                        <div className="text-sm font-medium mb-2 text-primary">Feedback</div>
                                                        <p className="text-sm text-foreground">{revision.critic_feedback}</p>
                                                    </div>
                                                )}

                                                {/* Success message if no blockers */}
                                                {(!revision.blockers || revision.blockers.length === 0) && (
                                                    <div className="p-3 bg-success/10 border border-success/30 rounded">
                                                        <div className="text-sm font-semibold text-success mb-1">
                                                            No Critical Issues
                                                        </div>
                                                        <p className="text-xs text-muted">
                                                            Your submission doesn't have any blockers. {revision.visible_to_client 
                                                                ? 'This work is visible to the client.' 
                                                                : 'Keep improving to reach the 8/10 threshold.'}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Pending Review State */}
                                        {revision.status === 'PENDING_REVIEW' && (
                                            <div className="mt-4 pt-4 border-t border-border">
                                                <div className="p-3 bg-info/10 border border-info/30 rounded">
                                                    <div className="text-sm font-medium text-info mb-1">Review in Progress</div>
                                                    <p className="text-xs text-muted">
                                                        Your submission is being reviewed by the Critic Agent. You'll receive detailed feedback once the review is complete.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Status indicators */}
                                        <div className="mt-3 flex items-center gap-3 text-xs">
                                            {revision.visible_to_client ? (
                                                <span className="px-2 py-1 rounded bg-success/10 border border-success/30 text-success font-medium">
                                                    Visible to client
                                                </span>
                                            ) : revision.status === 'REVIEWED' ? (
                                                <span className="px-2 py-1 rounded bg-muted/10 border border-border text-muted">
                                                    Not visible to client (score &lt; 8)
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="glass-card p-6">
                        <h3 className="font-semibold mb-4">Project Info</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted">Budget</span>
                                <span className="font-medium">${project.budget_usdc} USDC</span>
                            </div>
                            {project.requirements?.estimated_hours && (
                                <div className="flex justify-between">
                                    <span className="text-muted">Est. Hours</span>
                                    <span>{project.requirements.estimated_hours}h</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted">Revisions</span>
                                <span>{revisions.length}</span>
                            </div>
                            {project.highest_score && (
                                <div className="flex justify-between">
                                    <span className="text-muted">Best Score</span>
                                    <span className="text-success">{Math.round(project.highest_score * 10)}/10</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Gatekeeper Info */}
                    <div className="glass-card p-6 border-l-4 border-l-primary">
                        <h3 className="font-semibold mb-2">Gatekeeper Rules</h3>
                        <p className="text-sm text-muted">
                            Your work is reviewed by the Critic Agent. Only submissions scoring <span className="text-success font-medium">≥ 8/10</span> are shown to the client.
                        </p>
                    </div>
                </div>
            </div>

            {/* Submit Work Modal */}
            {showSubmitForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6 overflow-auto">
                    <div className="glass-card p-6 max-w-3xl w-full my-8">
                        <h3 className="text-xl font-semibold mb-4">Submit Work</h3>

                        {/* Files */}
                        <div className="space-y-4 mb-6">
                            {files.map((file, index) => (
                                <div key={index} className="p-4 rounded-lg bg-card border border-border">
                                    <div className="flex items-center gap-4 mb-3">
                                        <input
                                            type="text"
                                            value={file.filename}
                                            onChange={(e) => handleFileChange(index, 'filename', e.target.value)}
                                            className="input flex-1"
                                            placeholder="filename.js"
                                        />
                                        <select
                                            value={file.language}
                                            onChange={(e) => handleFileChange(index, 'language', e.target.value)}
                                            className="input w-40"
                                            disabled={file.language === 'image'}
                                        >
                                            <option value="javascript">JavaScript</option>
                                            <option value="typescript">TypeScript</option>
                                            <option value="python">Python</option>
                                            <option value="html">HTML</option>
                                            <option value="css">CSS</option>
                                            <option value="jsx">JSX</option>
                                            <option value="tsx">TSX</option>
                                            <option value="json">JSON</option>
                                            <option value="markdown">Markdown</option>
                                            <option value="image">Image</option>
                                        </select>
                                        <label className="btn btn-secondary cursor-pointer text-sm whitespace-nowrap">
                                            Upload
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={(e) => handleFileUpload(index, e)}
                                                accept=".js,.jsx,.ts,.tsx,.py,.html,.css,.scss,.sass,.json,.md,.java,.cpp,.c,.go,.rs,.rb,.php,.swift,.kt,.png,.jpg,.jpeg,.gif,.svg,.webp,.bmp"
                                            />
                                        </label>
                                        {files.length > 1 && (
                                            <button
                                                onClick={() => handleRemoveFile(index)}
                                                className="text-danger hover:text-danger/80"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                    {file.language === 'image' && file.content ? (
                                        <div className="border border-border rounded p-4 bg-card">
                                            <img 
                                                src={file.content} 
                                                alt={file.filename}
                                                className="max-w-full max-h-64 mx-auto rounded"
                                            />
                                            <div className="mt-2 text-xs text-muted text-center">
                                                Image loaded (Base64)
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <textarea
                                                value={file.content}
                                                onChange={(e) => handleFileChange(index, 'content', e.target.value)}
                                                className="input min-h-[150px] font-mono text-sm resize-none"
                                                placeholder="Upload a file or paste your code here..."
                                            />
                                            {file.content && (
                                                <div className="mt-2 text-xs text-muted">
                                                    {file.content.length} characters
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleAddFile}
                            className="btn btn-secondary w-full mb-6"
                        >
                            + Add Another File
                        </button>

                        {/* Notes */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="input min-h-[80px] resize-none"
                                placeholder="Describe what you've implemented..."
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSubmitForm(false)}
                                className="btn btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="btn btn-primary flex-1"
                            >
                                {submitting ? (
                                    <span className="animate-pulse">Submitting...</span>
                                ) : (
                                    'Submit for Review'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
