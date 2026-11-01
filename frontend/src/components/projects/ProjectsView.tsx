import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Project, Task, Department, ProjectStatus, TaskPriority, TaskStatus } from '../../types';
import {
  FolderKanban,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Edit3,
  Trash2,
  X,
  Search,
  Filter,
  Layers,
  AlertTriangle
} from 'lucide-react';

export const ProjectsView: React.FC = () => {
  const { user, accessToken } = useAuth();

  // Primary Data States
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Selected Project & Tasks Drawer
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Task Modal States
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Form Submitting State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Create/Edit Project Form Fields
  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    department_id: '',
    budget: '0',
    start_date: new Date().toISOString().split('T')[0],
    deadline: '',
    status: 'planning' as ProjectStatus,
  });

  // Add Task Form Fields
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    deadline: '',
    estimated_hours: '0',
    status: 'assigned' as TaskStatus,
    progress_percent: 0,
  });

  // Permissions
  const isManagerOrAdmin =
    user?.role &&
    ['super_admin', 'admin', 'department_manager', 'team_leader'].includes(user.role);
  const isAdmin = user?.role && ['super_admin', 'admin'].includes(user.role);

  // Fetch Projects & Departments
  const loadData = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [projData, deptData] = await Promise.all([
        api.getProjects(accessToken, {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchQuery.trim() || undefined,
          department_id: departmentFilter !== 'all' ? Number(departmentFilter) : undefined,
        }),
        api.getDepartments(accessToken),
      ]);
      setProjects(projData);
      setDepartments(deptData);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects from PostgreSQL database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken, statusFilter, departmentFilter]);

  // Handle Search Debounce or Submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Open Project Detail & Load Tasks
  const handleOpenProjectTasks = async (project: Project) => {
    setSelectedProject(project);
    setIsLoadingTasks(true);
    try {
      if (!accessToken) return;
      const tasks = await api.getProjectTasks(project.id, accessToken);
      setProjectTasks(tasks);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks for this project.');
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Create Project Submit
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.title.trim() || !projectForm.deadline) {
      setFormError('Project title and deadline are required.');
      return;
    }
    if (!accessToken) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      await api.createProject(
        {
          title: projectForm.title.trim(),
          description: projectForm.description.trim() || undefined,
          department_id: projectForm.department_id ? Number(projectForm.department_id) : undefined,
          budget: Number(projectForm.budget) || 0,
          start_date: projectForm.start_date || undefined,
          deadline: projectForm.deadline,
          status: projectForm.status,
        },
        accessToken
      );

      setIsCreateModalOpen(false);
      setSuccessMessage('Project successfully created in PostgreSQL.');
      setProjectForm({
        title: '',
        description: '',
        department_id: '',
        budget: '0',
        start_date: new Date().toISOString().split('T')[0],
        deadline: '',
        status: 'planning',
      });
      await loadData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (project: Project) => {
    setProjectToEdit(project);
    setProjectForm({
      title: project.title,
      description: project.description || '',
      department_id: project.department_id ? project.department_id.toString() : '',
      budget: project.budget.toString(),
      start_date: project.start_date || '',
      deadline: project.deadline,
      status: project.status,
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Edit Project Submit
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToEdit || !accessToken) return;
    if (!projectForm.title.trim() || !projectForm.deadline) {
      setFormError('Project title and deadline are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await api.updateProject(
        projectToEdit.id,
        {
          title: projectForm.title.trim(),
          description: projectForm.description.trim() || undefined,
          department_id: projectForm.department_id ? Number(projectForm.department_id) : undefined,
          budget: Number(projectForm.budget) || 0,
          start_date: projectForm.start_date || undefined,
          deadline: projectForm.deadline,
          status: projectForm.status,
        },
        accessToken
      );

      setIsEditModalOpen(false);
      setSuccessMessage('Project updated successfully.');
      await loadData();
      if (selectedProject?.id === projectToEdit.id) {
        const updated = await api.getProject(projectToEdit.id, accessToken);
        setSelectedProject(updated);
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to update project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Project Submit
  const handleDeleteProject = async () => {
    if (!projectToDelete || !accessToken) return;
    setIsSubmitting(true);
    try {
      await api.deleteProject(projectToDelete.id, accessToken);
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
      if (selectedProject?.id === projectToDelete.id) {
        setSelectedProject(null);
        setProjectTasks([]);
      }
      setSuccessMessage('Project deleted from database.');
      await loadData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Task Submit
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !accessToken) return;
    if (!taskForm.title.trim() || !taskForm.deadline) {
      setFormError('Task title and deadline are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await api.createProjectTask(
        selectedProject.id,
        {
          title: taskForm.title.trim(),
          description: taskForm.description.trim() || undefined,
          priority: taskForm.priority,
          deadline: taskForm.deadline,
          estimated_hours: Number(taskForm.estimated_hours) || 0,
          status: taskForm.status,
          progress_percent: Number(taskForm.progress_percent) || 0,
        },
        accessToken
      );

      setIsAddTaskModalOpen(false);
      setTaskForm({
        title: '',
        description: '',
        priority: 'medium',
        deadline: '',
        estimated_hours: '0',
        status: 'assigned',
        progress_percent: 0,
      });

      // Refresh tasks and project details
      const [updatedTasks, updatedProj] = await Promise.all([
        api.getProjectTasks(selectedProject.id, accessToken),
        api.getProject(selectedProject.id, accessToken),
      ]);
      setProjectTasks(updatedTasks);
      setSelectedProject(updatedProj);
      setSuccessMessage('Task added to project and sprint progress recalculated.');
      await loadData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to add task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Task Status / Approval Action
  const handleTaskApproval = async (taskId: number, status: 'approved' | 'rejected') => {
    if (!accessToken || !selectedProject) return;
    try {
      await api.updateTaskApproval(taskId, status, accessToken);
      const [updatedTasks, updatedProj] = await Promise.all([
        api.getProjectTasks(selectedProject.id, accessToken),
        api.getProject(selectedProject.id, accessToken),
      ]);
      setProjectTasks(updatedTasks);
      setSelectedProject(updatedProj);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update task approval.');
    }
  };

  // Quick Task Progress Advance
  const handleQuickProgress = async (task: Task, newProgress: number) => {
    if (!accessToken || !selectedProject) return;
    try {
      const nextStatus = newProgress === 100 ? 'under_review' : newProgress > 0 ? 'in_progress' : 'assigned';
      await api.updateTask(
        task.id,
        {
          progress_percent: newProgress,
          status: nextStatus,
        },
        accessToken
      );
      const [updatedTasks, updatedProj] = await Promise.all([
        api.getProjectTasks(selectedProject.id, accessToken),
        api.getProject(selectedProject.id, accessToken),
      ]);
      setProjectTasks(updatedTasks);
      setSelectedProject(updatedProj);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update task progress.');
    }
  };

  // Delete Task
  const handleDeleteTask = async () => {
    if (!taskToDelete || !accessToken || !selectedProject) return;
    try {
      await api.deleteTask(taskToDelete.id, accessToken);
      setTaskToDelete(null);
      const [updatedTasks, updatedProj] = await Promise.all([
        api.getProjectTasks(selectedProject.id, accessToken),
        api.getProject(selectedProject.id, accessToken),
      ]);
      setProjectTasks(updatedTasks);
      setSelectedProject(updatedProj);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete task.');
    }
  };

  // Helper styles for status badges
  const getStatusBadge = (status: ProjectStatus | string) => {
    switch (status) {
      case 'planning':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'in_review':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'on_hold':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getPriorityBadge = (priority: TaskPriority | string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'high':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'medium':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'low':
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-400 text-xs font-semibold mb-2">
            <FolderKanban className="w-3.5 h-3.5" />
            <span>PostgreSQL Verified • Projects & Delivery Engine</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Client Projects & Deliverables
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Commercial campaign pipelines, video production schedules, website builds, and sprint deliverables.
          </p>
        </div>

        {isManagerOrAdmin && (
          <button
            onClick={() => {
              setFormError(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Project</span>
          </button>
        )}
      </div>

      {/* Global Banners */}
      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-400 text-xs font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-800/60 border border-slate-700/60 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </form>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Department:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm">Querying PostgreSQL projects table...</p>
        </div>
      ) : projects.length === 0 ? (
        /* Honest Real Empty State */
        <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-900/30 p-12 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
            <FolderKanban className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-slate-100 mb-1">
            No Projects Found in PostgreSQL
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            There are currently no agency client projects recorded in the database matching your filters.
            Create the first project to start tracking deliverables, sprints, and task hours.
          </p>
          {isManagerOrAdmin && (
            <button
              onClick={() => {
                setFormError(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Project</span>
            </button>
          )}
        </div>
      ) : (
        /* Real Projects Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <div>
                {/* Header / Badges */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${getStatusBadge(
                      project.status
                    )}`}
                  >
                    {project.status.replace('_', ' ')}
                  </span>
                  {project.department_name && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {project.department_name}
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-semibold text-slate-100 hover:text-indigo-400 transition-colors line-clamp-1">
                  {project.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 min-h-[2rem]">
                  {project.description || 'No description provided.'}
                </p>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-400">Progress</span>
                    <span className="font-semibold text-slate-200">{project.progress_percent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        project.progress_percent === 100
                          ? 'bg-emerald-500'
                          : project.progress_percent > 50
                          ? 'bg-indigo-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${project.progress_percent}%` }}
                    />
                  </div>
                </div>

                {/* Metadata Items */}
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-500 block">Budget</span>
                    <span className="font-semibold text-slate-200">
                      ₹{project.budget.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Deadline</span>
                    <span className="font-semibold text-slate-200 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {project.deadline}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Deliverables</span>
                    <span className="font-medium text-slate-300">
                      {project.completed_tasks_count} / {project.tasks_count} done
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Client</span>
                    <span className="font-medium text-slate-300 truncate block">
                      {project.client_name || 'Internal Agency'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleOpenProjectTasks(project)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold transition-colors border border-indigo-500/30 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Tasks & Sprints ({project.tasks_count})</span>
                </button>

                {isManagerOrAdmin && (
                  <button
                    onClick={() => handleOpenEdit(project)}
                    title="Edit Project"
                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={() => {
                      setProjectToDelete(project);
                      setIsDeleteModalOpen(true);
                    }}
                    title="Delete Project"
                    className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Project Tasks & Sprints Drawer / Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/40">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${getStatusBadge(
                      selectedProject.status
                    )}`}
                  >
                    {selectedProject.status.replace('_', ' ')}
                  </span>
                  {selectedProject.department_name && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedProject.department_name}
                    </span>
                  )}
                  <span className="text-xs text-slate-500">ID: #{selectedProject.id}</span>
                </div>
                <h2 className="text-xl font-bold text-white">{selectedProject.title}</h2>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  {selectedProject.description || 'No description provided.'}
                </p>
              </div>

              <button
                onClick={() => setSelectedProject(null)}
                className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-900/60 border-b border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Overall Progress</span>
                <span className="font-semibold text-indigo-400 text-sm">
                  {selectedProject.progress_percent}%
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Budget Allocation</span>
                <span className="font-semibold text-slate-200 text-sm">
                  ₹{selectedProject.budget.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Target Deadline</span>
                <span className="font-semibold text-slate-200 text-sm">
                  {selectedProject.deadline}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Tasks Completed</span>
                <span className="font-semibold text-emerald-400 text-sm">
                  {selectedProject.completed_tasks_count} / {selectedProject.tasks_count}
                </span>
              </div>
            </div>

            {/* Tasks Section Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Project Deliverables & Sprints</h3>
              </div>

              {isManagerOrAdmin && (
                <button
                  onClick={() => {
                    setFormError(null);
                    setTaskForm({
                      title: '',
                      description: '',
                      priority: 'medium',
                      deadline: selectedProject.deadline,
                      estimated_hours: '4',
                      status: 'assigned',
                      progress_percent: 0,
                    });
                    setIsAddTaskModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>
              )}
            </div>

            {/* Tasks List Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoadingTasks ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <p className="text-xs">Loading tasks from PostgreSQL...</p>
                </div>
              ) : projectTasks.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/40">
                  <Clock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-slate-200">No Tasks Assigned Yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                    Create actionable tasks, set deadlines, and assign work hours to track progress automatically.
                  </p>
                  {isManagerOrAdmin && (
                    <button
                      onClick={() => setIsAddTaskModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Deliverable</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {projectTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getPriorityBadge(
                              task.priority
                            )}`}
                          >
                            {task.priority.toUpperCase()}
                          </span>
                          <span className="px-2 py-0.5 text-xs rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {task.status.replace('_', ' ')}
                          </span>
                          {task.manager_approval_status === 'approved' && (
                            <span className="px-2 py-0.5 text-xs rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Approved
                            </span>
                          )}
                          {task.manager_approval_status === 'rejected' && (
                            <span className="px-2 py-0.5 text-xs rounded bg-rose-950/60 text-rose-400 border border-rose-800 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Rejected
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-semibold text-slate-100">{task.title}</h4>
                        {task.description && (
                          <p className="text-xs text-slate-400 mt-0.5">{task.description}</p>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> Due: {task.deadline}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Est: {task.estimated_hours}h
                          </span>
                          {task.assigned_to_name && (
                            <span>Assignee: {task.assigned_to_name}</span>
                          )}
                        </div>
                      </div>

                      {/* Task Progress & Actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="w-32">
                          <div className="flex justify-between text-xs text-slate-300 mb-1">
                            <span>Progress</span>
                            <span>{task.progress_percent}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${task.progress_percent}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Quick Progress Buttons */}
                          {task.progress_percent < 100 && (
                            <button
                              onClick={() => handleQuickProgress(task, 100)}
                              title="Mark Task Ready for Review (100%)"
                              className="px-2.5 py-1 text-xs rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
                            >
                              Ready for Review
                            </button>
                          )}

                          {/* Manager Approval Workflow */}
                          {isManagerOrAdmin && task.status === 'under_review' && (
                            <>
                              <button
                                onClick={() => handleTaskApproval(task.id, 'approved')}
                                title="Approve Task"
                                className="p-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleTaskApproval(task.id, 'rejected')}
                                title="Request Revision"
                                className="p-1.5 rounded bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Delete Task */}
                          {isAdmin && (
                            <button
                              onClick={() => setTaskToDelete(task)}
                              title="Delete Task"
                              className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-950/40">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-indigo-500" />
                <span>Create New Project</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Growth Marketing & Web Revamp"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Campaign objectives, deliverable milestones, and client scope..."
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    value={projectForm.department_id}
                    onChange={(e) => setProjectForm({ ...projectForm, department_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">No Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={projectForm.status}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, status: e.target.value as ProjectStatus })
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="planning">Planning</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Budget (₹ INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={projectForm.budget}
                    onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={projectForm.deadline}
                    onChange={(e) => setProjectForm({ ...projectForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {isEditModalOpen && projectToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-500" />
                <span>Edit Project #{projectToEdit.id}</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProject} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    value={projectForm.department_id}
                    onChange={(e) => setProjectForm({ ...projectForm, department_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">No Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={projectForm.status}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, status: e.target.value as ProjectStatus })
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="planning">Planning</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Budget (₹ INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={projectForm.budget}
                    onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={projectForm.deadline}
                    onChange={(e) => setProjectForm({ ...projectForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isAddTaskModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-500" />
                <span>Add Task to #{selectedProject.title}</span>
              </h3>
              <button
                onClick={() => setIsAddTaskModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Deliverable Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design responsive landing page mockup"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Deliverable Specs
                </label>
                <textarea
                  rows={2}
                  placeholder="Figma links, scope guidelines, and acceptance criteria..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={taskForm.estimated_hours}
                    onChange={(e) => setTaskForm({ ...taskForm, estimated_hours: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Task Deadline *
                </label>
                <input
                  type="date"
                  required
                  value={taskForm.deadline}
                  onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="px-3.5 py-1.5 text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation */}
      {isDeleteModalOpen && projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Delete Project</h3>
            <p className="text-sm text-slate-400 mb-6">
              Are you sure you want to delete project{' '}
              <span className="font-semibold text-white">"{projectToDelete.title}"</span> from
              PostgreSQL? This will remove all associated tasks and records.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setProjectToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <h4 className="text-base font-bold text-white mb-2">Delete Deliverable</h4>
            <p className="text-xs text-slate-400 mb-5">
              Are you sure you want to delete task{' '}
              <span className="text-white font-semibold">"{taskToDelete.title}"</span>?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setTaskToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
