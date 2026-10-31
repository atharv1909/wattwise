import React, { useState, useEffect } from 'react';
import { fetchRealityCheck } from '../services/api';

export default function RealityCheckPage() {
  const [realityData, setRealityData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRealityCheck()
      .then(setRealityData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const unexplained = realityData?.unexplainedLoad;

  return (
    <div className="container-fluid py-4 px-md-4">
      <div className="mb-4">
        <h3 className="fw-bold text-dark mb-1">
          ⚖️ Reality Check &amp; Unexplained Load Calibration
        </h3>
        <p className="text-muted small mb-0">
          Comparing customer recalled guess vs. physics simulation vs. calibrated sub-metering against the actual MSEDCL electricity bill.
        </p>
      </div>

      {/* 3-Method Comparison Table */}
      <div className="card p-4 shadow-sm mb-4">
        <h5 className="fw-bold mb-3">Estimates vs. Actual Bill</h5>
        <div className="table-responsive">
          <table className="table table-bordered align-middle text-center small mb-0">
            <thead className="table-light">
              <tr>
                <th>Method</th>
                <th>Underlying Input</th>
                <th>Estimated kWh</th>
                <th>Error (kWh)</th>
                <th>Estimated ₹</th>
                <th>Error (₹)</th>
                <th>MAPE (%)</th>
                <th>Evaluator Rank</th>
              </tr>
            </thead>
            <tbody>
              {realityData?.methods?.map((m, idx) => (
                <tr key={idx} className={m.rank === 'Best' ? 'table-success' : m.rank === 'Worst' ? 'table-danger' : ''}>
                  <td className="fw-bold text-start">{m.method}</td>
                  <td className="text-start text-muted">{m.description}</td>
                  <td className="fw-semibold">{m.units}</td>
                  <td className={m.errorUnits < 0 ? 'text-danger' : 'text-success'}>
                    {m.errorUnits > 0 ? `+${m.errorUnits}` : m.errorUnits}
                  </td>
                  <td className="fw-bold">₹{m.computedRupees}</td>
                  <td className={m.errorRupees < 0 ? 'text-danger' : 'text-success'}>
                    {m.errorRupees > 0 ? `+₹${m.errorRupees}` : `₹${m.errorRupees}`}
                  </td>
                  <td className="fw-bold fs-6">{m.mapePercent}%</td>
                  <td>
                    <span className={`badge ${m.rank === 'Best' ? 'bg-success' : m.rank === 'Worst' ? 'bg-danger' : 'bg-primary'}`}>
                      {m.rank}
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="table-secondary fw-bold">
                <td className="text-start">Official Actual Bill</td>
                <td className="text-start">MSEDCL LT-I Meter Reading Slip</td>
                <td>{realityData?.actualBill?.units}</td>
                <td>0.0</td>
                <td>₹{realityData?.actualBill?.amountRupees}</td>
                <td>₹0.0</td>
                <td>0.0%</td>
                <td>Ground Truth</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Unexplained Load Section */}
      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <div className="card p-4 shadow-sm h-100 border-start border-warning border-4">
            <h5 className="fw-bold mb-2">Unexplained Load Gap</h5>
            <span className="text-muted small mb-3">Actual Bill kWh minus Physics Simulated Baseline</span>

            <div className="d-flex align-items-baseline gap-2 mb-3">
              <h2 className="fw-bold text-warning mb-0">{unexplained?.gapUnits || 0}</h2>
              <span className="text-muted">kWh ({unexplained?.gapPercentage || 0}% of bill)</span>
            </div>

            <div className="alert alert-warning p-3 rounded-3 small mb-0">
              <i className="bi bi-info-circle-fill me-2"></i>
              Estimated Financial Impact of Unexplained Gap: <strong>₹{unexplained?.gapRupees || 0}</strong>.
              In a distribution network, this represents phantom baseload, wiring dissipation, or unmonitored equipment.
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-7">
          <div className="card p-4 shadow-sm h-100">
            <h5 className="fw-bold mb-3">Physical Decomposition of Unexplained Gap</h5>
            <div className="list-group list-group-flush small">
              {unexplained?.diagnostics?.map((diag, i) => (
                <div key={i} className="list-group-item px-0 py-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="fw-bold text-dark">{diag.source}</span>
                    <span className="badge bg-light text-dark border">~{diag.estimatedShareKwh} kWh</span>
                  </div>
                  <p className="text-muted mb-0">{diag.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
