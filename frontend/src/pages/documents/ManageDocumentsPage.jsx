import { useEffect, useState, useMemo } from 'react';
import { Search, Edit2, Trash2, Download, FileText, Building2, Globe, Eye, Upload, X } from 'lucide-react';
import useDocumentStore from '../../stores/useDocumentStore';
import useDepartmentStore from '../../stores/useDepartmentStore';
import { toast } from 'react-hot-toast';
import { formatDate } from '../../utils/formatDate';
import UploadDocumentsPage from './UploadDocumentsPage';

const ManageDocumentsPage = () => {
  const { documents, getAllDocuments, deleteDocument, downloadDocument, updateDocument, loading } = useDocumentStore();
  const { departments, getAllDepartments } = useDepartmentStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [editingDoc, setEditingDoc] = useState(null);
  const [editForm, setEditForm] = useState({ visibility: 'company', department: '' });
  const [saving, setSaving] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [canSubmitUpload, setCanSubmitUpload] = useState(false);

  useEffect(() => {
    loadDocuments();
    getAllDepartments();
  }, [categoryFilter, visibilityFilter, departmentFilter]);

  const loadDocuments = async () => {
    const filters = {};
    if (categoryFilter !== 'all') filters.category = categoryFilter;
    if (visibilityFilter !== 'all') filters.visibility = visibilityFilter;
    if (departmentFilter !== 'all') filters.department = departmentFilter;
    if (searchQuery) filters.search = searchQuery;
    await getAllDocuments(filters);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== undefined) {
        loadDocuments();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const filteredDocuments = useMemo(() => {
    if (!documents || !Array.isArray(documents)) return [];
    return documents.filter((doc) => {
      const matchesSearch = !searchQuery ||
        doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [documents, searchQuery]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }
    const success = await deleteDocument(id);
    if (success) {
      loadDocuments();
    }
  };

  const handleDownload = async (doc) => {
    await downloadDocument(doc.id, doc.file.originalName);
  };

  const openEdit = (doc) => {
    setEditingDoc(doc);
    setEditForm({
      visibility: doc.visibility || 'company',
      department: doc.department || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    if (editForm.visibility === 'department' && !editForm.department) {
      toast.error('Please select a department for department visibility');
      return;
    }
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('title', editingDoc.title || '');
      formData.append('description', editingDoc.description || '');
      formData.append('category', editingDoc.category || 'other');
      formData.append('visibility', editForm.visibility);
      if (editForm.visibility === 'department') {
        formData.append('department', editForm.department);
      }
      await updateDocument(editingDoc.id, formData);
      setEditingDoc(null);
      setSaving(false);
      loadDocuments();
      toast.success('Document permissions updated');
    } catch (err) {
      console.error('Error updating document:', err);
      setSaving(false);
    }
  };

  const handleView = (doc) => {
    if (!doc?.id) {
      toast.error('File not available to view');
      return;
    }
    const base =
      import.meta.env.MODE === 'development'
        ? (() => {
            const explicit = import.meta.env.VITE_API_URL;
            if (explicit) {
              try {
                const url = new URL(explicit);
                return `${url.protocol}//${url.host}`;
              } catch {
                return explicit.replace(/\/api$/, '');
              }
            }
            if (typeof window !== 'undefined') {
              const host = window.location.hostname ?? 'localhost';
              const port = import.meta.env.VITE_API_PORT ?? '5000';
              return `http://${host}:${port}`;
            }
            return 'http://localhost:5000';
          })()
        : '';
    const url = `${base}/api/documents/${doc.id}/preview`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const resolveDepartmentId = (dept, idx) => String(dept?.id || dept?._id || dept?.departmentId || idx);
  const resolveDepartmentName = (dept) => dept?.name || dept?.departmentName || dept?.title || '';

  const departmentNameFromId = (id) => {
    if (!id || !departments) return '';
    const match = departments.find((d, idx) => resolveDepartmentId(d, idx) === String(id));
    return resolveDepartmentName(match) || '';
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-main">Manage Documents</h1>
            <p className="text-text-secondary mt-1">View, edit, delete, and upload company documents</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            type="button"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 border border-border-light">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-10 pr-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option key="all" value="all">All Categories</option>
            <option key="policy" value="policy">Policy</option>
            <option key="procedure" value="procedure">Procedure</option>
            <option key="form" value="form">Form</option>
            <option key="announcement" value="announcement">Announcement</option>
            <option key="other" value="other">Other</option>
          </select>

          {/* Visibility Filter */}
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option key="all" value="all">All Visibility</option>
            <option key="company" value="company">Company-wide</option>
            <option key="department" value="department">Department-specific</option>
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option key="all" value="all">All Departments</option>
            {departments && departments.length > 0 ? (
              departments.map((dept, idx) => {
                const deptId = resolveDepartmentId(dept, idx);
                const deptName = resolveDepartmentName(dept) || 'Unnamed';
                return (
                  <option key={deptId} value={deptId}>
                    {deptName}
                  </option>
                );
              })
            ) : (
              <option key="no-dept" value="">No departments</option>
            )}
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow border border-border-light overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-secondary">Loading documents...</div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">No documents found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-secondary border-b border-border-light">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    File Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Visibility
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-bg-secondary">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <div>
                          <div className="text-sm font-medium text-text-main">{doc.title}</div>
                          <div className="text-xs text-text-secondary">
                            {formatFileSize(doc.file?.size || 0)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-light text-primary capitalize">
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {(doc.file?.originalName || doc.file?.filename || '').split('.').pop()?.toUpperCase() || 'FILE'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {doc.visibility === 'company' ? (
                          <Globe className="w-4 h-4 text-green-600" />
                        ) : (
                          <Building2 className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="text-sm text-text-main capitalize">{doc.visibility}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {doc.visibility === 'company'
                        ? ''
                        : (typeof doc.department === 'string'
                            ? departmentNameFromId(doc.department)
                            : resolveDepartmentName(doc.department)) || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {doc.createdBy?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {formatDate(doc.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(doc)}
                          className="p-2 text-primary hover:bg-primary-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-2 text-primary hover:bg-primary-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(doc)}
                          className="p-2 text-primary hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit permissions"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.title)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

      {editingDoc && (
        <div className="fixed inset-0 bg-text-main/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl border border-border-light shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold text-text-main mb-2">Edit Document Permissions</h3>
            <p className="text-sm text-text-secondary mb-4">{editingDoc.title}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Visibility</label>
                <select
                  value={editForm.visibility}
                  onChange={(e) => setEditForm({ ...editForm, visibility: e.target.value })}
                  className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="company">Company-wide</option>
                  <option value="department">Department-specific</option>
                </select>
              </div>
              {editForm.visibility === 'department' && (
                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">Department</label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select department</option>
                    {Array.isArray(departments) &&
                      departments.map((dept, idx) => {
                        const deptId = resolveDepartmentId(dept, idx);
                        const deptName = resolveDepartmentName(dept) || 'Unnamed';
                        return (
                          <option key={deptId} value={deptId}>
                            {deptName}
                          </option>
                        );
                      })}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 text-text-main bg-bg-hover rounded-lg hover:bg-gray-200"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 bg-text-main/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl border border-border-light shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
              <div>
                <h3 className="text-lg font-semibold text-text-main">Upload Documents</h3>
                <p className="text-sm text-text-secondary">Add a new document directly from Manage Documents.</p>
              </div>
              <button
                onClick={() => setShowUpload(false)}
                className="p-2 text-text-secondary bg-bg-hover rounded-lg hover:bg-gray-200"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <UploadDocumentsPage
                hideFooterButtons
                onValidityChange={setCanSubmitUpload}
                onSuccess={() => {
                  setShowUpload(false);
                  loadDocuments();
                }}
              />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-light">
              <button
                onClick={() => setShowUpload(false)}
                className="px-4 py-2 text-text-main bg-bg-hover rounded-lg hover:bg-gray-200"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={() => document.getElementById('upload-documents-form')?.requestSubmit()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                disabled={!canSubmitUpload}
              >
                Upload Document
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ManageDocumentsPage;
