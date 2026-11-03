import React, { useState, useEffect } from 'react';
import { fetchAlerts, markAlertRead, createAlert } from '../services/api';

const DEFAULT_ALERTS = [
  {
    id: 1,
    household_id: 1,
    type: 'slab_breach_warning',
    alert_type: 'slab_breach_warning',
    severity: 'warning',
    title: 'Approaching 300 Unit Tariff Slab Boundary',
    message: 'Your household is projected to consume 318 kWh at current run rate this month. Slabs beyond 300 units increase by 41% from ₹10.29/unit to ₹14.55/unit. Trimming AC usage by 45 mins/day will keep you under 300 kWh and save ~₹680 this cycle.',
    is_read: false,
    created_at: new Date(Date.now() - 28 * 60 * 1000).toISOString()
  },
  {
    id: 2,
    household_id: 1,
    type: 'bill_mismatch',
    alert_type: 'bill_mismatch',
    severity: 'danger',
    title: 'Discom Overcharge Flagged: July 2024 Bill',
    message: 'Discom billed ₹3,550 for 210 units, but deterministic recomputation against MERC Case No. 226 of 2022 shows official payable is ₹2,504. Detected overcharge of ₹1,046.00 due to improper fixed charge tier or uncredited solar subsidy.',
    is_read: false,
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
  },
  {
    id: 3,
    household_id: 1,
    type: 'unusual_spike',
    alert_type: 'unusual_spike',
    severity: 'primary',
    title: 'Unusual Standby Load Detected at Night',
    message: 'Continuous baseline standby consumption was 140W between 2:00 AM and 5:00 AM. Check if bedroom geyser or gaming desktop was left on standby without automatic power-down.',
    is_read: true,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  },
  {
    id: 4,
    household_id: 1,
    type: 'tip',
    alert_type: 'tip',
    severity: 'success',
    title: 'BEE Energy Tip: Inverter AC Temperature Optimization',
    message: 'Bureau of Energy Efficiency (BEE) research demonstrates that setting your AC thermostat to 24°C instead of 20°C reduces compressor power draw by 24%, saving ~₹850 every month on Maharashtra tariffs.',
    is_read: false,
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  },
  {
    id: 5,
    household_id: 1,
    type: 'slab_breach_warning',
    alert_type: 'slab_breach_warning',
    severity: 'warning',
    title: 'Approaching Slab 2 (100 kWh)',
    message: 'You have consumed 88 kWh this cycle. Reaching 101 kWh increases your unit rate from ₹4.71 to ₹10.29/unit (2.18x jump). Minimize high-load appliances for 2 days to maximize Slab 1 savings.',
    is_read: true,
    created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString()
  }
];

