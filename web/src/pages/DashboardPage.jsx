import React, { useState, useEffect } from 'react';
import HomeSimulator3D from '../components/HomeSimulator3D';
import { fetchReadings, fetchHouseholdData, runSimulation } from '../services/api';

export default function DashboardPage() {
  const [datasetSource, setDatasetSource] = useState('demo');
  const [readingsData, setReadingsData] = useState(null);
  const [household, setHousehold] = useState(null);
  const [simData, setSimData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async (source) => {
    setLoading(true);
    try {
      const [readingsRes, hhRes, simRes] = await Promise.all([
        fetchReadings(source),
        fetchHouseholdData(1),
        runSimulation(1)
      ]);
      setReadingsData(readingsRes);
      setHousehold(hhRes);
      setSimData(simRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(datasetSource);
  }, [datasetSource]);

  const forecast = readingsData?.forecast;
  const gauge = forecast?.slabGauge;

  return (
    <div className="container-fluid py-4 px-md-4">
      {/* Header and Dataset Mode Switcher */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">
            ⚡ WattWise Energy Dashboard
          </h3>
          <p className="text-muted mb-0 small">
            Maharashtra State Electricity Distribution Co. Ltd. (MSEDCL LT-I) • Household: {household?.household?.name || 'Sharma Residence'}
          </p>
        </div>

        {/* Real Benchmark vs Kaggle SGCC vs Demo Switcher */}
        <div className="btn-group bg-white p-1 rounded-pill shadow-sm flex-wrap" role="group">
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-3 ${datasetSource === 'demo' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => setDatasetSource('demo')}
          >
            <i className="bi bi-house-door me-1"></i> Nagpur 2BHK Profile
          </button>
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-3 ${datasetSource === 'real' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => setDatasetSource('real')}
          >
            <i className="bi bi-database-check me-1"></i> UCI Real Measured
          </button>
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-3 ${datasetSource === 'sgcc_normal' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => setDatasetSource('sgcc_normal')}
          >
            <i className="bi bi-check2-circle me-1"></i> Kaggle SGCC (Normal)
          </button>
          <button
            type="button"
            className={`btn btn-sm rounded-pill px-3 ${datasetSource === 'sgcc_theft' ? 'btn-danger text-white' : 'btn-light'}`}
            onClick={() => setDatasetSource('sgcc_theft')}
          >
            <i className="bi bi-exclamation-diamond me-1"></i> Kaggle SGCC (Theft/Anomaly)
          </button>
        </div>
      </div>

      {/* Dataset Active Indicator Alert */}
      <div className="alert alert-secondary py-2 px-3 rounded-3 d-flex align-items-center justify-content-between mb-4 small">
        <span>
          <i className="bi bi-info-circle-fill text-primary me-2"></i>
          Active Data Stream: <strong>{readingsData?.datasetLabel}</strong> ({readingsData?.readings?.length || 0} Daily Observations)
        </span>
        <span className="badge bg-light text-dark border">Billing Cycle: Day {forecast?.daysElapsed || 20} of 30</span>
      </div>

      {/* Key Metric Cards */}
      <div className="row g-3 mb-4">
        {/* Month to Date */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card p-3 h-100 card-hover border-start border-primary border-4">
            <span className="text-muted small fw-medium">Month-to-Date Consumed</span>
            <div className="d-flex align-items-baseline gap-2 mt-2">
              <h2 className="fw-bold mb-0 text-primary">{forecast?.totalUnitsSoFar || 0}</h2>
              <span className="text-muted">kWh (Units)</span>
            </div>
            <div className="text-muted small mt-2">
              Daily Avg: <strong>{forecast?.dailyAverageKwh || 0} units/day</strong>
            </div>
          </div>
        </div>

        {/* Month-End Projected Units */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card p-3 h-100 card-hover border-start border-warning border-4">
            <span className="text-muted small fw-medium">Projected Month-End Units</span>
            <div className="d-flex align-items-baseline gap-2 mt-2">
              <h2 className="fw-bold mb-0 text-dark">{forecast?.trendForecastUnits || 0}</h2>
              <span className="text-muted">kWh</span>
            </div>
            <div className="text-muted small mt-2">
              Naive Baseline: {forecast?.naiveForecastUnits || 0} units
            </div>
          </div>
        </div>

        {/* Projected Electricity Bill */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card p-3 h-100 card-hover border-start border-success border-4">
            <span className="text-muted small fw-medium">Projected Month-End Bill</span>
            <div className="d-flex align-items-baseline gap-2 mt-2">
              <h2 className="fw-bold mb-0 text-success">₹{forecast?.projectedBill || 0}</h2>
              <span className="badge bg-success-subtle text-success small">Deterministic</span>
            </div>
            <div className="text-muted small mt-2">
              Includes 16% Duty, Fixed &amp; Wheeling charges
            </div>
          </div>
        </div>

        {/* Current Slab Status */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card p-3 h-100 card-hover border-start border-danger border-4">
            <span className="text-muted small fw-medium">Current Tariff Tier</span>
            <div className="d-flex align-items-baseline gap-2 mt-2">
              <h4 className="fw-bold mb-0 text-danger">{gauge?.currentSlab || 'Slab 1 (0-100)'}</h4>
            </div>
            <div className="text-muted small mt-2">
              Base Rate: <strong>₹{gauge?.currentRate || 4.41}/unit</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Slab Gauge Progress Bar */}
      {gauge && (
        <div className="card p-4 mb-4 shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              <h6 className="fw-bold mb-0">
                <i className="bi bi-speedometer2 text-primary me-2"></i>
                MSEDCL Slab Gauge &amp; Penalty Warning
              </h6>
              <span className="text-muted small">
                {gauge.unitsRemainingInSlab > 0
                  ? `${gauge.unitsRemainingInSlab} units remaining before crossing into ${gauge.nextSlab}`
                  : 'Highest slab tier reached'}
              </span>
            </div>
            {gauge.nextRate && (
              <span className="badge bg-danger px-3 py-2">
                ⚠️ Next Slab Jump: {gauge.penaltyMultiplier}x higher rate (₹{gauge.nextRate}/unit)
              </span>
            )}
          </div>

          <div className="progress slab-progress mb-2">
            <div
              className={`progress-bar ${gauge.percentageThroughSlab > 80 ? 'bg-danger' : 'bg-primary'}`}
              role="progressbar"
              style={{ width: `${Math.min(100, gauge.percentageThroughSlab)}%` }}
              aria-valuenow={gauge.percentageThroughSlab}
              aria-valuemin="0"
              aria-valuemax="100"
            />
          </div>

          <div className="d-flex justify-content-between text-muted small">
            <span>0 units (₹4.41)</span>
            <span>100 units (Slab 1 max)</span>
            <span>300 units (Slab 2 max)</span>
            <span>500+ units (₹15.72)</span>
          </div>
        </div>
      )}

      {/* Anomaly Alerts (if any detected in daily readings) */}
      {forecast?.anomalies && forecast.anomalies.length > 0 && (
        <div className="alert alert-warning p-3 rounded-3 shadow-sm mb-4">
          <h6 className="fw-bold text-dark mb-1">
            <i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>
            Consumption Spikes &amp; Anomaly Signals Detected
          </h6>
          <div className="small text-muted mb-2">
            Automated Z-score and rolling baseline analysis flagged {forecast.anomalies.length} anomalous daily interval(s):
          </div>
          <ul className="mb-0 ps-3 small">
            {forecast.anomalies.map((a, i) => (
              <li key={i} className="mb-1">
                <strong>{a.date}:</strong> {a.dailyUnits} kWh (+{a.deviationUnits} units above {a.normalMean} kWh mean). {a.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3D Home Simulator & Appliance Breakdown */}
      <div className="row g-4">
        {/* 3D Home Simulator View */}
        <div className="col-12 col-lg-7">
          <div className="card p-3 h-100 shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="fw-bold mb-0">
                  <i className="bi bi-box me-2 text-primary"></i>
                  Interactive 3D Household Energy Map
                </h5>
                <span className="text-muted small">Live power-density visualization by room and appliance</span>
              </div>
              <span className="badge bg-dark">Three.js Procedural Canvas</span>
            </div>

            <HomeSimulator3D
              archetype={household?.household?.archetype || '2BHK'}
              appliances={household?.appliances || []}
              onSelectAppliance={(app) => console.log('Selected:', app)}
            />
          </div>
        </div>

        {/* Appliance Share Table */}
        <div className="col-12 col-lg-5">
          <div className="card p-3 h-100 shadow-sm">
            <h5 className="fw-bold mb-2">
              <i className="bi bi-pie-chart text-success me-2"></i>
              Appliance Consumption Share
            </h5>
            <span className="text-muted small mb-3">Physics simulation breakdown (BEE thermal &amp; cyclic models)</span>

            <div className="table-responsive">
              <table className="table table-hover align-middle small mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Appliance</th>
                    <th>BEE</th>
                    <th>kWh</th>
                    <th>Share</th>
                    <th>Est. ₹</th>
                  </tr>
                </thead>
                <tbody>
                  {simData?.appliances?.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <div className="fw-semibold">{app.name}</div>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>{app.roomName}</span>
                      </td>
                      <td>
                        <span className="text-warning">{'★'.repeat(app.beeStarRating)}</span>
                      </td>
                      <td>{app.totalKwh}</td>
                      <td>
                        <span className={`badge ${app.percentageShare > 30 ? 'bg-danger' : app.percentageShare > 10 ? 'bg-warning text-dark' : 'bg-success'}`}>
                          {app.percentageShare}%
                        </span>
                      </td>
                      <td className="fw-bold">₹{app.estimatedCostInr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
