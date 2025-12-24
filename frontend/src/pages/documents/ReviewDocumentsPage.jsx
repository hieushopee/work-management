import { useEffect, useMemo, useState } from 'react';
import { Check, X, Eye, Download, FileText } from 'lucide-react';
import useDocumentStore from '../../stores/useDocumentStore';
import { formatDate } from '../../utils/formatDate';
import { toast } from 'react-hot-toast';

const ReviewDocumentsPage = () => {
  const { documents, getAllDocuments, reviewDocument, downloadDocument, loading, actionLoading } = useDocumentStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    await getAllDocuments({ approvalStatus: 'pending', docType: 'personal' });
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (documents || [])
      .filter((doc) => {
        // Only show pending personal docs submitted by staff
        const role = (doc.submittedBy?.role || '').toLowerCase();
        if (role && role !== 'staff') return false;
        return true;
      })
      .filter((doc) => {
      if (!term) return true;
      return (
        doc.title?.toLowerCase().includes(term) ||
        doc.description?.toLowerCase().includes(term) ||
        doc.category?.toLowerCase().includes(term)
      );
      });
  }, [documents, search]);

  const handleReview = async (docId, status) => {
    const result = await reviewDocument(docId, status);
    if (result) {
      loadPending();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-main">Review Documents</h1>
          <p className="text-text-secondary mt-1">Approve or reject submissions from staff.</p>
        </div>
        <div className="w-80">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pending documents..."
            className="w-full px-4 py-2 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border-light shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-text-secondary">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-text-secondary">No pending documents</div>
        ) : (
          <table className="w-full">
            <thead className="bg-bg-secondary border-b border-border-light">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Document</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Visibility</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Submitted By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-bg-secondary">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-primary" />
                      <div>
                        <div className="text-sm font-semibold text-text-main">{doc.title}</div>
                        <div className="text-xs text-text-secondary">{doc.description || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm capitalize">{doc.category}</td>
                  <td className="px-4 py-3 text-sm capitalize">{doc.visibility}</td>
                  <td className="px-4 py-3 text-sm text-text-main">{doc.submittedBy?.name || doc.createdBy?.name || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{formatDate(doc.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadDocument(doc.id, doc.file?.originalName || 'document')}
                        className="px-3 py-1.5 text-sm border border-border-light rounded-lg hover:bg-bg-secondary"
                      >
                        <Download className="w-4 h-4 inline-block mr-1" />
                        Download
                      </button>
                      <button
                        onClick={() => handleReview(doc.id, 'approved')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4 inline-block mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(doc.id, 'rejected')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        <X className="w-4 h-4 inline-block mr-1" />
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ReviewDocumentsPage;
