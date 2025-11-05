import React, { useState, useEffect } from 'react';
import { DEPARTMENTS } from '../constants/departments';
import { ROLES } from '../constants/roles';
import { X, User, Mail, Phone, Building, Briefcase, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import MultiSelectDropdown from './MultiSelectDropdown';

const EmployeeForm = ({ type, employee, onSubmit, isLoading, setIsOpen, currentUser, teams = [] }) => {
    const [employeeData, setEmployeeData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        department: '',
        role: 'employee',
        teams: []
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (type === 'edit' && employee) {
            setEmployeeData({
                name: employee.name || '',
                email: employee.email || '',
                phoneNumber: employee.phoneNumber || '',
                department: employee.department || '',
                role: employee.role || 'employee',
                teams: employee.teamNames || []
            });
        } else if (type === 'create') {
            setEmployeeData({
                name: '',
                email: '',
                phoneNumber: '',
                department: '',
                role: 'employee',
                teams: []
            });
        }
    }, [employee, type]);

    const validateField = (name, value) => {
        switch (name) {
            case 'name':
                if (!value.trim()) return 'Name is required';
                if (value.trim().length < 2) return 'Name must be at least 2 characters';
                return '';
            case 'email': {
                if (!value.trim()) return 'Email is required';
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) return 'Please enter a valid email address';
                return '';
            }
            case 'phoneNumber': {
                if (!value.trim()) return 'Phone number is required';
                const phoneRegex = /^(84|0[35789])[0-9]{8}$/;
                if (!phoneRegex.test(value)) return 'Please enter a valid Vietnamese phone number';
                return '';
            }
            case 'department':
                if (!value) return 'Department is required';
                return '';
            case 'role':
                if (!value) return 'Role is required';
                return '';
            default:
                return '';
        }
    };

    const validateForm = () => {
        const newErrors = {};
        Object.keys(employeeData).forEach(key => {
            if (key !== 'teams') {
                const error = validateField(key, employeeData[key]);
                if (error) newErrors[key] = error;
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
        onSubmit(employeeData);
    }
    };

    const handleChange = (field, value) => {
        setEmployeeData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleBlur = (field) => {
        const error = validateField(field, employeeData[field]);
        setErrors(prev => ({ ...prev, [field]: error }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-3xl">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-6">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-800 mb-2">
                                {type === 'create' ? 'Create New Employee' : 'Edit Employee'}
                            </h2>
                            <p className="text-slate-600">
                                {type === 'create'
                                    ? 'Add a new team member to your organization'
                                    : 'Update employee information and settings'
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

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column - Personal Information */}
                        <div className="space-y-6">
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
                                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                        <User className="w-5 h-5 text-white" />
                                    </div>
                                    Personal Information
                                </h3>
                                
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                                            Full Name <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                <User className={`w-5 h-5 ${errors.name ? 'text-red-400' : 'text-slate-400'}`} />
                                            </span>
                                            <input
                                                id="name"
                                                name="name"
                                                type="text"
                                                className={`w-full pl-10 pr-10 py-3 border-2 rounded-xl transition-all duration-200 ${
                                                    errors.name
                                                        ? 'border-red-300 focus:outline-none focus:ring-red-500 bg-red-50'
                                                        : 'border-gray-200 focus:outline-none focus:ring-blue-500 hover:border-blue-300 bg-blue-50/30'
                                                }`}
                                                value={employeeData.name}
                                                onChange={(e) => handleChange('name', e.target.value)}
                                                onBlur={() => handleBlur('name')}
                                                placeholder="Enter full name"
                                                required
                                            />
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                {errors.name ? (
                                                    <AlertCircle className="w-5 h-5 text-red-400" />
                                                ) : employeeData.name && !errors.name ? (
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

                                    <div className="space-y-2">
                                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                                            Email Address <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                <Mail className={`w-5 h-5 ${errors.email ? 'text-red-400' : 'text-slate-400'}`} />
                                            </span>
                                            <input
                                                id="email"
                                                name="email"
                                                type="email"
                                                className={`w-full pl-10 pr-10 py-3 border-2 rounded-xl transition-all duration-200 ${
                                                    errors.email
                                                        ? 'border-red-300 focus:outline-none focus:ring-red-500 bg-red-50'
                                                        : 'border-gray-200 focus:outline-none focus:ring-blue-500 hover:border-blue-300 bg-blue-50/30'
                                                }`}
                                                value={employeeData.email}
                                                onChange={(e) => handleChange('email', e.target.value)}
                                                onBlur={() => handleBlur('email')}
                                                placeholder="Enter email address"
                                                required
                                            />
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                {errors.email ? (
                                                    <AlertCircle className="w-5 h-5 text-red-400" />
                                                ) : employeeData.email && !errors.email ? (
                                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                                ) : null}
                                            </span>
                                        </div>
                                        {errors.email && (
                                            <p className="text-sm text-red-600 flex items-center gap-1">
                                                <AlertCircle className="w-4 h-4" />
                                                {errors.email}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700 mb-2">
                                            Phone Number <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                <Phone className={`w-5 h-5 ${errors.phoneNumber ? 'text-red-400' : 'text-slate-400'}`} />
                                            </span>
                                            <input
                                                id="phoneNumber"
                                                name="phoneNumber"
                                                type="tel"
                                                className={`w-full pl-10 pr-10 py-3 border-2 rounded-xl transition-all duration-200 ${
                                                    errors.phoneNumber
                                                        ? 'border-red-300 focus:outline-none focus:ring-red-500 bg-red-50'
                                                        : 'border-gray-200 focus:outline-none focus:ring-blue-500 hover:border-blue-300 bg-blue-50/30'
                                                }`}
                                                value={employeeData.phoneNumber}
                                                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                                                onBlur={() => handleBlur('phoneNumber')}
                                                placeholder="Enter phone number"
                                                required
                                            />
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                {errors.phoneNumber ? (
                                                    <AlertCircle className="w-5 h-5 text-red-400" />
                                                ) : employeeData.phoneNumber && !errors.phoneNumber ? (
                                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                                ) : null}
                                            </span>
                                        </div>
                                        {errors.phoneNumber && (
                                            <p className="text-sm text-red-600 flex items-center gap-1">
                                                <AlertCircle className="w-4 h-4" />
                                                {errors.phoneNumber}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Work Information */}
                        <div className="space-y-6">
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-100">
                                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                        <Briefcase className="w-5 h-5 text-white" />
                                    </div>
                                    Work Information
                                </h3>
                                
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label htmlFor="department" className="block text-sm font-medium text-slate-700 mb-2">
                                            Department <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                <Building className={`w-5 h-5 ${errors.department ? 'text-red-400' : 'text-slate-400'}`} />
                                            </span>
                                            <select
                                                id="department"
                                                name="department"
                                                className={`w-full pl-10 pr-10 py-3 border-2 rounded-xl transition-all duration-200 appearance-none ${
                                                    errors.department
                                                        ? 'border-red-300 focus:outline-none focus:ring-red-500 bg-red-50'
                                                        : 'border-gray-200 focus:outline-none focus:ring-blue-500 hover:border-blue-300 bg-blue-50/30'
                                                }`}
                                                value={employeeData.department}
                                                onChange={(e) => handleChange('department', e.target.value)}
                                                onBlur={() => handleBlur('department')}
                                                required
                                            >
                                                <option value="">Select Department</option>
                                                {DEPARTMENTS.map((department) => (
                                                    <option key={department.value} value={department.value}>{department.label}</option>
                                                ))}
                                            </select>
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                {errors.department ? (
                                                    <AlertCircle className="w-5 h-5 text-red-400" />
                                                ) : employeeData.department && !errors.department ? (
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

                                    <div className="space-y-2">
                                        <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-2">
                                            Role <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                <Briefcase className={`w-5 h-5 ${errors.role ? 'text-red-400' : 'text-slate-400'}`} />
                                            </span>
                                            <select
                                                id="role"
                                                name="role"
                                                className={`w-full pl-10 pr-10 py-3 border-2 rounded-xl transition-all duration-200 appearance-none ${
                                                    errors.role
                                                        ? 'border-red-300 focus:outline-none focus:ring-red-500 bg-red-50'
                                                        : 'border-gray-200 focus:outline-none focus:ring-blue-500 hover:border-blue-300 bg-blue-50/30'
                                                }`}
                                                value={employeeData.role}
                                                onChange={(e) => handleChange('role', e.target.value)}
                                                onBlur={() => handleBlur('role')}
                                                required
                                            >
                                                {ROLES.map((role) => (
                                                    <option key={role.value} value={role.value}>{role.label}</option>
                                                ))}
                                            </select>
                                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                {errors.role ? (
                                                    <AlertCircle className="w-5 h-5 text-red-400" />
                                                ) : employeeData.role && !errors.role ? (
                                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                                ) : null}
                                            </span>
                                        </div>
                                        {errors.role && (
                                            <p className="text-sm text-red-600 flex items-center gap-1">
                                                <AlertCircle className="w-4 h-4" />
                                                {errors.role}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <MultiSelectDropdown
                                            options={teams}
                                            selectedValues={employeeData.teams}
                                            onChange={(selectedTeams) => handleChange('teams', selectedTeams)}
                                            placeholder="Select teams"
                                            label="Teams (Optional)"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-slate-200">
                        {type === 'edit' && currentUser?.role === 'owner' && (
                            <label className="w-full sm:w-auto text-center bg-slate-100 text-slate-600 px-6 py-3 rounded-xl cursor-pointer hover:bg-slate-200 transition-all duration-200 flex items-center justify-center gap-2 font-medium">
                                <Upload className="w-5 h-5"/>
                                <span>Upload Face Data</span>
                                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    const reader = new FileReader();
                                    reader.onload = async () => {
                                        try {
                                            const originalDataUrl = reader.result;
                                            await new Promise((resolve, reject) => {
                                                const img = new Image();
                                                img.onload = async () => {
                                                    try {
                                                        const MAX_DIM = 800;
                                                        let { width, height } = img;
                                                        const ratio = width / height;

                                                        if (width > MAX_DIM || height > MAX_DIM) {
                                                            if (width > height) {
                                                                width = MAX_DIM;
                                                                height = Math.round(MAX_DIM / ratio);
                                                            } else {
                                                                height = MAX_DIM;
                                                                width = Math.round(MAX_DIM * ratio);
                                                            }
                                                        }

                                                        const canvas = document.createElement('canvas');
                                                        canvas.width = width;
                                                        canvas.height = height;
                                                        const ctx = canvas.getContext('2d');
                                                        ctx.drawImage(img, 0, 0, width, height);
                                                        const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

                                                        let b64 = resizedDataUrl;
                                                        const comma = b64.indexOf(',');
                                                        if (comma !== -1) b64 = b64.slice(comma + 1);

                                                        const r = await fetch(`/api/employees/${employee.id}/face`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ imageData: b64 })
                                                        });

                                                        const json = await r.json().catch(() => ({ success: false, error: 'Invalid JSON response' }));

                                                        if (!r.ok) {
                                                            console.error('Upload failed', json);
                                                            alert(`Upload failed: ${json?.error || 'server error'}`);
                                                            resolve();
                                                            return;
                                                        }

                                                        if (json.success) {
                                                            if (json.uploadedToImageKit) {
                                                                alert('Image uploaded successfully to ImageKit.');
                                                                if (json.imageUrl) window.open(json.imageUrl, '_blank');
                                                            } else {
                                                                alert('Image saved to the user profile, but no ImageKit upload was detected.');
                                                            }
                                                        } else {
                                                            console.error('Upload response error', json);
                                                            alert(`Upload failed: ${json?.error || 'unknown'}`);
                                                        }
                                                        resolve();
                                                    } catch (err) {
                                                        reject(err);
                                                    }
                                                };
                                                img.onerror = () => reject(new Error('Image load error'));
                                                img.src = originalDataUrl;
                                            });
                                        } catch (err) {
                                            console.error(err);
                                            alert('Upload request failed');
                                        }
                                    };
                                    reader.readAsDataURL(f);
                                }} />
                            </label>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
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
                                    type === 'create' ? 'Create Employee' : 'Save Changes'
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EmployeeForm;