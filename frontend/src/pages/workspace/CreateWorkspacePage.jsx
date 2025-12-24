import { useState } from 'react';
import { Building2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from '../../libs/axios';
import { toast } from 'react-hot-toast';

const CreateWorkspacePage = () => {
  const navigate = useNavigate();
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    
    if (!workspaceName.trim()) {
      toast.error('Please enter workspace name');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/workspace/create', {
        name: workspaceName.trim(),
      });

      if (res.data.success) {
        toast.success('Workspace created successfully!');
        // Store workspace info in localStorage
        localStorage.setItem('workspaceId', res.data.workspace.id);
        localStorage.setItem('workspaceName', res.data.workspace.name);
        // Redirect to register admin page
        navigate(`/register-admin?workspaceId=${res.data.workspace.id}`);
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create workspace';
      const errorDetails = error.response?.data?.details;
      
      if (errorDetails && Array.isArray(errorDetails)) {
        toast.error(`${errorMessage}: ${errorDetails.join(', ')}`);
      } else if (errorDetails) {
        toast.error(`${errorMessage}: ${errorDetails}`);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full overflow-y-auto bg-gradient-to-br from-white to-blue-100">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-light rounded-full mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-text-main mb-2">Create Workspace</h1>
          <p className="text-text-secondary">
            Set up your company workspace to get started
          </p>
        </div>

        <form onSubmit={handleCreateWorkspace} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-main mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full px-4 py-3 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter your company name"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || !workspaceName.trim()}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              'Creating...'
            ) : (
              <>
                Create Workspace
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
            Already have a workspace? Go to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkspacePage;

