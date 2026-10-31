import React, { useState, useEffect } from 'react';
import { runWhatIf } from '../services/api';

export default function WhatIfLabPage() {
  const [upgradeAc, setUpgradeAc] = useState(true);
  const [acSetpoint, setAcSetpoint] = useState(24);
  const [upgradeFans, setUpgradeFans] = useState(true);
  const [cutAcHours, setCutAcHours] = useState(2);
  const [solarKw, setSolarKw] = useState(0);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const evaluateScenario = async () => {
    setLoading(true);
    try {
      const res = await runWhatIf(1, {
        upgradeAcTo5Star: upgradeAc,
        upgradeFansToBldc: upgradeFans,
        reduceAcHoursBy: cutAcHours,
        solarKw: solarKw,
        acSetpointC: acSetpoint
      }, {
        acSetpointC: acSetpoint
      });
      setResult(res);
    } catch (err) {
      console.error('Failed to run what-if:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    evaluateScenario();
  }, [upgradeAc, acSetpoint, upgradeFans, cutAcHours, solarKw]);

  const savings = result?.savings;

  return (
    <div className="container-fluid py-4 px-md-4">
      <div className="mb-4">
        <h3 className="fw-bold text-dark mb-1">
          💡 What-If Savings Lab
        </h3>
        <p className="text-muted small mb-0">
          Simulate BEE 5-star appliance upgrades, behavioral thermostat shifts, and rooftop solar net-metering before spending a single rupee.
        </p>
      </div>

      <div className="row g-4">
        {/* Controls Column */}
        <div className="col-12 col-lg-5">
          <div className="card p-4 shadow-sm h-100">
            <h5 className="fw-bold mb-3">Simulate Interventions</h5>

            {/* 1. AC Star Upgrade */}
            <div className="form-check form-switch mb-3 p-3 bg-light rounded-3">
              <input
                className="form-check-input ms-0 me-3"
                type="checkbox"
                id="upgradeAcCheck"
                checked={upgradeAc}
                onChange={(e) => setUpgradeAc(e.target.checked)}
              />
              <label className="form-check-label fw-semibold" htmlFor="upgradeAcCheck">
                Upgrade AC to 5-Star Inverter Model
                <div className="text-muted small fw-normal">
                  Improves ISEER to 5.0 (saves ~30% active cooling draw)
                </div>
              </label>
            </div>

            {/* 2. AC Setpoint Slider */}
            <div className="mb-3 p-3 bg-light rounded-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label fw-semibold mb-0">AC Thermostat Setpoint</label>
                <span className="badge bg-primary fs-6">{acSetpoint}°C</span>
              </div>
              <input
                type="range"
                className="form-range"
                min="20"
                max="28"
                step="1"
                value={acSetpoint}
                onChange={(e) => setAcSetpoint(Number(e.target.value))}
              />
              <div className="d-flex justify-content-between text-muted small">
                <span>20°C (Heavy Workload)</span>
                <span>24°C (BEE Standard)</span>
                <span>28°C (Max Economy)</span>
              </div>
              <span className="text-muted small d-block mt-2">
                *Raising setpoint from 20°C to 24°C reduces compressor work by ~24%.
              </span>
            </div>

            {/* 3. BLDC Ceiling Fan Upgrade */}
            <div className="form-check form-switch mb-3 p-3 bg-light rounded-3">
              <input
                className="form-check-input ms-0 me-3"
                type="checkbox"
                id="upgradeFansCheck"
                checked={upgradeFans}
                onChange={(e) => setUpgradeFans(e.target.checked)}
              />
              <label className="form-check-label fw-semibold" htmlFor="upgradeFansCheck">
                Replace Fans with 5-Star BLDC (28W)
                <div className="text-muted small fw-normal">
                  Replaces conventional 75W induction fans with brushless DC motors (saves 62% energy)
                </div>
              </label>
            </div>

            {/* 4. Reduce AC Hours Slider */}
            <div className="mb-3 p-3 bg-light rounded-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label fw-semibold mb-0">Reduce AC Runtime</label>
                <span className="badge bg-secondary fs-6">{cutAcHours} hrs/day cut</span>
              </div>
              <input
                type="range"
                className="form-range"
                min="0"
                max="6"
                step="1"
                value={cutAcHours}
                onChange={(e) => setCutAcHours(Number(e.target.value))}
              />
              <div className="d-flex justify-content-between text-muted small">
                <span>0 hrs</span>
                <span>3 hrs</span>
                <span>6 hrs</span>
              </div>
            </div>

            {/* 5. Rooftop Solar Slider */}
            <div className="p-3 bg-light rounded-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label fw-semibold mb-0">Rooftop Solar PV Net-Metering</label>
                <span className="badge bg-warning text-dark fs-6">{solarKw} kWp</span>
              </div>
              <input
                type="range"
                className="form-range"
                min="0"
                max="5"
                step="1"
                value={solarKw}
                onChange={(e) => setSolarKw(Number(e.target.value))}
              />
              <div className="d-flex justify-content-between text-muted small">
                <span>0 kW (None)</span>
                <span>2 kWp (~240 units/mo)</span>
                <span>5 kWp</span>
              </div>
            </div>
          </div>
        </div>

        {/* Results Column */}
        <div className="col-12 col-lg-7">
          <div className="card p-4 shadow-sm h-100">
            <h5 className="fw-bold mb-3">Projected Savings &amp; Impact</h5>

            {/* Savings Banner */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-sm-6">
                <div className="p-3 bg-success-subtle text-success rounded-3 border border-success">
                  <span className="small fw-semibold text-uppercase d-block">Monthly Bill Savings</span>
                  <h2 className="fw-bold mb-0 mt-1">₹{savings?.monthlyRupeesSaved || 0}</h2>
                  <span className="small">Saved every month ({savings?.percentSaved || 0}% cut)</span>
                </div>
              </div>
              <div className="col-12 col-sm-6">
                <div className="p-3 bg-primary-subtle text-primary rounded-3 border border-primary">
                  <span className="small fw-semibold text-uppercase d-block">Annualized Savings</span>
                  <h2 className="fw-bold mb-0 mt-1">₹{savings?.annualRupeesSaved || 0}</h2>
                  <span className="small">Cumulative annual money back in pocket</span>
                </div>
              </div>
            </div>

            {/* Slab Drop Alert */}
            {savings?.droppedSlab && (
              <div className="alert alert-success p-3 rounded-3 mb-4">
                <i className="bi bi-arrow-down-circle-fill me-2 fs-5"></i>
                <strong>Slab Advantage:</strong> {savings.slabDroppedMessage}
              </div>
            )}

            {/* Comparison Overview */}
            <div className="card bg-light p-3 border-0 mb-4">
              <h6 className="fw-bold mb-2">Baseline vs. Optimized Scenario</h6>
              <div className="row text-center g-2 small">
                <div className="col-6 p-2 bg-white rounded border">
                  <span className="text-muted d-block">Current Baseline Bill</span>
                  <h4 className="fw-bold text-dark mt-1">₹{result?.baseline?.billAmount || 0}</h4>
                  <span className="badge bg-secondary">{result?.baseline?.units || 0} units</span>
                </div>
                <div className="col-6 p-2 bg-white rounded border">
                  <span className="text-muted d-block">Optimized Bill</span>
                  <h4 className="fw-bold text-success mt-1">₹{result?.scenario?.billAmount || 0}</h4>
                  <span className="badge bg-success">{result?.scenario?.netUnits || 0} units</span>
                </div>
              </div>
            </div>

            {/* Active Interventions Summary */}
            <h6 className="fw-bold text-dark mb-2">Applied Interventions</h6>
            <ul className="list-group list-group-flush small">
              {result?.scenarioDescription?.map((desc, idx) => (
                <li key={idx} className="list-group-item px-0 py-2 d-flex align-items-center">
                  <i className="bi bi-check-circle-fill text-success me-2"></i>
                  {desc}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
