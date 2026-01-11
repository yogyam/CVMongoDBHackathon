'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { projects } from '@/lib/api';

interface Project {
  _id: string;
  title: string;
  description: string;
  status: 'REQUIREMENTS_READY' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';
  estimatedHours: number;
  client: {
    full_name: string;
  };
  createdAt: string;
}

const statusColors = {
  'REQUIREMENTS_READY': 'badge-warning',
  'IN_PROGRESS': 'badge-primary',
  'IN_REVIEW': 'badge-secondary', 
  'COMPLETED': 'badge-success',
  'CANCELLED': 'badge-danger'
};

const statusLabels = {
  'REQUIREMENTS_READY': 'Ready to Work',
  'IN_PROGRESS': 'In Progress',
  'IN_REVIEW': 'In Review',
  'COMPLETED': 'Completed',
  'CANCELLED': 'Cancelled'
};

export default function FreelancerProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem('syntropy_token');
        if (!token) {
          setError('No authentication token found');
          return;
        }
        
        const response = await projects.list(token);
        // Handle the API response structure which has a projects array
        const projectsData = response.projects || response;
        
        // Filter projects assigned to this freelancer
        const freelancerProjects = projectsData.filter((project: any) => 
          project.freelancer?._id === user?._id
        );
        setProjects(freelancerProjects);
      } catch (err) {
        setError('Failed to load projects');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProjects();
    }
  }, [user]);

  const getStatusStats = () => {
    const stats = projects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      readyToWork: stats['REQUIREMENTS_READY'] || 0,
      inProgress: stats['IN_PROGRESS'] || 0,
      inReview: stats['IN_REVIEW'] || 0,
      completed: stats['COMPLETED'] || 0
    };
  };

  const stats = getStatusStats();

  if (loading) {
    return (
      <div className="main-content">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="glass-card p-6">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
            <p className="text-gray-600 mt-2">View assigned projects and submit your work</p>
          </div>
        </div>

        {error && (
          <div className="glass-card p-4 mb-6 border-l-4 border-red-500 bg-red-50">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6 text-center">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Ready to Work</h3>
            <div className="text-3xl font-bold text-amber-600">{stats.readyToWork}</div>
          </div>
          <div className="glass-card p-6 text-center">
            <h3 className="text-sm font-medium text-gray-600 mb-2">In Progress</h3>
            <div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div>
          </div>
          <div className="glass-card p-6 text-center">
            <h3 className="text-sm font-medium text-gray-600 mb-2">In Review</h3>
            <div className="text-3xl font-bold text-purple-600">{stats.inReview}</div>
          </div>
          <div className="glass-card p-6 text-center">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Completed</h3>
            <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
          </div>
        </div>

        {/* Projects List */}
        <div className="glass-card">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">All Projects</h2>
          </div>
          
          {projects.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects assigned</h3>
              <p className="text-gray-600 mb-6">You haven't been assigned any projects yet. Check back soon!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {projects.map((project) => (
                <div key={project._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Link 
                          href={`/freelancer/projects/${project._id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {project.title}
                        </Link>
                        <span className={`badge ${statusColors[project.status]}`}>
                          {statusLabels[project.status]}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>👤 {project.client.full_name}</span>
                        <span>⏱️ {project.estimatedHours} hours</span>
                        <span>📅 {new Date(project.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="ml-6">
                      <Link 
                        href={`/freelancer/projects/${project._id}`}
                        className="btn btn-primary"
                      >
                        View Project
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}