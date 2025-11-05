import React, { useState } from 'react';
import axios from '../libs/axios';
import { X, Plus, Trash2, Settings, ToggleLeft, ToggleRight, Lock, Users, Pin } from 'lucide-react';

const CreateFormModal = ({ onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState('forever');
  
  // Settings
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [allowAddOptions, setAllowAddOptions] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const durationOptions = [
    { label: 'Forever', value: 'forever' },
    { label: '1 Hour', value: '1h' },
    { label: '8 Hours', value: '8h' },
    { label: '1 Day', value: '1d' },
    { label: '1 Week', value: '1w' },
  ];

  const addOption = () => setOptions(prev => [...prev, '']);
  
  const updateOption = (idx, value) =>
    setOptions(prev => prev.map((o, i) => (i === idx ? value : o)));

  const removeOption = (idx) => {
    if (options.length > 2) {
        setOptions(prev => prev.filter((_, i) => i !== idx));
    }
  }

  const handleSubmit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        await axios.post('/forms', {
            title: title.trim(),
            options: options.filter(o => o.trim()),
            duration,
            settings: {
                allowMultiple,
                allowAddOptions,
                allowAnonymous: isAnonymous,
                pinToTop: isPinned
            },
        });
        onCreated();
        onClose();
    } catch (error) {
        console.error("Failed to create poll:", error);
        // You might want to show a toast notification here
    } finally {
        setIsSubmitting(false);
    }
  };

  const Toggle = ({ label, enabled, onChange, icon: IconComponent }) => (
    <label className="flex items-center justify-between cursor-pointer">
        <div className="flex items-center gap-3">
            {React.createElement(IconComponent, { className: 'w-5 h-5 text-slate-500' })}
            <span className="font-medium text-slate-700">{label}</span>
        </div>
        <button type="button" onClick={() => onChange(!enabled)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </label>
  );

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl transform transition-all" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800">Create New Poll</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Question */}
            <div>
              <label htmlFor="poll-title" className="block text-sm font-bold text-slate-600 mb-1">Poll Question</label>
              <input
                id="poll-title"
                name="poll-title"
                type="text"
                autoComplete="off"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What should we do for the team outing?"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">Answer Options</label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      name={`option-${idx}`}
                      autoComplete="off"
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={e => updateOption(idx, e.target.value)}
                      required={idx < 2}
                    />
                    {options.length > 2 && (
                        <button type="button" onClick={() => removeOption(idx)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" className="text-blue-600 hover:text-blue-700 font-semibold text-sm mt-2 inline-flex items-center gap-1" onClick={addOption}><Plus className="w-4 h-4"/> Add Option</button>
            </div>

            {/* Settings */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2"><Settings className="w-5 h-5"/> Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <Toggle label="Allow multiple answers" enabled={allowMultiple} onChange={setAllowMultiple} icon={ToggleRight} />
                    <Toggle label="Allow others to add options" enabled={allowAddOptions} onChange={setAllowAddOptions} icon={Users} />
                    <Toggle label="Anonymous voting" enabled={isAnonymous} onChange={setIsAnonymous} icon={Lock} />
                    <Toggle label="Pin to top" enabled={isPinned} onChange={setIsPinned} icon={Pin} />
                    <div>
                        <label htmlFor="duration" className="block text-sm font-medium text-slate-700 mb-1">Poll Duration</label>
                        <select
                          id="duration"
                          name="duration"
                          autoComplete="off"
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={duration}
                          onChange={e => setDuration(e.target.value)}
                        >
                            {durationOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4 p-6 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Poll'}</button>
        </div>
      </form>
    </div>
  );
}

export default CreateFormModal;
