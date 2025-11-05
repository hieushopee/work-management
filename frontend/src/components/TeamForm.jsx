import React, { useState } from 'react';
import { X, Users, Building, FileText, CheckCircle, AlertCircle, UserPlus } from 'lucide-react';

const TeamForm = ({ type, team, onSubmit, isLoading, setIsOpen }) => {
    const [teamData, setTeamData] = useState({
        name: team?.name || '',
        description: team?.description || '',
        department: team?.department || ''
    });

    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');

    const validateField = (name, value) => {
        switch (name) {
            case 'name':
                if (!value.trim()) return 'Team name is required';
                if (value.trim().length < 2) return 'Team name must be at least 2 characters';
                if (value.trim().length > 50) return 'Team name must be less than 50 characters';
                return '';
            case 'description':
                if (value.trim().length > 200) return 'Description must be less than 200 characters';
                return '';
            case 'department':
                if (value.trim().length > 50) return 'Department name must be less than 50 characters';
                return '';
            default:
                return '';
        }
    };

    const validateForm = () => {
        const newErrors = {};
        Object.keys(teamData).forEach(key => {
            const error = validateField(key, teamData[key]);
            if (error) newErrors[key] = error;
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (validateForm()) {
            onSubmit(teamData, setError);
        }
    };

    const handleChange = (field, value) => {
        setTeamData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
        if (error) {
            setError('');
        }
    };

    const handleBlur = (field) => {
        const error = validateField(field, teamData[field]);
        setErrors(prev => ({ ...prev, [field]: error }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-3xl">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-6">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-800 mb-2">
                                {type === 'create' ? 'Create New Team' : 'Create New Team'}
                            </h2>
                            <p className="text-slate-600">
                                {type === 'create'
                                    ? 'Create a new team to organize your employees'
                                    : 'Update team information and settings'
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
                                <UserPlus className="w-5 h-5 text-green-600" />
                                Team Information
                            </h3>
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                                        Team Name <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                            <Users className={`w-5 h-5 ${errors.name ? 'text-red-400' : 'text-slate-400'}`} />
                                        </span>
                                        <input
                                            id="name"
                                            name="name"
                                            type="text"
                                            className={`w-full pl-10 pr-10 py-3 border rounded-lg transition-all duration-200 ${
                                                errors.name
                                                    ? 'border-red-300 focus:outline-none focus:ring-red-500 bg-red-50'
                                                    : 'border-slate-300 focus:outline-none focus:ring-green-500 hover:border-slate-400'
                                            }`}
                                            value={teamData.name}
                                            onChange={(e) => handleChange('name', e.target.value)}
                                            onBlur={() => handleBlur('name')}
                                            placeholder="Enter team name"
                                            required
                                        />
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            {errors.name ? (
                                                <AlertCircle className="w-5 h-5 text-red-400" />
                                            ) : teamData.name && !errors.name ? (
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
                                    {error && (
                                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                            <AlertCircle className="w-4 h-4" />
                                            {error}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                                        Description (Optional)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute top-3 left-0 flex items-center pl-3 pointer-events-none">
                                            <FileText className={`w-5 h-5 ${errors.description ? 'text-red-400' : 'text-slate-400'}`} />
                                        </span>
                                        <textarea
                                            id="description"
                                            name="description"
                                            className={`w-full pl-10 pr-10 py-3 border rounded-lg transition-all duration-200 resize-none ${
                                                errors.description
                                                    ? 'border-red-300 focus:outline-none focus:ring-red-500 bg-red-50'
                                                    : 'border-slate-300 focus:outline-none focus:ring-green-500 hover:border-slate-400'
                                            }`}
                                            value={teamData.description}
                                            onChange={(e) => handleChange('description', e.target.value)}
                                            onBlur={() => handleBlur('description')}
                                            placeholder="Enter team description"
                                            rows={3}
                                        />
                                        <span className="absolute top-3 right-0 flex items-center pr-3 pointer-events-none">
                                            {errors.description ? (
                                                <AlertCircle className="w-5 h-5 text-red-400" />
                                            ) : teamData.description && !errors.description ? (
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

                                <div className="space-y-1">
                                    <label htmlFor="department" className="block text-sm font-medium text-slate-700 mb-1">
                                        Department (Optional)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                            <Building className={`w-5 h-5 ${errors.department ? 'text-red-400' : 'text-slate-400'}`} />
                                        </span>
                                        <input
                                            id="department"
                                            name="department"
                                            type="text"
                                            className={`w-full pl-10 pr-10 py-3 border rounded-lg transition-all duration-200 ${
                                                errors.department
                                                    ? 'border-red-300 focus:outline-none focus:ring-red-500 bg-red-50'
                                                    : 'border-slate-300 focus:outline-none focus:ring-green-500 hover:border-slate-400'
                                            }`}
                                            value={teamData.department}
                                            onChange={(e) => handleChange('department', e.target.value)}
                                            onBlur={() => handleBlur('department')}
                                            placeholder="Enter department name"
                                        />
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            {errors.department ? (
                                                <AlertCircle className="w-5 h-5 text-red-400" />
                                            ) : teamData.department && !errors.department ? (
                                                <CheckCircle className="w-5 h-5 text-green-400" />
                                            ) : null}
                                        </span>
                                    </div>
                                    {errors.department && (
                                        <p className="text-sm text-red-600 flex items-center gap-1">
                                            <AlertCircle className="w-4 h-4" />
                                            {errors.department}
                                        </p>
                                    )}
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
                            className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-3 rounded-xl cursor-pointer hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Saving...
                                </div>
                            ) : (
                                type === 'create' ? 'Create Team' : 'Save Changes'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TeamForm;
