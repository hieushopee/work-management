import React, { useState, useEffect, useMemo } from 'react';
import axios from '../../libs/axios';
import { toast } from 'react-hot-toast';
import { useEmployeeStore } from '../../stores/useEmployeeStore';
import useUserStore from '../../stores/useUserStore';
import { CheckCircle2, MessageSquare, Circle } from 'lucide-react';

import FormList from '../../components/FormList';
import FormDetail from '../../components/FormDetail';
import LoadingSpinner from '../../components/LoadingSpinner';

const MyResponsesPage = () => {
  const { user } = useUserStore();
  const { employees, getAllUsers } = useEmployeeStore();
  const [allForms, setAllForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [loading, setLoading] = useState(true);

  const userId = user?.id;

  useEffect(() => {
    fetchAllForms();
  }, []);

  useEffect(() => {
    getAllUsers();
  }, [getAllUsers]);

  async function fetchAllForms() {
    setLoading(true);
    try {
      const { data } = await axios.get('/forms');
      setAllForms(data || []);
    } catch (err) {
      console.error('Fetch forms error:', err);
      toast.error('Could not load forms');
    } finally {
      setLoading(false);
    }
  }

  // Filter forms based on user's responses
  const { votedForms, notVotedForms } = useMemo(() => {
    if (!userId || !Array.isArray(allForms)) {
      return { votedForms: [], notVotedForms: [] };
    }

    const userIdString = userId.toString();
    const voted = [];
    const notVoted = [];

    allForms.forEach((form) => {
      if (!form.options || !Array.isArray(form.options)) {
        notVoted.push(form);
        return;
      }

      // Check if user has voted in any option
      const hasVoted = form.options.some((option) => {
        if (!option.voters || !Array.isArray(option.voters)) return false;
        return option.voters.some((voter) => {
          const voterId = voter.id?.toString() || voter._id?.toString();
          return voterId === userIdString;
        });
      });

      if (hasVoted) {
        voted.push(form);
      } else {
        notVoted.push(form);
      }
    });

    // Sort voted forms by most recent (use form updatedAt as proxy)
    voted.sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    });

    // Sort not voted forms by creation date
    notVoted.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return { votedForms: voted, notVotedForms: notVoted };
  }, [allForms, userId]);

  const handleFormDeleted = (deletedId) => {
    setAllForms((prev) => prev.filter((formItem) => formItem.id !== deletedId));
    if (deletedId === selectedForm?.id) {
      setSelectedForm(null);
    }
  };

  const displayForms = [...votedForms, ...notVotedForms];

  return (
    <div className="flex h-full bg-slate-50 font-sans">
      {/* Left Sidebar */}
      <aside className="w-full md:w-1/3 lg:w-1/4 max-w-sm border-r border-slate-200 flex flex-col h-full bg-white">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-slate-800">My Responses</h2>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span>{votedForms.length} Voted</span>
            </div>
            <div className="flex items-center gap-1">
              <Circle className="w-3 h-3 text-slate-400" />
              <span>{notVotedForms.length} Pending</span>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              {displayForms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <CheckCircle2 className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">No forms available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {votedForms.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-2">
                        Voted ({votedForms.length})
                      </h3>
                      <FormList
                        forms={votedForms}
                        selectedFormId={selectedForm?.id}
                        onSelectForm={setSelectedForm}
                        showVotedIndicator={true}
                      />
                    </div>
                  )}
                  {notVotedForms.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-2">
                        Not Voted ({notVotedForms.length})
                      </h3>
                      <FormList
                        forms={notVotedForms}
                        selectedFormId={selectedForm?.id}
                        onSelectForm={setSelectedForm}
                        showPendingIndicator={true}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {selectedForm ? (
          <FormDetail
            key={selectedForm.id}
            form={selectedForm}
            onDeleteForm={handleFormDeleted}
            users={employees}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-center text-slate-500">
            <div className="flex flex-col items-center gap-4">
              <MessageSquare className="w-16 h-16 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-700">Select a form</h3>
              <p className="max-w-xs">
                Choose a form to view your response or vote on pending forms.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MyResponsesPage;

