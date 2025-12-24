import { useState, useEffect } from 'react';
import { Upload, FileText, X, Building2, Globe, CheckCircle } from 'lucide-react';
import useDocumentStore from '../../stores/useDocumentStore';
import useDepartmentStore from '../../stores/useDepartmentStore';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const UploadDocumentsPage = ({
  hideFooterButtons = false,
  onSuccess,
  onValidityChange,
  submitDocumentFn,
  buttonLabel = 'Upload Document',
}) => {
  const navigate = useNavigate();
  const { createDocument, loading } = useDocumentStore();
  const { departments, getAllDepartments } = useDepartmentStore();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    visibility: 'company',
    department: '',
    tags: '',
    file: null,
  });

  const [filePreview, setFilePreview] = useState(null);
  const isValid =
    formData.title.trim() &&
    formData.file &&
    (formData.visibility === 'company' || (formData.visibility === 'department' && formData.department));

  useEffect(() => {
    if (typeof onValidityChange === 'function') {
      onValidityChange(Boolean(isValid));
    }
  }, [isValid, onValidityChange]);

  useEffect(() => {
    getAllDepartments();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB');
        return;
      }
      setFormData({ ...formData, file });
      setFilePreview({
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!formData.file) {
      toast.error('Please select a file');
      return;
    }

    if (formData.visibility === 'department' && !formData.department) {
      toast.error('Please select a department for department-specific documents');
      return;
    }

    const submitData = new FormData();
    submitData.append('title', formData.title);
    submitData.append('description', formData.description);
    submitData.append('category', formData.category);
    submitData.append('visibility', formData.visibility);
    if (formData.visibility === 'department' && formData.department) {
      submitData.append('department', formData.department);
    }
    if (formData.tags) {
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      submitData.append('tags', JSON.stringify(tagsArray));
    }
    submitData.append('file', formData.file);

    if (!isValid) return;

    const submitFn = submitDocumentFn || createDocument;
    const result = await submitFn(submitData);
    if (result) {
      setFormData({
        title: '',
        description: '',
        category: 'other',
        visibility: 'company',
        department: '',
        tags: '',
        file: null,
      });
      setFilePreview(null);
      if (typeof onSuccess === 'function') {
        onSuccess();
      } else {
        navigate('/documents/manage');
      }
    }
  };

  const removeFile = () => {
    setFormData({ ...formData, file: null });
    setFilePreview(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <form id="upload-documents-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-text-main mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter document title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-main mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              rows="3"
              placeholder="Enter document description"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-text-main mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="policy">Policy</option>
              <option value="procedure">Procedure</option>
              <option value="form">Form</option>
              <option value="announcement">Announcement</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-text-main mb-2">
              Visibility
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="company"
                  checked={formData.visibility === 'company'}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value, department: '' })}
                  className="w-4 h-4 text-primary"
                />
                <Globe className="w-4 h-4 text-text-secondary" />
                <span className="text-text-main">Company-wide</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="department"
                  checked={formData.visibility === 'department'}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                  className="w-4 h-4 text-primary"
                />
                <Building2 className="w-4 h-4 text-text-secondary" />
                <span className="text-text-main">Department-specific</span>
              </label>
            </div>
          </div>

          {/* Department (if department-specific) */}
          {formData.visibility === 'department' && (
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required={formData.visibility === 'department'}
              >
                <option key="select-dept" value="">Select department</option>
                {departments && departments.length > 0 ? (
                  departments.map((dept) => {
                    const deptId = dept.id || dept._id || dept.name;
                    return (
                      <option key={deptId} value={deptId || ''}>
                        {dept.name}
                      </option>
                    );
                  })
                ) : (
                  <option key="no-dept" value="">No departments available</option>
                )}
              </select>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-text-main mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., important, hr, policy"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-text-main mb-2">
              File <span className="text-red-500">*</span>
            </label>
            {!filePreview ? (
              <div className="border-2 border-dashed border-border-light rounded-lg p-8 text-center hover:border-indigo-500 transition-colors">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept="*/*"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-12 h-12 text-text-muted" />
                  <span className="text-text-secondary">Click to upload or drag and drop</span>
                  <span className="text-sm text-text-secondary">Max file size: 50MB</span>
                </label>
              </div>
            ) : (
              <div className="border border-border-light rounded-lg p-4 bg-bg-secondary">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-text-main font-medium">{filePreview.name}</p>
                      <p className="text-sm text-text-secondary">{formatFileSize(filePreview.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {!hideFooterButtons && (
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/documents/manage')}
                className="px-6 py-2 text-text-main bg-bg-hover rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !isValid}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  'Uploading...'
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {buttonLabel}
                  </>
                )}
              </button>
            </div>
          )}
    </form>
  );
};

export default UploadDocumentsPage;
