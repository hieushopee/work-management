import { useState, useEffect, useRef } from 'react';
import { Building, Camera, Save, X, Loader2 } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { toast } from 'react-hot-toast';
import axios from '../../libs/axios';
import useUserStore from '../../stores/useUserStore';
import { isAdmin } from '../../utils/roleUtils';
import LoadingSpinner from '../../components/LoadingSpinner';

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

const WorkspaceSettingsPage = () => {
  const { user } = useUserStore();
  const { workspace, getCurrentWorkspace } = useWorkspaceStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadWorkspace();
  }, []);

  const loadWorkspace = async () => {
    setLoading(true);
    try {
      await getCurrentWorkspace();
    } catch (error) {
      console.error('Error loading workspace:', error);
      toast.error('Failed to load workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspace) {
      setWorkspaceName(workspace.name || '');
      setLogoPreview(workspace.logo || '');
    }
  }, [workspace]);

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_LOGO_SIZE) {
      toast.error('Logo must be smaller than 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result?.toString() || '');
      setLogoFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setLogoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!workspaceName.trim()) {
      toast.error('Workspace name is required');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', workspaceName.trim());
      if (logoFile) {
        formData.append('logo', logoFile);
      } else if (!logoPreview && workspace?.logo) {
        // If logo was removed
        formData.append('removeLogo', 'true');
      }

      const res = await axios.put('/workspace/update', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        toast.success('Workspace updated successfully');
        await loadWorkspace();
      }
    } catch (error) {
      console.error('Error updating workspace:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update workspace';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin(user)) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Access denied. Admin only.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Workspace Settings</h1>
              <p className="text-white/90 text-sm">Manage your workspace name and logo</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Workspace Name */}
          <div>
            <label className="block text-base font-semibold text-text-main mb-3">
              Workspace Name
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Enter workspace name"
              className="w-full px-5 py-4 border-2 border-border-light rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary transition-all duration-200 bg-bg-secondary focus:bg-white text-text-main font-medium shadow-sm"
            />
          </div>

          {/* Logo */}
          <div>
            <label className="block text-base font-semibold text-text-main mb-3">
              Workspace Logo
            </label>
            <div className="flex items-start gap-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-2xl bg-primary-light border-2 border-border-light flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Workspace logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building className="w-16 h-16 text-primary/50" />
                  )}
                </div>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 ring-2 ring-white"
                    title="Remove logo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
                >
                  <Camera className="w-5 h-5" />
                  {logoPreview ? 'Change Logo' : 'Upload Logo'}
                </button>
                <p className="text-sm text-text-secondary">
                  Recommended: Square image, at least 256x256 pixels. Max size: 2MB
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-border-light">
            <button
              onClick={handleSave}
              disabled={saving || !workspaceName.trim()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-sm hover:shadow-md"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default WorkspaceSettingsPage;

