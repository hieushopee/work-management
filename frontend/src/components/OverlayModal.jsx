import React from "react";

export default function OverlayModal({ open, onClose, children, width = 700 }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed z-50 flex flex-col rounded-xl bg-white shadow-soft-xl border border-border-light max-h-[90vh] overflow-y-auto"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width, minWidth: 340 }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
}
