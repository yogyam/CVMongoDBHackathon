import Link from 'next/link';
import { Project } from '@/lib/api';

interface ProjectCardProps {
    project: Project;
    role: 'CLIENT' | 'FREELANCER';
}

const statusConfig: Record<string, { label: string; class: string }> = {
    CREATED: { label: 'Created', class: 'badge-secondary' },
    REQUIREMENTS_GENERATED: { label: 'Requirements Ready', class: 'badge-primary' },
    IN_PROGRESS: { label: 'In Progress', class: 'badge-warning' },
    IN_REVIEW: { label: 'In Review', class: 'badge-primary' },
    APPROVED: { label: 'Approved', class: 'badge-success' },
    COMPLETED: { label: 'Completed', class: 'badge-success' },
};

export function ProjectCard({ project, role }: ProjectCardProps) {
    const status = statusConfig[project.status] || { label: project.status, class: 'badge-secondary' };
    const href = role === 'CLIENT'
        ? `/client/projects/${project._id || project.id}`
        : `/freelancer/projects/${project._id || project.id}`;

    return (
        <Link href={href} className="block">
            <div className="glass-card p-6 animate-fade-in">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="text-xs text-muted font-mono mb-1">{project.project_code}</div>
                        <h3 className="text-lg font-semibold truncate">{project.title}</h3>
                    </div>
                    <span className={`badge ${status.class} shrink-0`}>{status.label}</span>
                </div>

                <div className="flex items-center gap-6 text-sm text-muted">

                    {project.current_revision !== undefined && project.current_revision > 0 && (
                        <div className="flex items-center gap-2">
                            <span>📝</span>
                            <span>Rev #{project.current_revision}</span>
                        </div>
                    )}

                    {project.highest_score !== undefined && project.highest_score > 0 && (
                        <div className="flex items-center gap-2">
                            <span>⭐</span>
                            <span>{Math.round(project.highest_score * 10)}/10</span>
                        </div>
                    )}
                </div>

                {project.requirements?.estimated_hours && (
                    <div className="mt-4 pt-4 border-t border-border text-sm text-muted">
                        <span>⏱️ Est. {project.requirements.estimated_hours} hours</span>
                    </div>
                )}
            </div>
        </Link>
    );
}
