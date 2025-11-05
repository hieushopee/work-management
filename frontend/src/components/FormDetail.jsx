import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Users,
  BarChart3,
  Clock,
  PlusCircle,
  CheckCircle2,
  CalendarDays,
  Trash2,
  List,
  PencilLine,
  Save,
  X as CloseIcon,
  Eye,
  Pin
} from 'lucide-react';
import axios from '../libs/axios';
import useUserStore from '../stores/useUserStore';
import VoterListModal from './VoterListModal';
import LoadingSpinner from './LoadingSpinner';

// Helper Functions
const formatDateTime = (value) => {
  if (!value) return 'N/A';
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return 'Invalid Date';
  }
};

const formatDurationLabel = (duration) => {
  if (!duration || duration === 'forever') return 'No end date';
  const durationMap = { '1h': '1 Hour', '8h': '8 Hours', '1d': '1 Day', '1w': '1 Week' };
  return durationMap[duration] || String(duration);
};

// Sub-components
const StatCard = ({ label, value, icon: IconComponent }) => (
  <div className='flex items-start gap-4 rounded-xl bg-slate-50/80 p-4 border border-slate-200/80'>
    <div className='mt-1 rounded-lg bg-blue-100 p-2 text-blue-600'>
      {React.createElement(IconComponent, { className: 'h-5 w-5' })}
    </div>
    <div>
      <p className='text-sm font-medium text-slate-500'>{label}</p>
      <p className='text-base font-bold text-slate-800'>{value}</p>
    </div>
  </div>
);

const VotingOption = ({ option, totalVotes, isChecked, onToggle, isEditing, onTextChange, onDelete, isOwner, allowMultiple, isAnonymous }) => {
  const percentage = totalVotes > 0 ? ((option.votes || 0) / totalVotes) * 100 : 0;
  const voterNames = (option.voters || []).map((v) => v.name).filter(Boolean);

  return (
    <li className='relative'>
      <label className={`relative flex gap-4 rounded-xl border p-5 transition-all duration-200 ${isChecked ? 'border-blue-400 bg-blue-50/70' : 'border-slate-200 bg-white hover:border-blue-200'}`}>
        <input type={allowMultiple ? "checkbox" : "radio"} name={allowMultiple ? undefined : 'voteOption'} checked={isChecked} onChange={onToggle} className='mt-1 h-5 w-5 shrink-0 cursor-pointer accent-blue-600' disabled={isEditing} />
        <div className='flex-1 space-y-3'>
          {isEditing ? (
            <div className='flex items-center gap-3 w-full'>
              <div className='h-12 flex-1 overflow-hidden rounded-lg bg-slate-200 relative'>
                <input 
                  type='text' 
                  value={option.text} 
                  onChange={(e) => onTextChange(option.id, e.target.value)} 
                  disabled={!isOwner} 
                  className='h-full w-full rounded-lg border border-blue-300 bg-white px-4 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500' 
                />
              </div>
              {isOwner && (
                <button type='button' onClick={() => onDelete(option.id)} className='p-2 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-full' title='Delete option'>
                  <Trash2 className='h-5 w-5' />
                </button>
              )}
            </div>
          ) : (
            <div className='relative w-full'>
              <div className='h-12 w-full overflow-hidden rounded-lg bg-slate-200 relative'>
                {percentage > 0 ? (
                  <div 
                    className='h-full rounded-lg bg-blue-500 transition-all duration-300 flex items-center px-4' 
                    style={{ width: `${percentage}%` }}
                  >
                    <span className='text-white font-semibold text-sm truncate'>{option.text}</span>
                  </div>
                ) : (
                  <div className='h-full flex items-center px-4'>
                    <span className='text-slate-600 font-semibold text-sm'>{option.text}</span>
                  </div>
                )}
                <div className='absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-sm'>
                  {percentage.toFixed(0)}%
                </div>
              </div>
            </div>
          )}
          <div className='flex items-center justify-between gap-2 text-xs text-slate-500'>
            <span className='flex items-center gap-1 font-medium'>
              <Users className='h-4 w-4' /> {option.votes || 0} {`vote${(option.votes || 0) !== 1 ? 's' : ''}`}
            </span>
            {!isAnonymous && voterNames.length > 0 && <p className="truncate max-w-[200px]">Voters: {voterNames.join(', ')}</p>}
          </div>
        </div>
      </label>
    </li>
  );
};

