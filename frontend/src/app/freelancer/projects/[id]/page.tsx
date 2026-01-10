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
    const [files, setFiles] = useState<{ filename: string; content: string; language: string }[]>([]);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [folderUploading, setFolderUploading] = useState(false);

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

    const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = event.target.files;
        if (!fileList || fileList.length === 0) return;
        
        setFolderUploading(true);
        const uploadedFiles: { filename: string; content: string; language: string }[] = [];
        
        // Define file extensions we want to include (skip node_modules, .git, etc.)
        const allowedExtensions = [
            'js', 'jsx', 'ts', 'tsx', 'vue', 'svelte',
            'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs',
            'html', 'css', 'scss', 'sass', 'less',
            'json', 'yaml', 'yml', 'xml', 'toml',
            'md', 'txt', 'env', 'gitignore', 'dockerfile',
            'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'
        ];
        
        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            const relativePath = file.webkitRelativePath || file.name;
            
            // Skip unwanted directories and files
            if (relativePath.includes('node_modules/') || 
                relativePath.includes('.git/') || 
                relativePath.includes('dist/') || 
                relativePath.includes('build/') ||
                relativePath.includes('.next/') ||
                relativePath.includes('coverage/') ||
                relativePath.startsWith('.')) {
                continue;
            }
            
            const extension = file.name.split('.').pop()?.toLowerCase() || '';
            if (!allowedExtensions.includes(extension)) continue;
            
            try {
                const content = await readFileContent(file);
                const language = detectLanguage(extension);
                
                uploadedFiles.push({
                    filename: relativePath,
                    content,
                    language
                });
            } catch (error) {
                console.error(`Error reading file ${relativePath}:`, error);
            }
        }
        
        setFiles(uploadedFiles);
        setFolderUploading(false);
    };
    
    const readFileContent = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            // Check if it's an image file
            const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'];
            const isImage = imageExtensions.includes(file.name.split('.').pop()?.toLowerCase() || '');
            
            if (isImage) {
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            } else {
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = reject;
                reader.readAsText(file);
            }
        });
    };
    
    const detectLanguage = (extension: string): string => {
        const languageMap: Record<string, string> = {
            'js': 'javascript',
            'jsx': 'jsx',
            'ts': 'typescript',
            'tsx': 'tsx',
            'vue': 'vue',
            'svelte': 'svelte',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'less': 'less',
            'json': 'json',
            'yaml': 'yaml',
            'yml': 'yaml',
            'xml': 'xml',
            'toml': 'toml',
            'md': 'markdown',
            'txt': 'text',
            'env': 'bash',
            'dockerfile': 'dockerfile',
            'png': 'image',
            'jpg': 'image',
            'jpeg': 'image',
            'gif': 'image',
            'svg': 'image',
            'webp': 'image',
            'ico': 'image'
        };
        
        return languageMap[extension] || 'text';
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

        if (files.length === 0) {
            setError('Please upload a folder with your project files');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            await revisionsApi.submit({
                project_id: id as string,
                files: files,  // Use all uploaded files
                notes
            }, token);
            
            // Refresh data
            const revisionsRes = await revisionsApi.list(id as string, token);
            setRevisions(revisionsRes.revisions);
            setShowSubmitForm(false);
            setFiles([]);
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
                            📤 Submit Work
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
                        <div className="glass-card p-6">
                            <h2 className="text-xl font-semibold mb-4">Requirements</h2>
                            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-muted">
                                {project.requirements.structured_brief}
                            </div>

                            {project.requirements.acceptance_criteria && project.requirements.acceptance_criteria.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="font-semibold mb-3">Acceptance Criteria</h3>
                                    <ul className="space-y-2">
                                        {project.requirements.acceptance_criteria.map((criterion, i) => (
                                            <li key={i} className="flex items-start gap-3 text-sm text-muted">
                                                <span className="text-primary mt-0.5">○</span>
                                                {criterion}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {project.requirements.technical_stack && project.requirements.technical_stack.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="font-semibold mb-3">Tech Stack</h3>
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
                    <div className="glass-card p-6">
                        <h2 className="text-xl font-semibold mb-4">My Submissions</h2>

                        {revisions.length === 0 ? (
                            <div className="text-center py-8 text-muted">
                                <div className="text-3xl mb-2">📝</div>
                                <p>No submissions yet</p>
                                <p className="text-sm">Click "Submit Work" to upload your first revision</p>
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
                                            {revision.critic_score > 0 && (
                                                <ScoreBadge score={revision.critic_score} size="sm" />
                                            )}
                                        </div>

                                        {revision.notes && (
                                            <p className="text-sm text-muted mb-3">{revision.notes}</p>
                                        )}

                                        <div className="text-sm mb-3">
                                            <span className="text-muted">Files: </span>
                                            {revision.files.map(f => f.filename).join(', ')}
                                        </div>

                                        {/* Feedback Section */}
                                        {revision.critic_feedback && (
                                            <div className="mt-4 pt-4 border-t border-border">
                                                <div className="text-sm font-medium mb-2 flex items-center gap-2">
                                                    🔍 Critic Feedback
                                                </div>
                                                <p className="text-sm text-muted mb-3">{revision.critic_feedback}</p>

                                                {revision.blockers && revision.blockers.length > 0 && (
                                                    <div className="mb-3">
                                                        <div className="text-xs font-medium text-danger mb-1">Blockers:</div>
                                                        <ul className="text-sm text-muted space-y-1">
                                                            {revision.blockers.map((b, i) => (
                                                                <li key={i} className="flex items-start gap-2">
                                                                    <span className="text-danger">•</span> {b}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {revision.suggestions && revision.suggestions.length > 0 && (
                                                    <div>
                                                        <div className="text-xs font-medium text-warning mb-1">Suggestions:</div>
                                                        <ul className="text-sm text-muted space-y-1">
                                                            {revision.suggestions.map((s, i) => (
                                                                <li key={i} className="flex items-start gap-2">
                                                                    <span className="text-warning">•</span> {s}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Status indicators */}
                                        <div className="mt-3 flex items-center gap-3 text-xs">
                                            {revision.visible_to_client ? (
                                                <span className="text-success flex items-center gap-1">
                                                    ✓ Visible to client
                                                </span>
                                            ) : (
                                                <span className="text-muted flex items-center gap-1">
                                                    ○ Not visible to client (score &lt; 8)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
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
                        <h3 className="font-semibold mb-2">🎯 Gatekeeper Rules</h3>
                        <p className="text-sm text-muted">
                            Your work is reviewed by the Critic Agent. Only submissions scoring <span className="text-success font-medium">≥ 8/10</span> are shown to the client.
                        </p>
                    </div>
                </div>
            </div>

            {/* Submit Work Modal */}
            {showSubmitForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6 overflow-auto">
                    <div className="glass-card p-6 max-w-4xl w-full my-8">
                        <h3 className="text-xl font-semibold mb-4">Submit Work</h3>

                        {/* Folder Upload */}
                        <div className="mb-6">
                            {files.length === 0 ? (
                                <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center">
                                    <div className="text-4xl mb-4">📁</div>
                                    <h4 className="text-lg font-semibold mb-2">Upload Your Project Folder</h4>
                                    <p className="text-muted mb-4">Select your project folder to automatically upload all relevant files</p>
                                    
                                    <label className="btn btn-primary cursor-pointer">
                                        {folderUploading ? (
                                            <span className="animate-pulse">📤 Processing Files...</span>
                                        ) : (
                                            <>📂 Choose Folder</>
                                        )}
                                        <input
                                            type="file"
                                            className="hidden"
                                            webkitdirectory=""
                                            multiple
                                            onChange={handleFolderUpload}
                                            disabled={folderUploading}
                                        />
                                    </label>
                                    
                                    <div className="mt-4 text-xs text-muted">
                                        <p>• Automatically skips node_modules, .git, dist, build folders</p>
                                        <p>• Supports code files, images, configs, and documentation</p>
                                        <p>• AI agent will analyze all uploaded files</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-semibold">📁 Uploaded Files ({files.length})</h4>
                                        <button
                                            onClick={() => setFiles([])}
                                            className="btn btn-secondary btn-sm"
                                        >
                                            🗑️ Clear All
                                        </button>
                                    </div>
                                    
                                    <div className="max-h-64 overflow-y-auto space-y-2 p-4 bg-card/50 rounded-lg border border-border">
                                        {files.map((file, index) => (
                                            <div key={index} className="flex items-center gap-3 text-sm p-2 hover:bg-card/80 rounded">
                                                <span className="text-primary font-mono text-xs flex-shrink-0">
                                                    {file.language === 'image' ? '🖼️' : '📄'}
                                                </span>
                                                <span className="flex-1 truncate font-mono">{file.filename}</span>
                                                <span className="text-muted text-xs bg-muted/10 px-2 py-1 rounded">
                                                    {file.language}
                                                </span>
                                                <span className="text-muted text-xs">
                                                    {file.language === 'image' ? 'Image' : `${file.content.length} chars`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="flex justify-center">
                                        <label className="btn btn-secondary cursor-pointer">
                                            📂 Choose Different Folder
                                            <input
                                                type="file"
                                                className="hidden"
                                                webkitdirectory=""
                                                multiple
                                                onChange={handleFolderUpload}
                                            />
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

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
                                disabled={submitting || files.length === 0}
                                className="btn btn-primary flex-1"
                            >
                                {submitting ? (
                                    <span className="animate-pulse">Submitting...</span>
                                ) : (
                                    '🚀 Submit for Review'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
