import React, { useState, useEffect } from 'react';
import { X, Clipboard, AlignLeft, User, Calendar, CheckCircle, AlertCircle, Target } from 'lucide-react';
import useTeamStore from '../stores/useTeamStore';
import HierarchicalAssignTo from './HierarchicalAssignTo';

const priorityOptions = ['Low', 'Medium', 'High', 'Critical'];

const TaskForm = ({ type, employees, task, onSubmit, isLoading, setIsOpen }) => {
    const { teams, getAllTeams } = useTeamStore();
    const [taskData, setTaskData] = useState({
        name: '',
        description: '',
        assignedTo: [], // Changed to array for multiple assignments
        deadline: '',
        priority: 'Medium'
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        getAllTeams(); // Load teams when component mounts
    }, [getAllTeams]);

    useEffect(() => {
        if (type === 'edit' && task) {
            setTaskData({
                name: task.name || '',
                description: task.description || '',
                assignedTo: task.assignedTo || [], // Handle both string and array
                deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
                priority: task.priority || 'Medium'
            });
        } else if (type === 'create') {
            setTaskData({
                name: '',
                description: '',
                assignedTo: [],
                deadline: '',
                priority: 'Medium'
            });
        }
    }, [task, type]);

    const validateField = (name, value) => {
        switch (name) {
            case 'name':
                if (!value.trim()) return 'Task name is required';
                if (value.trim().length < 3) return 'Task name must be at least 3 characters';
                return '';
            case 'description':
                if (!value.trim()) return 'Description is required';
                if (value.trim().length < 10) return 'Description must be at least 10 characters';
                return '';
            case 'deadline': {
                if (!value) return '';
                const deadlineDate = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (deadlineDate < today) return 'Deadline cannot be in the past';
                return '';
            }
            case 'priority':
                if (!value) return 'Priority is required';
                return '';
            default:
                return '';
        }
    };

    const validateForm = () => {
        const newErrors = {};
        Object.keys(taskData).forEach(key => {
            const error = validateField(key, taskData[key]);
            if (error) newErrors[key] = error;
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(taskData);
        }
    };

    const handleChange = (field, value) => {
        setTaskData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleBlur = (field) => {
        const error = validateField(field, taskData[field]);
        setErrors(prev => ({ ...prev, [field]: error }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-3xl">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-6">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-800 mb-2">
                                {type === 'create' ? 'Create New Task' : 'Edit Task'}
                            </h2>
                            <p className="text-slate-600">
                                {type === 'create'
                                    ? 'Create a new task and assign it to a team member'
                                    : 'Update task details and assignment'
                                }
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen({ type: 'create', open: false })}
                            className="p-3 rounded-full hover:bg-slate-100 transition-colors duration-200"
                        >
                            <X className="w-6 h-6 text-slate-500" />
                        </button>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <Target className="w-5 h-5 text-blue-600" />
                                Task Details
                            </h3>
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                                        Task Name <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                            <Clipboard className={`w-5 h-5 ${errors.name ? 'text-red-400' : 'text-slate-400'}`} />
                                        </span>
                                        <input
                                            id="name"
                                            name="name"
                                            type="text"
                                            className={`w-full pl-10 pr-10 py-3 border rounded-lg transition-all duration-200 ${
                                                errors.name
                                                    ? 'border-red-300 focus:outline-none focus:ring-red-500 bg-red-50'
                                                    : 'border-slate-300 focus:outline-none focus:ring-blue-500 hover:border-slate-400'
                                            }`}
                                            value={taskData.name}
                                            onChange={(e) => handleChange('name', e.target.value)}
                                            onBlur={() => handleBlur('name')}
                                            placeholder="Enter task name"
                                            autoComplete="off"
                                            required
                                        />
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            {errors.name ? (
                                                <AlertCircle className="w-5 h-5 text-red-400" />
                                            ) : taskData.name && !errors.name ? (
                                                <CheckCircle className="w-5 h-5 text-green-400" />
                                            ) : null}
                                        </span>
                                    </div>
                                    {errors.name && (
                                        <p className="text-sm text-red-600 flex items-center gap-1">
                                            <AlertCircle className="w-4 h-4" />
                                            {errors.name}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                                        Description <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute top-3 left-0 flex items-center pl-3 pointer-events-none">
                                            <AlignLeft className={`w-5 h-5 ${errors.description ? 'text-red-400' : 'text-slate-400'}`} />
                                        </span>
                                        <textarea
                                            id="description"
                                            name="description"
                                            className={`w-full pl-10 pr-10 py-3 border rounded-lg transition-all duration-200 resize-none ${
                                                errors.description
                                                    ? 'border-red-300 focus:outline-none focus:ring-red-500 bg-red-50'
                                                    : 'border-slate-300 focus:outline-none focus:ring-blue-500 hover:border-slate-400'
                                            }`}
                                            value={taskData.description}
                                            onChange={(e) => handleChange('description', e.target.value)}
                                            onBlur={() => handleBlur('description')}
                                            placeholder="Enter detailed task description"
                                            rows={4}
                                            autoComplete="off"
                                            required
                                        />
                                        <span className="absolute top-3 right-0 flex items-center pr-3 pointer-events-none">
                                            {errors.description ? (
                                                <AlertCircle className="w-5 h-5 text-red-400" />
                                            ) : taskData.description && !errors.description ? (
                                                <CheckCircle className="w-5 h-5 text-green-400" />
                                            ) : null}
                                        </span>
                                    </div>
                                    {errors.description && (
                                        <p className="text-sm text-red-600 flex items-center gap-1">
                                            <AlertCircle className="w-4 h-4" />
                                            {errors.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-green-600" />
                                Assignment & Timeline
                            </h3>
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <label htmlFor="assign-to" className="block text-sm font-medium text-slate-700 mb-2">
                                        Assign To <span className="text-red-500">*</span>
                                    </label>
                                    <HierarchicalAssignTo
                                        id="assign-to"
                                        teams={teams}
                                        employees={employees}
                                        selectedAssignments={taskData.assignedTo}
                                        onChange={(assignments) => handleChange('assignedTo', assignments)}
                                        error={errors.assignedTo}
                                    />
                                    {errors.assignedTo && (
                                        <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                                            <AlertCircle className="w-4 h-4" />
                                            {errors.assignedTo}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label htmlFor="deadline" className="block text-sm font-medium text-slate-700 mb-1">
                                            Deadline
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                <Calendar className={`w-5 h-5 ${errors.deadline ? 'text-red-400' : 'text-slate-400'}`} />
                                            </span>
                                            <input
                                                id="deadline"
                                                name="deadline"
                                                type="date"
                                                className={`w-full pl-10 pr-10 py-3 border rounded-lg transition-all duration-200 ${
                                                    errors.deadline
                                                        ? 'border-red-300 focus:outline-none focus:ring-red-500 bg-red-50'
                                                        : 'border-slate-300 focus:outline-none focus:ring-blue-500 hover:border-slate-400'
                                                }`}
                                                value={taskData.deadline}
                                                onChange={(e) => handleChange('deadline', e.target.value)}
                                                onBlur={() => handleBlur('deadline')}
                                                autoComplete="off"
                                            />
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                {errors.deadline ? (
                                                    <AlertCircle className="w-5 h-5 text-red-400" />
                                                ) : taskData.deadline && !errors.deadline ? (
                                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                                ) : null}
                                            </span>
                                        </div>
                                        {errors.deadline && (
                                            <p className="text-sm text-red-600 flex items-center gap-1">
                                                <AlertCircle className="w-4 h-4" />
                                                {errors.deadline}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <label htmlFor="priority" className="block text-sm font-medium text-slate-700 mb-1">
                                            Priority <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            id="priority"
                                            name="priority"
                                            className={`w-full px-3 py-3 border rounded-lg transition-all duration-200 ${
                                                errors.priority
                                                    ? 'border-red-300 focus:outline-none focus:ring-red-500 bg-red-50'
                                                    : 'border-slate-300 focus:outline-none focus:ring-blue-500 hover:border-slate-400'
                                            }`}
                                            value={taskData.priority}
                                            onChange={(e) => handleChange('priority', e.target.value)}
                                            onBlur={() => handleBlur('priority')}
                                        >
                                            {priorityOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.priority && (
                                            <p className="text-sm text-red-600 flex items-center gap-1">
                                                <AlertCircle className="w-4 h-4" />
                                                {errors.priority}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={() => setIsOpen({ type: 'create', open: false })}
                            className="w-full sm:w-auto bg-white border-2 border-slate-300 text-slate-700 px-6 py-3 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl cursor-pointer hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Saving...
                                </div>
                            ) : (
                                type === 'create' ? 'Create Task' : 'Save Changes'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskForm;
