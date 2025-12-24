import { useEffect, useState } from 'react';
import { Settings, Save, Building2, TrendingUp, AlertCircle, Calendar, Shield } from 'lucide-react';
import { useSalarySettingsStore } from '../../stores/useSalarySettingsStore';
import useUserStore from '../../stores/useUserStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import { isAdmin } from '../../utils/roleUtils';
import { toast } from 'react-hot-toast';

const SalarySettingsPage = () => {
  const { user } = useUserStore();
  const {
    settings,
    getSalarySettings,
    updateSalarySettings,
    loading,
    actionLoading,
  } = useSalarySettingsStore();

  const [formData, setFormData] = useState({
    otRates: {
      weekday: 1.5,
      weekend: 2.0,
      holiday: 3.0,
    },
    kpiStandard: 100,
    standardPenalties: {
      lateArrival: 0,
      unauthorizedLeave: 0,
      violation: 0,
      damage: 0,
    },
    standardBonuses: {
      kpi: 0,
      holiday: 0,
      project: 0,
      attendance: 0,
      performance: 0,
    },
    standardAllowances: {
      meal: 0,
      phone: 0,
      transport: 0,
      position: 0,
      attendance: 0,
    },
    annualLeaveDays: 12,
    insurance: {
      socialInsurance: 8,
      healthInsurance: 1.5,
      unemploymentInsurance: 1,
    },
    currency: 'VND',
  });

  useEffect(() => {
    if (!isAdmin(user)) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      await getSalarySettings();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    if (settings) {
      setFormData({
        otRates: settings.otRates || {
          weekday: 1.5,
          weekend: 2.0,
          holiday: 3.0,
        },
        kpiStandard: settings.kpiStandard || 100,
        standardPenalties: settings.standardPenalties || {
          lateArrival: 0,
          unauthorizedLeave: 0,
          violation: 0,
          damage: 0,
        },
        standardBonuses: settings.standardBonuses || {
          kpi: 0,
          holiday: 0,
          project: 0,
          attendance: 0,
          performance: 0,
        },
        standardAllowances: settings.standardAllowances || {
          meal: 0,
          phone: 0,
          transport: 0,
          position: 0,
          attendance: 0,
        },
        annualLeaveDays: settings.annualLeaveDays || 12,
        insurance: settings.insurance || {
          socialInsurance: 8,
          healthInsurance: 1.5,
          unemploymentInsurance: 1,
        },
        currency: settings.currency || 'VND',
      });
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    try {
      await updateSalarySettings(formData);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  if (!isAdmin(user)) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Access denied. Admin only.</p>
        </div>
      </div>
    );
  }

  if (loading && !settings) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Salary Settings
        </h1>
        <p className="text-text-secondary mt-1">Configure salary calculation rules and coefficients</p>
      </div>

      {/* Settings Form */}
      <div className="space-y-6">
        {/* OT Rates */}
        <div className="bg-white rounded-lg border border-border-light p-6">
          <h2 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Overtime Rates
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">Weekday Rate (x)</label>
              <input
                type="number"
                step="0.1"
                value={formData.otRates.weekday}
                onChange={(e) => setFormData({ ...formData, otRates: { ...formData.otRates, weekday: parseFloat(e.target.value) || 0 } })}
                className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">Weekend Rate (x)</label>
              <input
                type="number"
                step="0.1"
                value={formData.otRates.weekend}
                onChange={(e) => setFormData({ ...formData, otRates: { ...formData.otRates, weekend: parseFloat(e.target.value) || 0 } })}
                className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">Holiday Rate (x)</label>
              <input
                type="number"
                step="0.1"
                value={formData.otRates.holiday}
                onChange={(e) => setFormData({ ...formData, otRates: { ...formData.otRates, holiday: parseFloat(e.target.value) || 0 } })}
                className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

          {/* KPI Standard */}
          <div className="bg-white rounded-lg border border-border-light p-6">
            <h2 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              KPI Standard
            </h2>
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">Standard KPI (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.kpiStandard}
                onChange={(e) => setFormData({ ...formData, kpiStandard: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Standard Penalties */}
          <div className="bg-white rounded-lg border border-border-light p-6">
            <h2 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Standard Penalties
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Late Arrival (VND/time)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.standardPenalties.lateArrival}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      standardPenalties: {
                        ...formData.standardPenalties,
                        lateArrival: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Unauthorized Leave (VND/day)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.standardPenalties.unauthorizedLeave}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      standardPenalties: {
                        ...formData.standardPenalties,
                        unauthorizedLeave: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Violation (VND/time)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.standardPenalties.violation}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      standardPenalties: {
                        ...formData.standardPenalties,
                        violation: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Damage (VND/time)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.standardPenalties.damage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      standardPenalties: {
                        ...formData.standardPenalties,
                        damage: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Standard Bonuses */}
          <div className="bg-white rounded-lg border border-border-light p-6">
            <h2 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Standard Bonuses
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">KPI (VND)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.standardBonuses.kpi}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      standardBonuses: {
                        ...formData.standardBonuses,
                        kpi: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Holiday (VND)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.standardBonuses.holiday}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      standardBonuses: {
                        ...formData.standardBonuses,
                        holiday: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Project (VND)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.standardBonuses.project}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      standardBonuses: {
                        ...formData.standardBonuses,
                        project: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Attendance (VND)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.standardBonuses.attendance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      standardBonuses: {
                        ...formData.standardBonuses,
                        attendance: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Performance (VND)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.standardBonuses.performance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      standardBonuses: {
                        ...formData.standardBonuses,
                        performance: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Standard Allowances */}
          <div className="bg-white rounded-lg border border-border-light p-6">
            <h2 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Standard Allowances (VND/month)
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Meal</label>
                <input
                  type="number"
                  min="0"
                  value={formData.standardAllowances.meal}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      standardAllowances: {
                        ...formData.standardAllowances,
                        meal: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Phone</label>
                <input
                  type="number"
                  min="0"
                  value={formData.standardAllowances.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      standardAllowances: {
                        ...formData.standardAllowances,
                        phone: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Transport</label>
                <input
                  type="number"
                  min="0"
                  value={formData.standardAllowances.transport}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      standardAllowances: {
                        ...formData.standardAllowances,
                        transport: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Position</label>
                <input
                  type="number"
                  min="0"
                  value={formData.standardAllowances.position}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      standardAllowances: {
                        ...formData.standardAllowances,
                        position: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Attendance</label>
                <input
                  type="number"
                  min="0"
                  value={formData.standardAllowances.attendance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      standardAllowances: {
                        ...formData.standardAllowances,
                        attendance: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Annual Leave & Insurance */}
          <div className="bg-white rounded-lg border border-border-light p-6">
            <h2 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Leave & Insurance
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-main mb-2">Annual Leave Days</label>
                <input
                  type="number"
                  min="0"
                  value={formData.annualLeaveDays}
                  onChange={(e) => setFormData({ ...formData, annualLeaveDays: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-text-main mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Insurance Rates (%)
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Social Insurance</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.insurance.socialInsurance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        insurance: {
                          ...formData.insurance,
                          socialInsurance: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Health Insurance</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.insurance.healthInsurance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        insurance: {
                          ...formData.insurance,
                          healthInsurance: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Unemployment Insurance</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.insurance.unemploymentInsurance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        insurance: {
                          ...formData.insurance,
                          unemploymentInsurance: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={actionLoading}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {actionLoading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
    </div>
  );
};

export default SalarySettingsPage;

