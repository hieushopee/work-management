import { useState, useEffect } from 'react';
import { UserPlus, Eye, EyeOff, ArrowRight, Building2, CheckCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserStore } from '../../stores/useUserStore';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { toast } from 'react-hot-toast';
import axios from '../../libs/axios';

const RegisterAdminPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get('workspaceId') || localStorage.getItem('workspaceId');
  
  const { registerAdmin, loading } = useUserStore();
  const { checkWorkspaceAdmin } = useWorkspaceStore();
  
  const [workspaceName, setWorkspaceName] = useState('');
  const [checkingWorkspace, setCheckingWorkspace] = useState(true);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phoneNumber: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);

  useEffect(() => {
    // Check if workspace exists and needs admin
    const checkAdmin = async () => {
      if (!workspaceId) {
        // No workspace ID, redirect to create workspace
        toast.error('Please create a workspace first');
        navigate('/create-workspace');
        return;
      }

      try {
        // Get workspace info
        const workspaceRes = await axios.get(`/workspace/${workspaceId}`);
        if (workspaceRes.data.success) {
          setWorkspaceName(workspaceRes.data.workspace.name);
          localStorage.setItem('workspaceId', workspaceId);
          localStorage.setItem('workspaceName', workspaceRes.data.workspace.name);
        }

        // Check if workspace needs admin
        const result = await checkWorkspaceAdmin(workspaceId);
        if (!result.needsAdmin) {
          // Workspace already has admin, redirect to login
          toast.info('Workspace already has an admin. Please log in.');
          navigate('/login');
        }
      } catch (error) {
        console.error('Error checking workspace:', error);
        toast.error('Workspace not found. Please create a workspace first.');
        navigate('/create-workspace');
      } finally {
        setCheckingWorkspace(false);
      }
    };
    checkAdmin();
  }, [workspaceId, navigate, checkWorkspaceAdmin]);

  const validatePassword = (password) => {
    const errors = [];
    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least 1 lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least 1 uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least 1 number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':\"\\\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least 1 special character');
    }
    return errors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    if (name === 'password') {
      const errors = validatePassword(value);
      setPasswordErrors(errors);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.email || !formData.password || !formData.name) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate password
    const errors = validatePassword(formData.password);
    if (errors.length > 0) {
      setPasswordErrors(errors);
      toast.error('Password does not meet requirements');
      return;
    }

    // Check password match
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    // Register admin
    const result = await registerAdmin({
      workspaceId,
      email: formData.email,
      password: formData.password,
      name: formData.name,
      phoneNumber: formData.phoneNumber,
    });

    if (result.success) {
      // Redirect to home page
      navigate('/');
    }
  };

  if (checkingWorkspace) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full overflow-y-auto bg-gradient-to-br from-white to-blue-100">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-light rounded-full mb-4 animate-pulse">
            <UserPlus className="w-8 h-8 text-primary" />
          </div>
          <p className="text-text-secondary">Checking workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen w-full overflow-y-auto bg-gradient-to-br from-white to-blue-100">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-light rounded-full mb-4">
            <UserPlus className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-text-main mb-2">Register Admin</h1>
          {workspaceName && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-primary" />
              <p className="text-primary font-medium">{workspaceName}</p>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
          )}
          <p className="text-text-secondary">
            Create an admin account for your workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1: Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text-main mb-4">Personal Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="admin@example.com"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0123456789"
                />
              </div>
            </div>

            {/* Column 2: Password */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text-main mb-4">Password</h3>
              
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                      formData.password && passwordErrors.length === 0 
                        ? 'border-green-500 pr-20' 
                        : passwordErrors.length > 0 
                        ? 'border-red-500 pr-20' 
                        : 'border-border-light pr-10'
                    }`}
                    placeholder="Enter password"
                    required
                  />
                  {formData.password && passwordErrors.length === 0 && (
                    <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-main"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordErrors.length > 0 && (
                  <ul className="mt-2 text-sm text-red-600 space-y-1">
                    {passwordErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-main mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                      formData.confirmPassword && formData.password === formData.confirmPassword 
                        ? 'border-green-500 pr-20' 
                        : formData.confirmPassword && formData.password !== formData.confirmPassword 
                        ? 'border-red-500 pr-20' 
                        : 'border-border-light pr-10'
                    }`}
                    placeholder="Re-enter password"
                    required
                  />
                  {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-main"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">Passwords do not match</p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">Password Requirements:</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• At least 8 characters</li>
                  <li>• At least 1 lowercase letter (a-z)</li>
                  <li>• At least 1 uppercase letter (A-Z)</li>
                  <li>• At least 1 number (0-9)</li>
                  <li>• At least 1 special character (!@#$%^&*)</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !formData.email || !formData.password || !formData.name || passwordErrors.length > 0}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              'Registering...'
            ) : (
              <>
                Register Admin
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-primary hover:text-primary-hover font-medium"
          >
            Already have an account? Log in
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterAdminPage;

