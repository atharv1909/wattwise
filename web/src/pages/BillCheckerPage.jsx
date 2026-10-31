import React, { useState } from 'react';
import { auditRealBill } from '../services/api';

export default function BillCheckerPage() {
  const [units, setUnits] = useState(342);
  const [amount, setAmount] = useState(4206);
  const [billMonth, setBillMonth] = useState('2024-05');
  const [auditResult, setAuditResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAudit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const res = await auditRealBill(Number(units), Number(amount), billMonth);
      setAuditResult(res);
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Preload Presets
  const loadPreset = (presetUnits, presetAmount, month) => {
    setUnits(presetUnits);
    setAmount(presetAmount);
    setBillMonth(month);
    auditRealBill(presetUnits, presetAmount, month).then(setAuditResult);
  };

  return (
    <div className="container-fluid py-4 px-md-4">
      <div className="mb-4">
        <h3 className="fw-bold text-dark mb-1">
          🔍 MSEDCL Bill Auditor &amp; Recomputation Engine
        </h3>
        <p className="text-muted small mb-0">
          Recompute paper bills against official Maharashtra Electricity Regulatory Commission (MERC) orders to detect tariff misallocations, erroneous arrears, or overcharges.
        </p>
      </div>

      {/* Preset Test Case Buttons */}
      <div className="card p-3 mb-4 shadow-sm bg-white">
        <span className="small text-muted fw-semibold mb-2">QUICK TEST PRESETS (GOLDEN BILLS):</span>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-success btn-sm rounded-pill"
            onClick={() => loadPreset(342, 4206, '2024-05')}
          >
            <i className="bi bi-check-circle me-1"></i> Golden Bill 1: Summer (342 units, ₹4,206)
          </button>
          <button
            type="button"
            className="btn btn-outline-success btn-sm rounded-pill"
            onClick={() => loadPreset(240, 2679, '2024-06')}
          >
            <i className="bi bi-check-circle me-1"></i> Golden Bill 2: Monsoon (240 units, ₹2,679)
          </button>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm rounded-pill"
            onClick={() => loadPreset(210, 3550, '2024-07')}
          >
            <i className="bi bi-exclamation-octagon me-1"></i> Injected Error Test: July Overcharge (210 units charged ₹3,550 instead of ₹2,504)
          </button>
        </div>
      </div>

      <div className="row g-4">
        {/* Form Inputs */}
        <div className="col-12 col-lg-5">
          <div className="card p-4 shadow-sm h-100">
            <h5 className="fw-bold mb-3">Enter Bill Details</h5>
            <form onSubmit={handleAudit}>
              <div className="mb-3">
                <label className="form-label small text-muted">Billing Month</label>
                <input
                  type="month"
                  className="form-control"
                  value={billMonth}
                  onChange={(e) => setBillMonth(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small text-muted">Billed Units (kWh)</label>
                <input
                  type="number"
                  className="form-control"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  placeholder="e.g. 240"
                  min="0"
                  step="1"
                  required
                />
                <span className="form-text text-muted small">Total energy consumed stated on discom slip</span>
              </div>

              <div className="mb-4">
                <label className="form-label small text-muted">Billed Total Amount (₹)</label>
                <input
                  type="number"
                  className="form-control"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 2904"
                  min="0"
                  step="1"
                  required
                />
                <span className="form-text text-muted small">Final amount billed by Mahavitaran</span>
              </div>

              <button type="submit" className="btn btn-primary w-100 py-2 fw-semibold" disabled={loading}>
                {loading ? 'Recomputing...' : 'Audit & Recompute Bill'}
              </button>
            </form>
          </div>
        </div>

        {/* Audit Results */}
        <div className="col-12 col-lg-7">
          {auditResult ? (
            <div className="card p-4 shadow-sm h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Audit Diagnostic Outcome</h5>
                <span className={`badge px-3 py-2 ${auditResult.isMismatch ? 'bg-danger' : 'bg-success'}`}>
                  {auditResult.isMismatch ? '⚠️ Discrepancy Flagged' : '✓ Bill Verified to the Rupee'}
                </span>
              </div>

              {/* Status Banner */}
              {auditResult.isMismatch ? (
                <div className="alert alert-danger p-3 mb-4 rounded-3">
                  <div className="fw-bold mb-1">
                    <i className="bi bi-x-circle-fill me-2"></i>
                    Billing Mismatch Detected!
                  </div>
                  <p className="mb-0 small">{auditResult.mismatchReason}</p>
                </div>
              ) : (
                <div className="alert alert-success p-3 mb-4 rounded-3">
                  <div className="fw-bold mb-1">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    Calculation Accurate
                  </div>
                  <p className="mb-0 small">
                    The discom's charge of ₹{auditResult.amountBilled} matches the regulatory recomputation of ₹{auditResult.amountRecomputed} exactly.
                  </p>
                </div>
              )}

              {/* Breakdown Comparison Table */}
              <h6 className="fw-bold text-dark mb-2">Itemized Regulatory Breakdown</h6>
              <div className="table-responsive mb-3">
                <table className="table table-bordered table-sm align-middle small">
                  <thead className="table-light">
                    <tr>
                      <th>Cost Component</th>
                      <th>Basis / Formula</th>
                      <th className="text-end">Recomputed Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Tiered Energy Charges</td>
                      <td>Slab 1 (₹4.41), Slab 2 (₹9.64), Slab 3 (₹13.61)</td>
                      <td className="text-end fw-semibold">₹{auditResult.recomputedBreakdown.energyCharges}</td>
                    </tr>
                    <tr>
                      <td>Wheeling Charges</td>
                      <td>{auditResult.unitsBilled} units × ₹1.28/kWh</td>
                      <td className="text-end fw-semibold">₹{auditResult.recomputedBreakdown.wheelingCharges}</td>
                    </tr>
                    <tr>
                      <td>Fixed Monthly Charge</td>
                      <td>LT-I Single Phase Statutory Tariff</td>
                      <td className="text-end fw-semibold">₹{auditResult.recomputedBreakdown.fixedCharges}</td>
                    </tr>
                    <tr>
                      <td>Fuel Adjustment Charge (FAC)</td>
                      <td>{auditResult.unitsBilled} units × ₹0.35/kWh</td>
                      <td className="text-end fw-semibold">₹{auditResult.recomputedBreakdown.facCharges}</td>
                    </tr>
                    <tr>
                      <td>Electricity Duty (16%)</td>
                      <td>16% on taxable subtotal (₹{auditResult.recomputedBreakdown.taxableSubtotal})</td>
                      <td className="text-end fw-semibold">₹{auditResult.recomputedBreakdown.dutyAmount}</td>
                    </tr>
                    <tr className="table-primary fw-bold">
                      <td colSpan="2">Statutory Recomputed Bill</td>
                      <td className="text-end text-primary">₹{auditResult.amountRecomputed}</td>
                    </tr>
                    <tr className={auditResult.isMismatch ? 'table-danger fw-bold' : ''}>
                      <td colSpan="2">Discom Paper Bill Amount</td>
                      <td className="text-end">₹{auditResult.amountBilled}</td>
                    </tr>
                    {auditResult.isMismatch && (
                      <tr className="table-warning fw-bold">
                        <td colSpan="2">Discrepancy (Overcharge)</td>
                        <td className="text-end text-danger">+₹{auditResult.difference}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Slabs breakdown details */}
              <div className="bg-light p-3 rounded-3 small">
                <span className="fw-semibold text-dark">Slab Allocation:</span>
                <div className="d-flex flex-wrap gap-3 mt-1 text-muted">
                  {auditResult.recomputedBreakdown.slabBreakdown.map((s, i) => (
                    <span key={i}>
                      {s.range}: <strong>{s.unitsInSlab} units</strong> (₹{s.amount})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-5 text-center shadow-sm h-100 justify-content-center text-muted">
              <i className="bi bi-receipt-cutoff display-4 mb-3 text-secondary"></i>
              <h5>No Bill Audited Yet</h5>
              <p className="small">Enter your bill parameters or choose a quick preset to run the audit engine.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