export default function FormDetail({ form, onDeleteForm, users }) {
   const [detail, setDetail] = useState(null);
   const [selectedOptions, setSelectedOptions] = useState([]);
   const [isEditing, setIsEditing] = useState(false);
   const [editedOptions, setEditedOptions] = useState([]);
   const [loading, setLoading] = useState(true);
   const [actionLoading, setActionLoading] = useState(false);
   const [showVoters, setShowVoters] = useState(false);
   const [showAddInput, setShowAddInput] = useState(false);
   const [newOptionText, setNewOptionText] = useState('');

  const user = useUserStore((state) => state.user);

  const isOwner = useMemo(() => user?.id === detail?.ownerId, [user, detail]);

  const resetEditedOptions = useCallback(() => {
    if (detail?.options) {
      setEditedOptions(detail.options.map(opt => ({ ...opt })));
    } else {
      setEditedOptions([]);
    }
  }, [detail]);

  const handleStartEditing = () => {
    resetEditedOptions();
    setShowAddInput(false);
    setNewOptionText('');
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    resetEditedOptions();
    setShowAddInput(false);
    setNewOptionText('');
    setIsEditing(false);
  };

  const fetchDetail = async (id) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/forms/${id}`);
      setDetail(data);
      setEditedOptions(data.options?.map(opt => ({ ...opt })) || []);
    } catch (err) {
      console.error('Failed to load detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (form?.id) {
      fetchDetail(form.id);
    }
  }, [form?.id]);

  const handleVote = async () => {
    if (!detail?.id || !selectedOptions.length) return;
    setActionLoading(true);
    try {
      for (const optId of selectedOptions) {
        await axios.post(`/forms/${detail.id}/options/${optId}/vote`, { voter: { id: user.id, name: user.name } });
      }
      fetchDetail(detail.id);
      setSelectedOptions([]);
    } catch (err) {
      console.error('Vote error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveOptions = async () => {
    if (!detail?.id || !isOwner) return;
    setActionLoading(true);
    try {
      const deletedOptionIds = editedOptions
        .filter(o => o.deleted && o.id)
        .map(o => o.id);

      if (deletedOptionIds.length) {
        await Promise.all(
          deletedOptionIds.map((optId) =>
            axios.delete(`/forms/${detail.id}/options/${optId}`).catch((error) => {
              console.error(`Delete option ${optId} error:`, error);
              throw error;
            })
          )
        );
      }

      const optionsToSave = editedOptions
        .filter(o => !o.deleted)
        .map(o => {
          const { deleted: _deleted, ...optionWithoutDeleted } = o;
          return optionWithoutDeleted;
        });

      if (optionsToSave.length) {
        await axios.put(`/forms/${detail.id}/options`, { options: optionsToSave });
      }

      setIsEditing(false);
      fetchDetail(detail.id);
    } catch (err) {
      console.error('Update options error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOption = async (optId) => {
    setEditedOptions(prev => prev.map(o => o.id === optId ? { ...o, deleted: true } : o));
  };

  const handleDeletePoll = async () => {
    if (!detail?.id || !isOwner) return;
    setActionLoading(true);
    try {
      await axios.delete(`/forms/${detail.id}`);
      onDeleteForm(detail.id);
    } catch (err) {
      console.error('Delete poll error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddOption = async () => {
    if (!detail?.id) return;
    const text = (newOptionText || '').trim();
    if (!text) return;
    setActionLoading(true);
    try {
      await axios.post(`/forms/${detail.id}/options`, { text });
      setNewOptionText('');
      setShowAddInput(false);
      fetchDetail(detail.id);
    } catch (err) {
      console.error('Add option error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const totalVotes = useMemo(() => (detail?.options || []).reduce((sum, opt) => sum + (opt.votes || 0), 0), [detail]);

  const uniqueVoters = useMemo(() => new Set((detail?.options || []).flatMap(o => o.voters?.map(v => v.id))).size, [detail]);

  const allowMultiple = detail?.settings?.allowMultiple;
  const allowAddOptions = detail?.settings?.allowAddOptions;
  const isAnonymous = detail?.settings?.allowAnonymous;

  if (loading || !detail) return <LoadingSpinner />;

  const summaryCards = [
    { label: 'Total Votes', value: totalVotes, icon: BarChart3 },
    { label: 'Unique Voters', value: uniqueVoters, icon: Users },
    { label: 'Options', value: detail.options?.length || 0, icon: List },
    { label: 'Ends', value: formatDurationLabel(detail.duration), icon: Clock },
    { label: 'Created', value: formatDateTime(detail.createdAt), icon: CalendarDays },
    { label: 'Updated', value: formatDateTime(detail.updatedAt), icon: CalendarDays },
  ];

  return (
    <div className='space-y-8'>
      {/* Header */}
      <section>
        <div className='flex items-center gap-2'>
          <h1 className='text-4xl font-bold text-slate-800'>{detail.title}</h1>
          {detail.pinned && <Pin className='w-6 h-6 text-yellow-500' />}
        </div>
        <p className='mt-1 text-sm text-slate-500'>Cre: {user?.id === detail?.ownerId ? 'You' : detail?.ownerName || 'Unknown'}</p>
        {detail.description && <p className='mt-2 text-lg text-slate-600 max-w-3xl'>{detail.description}</p>}
      </section>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaryCards.map(card => <StatCard key={card.label} {...card} />)}
      </section>

      {/* Voting Section */}
      <section>
        <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6'>
          <h2 className='text-2xl font-bold text-slate-800'>Options</h2>
          {isOwner && (
            <div className='flex items-center gap-2'>
              {!isEditing ? (
                <button
                  onClick={handleStartEditing}
                  className='inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors'
                >
                  <PencilLine className='w-4 h-4' /> Edit Options
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancelEditing}
                    className='inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors'
                  >
                    <CloseIcon className='w-4 h-4' /> Cancel
                  </button>
                  <button
                    onClick={handleSaveOptions}
                    disabled={actionLoading}
                    className='inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50'
                  >
                    <Save className='w-4 h-4' /> {actionLoading ? 'Saving...' : 'Save Options'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <ul className='space-y-4'>
          {(isEditing ? editedOptions.filter(o => !o.deleted) : detail.options).map(opt => (
            <VotingOption
              key={opt.id}
              option={opt}
              totalVotes={totalVotes}
              isChecked={allowMultiple ? selectedOptions.includes(opt.id) : selectedOptions[0] === opt.id}
              onToggle={() => {
                if (allowMultiple) {
                  setSelectedOptions(prev => prev.includes(opt.id) ? prev.filter(id => id !== opt.id) : [...prev, opt.id]);
                } else {
                  setSelectedOptions([opt.id]);
                }
              }}
              isEditing={isEditing}
              onTextChange={(id, text) => setEditedOptions(prev => prev.map(o => o.id === id ? ({ ...o, text }) : o))}
              onDelete={handleDeleteOption}
              isOwner={isOwner}
              allowMultiple={allowMultiple}
              isAnonymous={isAnonymous}
            />
          ))}

          {allowAddOptions && (
            <li>
              {showAddInput ? (
                <div className='relative flex gap-4 rounded-xl border border-dashed p-5 bg-white'>
                  <div className='flex-1 flex items-center gap-2'>
                    <input
                      type='text'
                      autoFocus
                      value={newOptionText}
                      onChange={(e) => setNewOptionText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newOptionText.trim()) {
                          e.preventDefault();
                          handleAddOption();
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setShowAddInput(false);
                          setNewOptionText('');
                        }
                      }}
                      placeholder='Type a new option and press Enter'
                      className='w-full rounded-md border border-blue-300 bg-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500'
                    />
                  </div>
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={handleAddOption}
                      disabled={actionLoading || !newOptionText.trim()}
                      className='inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50'
                    >
                      <PlusCircle className='w-4 h-4' /> {actionLoading ? 'Adding...' : 'Add'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddInput(false);
                        setNewOptionText('');
                      }}
                      className='inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors'
                    >
                      <CloseIcon className='w-4 h-4' /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type='button'
                  onClick={() => setShowAddInput(true)}
                  className='w-full text-left'
                  aria-label='Add a new option'
                >
                  <label className='relative flex gap-4 rounded-xl border border-dashed p-5 bg-white hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer'>
                    <div className='mt-1 rounded-lg bg-blue-100 p-2 text-blue-600'>
                      <PlusCircle className='h-5 w-5' />
                    </div>
                    <div className='flex-1'>
                      <p className='text-base font-semibold text-slate-800'>Add an option</p>
                      <p className='text-sm text-slate-500'>Click to add your own option to this poll</p>
                    </div>
                  </label>
                </button>
              )}
            </li>
          )}
        </ul>
      </section>

      {/* Action Footer */}
      <footer className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
        <p className='text-sm text-slate-500'>
          {isEditing ? 'You are in edit mode.' : !selectedOptions.length ? `Select ${allowMultiple ? 'options' : 'an option'} to vote.` : `Your vote${allowMultiple && selectedOptions.length > 1 ? 's' : ''} ${allowMultiple && selectedOptions.length > 1 ? 'are' : 'is'} ready to be submitted.`}
        </p>
        <div className="flex items-center gap-3">
            {!isAnonymous && (
              <button onClick={() => setShowVoters(true)} className='inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors'>
                  <Eye className='w-4 h-4'/> View Voters
              </button>
            )}
            <button onClick={handleVote} disabled={!selectedOptions.length || isEditing || actionLoading} className='px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'>
                {actionLoading ? 'Submitting...' : 'Submit Vote'}
            </button>
        </div>
      </footer>

      {isOwner && (
          <div className="mt-12 pt-6 border-t border-dashed border-red-300">
              <h3 className="text-lg font-semibold text-red-800">Danger Zone</h3>
              <p className="text-sm text-slate-500 mt-1">This action cannot be undone.</p>
              <button onClick={handleDeletePoll} disabled={actionLoading} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50">
                  <Trash2 className="w-4 h-4"/> {actionLoading ? 'Deleting...' : 'Delete this Poll'}
              </button>
          </div>
      )}

      {showVoters && <VoterListModal open={showVoters} onClose={() => setShowVoters(false)} options={detail.options} users={users || []} />}
    </div>
  );
}






