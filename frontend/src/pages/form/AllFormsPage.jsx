import React, { useState, useEffect } from 'react';
import axios from '../../libs/axios';
import { toast } from 'react-hot-toast';
import { useEmployeeStore } from '../../stores/useEmployeeStore';
import { PlusCircle, List, MessageSquare } from 'lucide-react';

import FormList from '../../components/FormList';
import CreateFormModal from '../../components/CreateFormModal';
import FormDetail from '../../components/FormDetail';
import LoadingSpinner from '../../components/LoadingSpinner';

const AllFormsPage = () => {
  const { employees, getAllUsers } = useEmployeeStore();
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForms();
  }, []);

  useEffect(() => {
    getAllUsers();
  }, [getAllUsers]);

  async function fetchForms() {
    setLoading(true);
    try {
      const { data } = await axios.get('/forms');
      const normalizePin = (f) => Boolean(f?.isPinned ?? f?.pinned);
      const toNum = (v) => (typeof v === 'number' ? v : 0);
      setForms((data || []).sort((a, b) => {
        const pinDiff = Number(normalizePin(b)) - Number(normalizePin(a));
        if (pinDiff !== 0) return pinDiff;
        const pinnedAtDiff = toNum(b?.pinnedAt) - toNum(a?.pinnedAt);
        if (pinnedAtDiff !== 0) return pinnedAtDiff;
        return toNum(b?.createdAt) - toNum(a?.createdAt);
      }));
    } catch (err) {
      console.error('Fetch forms error:', err);
      toast.error('Could not load the list of polls');
    } finally {
      setLoading(false);
    }
  }

  const handleFormDeleted = (deletedId) => {
    setForms((prev) => prev.filter((formItem) => formItem.id !== deletedId));
    if (deletedId === selectedForm?.id) {
      setSelectedForm(null);
    }
  };

  return (
    <div className="flex h-full bg-bg-secondary font-sans">
      {/* Left Sidebar */}
      <aside className="w-full md:w-1/3 lg:w-1/4 max-w-sm border-r border-border-light flex flex-col h-full bg-white">
        <div className="p-4 border-b border-border-light flex justify-between items-center">
          <div className="flex items-center gap-3">
            <List className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-text-main">All Forms</h2>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white hover:bg-primary-hover transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            title="Create New Poll"
          >
            <PlusCircle className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <FormList forms={forms} selectedFormId={selectedForm?.id} onSelectForm={setSelectedForm} />
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
          <div className="flex h-full items-center justify-center text-center text-text-secondary">
            <div className="flex flex-col items-center gap-4">
              <MessageSquare className="w-16 h-16 text-text-muted" />
              <h3 className="text-lg font-semibold text-text-main">Select a form</h3>
              <p className="max-w-xs">Choose a form from the list on the left to see its details and vote.</p>
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <CreateFormModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            fetchForms();
          }}
        />
      )}
    </div>
  );
};

export default AllFormsPage;


