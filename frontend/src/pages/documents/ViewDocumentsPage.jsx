import { useEffect, useState, useMemo } from 'react';
import { Search, Download, FileText, Building2, Globe, Eye } from 'lucide-react';
import useDocumentStore from '../../stores/useDocumentStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatDate } from '../../utils/formatDate';
import { toast } from 'react-hot-toast';

const ViewDocumentsPage = ({ docType }) => {
  const { documents, getAllDocuments, downloadDocument, loading } = useDocumentStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');

  useEffect(() => {
    loadDocuments();
  }, [categoryFilter, visibilityFilter, docType]);

  const loadDocuments = async () => {
    const filters = {};
    if (categoryFilter !== 'all') filters.category = categoryFilter;
    if (visibilityFilter !== 'all') filters.visibility = visibilityFilter;
    if (docType) filters.docType = docType;
    if (searchQuery) filters.search = searchQuery;
    // Only show approved documents in public views
    filters.approvalStatus = 'approved';
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

  const handleDownload = async (doc) => {
    await downloadDocument(doc.id, doc.file.originalName);
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

  if (loading && documents.length === 0) {
    return <LoadingSpinner />;
  }

  const getFileType = (doc) => {
    const name = doc?.file?.originalName || doc?.file?.filename || '';
    const parts = name.split('.');
    if (parts.length < 2) return 'FILE';
    return parts.pop().toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-main">View Documents</h1>
        <p className="text-text-secondary mt-1">Browse and download company documents</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 border border-border-light">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <option value="all">All Categories</option>
            <option value="policy">Policy</option>
            <option value="procedure">Procedure</option>
            <option value="form">Form</option>
            <option value="announcement">Announcement</option>
            <option value="other">Other</option>
          </select>

          {/* Visibility Filter */}
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Visibility</option>
            <option value="company">Company-wide</option>
            <option value="department">Department-specific</option>
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="p-8 text-center text-text-secondary">Loading documents...</div>
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center border border-border-light">
          <FileText className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary">No documents found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-lg shadow border border-border-light p-6 hover:shadow-lg transition-shadow flex flex-col h-full"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-main line-clamp-2">{doc.title}</h3>
                    <p className="text-xs text-text-secondary mt-1">
                      {formatFileSize(doc.file?.size || 0)} • {getFileType(doc)}
                    </p>
                  </div>
                </div>
              </div>

              {doc.description && (
                <p className="text-sm text-text-secondary mb-4 line-clamp-2">{doc.description}</p>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-light text-primary capitalize">
                  {doc.category}
                </span>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    doc.visibility === 'company'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {doc.visibility === 'company' ? (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Company
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      Department
                    </span>
                  )}
                </span>
              </div>

              {doc.department && (
                <div className="mb-4">
                  <p className="text-xs text-text-secondary">Department:</p>
                  <p className="text-sm text-text-main font-medium">{doc.department.name}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border-light mt-auto">
                <div className="text-xs text-text-secondary">
                  {formatDate(doc.createdAt)}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleView(doc)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-primary border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ViewDocumentsPage;








