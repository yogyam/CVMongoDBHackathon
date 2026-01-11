'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { projects as projectsApi } from '@/lib/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ChatResponse {
    response: string;
    is_complete: boolean;
    gathered_info?: {
        has_tech_stack: boolean;
        has_features: boolean;
        has_timeline: boolean;
        has_design_preferences: boolean;
    };
    can_generate?: boolean;
}

export default function NewProjectPage() {
    const { token } = useAuth();
    const router = useRouter();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Project creation state
    const [step, setStep] = useState<'form' | 'chat' | 'generating'>('form');
    const [projectId, setProjectId] = useState<string | null>(null);

    // Form fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [freelancerEmail, setFreelancerEmail] = useState('');

    // Chat state
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [canGenerate, setCanGenerate] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!token) throw new Error('Not authenticated');

            const project = await projectsApi.create({
                title,
                description,
                freelancer_email: freelancerEmail
            }, token);

            setProjectId(project.project._id || project.project.id);
            setStep('chat');

            // Start the conversation
            await startConversation(project.project._id || project.project.id);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create project');
        } finally {
            setLoading(false);
        }
    };

    const startConversation = async (projId: string) => {
        try {
            setLoading(true);
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/chat/${projId}/start`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start conversation');
            }

            const data = await response.json();

            // Add initial messages
            setMessages([
                {
                    role: 'assistant',
                    content: data.response || 'Hello! I\'m the Architect Agent. I\'ll help you define your project requirements. Let me start by asking a few questions...',
                    timestamp: new Date(),
                }
            ]);
            setCanGenerate(data.is_complete || false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start conversation');
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!inputMessage.trim() || !projectId || loading) return;

        const userMessage: Message = {
            role: 'user',
            content: inputMessage.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setLoading(true);
        setError('');

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/chat/${projectId}/message`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message: userMessage.content }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send message');
            }

            const data: ChatResponse = await response.json();

            const assistantMessage: Message = {
                role: 'assistant',
                content: data.response,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
            setCanGenerate(data.is_complete || false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send message');
            // Remove user message on error
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setLoading(false);
        }
    };

    const generateRequirements = async () => {
        if (!projectId) return;

        setStep('generating');
        setIsGenerating(true);
        setError('');

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/chat/${projectId}/generate`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate requirements');
            }

            // Requirements generated successfully, redirect to project page
            router.push(`/client/projects/${projectId}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate requirements');
            setStep('chat');
        } finally {
            setIsGenerating(false);
        }
    };

    // Project creation form
    if (step === 'form') {
        return (
            <div className="max-w-2xl animate-fade-in">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
                    <p className="text-muted">Start by providing basic details. Our Architect Agent will help you refine the requirements through a conversation.</p>
                </div>

                <form onSubmit={handleCreateProject} className="glass-card p-8">
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
                                Initial Description
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="input min-h-[150px] resize-none"
                                placeholder="Describe your project idea. Don't worry about being too detailed - our Architect Agent will ask clarifying questions to create a complete requirements document."
                                required
                            />
                            <p className="text-xs text-muted mt-2">
                                💡 The Architect Agent will ask you questions to refine this into structured requirements
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
                                    Create Project & Start Chat
                                </>
                            )}
                        </button>
                    </div>
                </form >
            </div >
        );
    }

    // Chat interface
    if (step === 'chat') {
        return (
            <div className="max-w-4xl mx-auto animate-fade-in h-[calc(100vh-4rem)] flex flex-col">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold mb-2">🗣️ Chat with Architect Agent</h1>
                    <p className="text-muted text-sm">Discuss your project requirements. The agent will ask questions to create a complete specification.</p>
                </div>

                {/* Chat Messages */}
                <div className="glass-card flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {messages.length === 0 && !loading && (
                            <div className="text-center text-muted py-12">
                                Starting conversation...
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg p-4 ${msg.role === 'user'
                                        ? 'bg-primary/20 text-primary-foreground'
                                        : 'bg-card border border-border'
                                        }`}
                                >
                                    <div className="text-sm font-medium mb-1">
                                        {msg.role === 'user' ? 'You' : '🏗️ Architect Agent'}
                                    </div>
                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                    <div className="text-xs text-muted mt-2">
                                        {msg.timestamp.toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-card border border-border rounded-lg p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="animate-pulse">💭</div>
                                        <span className="text-muted">Architect Agent is thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Error display */}
                    {error && (
                        <div className="px-6 pb-4">
                            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
                                {error}
                            </div>
                        </div>
                    )}

                    {/* Input area */}
                    <div className="border-t border-border p-4">
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                placeholder="Type your message..."
                                className="input flex-1"
                                disabled={loading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={loading || !inputMessage.trim()}
                                className="btn btn-primary"
                            >
                                Send
                            </button>
                        </div>

                        {/* Generate requirements button */}
                        {canGenerate && (
                            <div className="mt-4 pt-4 border-t border-border">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-muted">
                                        ✅ The Architect Agent has gathered enough information
                                    </div>
                                    <button
                                        onClick={generateRequirements}
                                        className="btn btn-primary"
                                    >
                                        🎯 Generate Requirements Document
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Generating requirements
    if (step === 'generating') {
        return (
            <div className="max-w-2xl mx-auto animate-fade-in text-center py-20">
                <div className="glass-card p-12">
                    <div className="text-6xl mb-6 animate-pulse">🏗️</div>
                    <h2 className="text-2xl font-bold mb-4">Generating Requirements Document</h2>
                    <p className="text-muted mb-8">
                        The Architect Agent is creating a structured requirements document based on your conversation...
                    </p>
                    <div className="animate-pulse text-primary text-lg">
                        This may take a few moments...
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
