import { useEffect, useState } from 'react';
import { BarChart3, FileText, Building2, Globe, FolderOpen, TrendingUp, RefreshCw } from 'lucide-react';
import useDocumentStore from '../../stores/useDocumentStore';
import LoadingSpinner from '../../components/LoadingSpinner';

const StatisticsPage = () => {
  const { statistics, getStatistics, loading } = useDocumentStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setRefreshing(true);
    await getStatistics();
    setRefreshing(false);
  };

  if (loading && !statistics) {
    return <LoadingSpinner />;
  }

  // Graceful fallback if API returns no stats
  const safeStats = statistics || {
    totalDocuments: 0,
    byCategory: [],
    byVisibility: [],
    recentDocuments: [],
  };

  const categoryStats = safeStats.byCategory || [];
  const rawVisibilityStats = safeStats.byVisibility || [];
  const recentDocs = safeStats.recentDocuments || [];

  // Fallback: if backend visibility stats are empty, derive from recent docs
  const fallbackVisibilityCounts = recentDocs.reduce(
    (acc, doc) => {
      const key = (doc.visibility || 'company').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {}
  );

  const visibilityStats =
    rawVisibilityStats.length > 0
      ? rawVisibilityStats.map((v) => ({ ...v, _id: (v._id || '').toLowerCase() }))
      : Object.entries(fallbackVisibilityCounts).map(([key, count]) => ({ _id: key, count }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-main">Document Statistics</h1>
          <p className="text-text-secondary mt-1">Overview of all documents in the system</p>
        </div>
        <button
          onClick={loadStatistics}
          disabled={refreshing}
          className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors inline-flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-border-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Total Documents</p>
              <p className="text-3xl font-bold text-text-main mt-2">
                {statistics?.totalDocuments || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-border-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Company-wide</p>
              <p className="text-3xl font-bold text-text-main mt-2">
                {visibilityStats.reduce(
                  (sum, v) => sum + ((v._id || '').toLowerCase() === 'company' ? v.count : 0),
                  0
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Globe className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-border-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Department-specific</p>
              <p className="text-3xl font-bold text-text-main mt-2">
                {visibilityStats.reduce(
                  (sum, v) => sum + ((v._id || '').toLowerCase() === 'department' ? v.count : 0),
                  0
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Category */}
        <div className="bg-white rounded-lg shadow p-6 border border-border-light">
          <h2 className="text-xl font-semibold text-text-main mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Documents by Category
          </h2>
          <div className="space-y-4">
            {categoryStats.length > 0 ? (
              categoryStats.map((stat) => (
                <div key={stat._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span className="text-text-main capitalize">{stat._id || 'Other'}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${(stat.count / (safeStats?.totalDocuments || 1)) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-text-main font-semibold w-8 text-right">{stat.count}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-text-secondary text-center py-8">No category data available</p>
            )}
          </div>
        </div>

        {/* By Visibility */}
        <div className="bg-white rounded-lg shadow p-6 border border-border-light">
          <h2 className="text-xl font-semibold text-text-main mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Documents by Visibility
          </h2>
          <div className="space-y-4">
            {visibilityStats.length > 0 ? (
              visibilityStats.map((stat) => (
                <div key={stat._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        (stat._id || '').toLowerCase() === 'company' ? 'bg-green-600' : 'bg-blue-600'
                      }`}
                    ></div>
                    <span className="text-text-main capitalize">
                      {(stat._id || '').toLowerCase() === 'company' ? 'Company-wide' : 'Department-specific'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          (stat._id || '').toLowerCase() === 'company' ? 'bg-green-600' : 'bg-blue-600'
                        }`}
                        style={{
                          width: `${(stat.count / (safeStats?.totalDocuments || 1)) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-text-main font-semibold w-8 text-right">{stat.count}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-text-secondary text-center py-8">No visibility data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-lg shadow p-6 border border-border-light">
        <h2 className="text-xl font-semibold text-text-main mb-4 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-primary" />
          Recent Documents
        </h2>
        {recentDocs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light">
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-main">Title</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-main">Category</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-main">File Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-main">Visibility</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-main">Department</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-main">Created By</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-text-main">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentDocs.map((doc) => (
                  <tr key={doc.id} className="border-b border-border-light hover:bg-bg-secondary">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-text-muted" />
                        <span className="text-text-main">{doc.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-light text-primary capitalize">
                        {doc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary">
                      {(doc.file?.originalName || doc.file?.filename || '').split('.').pop()?.toUpperCase() || 'FILE'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          doc.visibility === 'company'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {doc.visibility === 'company' ? 'Company' : 'Department'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {doc.department?.name || ''}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {doc.createdBy?.name || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-text-secondary text-center py-8">No recent documents</p>
        )}
      </div>
    </div>
  );
};

export default StatisticsPage;