export default function AlertsPage({ householdId = 1, onNavigateTab }) {
  const [alerts, setAlerts] = useState(DEFAULT_ALERTS);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'warnings' | 'tips' | 'mismatches'
  const [loading, setLoading] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);

  // New Alert Simulation Form State
  const [simType, setSimType] = useState('slab_breach_warning');
  const [simTitle, setSimTitle] = useState('');
  const [simMessage, setSimMessage] = useState('');

  // Fetch alerts on mount
  useEffect(() => {
    loadAlerts();
  }, [householdId]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetchAlerts(householdId);
      if (res && Array.isArray(res.alerts) && res.alerts.length > 0) {
        setAlerts(res.alerts);
      }
    } catch (err) {
      console.warn('API error fetching alerts, using fallback seed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mark single alert as read
  const handleMarkAsRead = async (id) => {
    try {
      await markAlertRead(id);
    } catch (err) {
      console.warn('Backend markRead failed, updating local state:', err);
    }

    setAlerts(alerts.map(a => a.id === id ? { ...a, is_read: true } : a));
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    const unread = alerts.filter(a => !a.is_read);
    for (const a of unread) {
      try {
        await markAlertRead(a.id);
      } catch (e) {
        // Continue
      }
    }
    setAlerts(alerts.map(a => ({ ...a, is_read: true })));
  };

  // Simulate / Create New Alert
  const handleSimulateAlert = async (e) => {
    e.preventDefault();
    if (!simTitle.trim()) return;

    let sev = 'info';
    if (simType === 'slab_breach_warning') sev = 'warning';
    else if (simType === 'bill_mismatch') sev = 'danger';
    else if (simType === 'tip') sev = 'success';
    else if (simType === 'unusual_spike') sev = 'primary';

    const payload = {
      household_id: householdId,
      type: simType,
      alert_type: simType,
      severity: sev,
      title: simTitle.trim(),
      message: simMessage.trim() || 'Simulated smart notification from WattWise monitoring engine.',
      is_read: false,
      created_at: new Date().toISOString()
    };

    try {
      const res = await createAlert(payload);
      const created = res.alert || { id: Date.now(), ...payload };
      setAlerts([created, ...alerts]);
    } catch (err) {
      setAlerts([{ id: Date.now(), ...payload }, ...alerts]);
    }

    setShowSimulateModal(false);
    setSimTitle('');
    setSimMessage('');
  };

  // Helper for Relative Timestamp
  const formatTime = (isoString) => {
    if (!isoString) return 'Just now';
    const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diffSec < 60) return `${diffSec} seconds ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Helper for Alert Type Configuration
  const getAlertConfig = (type) => {
    switch (type) {
      case 'slab_breach_warning':
        return {
          icon: 'bi-exclamation-triangle-fill',
          emoji: '⚠️',
          color: 'warning',
          badgeText: 'SLAB WARNING',
          badgeClass: 'bg-warning text-dark',
          actionText: 'What-If Lab',
          actionTab: 'whatif'
        };
      case 'bill_mismatch':
        return {
          icon: 'bi-x-octagon-fill',
          emoji: '🔴',
          color: 'danger',
          badgeText: 'BILL MISMATCH',
          badgeClass: 'bg-danger text-white',
          actionText: 'Audit Bill',
          actionTab: 'checker'
        };
      case 'unusual_spike':
        return {
          icon: 'bi-graph-up-arrow',
          emoji: '📊',
          color: 'primary',
          badgeText: 'UNUSUAL SPIKE',
          badgeClass: 'bg-primary text-white',
          actionText: 'View Telemetry',
          actionTab: 'devices'
        };
      case 'tip':
      default:
        return {
          icon: 'bi-lightbulb-fill',
          emoji: '💡',
          color: 'success',
          badgeText: 'ENERGY TIP',
          badgeClass: 'bg-success text-white',
          actionText: 'Ask Copilot',
          actionTab: 'copilot'
        };
    }
  };

  // Quick stats
  const totalCount = alerts.length;
  const unreadCount = alerts.filter(a => !a.is_read).length;
  const warningsCount = alerts.filter(a => (a.type || a.alert_type) === 'slab_breach_warning' || (a.type || a.alert_type) === 'unusual_spike').length;
  const mismatchesCount = alerts.filter(a => (a.type || a.alert_type) === 'bill_mismatch').length;
  const tipsCount = alerts.filter(a => (a.type || a.alert_type) === 'tip').length;

  // Filtered Alerts (Sorted Newest First)
  const filteredAlerts = alerts
    .filter(a => {
      const type = a.type || a.alert_type;
      if (filter === 'unread') return !a.is_read;
      if (filter === 'warnings') return type === 'slab_breach_warning' || type === 'unusual_spike';
      if (filter === 'tips') return type === 'tip';
      if (filter === 'mismatches') return type === 'bill_mismatch';
      return true; // 'all'
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="container-fluid py-4 px-md-4" style={{ maxWidth: '1100px' }}>
      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">
            <i className="bi bi-bell-fill text-primary me-2"></i> Alerts &amp; Smart Notifications
          </h3>
          <p className="text-muted small mb-0">
            Real-time notifications for MERC slab boundary breaches, paper bill tariff mismatches, and automated energy tips.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {unreadCount > 0 && (
            <button
              className="btn btn-outline-secondary btn-sm rounded-pill"
              onClick={handleMarkAllRead}
            >
              <i className="bi bi-check2-all me-1"></i> Mark All as Read
            </button>
          )}
          <button
            className="btn btn-outline-primary btn-sm rounded-pill"
            onClick={() => setShowSimulateModal(true)}
          >
            <i className="bi bi-lightning-charge me-1"></i> Simulate Alert
          </button>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="small text-muted d-block fw-semibold">UNREAD ALERTS</span>
                <span className={`fs-4 fw-bold ${unreadCount > 0 ? 'text-danger' : 'text-success'}`}>
                  {unreadCount}
                </span>
              </div>
              <div className="p-2 bg-danger-subtle text-danger rounded-circle">
                <i className="bi bi-bell-fill fs-5"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="small text-muted d-block fw-semibold">SLAB WARNINGS</span>
                <span className="fs-4 fw-bold text-warning">{warningsCount}</span>
              </div>
              <div className="p-2 bg-warning-subtle text-warning rounded-circle">
                <i className="bi bi-exclamation-triangle-fill fs-5"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="small text-muted d-block fw-semibold">BILL MISMATCHES</span>
                <span className="fs-4 fw-bold text-danger">{mismatchesCount}</span>
              </div>
              <div className="p-2 bg-danger-subtle text-danger rounded-circle">
                <i className="bi bi-x-octagon-fill fs-5"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 p-3 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="small text-muted d-block fw-semibold">ENERGY TIPS</span>
                <span className="fs-4 fw-bold text-success">{tipsCount}</span>
              </div>
              <div className="p-2 bg-success-subtle text-success rounded-circle">
                <i className="bi bi-lightbulb-fill fs-5"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="d-flex flex-wrap gap-2 mb-4 align-items-center">
        <span className="small fw-semibold text-muted me-2">FILTER:</span>
        <button
          className={`btn btn-sm rounded-pill ${filter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setFilter('all')}
        >
          All ({totalCount})
        </button>
        <button
          className={`btn btn-sm rounded-pill ${filter === 'unread' ? 'btn-danger text-white' : 'btn-outline-secondary'}`}
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadCount})
        </button>
        <button
          className={`btn btn-sm rounded-pill ${filter === 'warnings' ? 'btn-warning text-dark' : 'btn-outline-secondary'}`}
          onClick={() => setFilter('warnings')}
        >
          Warnings ({warningsCount})
        </button>
        <button
          className={`btn btn-sm rounded-pill ${filter === 'mismatches' ? 'btn-danger text-white' : 'btn-outline-secondary'}`}
          onClick={() => setFilter('mismatches')}
        >
          Bill Mismatches ({mismatchesCount})
        </button>
        <button
          className={`btn btn-sm rounded-pill ${filter === 'tips' ? 'btn-success text-white' : 'btn-outline-secondary'}`}
          onClick={() => setFilter('tips')}
        >
          Tips ({tipsCount})
        </button>
      </div>

      {/* Alert Cards List (Newest First) */}
      <div className="d-flex flex-column gap-3 mb-5">
        {filteredAlerts.map((alert) => {
          const type = alert.type || alert.alert_type;
          const conf = getAlertConfig(type);
          const isUnread = !alert.is_read;

          return (
            <div
              key={alert.id}
              className={`card rounded-3 transition-all ${
                isUnread
                  ? 'border-0 border-start border-4 border-primary shadow-sm bg-white'
                  : 'border border-light-subtle bg-light opacity-75'
              }`}
              style={{ transition: 'all 0.2s ease' }}
            >
              <div className="card-body p-3 p-md-4">
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2 mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fs-4 me-1">{conf.emoji}</span>
                    <div>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <h6 className={`fw-bold mb-0 ${isUnread ? 'text-dark' : 'text-secondary'}`}>
                          {alert.title}
                        </h6>
                        <span className={`badge ${conf.badgeClass} rounded-pill small`} style={{ fontSize: '0.65rem' }}>
                          {conf.badgeText}
                        </span>
                        {isUnread && (
                          <span className="badge bg-primary text-uppercase" style={{ fontSize: '0.6rem' }}>
                            NEW
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2 text-muted small ms-auto ms-sm-0">
                    <i className="bi bi-clock"></i>
                    <span>{formatTime(alert.created_at)}</span>
                  </div>
                </div>

                {/* Message Body */}
                <p className={`small mb-3 ${isUnread ? 'text-secondary' : 'text-muted'}`} style={{ lineHeight: '1.5' }}>
                  {alert.message}
                </p>

                {/* Card Action Buttons */}
                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                  <div className="d-flex align-items-center gap-2">
                    {onNavigateTab && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary rounded-pill py-0 px-3 small"
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => onNavigateTab(conf.actionTab)}
                      >
                        <i className="bi bi-box-arrow-up-right me-1"></i> {conf.actionText}
                      </button>
                    )}
                  </div>

                  <div>
                    {isUnread ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary rounded-pill py-0 px-3 small"
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => handleMarkAsRead(alert.id)}
                      >
                        <i className="bi bi-check2 me-1"></i> Mark as Read
                      </button>
                    ) : (
                      <span className="small text-muted fst-italic" style={{ fontSize: '0.75rem' }}>
                        <i className="bi bi-check-all text-success me-1"></i> Read
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredAlerts.length === 0 && (
          <div className="card shadow-sm border-0 p-5 text-center bg-white">
            <i className="bi bi-bell-slash fs-1 text-muted d-block mb-2"></i>
            <h5 className="text-dark">No Notifications</h5>
            <p className="text-muted small mb-3">There are no alerts matching the selected filter criteria.</p>
            <div>
              <button className="btn btn-outline-primary btn-sm rounded-pill" onClick={() => setFilter('all')}>
                View All Notifications
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SIMULATE ALERT MODAL */}
      {showSimulateModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <form onSubmit={handleSimulateAlert}>
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-bell-plus me-2"></i> Simulate Real-Time Alert
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowSimulateModal(false)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark">Notification Category</label>
                    <select
                      className="form-select"
                      value={simType}
                      onChange={(e) => {
                        setSimType(e.target.value);
                        if (e.target.value === 'slab_breach_warning') {
                          setSimTitle('Tariff Slab Breach Warning: Approaching 300 kWh');
                          setSimMessage('At current consumption rate, you will enter the highest MERC tariff bracket in 3 days.');
                        } else if (e.target.value === 'bill_mismatch') {
                          setSimTitle('Discom Tariff Miscalculation Detected');
                          setSimMessage('Official recomputation indicates overcharge of ₹420 on August bill.');
                        } else if (e.target.value === 'unusual_spike') {
                          setSimTitle('Unusual Power Draw Detected');
                          setSimMessage('Load jumped to 3,200W between 3:00 PM and 5:00 PM.');
                        } else {
                          setSimTitle('Energy Tip: Clean AC Air Filters');
                          setSimMessage('Clogged filters reduce airflow and increase compressor power by 15%.');
                        }
                      }}
                    >
                      <option value="slab_breach_warning">⚠️ Tariff Slab Breach Warning</option>
                      <option value="bill_mismatch">🔴 Bill Mismatch / Overcharge Alert</option>
                      <option value="unusual_spike">📊 Unusual Consumption Spike</option>
                      <option value="tip">💡 Energy Conservation Tip</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark">Alert Title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={simTitle}
                      onChange={(e) => setSimTitle(e.target.value)}
                      placeholder="e.g. Approaching Slab Boundary"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark">Detailed Advisory Message</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={simMessage}
                      onChange={(e) => setSimMessage(e.target.value)}
                      placeholder="Explanation of the alert and recommended user action..."
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-pill"
                    onClick={() => setShowSimulateModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 shadow-sm">
                    Trigger Notification
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
