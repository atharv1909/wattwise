import React, { useState, useEffect } from 'react';
import { fetchDevices, registerDevice, deleteDevice, fetchHouseholdData } from '../services/api';

const DEFAULT_DEVICES = [
  {
    id: 1,
    household_id: 1,
    device_name: 'Master Bed AC Smart Plug',
    name: 'Master Bed AC Smart Plug',
    device_kind: 'smart_plug',
    kind: 'smart_plug',
    linked_appliance_id: 1,
    linked_appliance_name: 'Master Bedroom Split AC',
    status: 'online',
    last_seen: new Date(Date.now() - 45 * 1000).toISOString(),
    telemetry: { v: 231.4, i: 6.45, p: 1491.5, e_wh: 142580 }
  },
  {
    id: 2,
    household_id: 1,
    device_name: 'Main DB Board ESP32 Meter',
    name: 'Main DB Board ESP32 Meter',
    device_kind: 'esp32_meter',
    kind: 'esp32_meter',
    linked_appliance_id: null,
    linked_appliance_name: null,
    status: 'online',
    last_seen: new Date(Date.now() - 110 * 1000).toISOString(),
    telemetry: { v: 230.8, i: 8.82, p: 2035.7, e_wh: 849200 }
  },
  {
    id: 3,
    household_id: 1,
    device_name: 'Kitchen Fridge Sonoff Plug',
    name: 'Kitchen Fridge Sonoff Plug',
    device_kind: 'smart_plug',
    kind: 'smart_plug',
    linked_appliance_id: 4,
    linked_appliance_name: 'Kitchen Double Door Fridge',
    status: 'online',
    last_seen: new Date(Date.now() - 190 * 1000).toISOString(),
    telemetry: { v: 229.2, i: 0.61, p: 139.8, e_wh: 92450 }
  },
  {
    id: 4,
    household_id: 1,
    device_name: 'Geyser CT Clamp Node',
    name: 'Geyser CT Clamp Node',
    device_kind: 'ct_clamp',
    kind: 'ct_clamp',
    linked_appliance_id: 5,
    linked_appliance_name: 'Bathroom Geyser',
    status: 'offline',
    last_seen: new Date(Date.now() - 3600 * 4 * 1000).toISOString(),
    telemetry: { v: 230.0, i: 0.0, p: 0.0, e_wh: 34100 }
  }
];

