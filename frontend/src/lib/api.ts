// Use explicit URL to avoid env var issues
const API_BASE = typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080')
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080');

interface FetchOptions extends RequestInit {
    token?: string;
}

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { token, ...fetchOptions } = options;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE}${endpoint}`;
    console.log(`API Request: ${fetchOptions.method || 'GET'} ${url}`); // Debug log
    console.log(`API_BASE: ${API_BASE}`); // Debug log

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            console.error(`API Error: ${response.status} ${url}`, error); // Debug log
            throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    } catch (error) {
        console.error(`Fetch error for ${url}:`, error);
        throw error;
    }
}

// Auth
export const auth = {
    register: (data: { email: string; password: string; role: 'CLIENT' | 'FREELANCER'; full_name: string }) =>
        apiFetch<{ token: string; user: User }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

    login: (data: { email: string; password: string }) =>
        apiFetch<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),

    me: (token: string) =>
        apiFetch<{ user: User }>('/api/auth/me', { token }),
};

// Projects
export const projects = {
    list: (token: string) =>
        apiFetch<{ projects: Project[] }>('/api/projects', { token }),

    get: (id: string, token: string) =>
        apiFetch<{ project: Project }>(`/api/projects/${id}`, { token }),

    create: (data: { title: string; description: string; freelancer_email: string; budget_usdc: number }, token: string) =>
        apiFetch<{ project: Project }>('/api/projects', { method: 'POST', body: JSON.stringify(data), token }),

    approve: (id: string, revisionId: string, feedback: string, token: string) =>
        apiFetch('/api/projects/' + id + '/approve', { method: 'POST', body: JSON.stringify({ revision_id: revisionId, feedback }), token }),

    requestChanges: (id: string, revisionId: string, changes: string, token: string) =>
        apiFetch('/api/projects/' + id + '/request-changes', { method: 'POST', body: JSON.stringify({ revision_id: revisionId, changes_requested: changes }), token }),
};

// Revisions
export const revisions = {
    list: (projectId: string, token: string) =>
        apiFetch<{ revisions: Revision[]; total: number }>(`/api/revisions/${projectId}`, { token }),

    submit: (data: { project_id: string; files: { filename: string; content: string; language: string }[]; notes?: string }, token: string) =>
        apiFetch<{ revision: Revision }>('/api/revisions', { method: 'POST', body: JSON.stringify(data), token }),
};

// Types
export interface User {
    id: string;
    email: string;
    role: 'CLIENT' | 'FREELANCER';
    full_name: string;
    wallet_address?: string;
    wallet_network?: string;
}

export interface Project {
    id: string;
    _id?: string;
    project_code: string;
    title: string;
    raw_description?: string;
    status: 'CREATED' | 'REQUIREMENTS_GENERATED' | 'IN_PROGRESS' | 'IN_REVIEW' | 'APPROVED' | 'COMPLETED';
    budget_usdc: number;
    current_revision?: number;
    highest_score?: number;
    requirements?: {
        structured_brief: string;
        acceptance_criteria: string[];
        technical_stack: string[];
        estimated_hours: number;
    };
    created_at: string;
    freelancer_email?: string;
}

export interface Revision {
    _id: string;
    project_id: string;
    revision_number: number;
    files: { filename: string; content: string; language: string }[];
    notes: string;
    critic_score: number;
    critic_feedback: string;
    blockers: string[];
    suggestions: string[];
    visible_to_client: boolean;
    status: 'PENDING_REVIEW' | 'REVIEWED' | 'APPROVED' | 'REJECTED';
    submitted_at: string;
}
