import React, { useMemo } from 'react';
import { Pin, BarChart2, Calendar, CheckCircle2, Circle } from 'lucide-react';

export default function FormList({ forms = [], selectedFormId, onSelectForm, showVotedIndicator = false, showPendingIndicator = false }) {
  const normalized = useMemo(() => {
    return (forms || []).map(f => ({
      ...f,
      id: f?.id || f?._id || f?.docId,
      title: f?.title || 'Untitled Poll',
      options: Array.isArray(f?.options) ? f.options : [],
      totalVotes: (f?.options || []).reduce((sum, opt) => sum + (opt.votes || 0), 0),
      duration: f?.duration || 'forever',
      // Prefer backend's isPinned; fall back to legacy "pinned"
      isPinned: Boolean(f?.isPinned ?? f?.pinned),
      pinnedAt: f?.pinnedAt || null,
      createdAt: f?.createdAt || 0
    }));
  }, [forms]);

  const sortedForms = useMemo(() => {
    const toNum = v => (typeof v === 'number' ? v : 0);
    return [...normalized].sort((a, b) => {
      const pinDiff = Number(!!b?.isPinned) - Number(!!a?.isPinned);
      if (pinDiff !== 0) return pinDiff;
      const pinnedAtDiff = toNum(b?.pinnedAt) - toNum(a?.pinnedAt);
      if (pinnedAtDiff !== 0) return pinnedAtDiff;
      return toNum(b?.createdAt) - toNum(a?.createdAt);
    });
  }, [normalized]);

  if (!sortedForms.length) {
    return <div className="p-4 text-center text-text-secondary">No polls available.</div>;
  }

  return (
    <div className="space-y-2 p-2">
      {sortedForms.map(form => {
        const isSelected = form.id === selectedFormId;
        return (
          <button
            key={form.id}
            type="button"
            className={`w-full text-left rounded-xl p-4 cursor-pointer transition-all duration-200 ${isSelected ? 'bg-primary-light shadow-sm' : 'bg-white hover:bg-bg-hover'}`}
            onClick={() => form.id && onSelectForm && onSelectForm(form)}
          >
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-semibold text-text-main flex-1">{form.title}</h3>
              <div className="flex items-center gap-1 flex-shrink-0">
                {showVotedIndicator && (
                  <span className="text-green-500" title="You have voted">
                    <CheckCircle2 className='w-4 h-4' />
                  </span>
                )}
                {showPendingIndicator && (
                  <span className="text-slate-400" title="Not voted yet">
                    <Circle className='w-4 h-4' />
                  </span>
                )}
              {form.isPinned && (
                <span className="text-slate-400" title="Pinned">
                  <Pin className='w-4 h-4' />
                </span>
              )}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-text-secondary mt-3">
                <div className="flex items-center gap-1">
                    <BarChart2 className="w-3 h-3" />
                    <span>{form.totalVotes} {form.totalVotes === 1 ? 'vote' : 'votes'}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{form.createdAt ? new Date(form.createdAt).toLocaleDateString() : ''}</span>
                </div>
            </div>
          </button>
        )
      })}
    </div>
  );
}