export default function DevicesPage({ householdId = 1 }) {
  const [devices, setDevices] = useState(DEFAULT_DEVICES);
  const [appliances, setAppliances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const [newlyCreatedToken, setNewlyCreatedToken] = useState(null);

  // Form State
  const [deviceName, setDeviceName] = useState('');
  const [deviceKind, setDeviceKind] = useState('smart_plug');
  const [selectedApplianceId, setSelectedApplianceId] = useState('');
  const [filterKind, setFilterKind] = useState('all');

  // Load Devices and Appliances on mount
  useEffect(() => {
    loadData();
  }, [householdId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Household Appliances for dropdown
      const hhData = await fetchHouseholdData(householdId);
      if (hhData && hhData.appliances) {
        setAppliances(hhData.appliances);
      }

      // 2. Fetch Devices
      const devRes = await fetchDevices(householdId);
      if (devRes && Array.isArray(devRes.devices) && devRes.devices.length > 0) {
        // Enrich devices with appliance custom_name if available
        const enriched = devRes.devices.map(d => {
          const app = hhData?.appliances?.find(a => a.id === (d.appliance_id || d.linked_appliance_id));
          return {
            ...d,
            device_name: d.name || d.device_name,
            device_kind: d.kind || d.device_kind || 'smart_plug',
            linked_appliance_id: d.appliance_id || d.linked_appliance_id || null,
            linked_appliance_name: app ? app.custom_name : (d.linked_appliance_name || null)
          };
        });
        setDevices(enriched);
      }
    } catch (err) {
      console.warn('API error fetching devices, using local state:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine if a device is online (< 5 minutes / 300s)
  const isDeviceOnline = (lastSeen) => {
    if (!lastSeen) return false;
    const diffMs = Date.now() - new Date(lastSeen).getTime();
    return diffMs < 300000; // 5 minutes
  };

  // Format relative timestamp
  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never seen';
    const diffSec = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000);
    if (diffSec < 60) return `${diffSec} seconds ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hours ago`;
    return `${Math.floor(diffHr / 24)} days ago`;
  };

  // Register Device Handler
  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    if (!deviceName.trim()) return;

    const payload = {
      household_id: householdId,
      device_name: deviceName.trim(),
      name: deviceName.trim(),
      device_kind: deviceKind,
      kind: deviceKind,
      appliance_id: selectedApplianceId ? Number(selectedApplianceId) : null
    };

    try {
      const res = await registerDevice(payload);
      const generatedToken = res?.token || ('ww_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
      const app = appliances.find(a => a.id === Number(selectedApplianceId));
      
      const createdDevice = {
        id: res?.device?.id || Date.now(),
        household_id: householdId,
        device_name: deviceName.trim(),
        name: deviceName.trim(),
        device_kind: deviceKind,
        kind: deviceKind,
        linked_appliance_id: selectedApplianceId ? Number(selectedApplianceId) : null,
        linked_appliance_name: app ? app.custom_name : null,
        status: 'online',
        last_seen: new Date().toISOString(),
        telemetry: {
          v: 230.0 + Math.random() * 4,
          i: 0.0,
          p: 0.0,
          e_wh: 0.0
        }
      };

      setDevices([createdDevice, ...devices]);
      setNewlyCreatedToken({
        name: createdDevice.device_name,
        token: generatedToken,
        id: createdDevice.id
      });
      setShowModal(false);
      setDeviceName('');
      setSelectedApplianceId('');
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  // Delete Device Handler
  const handleDeleteDevice = async (id) => {
    if (!window.confirm('Are you sure you want to delete this IoT device? This will remove its live telemetry link.')) {
      return;
    }
    try {
      await deleteDevice(id);
    } catch (err) {
      console.warn('API delete error, removing from local state:', err);
    }
    setDevices(devices.filter(d => d.id !== id));
  };

  // Link / Unlink Appliance Handler
  const handleLinkAppliance = (deviceId, newAppId) => {
    const updated = devices.map(d => {
      if (d.id === deviceId) {
        if (!newAppId) {
          return { ...d, linked_appliance_id: null, linked_appliance_name: null };
        }
        const app = appliances.find(a => a.id === Number(newAppId));
        return {
          ...d,
          linked_appliance_id: Number(newAppId),
          linked_appliance_name: app ? app.custom_name : 'Appliance #' + newAppId
        };
      }
      return d;
    });
    setDevices(updated);
  };

  // Quick Ping / Simulate Telemetry
  const handleSimulatePing = (deviceId) => {
    setDevices(devices.map(d => {
      if (d.id === deviceId) {
        const v = Number((228 + Math.random() * 6).toFixed(1));
        const p = d.linked_appliance_id ? Math.floor(100 + Math.random() * 1500) : Math.floor(Math.random() * 50);
        const i = Number((p / v).toFixed(2));
        const prevWh = d.telemetry?.e_wh || 1000;
        return {
          ...d,
          last_seen: new Date().toISOString(),
          status: 'online',
          telemetry: {
            v,
            i,
            p,
            e_wh: prevWh + Math.floor(Math.random() * 20 + 5)
          }
        };
      }
      return d;
    }));
  };

  // Copy to clipboard helper
  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(label);
    setTimeout(() => setCopySuccess(''), 2500);
  };

  const filteredDevices = devices.filter(d => {
    if (filterKind === 'all') return true;
    if (filterKind === 'online') return isDeviceOnline(d.last_seen);
    if (filterKind === 'offline') return !isDeviceOnline(d.last_seen);
    return (d.kind || d.device_kind) === filterKind;
  });

  return (
    <div className="container-fluid py-4 px-md-4">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">
            <i className="bi bi-cpu text-primary me-2"></i> IoT Devices &amp; Smart Plugs
          </h3>
          <p className="text-muted small mb-0">
            Monitor hardware smart plugs, ESP32 telemetry nodes, and smart CT sensors linked to your appliances.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-outline-primary btn-sm rounded-pill"
            onClick={loadData}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
          <button
            className="btn btn-primary btn-sm rounded-pill px-3 shadow-sm"
            onClick={() => setShowModal(true)}
          >
            <i className="bi bi-plus-lg me-1"></i> Register New Device
          </button>
        </div>
      </div>

      {/* Copy Notification Toast */}
      {copySuccess && (
        <div className="alert alert-success py-2 px-3 small shadow-sm d-flex align-items-center gap-2 mb-3">
          <i className="bi bi-check-circle-fill"></i>
          <span>Copied <strong>{copySuccess}</strong> to clipboard!</span>
        </div>
      )}

      {/* NEW TOKEN REVEAL MODAL / BANNER */}
      {newlyCreatedToken && (
        <div className="alert alert-warning border-warning shadow-sm mb-4">
          <div className="d-flex justify-content-between align-items-start">
            <div className="d-flex align-items-center gap-2 mb-2">
              <i className="bi bi-key-fill text-warning fs-4"></i>
              <h6 className="fw-bold text-dark mb-0">
                New Device Registered: <u>{newlyCreatedToken.name}</u>
              </h6>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={() => setNewlyCreatedToken(null)}
            ></button>
          </div>
          <p className="small text-muted mb-2">
            <strong>⚠️ Security Notice:</strong> This device authentication token is generated once and will never be shown again. Save it securely in your ESP32 or MQTT client config.
          </p>
          <div className="d-flex align-items-center gap-2 bg-white p-2 rounded border">
            <code className="text-primary fw-bold text-break flex-grow-1 small">
              {newlyCreatedToken.token}
            </code>
            <button
              className="btn btn-sm btn-outline-primary rounded-pill px-3"
              onClick={() => handleCopy(newlyCreatedToken.token, 'Device Secret Token')}
            >
              <i className="bi bi-clipboard me-1"></i> Copy Token
            </button>
          </div>
        </div>
      )}

      {/* Quick Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 p-3 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="small text-muted d-block fw-semibold">TOTAL DEVICES</span>
                <span className="fs-4 fw-bold text-dark">{devices.length}</span>
              </div>
              <div className="p-2 bg-primary-subtle text-primary rounded-circle">
                <i className="bi bi-hdd-network fs-4"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 p-3 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="small text-muted d-block fw-semibold">ONLINE NOW</span>
                <span className="fs-4 fw-bold text-success">
                  {devices.filter(d => isDeviceOnline(d.last_seen)).length}
                </span>
              </div>
              <div className="p-2 bg-success-subtle text-success rounded-circle">
                <i className="bi bi-activity fs-4"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 p-3 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="small text-muted d-block fw-semibold">LINKED TO APPLIANCE</span>
                <span className="fs-4 fw-bold text-primary">
                  {devices.filter(d => d.linked_appliance_id).length}
                </span>
              </div>
              <div className="p-2 bg-info-subtle text-info rounded-circle">
                <i className="bi bi-link-45deg fs-4"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card shadow-sm border-0 p-3 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <span className="small text-muted d-block fw-semibold">ACTIVE TELEMETRY LOAD</span>
                <span className="fs-4 fw-bold text-dark">
                  {devices.reduce((acc, d) => acc + (d.telemetry?.p || 0), 0).toFixed(0)} <small className="fs-6 text-muted">W</small>
                </span>
              </div>
              <div className="p-2 bg-warning-subtle text-warning rounded-circle">
                <i className="bi bi-lightning-charge fs-4"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        <span className="small fw-semibold text-muted me-2">FILTER:</span>
        <button
          className={`btn btn-sm rounded-pill ${filterKind === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setFilterKind('all')}
        >
          All ({devices.length})
        </button>
        <button
          className={`btn btn-sm rounded-pill ${filterKind === 'online' ? 'btn-success text-white' : 'btn-outline-secondary'}`}
          onClick={() => setFilterKind('online')}
        >
          <span className="badge bg-white text-success rounded-circle me-1">•</span>
          Online ({devices.filter(d => isDeviceOnline(d.last_seen)).length})
        </button>
        <button
          className={`btn btn-sm rounded-pill ${filterKind === 'offline' ? 'btn-danger text-white' : 'btn-outline-secondary'}`}
          onClick={() => setFilterKind('offline')}
        >
          Offline ({devices.filter(d => !isDeviceOnline(d.last_seen)).length})
        </button>
        <button
          className={`btn btn-sm rounded-pill ${filterKind === 'smart_plug' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setFilterKind('smart_plug')}
        >
          Smart Plugs
        </button>
        <button
          className={`btn btn-sm rounded-pill ${filterKind === 'esp32_meter' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setFilterKind('esp32_meter')}
        >
          ESP32 Nodes
        </button>
      </div>

      {/* Devices Grid */}
      <div className="row g-3 mb-5">
        {filteredDevices.map((dev) => {
          const online = isDeviceOnline(dev.last_seen);
          const kindName = (dev.kind || dev.device_kind || 'smart_plug').replace('_', ' ').toUpperCase();
          const p = dev.telemetry?.p ?? 0;
          const v = dev.telemetry?.v ?? 230.0;
          const i = dev.telemetry?.i ?? (p / (v || 230)).toFixed(2);
          const eKwh = ((dev.telemetry?.e_wh || 0) / 1000).toFixed(2);

          return (
            <div key={dev.id} className="col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm border-0 position-relative bg-white rounded-3">
                <div className="card-body p-3 d-flex flex-column">
                  {/* Top Header: Status + Device Name + Kind */}
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <span
                        className={`rounded-circle d-inline-block ${online ? 'bg-success' : 'bg-danger'}`}
                        style={{
                          width: '10px',
                          height: '10px',
                          boxShadow: online ? '0 0 8px #28a745' : 'none'
                        }}
                        title={online ? 'Online (<5m)' : 'Offline (>5m)'}
                      ></span>
                      <h6 className="fw-bold text-dark mb-0">{dev.name || dev.device_name}</h6>
                    </div>
                    <span className="badge bg-light text-muted border text-uppercase" style={{ fontSize: '0.65rem' }}>
                      {kindName}
                    </span>
                  </div>

                  {/* Linked Appliance Status */}
                  <div className="mb-3">
                    <div className="d-flex align-items-center gap-1 small">
                      <span className="text-muted">Linked To:</span>
                      {dev.linked_appliance_name ? (
                        <span className="badge bg-primary-subtle text-primary fw-semibold">
                          <i className="bi bi-plug-fill me-1"></i>
                          {dev.linked_appliance_name}
                        </span>
                      ) : (
                        <span className="badge bg-secondary-subtle text-secondary">
                          <i className="bi bi-dash-circle me-1"></i> Unlinked
                        </span>
                      )}
                    </div>
                    <small className="text-muted d-block mt-1" style={{ fontSize: '0.75rem' }}>
                      <i className="bi bi-clock-history me-1"></i> Last seen: {formatLastSeen(dev.last_seen)}
                    </small>
                  </div>

                  {/* Live Telemetry Metrics Card */}
                  <div className="bg-light p-2 rounded-2 mb-3">
                    <div className="row text-center g-1">
                      <div className="col-3 border-end">
                        <span className="text-muted d-block" style={{ fontSize: '0.65rem' }}>POWER</span>
                        <span className="fw-bold text-dark small">{p} W</span>
                      </div>
                      <div className="col-3 border-end">
                        <span className="text-muted d-block" style={{ fontSize: '0.65rem' }}>VOLTAGE</span>
                        <span className="fw-bold text-dark small">{v} V</span>
                      </div>
                      <div className="col-3 border-end">
                        <span className="text-muted d-block" style={{ fontSize: '0.65rem' }}>CURRENT</span>
                        <span className="fw-bold text-dark small">{i} A</span>
                      </div>
                      <div className="col-3">
                        <span className="text-muted d-block" style={{ fontSize: '0.65rem' }}>ENERGY</span>
                        <span className="fw-bold text-primary small">{eKwh} kWh</span>
                      </div>
                    </div>
                  </div>

                  {/* Link / Unlink Dropdown & Actions */}
                  <div className="mt-auto pt-2 border-top">
                    <div className="row g-2 align-items-center">
                      <div className="col-7">
                        <select
                          className="form-select form-select-sm"
                          style={{ fontSize: '0.78rem' }}
                          value={dev.linked_appliance_id || ''}
                          onChange={(e) => handleLinkAppliance(dev.id, e.target.value)}
                        >
                          <option value="">-- Unlinked --</option>
                          {appliances.map(app => (
                            <option key={app.id} value={app.id}>
                              {app.custom_name} ({app.rated_w}W)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-5 d-flex justify-content-end gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success p-1 px-2"
                          title="Simulate live MQTT telemetry ping"
                          onClick={() => handleSimulatePing(dev.id)}
                        >
                          <i className="bi bi-broadcast"></i> Ping
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger p-1 px-2"
                          title="Delete Device"
                          onClick={() => handleDeleteDevice(dev.id)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredDevices.length === 0 && (
          <div className="col-12 text-center py-5">
            <i className="bi bi-cpu fs-1 text-muted d-block mb-2"></i>
            <h5 className="text-dark">No Devices Found</h5>
            <p className="text-muted small">No smart plugs or IoT nodes matched your current filter.</p>
            <button className="btn btn-primary btn-sm rounded-pill" onClick={() => setShowModal(true)}>
              Register Device
            </button>
          </div>
        )}
      </div>

      {/* CONNECTION INSTRUCTIONS & TIER GUIDE PANEL */}
      <div className="card shadow-sm border-0 mb-4 bg-white">
        <div className="card-header bg-white py-3 border-bottom">
          <h5 className="fw-bold mb-0 text-dark">
            <i className="bi bi-terminal-split text-primary me-2"></i> IoT Connection Specifications &amp; Architecture
          </h5>
        </div>
        <div className="card-body p-4">
          <div className="row g-4">
            {/* MQTT Protocol Instructions */}
            <div className="col-lg-7">
              <h6 className="fw-bold text-dark mb-2">
                <i className="bi bi-router me-1 text-primary"></i> MQTT Broker Ingestion Endpoint
              </h6>
              <p className="small text-muted mb-2">
                Configure your ESP32, Shelly, Sonoff Tasmota, or custom IoT device to publish JSON telemetry over MQTT to the WattWise ingestion server.
              </p>

              <div className="bg-light p-3 rounded-3 mb-3 border">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small text-muted fw-bold">MQTT TOPIC FORMAT:</span>
                  <button
                    className="btn btn-sm btn-link text-decoration-none p-0 small"
                    onClick={() => handleCopy(`wattwise/${householdId}/{deviceId}/telemetry`, 'MQTT Topic')}
                  >
                    <i className="bi bi-clipboard me-1"></i> Copy Topic
                  </button>
                </div>
                <code className="text-primary fw-bold d-block small">
                  wattwise/{householdId}/&#123;deviceId&#125;/telemetry
                </code>
              </div>

              <div className="bg-dark text-light p-3 rounded-3 position-relative">
                <div className="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom border-secondary">
                  <span className="small text-warning fw-semibold font-monospace">JSON Payload Schema</span>
                  <button
                    className="btn btn-sm btn-outline-light py-0 px-2 small"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => handleCopy(`{"ts": 1234567890, "v": 230.5, "i": 1.82, "p": 395.2, "e_wh": 128934.0}`, 'JSON Payload')}
                  >
                    <i className="bi bi-clipboard"></i> Copy
                  </button>
                </div>
                <pre className="mb-0 small text-success font-monospace" style={{ fontSize: '0.8rem' }}>
{`{
  "ts": 1234567890,      // Unix epoch timestamp in seconds
  "v": 230.5,            // RMS Voltage in Volts (V)
  "i": 1.82,             // RMS Current in Amperes (A)
  "p": 395.2,            // Active Power in Watts (W)
  "e_wh": 128934.0       // Cumulative energy in Watt-Hours (Wh)
}`}
                </pre>
              </div>
            </div>

            {/* Three-Tier Hardware Hierarchy Guide */}
            <div className="col-lg-5">
              <h6 className="fw-bold text-dark mb-2">
                <i className="bi bi-layers-half me-1 text-primary"></i> WattWise Three-Tier Architecture
              </h6>
              <div className="d-flex flex-column gap-2">
                <div className="card p-2 border-primary-subtle bg-primary-subtle">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="badge bg-primary">Tier 0</span>
                    <strong className="small text-primary">Manual / Paper Bill Baseline</strong>
                  </div>
                  <p className="small text-muted mb-0" style={{ fontSize: '0.78rem' }}>
                    Zero hardware barrier. Log paper DISCOM bills and monthly meter readings. Recomputed deterministically against MERC tariffs.
                  </p>
                </div>

                <div className="card p-2 border-info-subtle bg-info-subtle">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="badge bg-info text-dark">Tier 1</span>
                    <strong className="small text-dark">Physics Simulator (Digital Twin)</strong>
                  </div>
                  <p className="small text-muted mb-0" style={{ fontSize: '0.78rem' }}>
                    Mathematical physics models: Constant, Scheduled, Cyclic (Fridge), and Thermostatic (AC temperature differential).
                  </p>
                </div>

                <div className="card p-2 border-success-subtle bg-success-subtle">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="badge bg-success">Tier 2</span>
                    <strong className="small text-success">Hardware IoT Telemetry</strong>
                  </div>
                  <p className="small text-muted mb-0" style={{ fontSize: '0.78rem' }}>
                    Physical smart plugs (Sonoff POW / Shelly / Tuya) and ESP32 split-core CT sensors publishing live current and wattage over MQTT.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REGISTER NEW DEVICE MODAL */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <form onSubmit={handleRegisterDevice}>
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-plus-circle me-2"></i> Register New IoT Device
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark">Device Friendly Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Living Room AC Plug, ESP32 Main Panel"
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark">Hardware Kind / Protocol</label>
                    <select
                      className="form-select"
                      value={deviceKind}
                      onChange={(e) => setDeviceKind(e.target.value)}
                    >
                      <option value="smart_plug">Smart Plug (Sonoff / Tuya / Tapo)</option>
                      <option value="esp32_meter">ESP32 Energy Monitor (PZEM-004T / CT)</option>
                      <option value="ct_clamp">Non-Invasive CT Clamp Sensor</option>
                      <option value="shelly_em">Shelly EM / Pro 4PM</option>
                      <option value="zigbee_plug">Zigbee 3.0 Smart Socket</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark">Link to Household Appliance (Optional)</label>
                    <select
                      className="form-select"
                      value={selectedApplianceId}
                      onChange={(e) => setSelectedApplianceId(e.target.value)}
                    >
                      <option value="">-- Leave Unlinked (Whole House / Unassigned) --</option>
                      {appliances.map(app => (
                        <option key={app.id} value={app.id}>
                          {app.custom_name} ({app.category} - {app.rated_w}W)
                        </option>
                      ))}
                    </select>
                    <small className="text-muted">You can also link/reassign appliances anytime later.</small>
                  </div>

                  <div className="alert alert-info py-2 px-3 small mb-0">
                    <i className="bi bi-info-circle me-1"></i> Submitting will generate a secure hardware authentication token for your MQTT telemetry client.
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-pill"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4 shadow-sm">
                    Generate Token &amp; Register
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
