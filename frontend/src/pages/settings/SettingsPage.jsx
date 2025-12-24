import React from "react";

const SettingsPage = () => {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-main">Settings</h1>
          <p className="text-text-secondary">Workspace and account preferences.</p>
        </div>
      </div>
      <div className="rounded-xl border border-border-light bg-white p-6 shadow-sm">
        <p className="text-text-main">
          Settings module placeholder. Configure sections will be added here next.
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;
