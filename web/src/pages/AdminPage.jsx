import React, { useState, useEffect } from 'react';
import { fetchAdminStats } from '../services/api';

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const summary = stats?.summary;

  return (
    <div className="container-fluid py-4 px-md-4">
      <div className="mb-4">
        <h3 className="fw-bold text-dark mb-1">
          📊 Admin Analytics &amp; Power BI Integration (Module 1)
        </h3>
        <p className="text-muted small mb-0">
          Aggregated cross-household energy accounting, archetype distribution, and Power BI relational view connections.
        </p>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card p-3 shadow-sm card-hover">
            <span className="text-muted small fw-medium">Monitored Households</span>
            <h2 className="fw-bold mb-0 text-dark mt-2">{summary?.totalHouseholds || 4}</h2>
            <span className="text-muted small mt-1">4 Indian Archetypes</span>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card p-3 shadow-sm card-hover">
            <span className="text-muted small fw-medium">Configured Appliances</span>
            <h2 className="fw-bold mb-0 text-primary mt-2">{summary?.totalAppliances || 9}</h2>
            <span className="text-muted small mt-1">BEE Star Rated Inventory</span>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card p-3 shadow-sm card-hover">
            <span className="text-muted small fw-medium">Audited Bills</span>
            <h2 className="fw-bold mb-0 text-success mt-2">{summary?.totalBillsAudited || 3}</h2>
            <span className="text-muted small mt-1">Verified with MSEDCL Orders</span>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card p-3 shadow-sm card-hover">
            <span className="text-muted small fw-medium">Audit Mismatch Rate</span>
            <h2 className="fw-bold mb-0 text-danger mt-2">{summary?.auditMismatchRatePercent || 33.3}%</h2>
            <span className="text-muted small mt-1">{summary?.mismatchedBills || 1} flagged discom overcharge</span>
          </div>
        </div>
      </div>

      {/* Power BI Connection Blueprint */}
      <div className="card p-4 shadow-sm mb-4 bg-white border-start border-primary border-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0">
            <i className="bi bi-file-earmark-bar-graph-fill text-primary me-2"></i>
            Module 1: Power BI Direct MySQL Connection Specification
          </h5>
          <span className="badge bg-primary">Power BI Desktop Compatible</span>
        </div>
        <p className="small text-muted mb-3">
          Power BI Desktop connects to the WattWise MySQL database via the read-only reporting user. The dashboard consumes two pre-aggregated SQL views:
        </p>

        <div className="row g-3 small">
          <div className="col-12 col-md-6">
            <div className="p-3 bg-light rounded-3 h-100">
              <span className="fw-bold text-dark d-block mb-1">1. View: v_monthly_usage</span>
              <p className="text-muted mb-2">
                Contains historical billing records across households, actual vs. recomputed bill amounts, variance in rupees, and window functions calculating archetype running totals.
              </p>
              <code>SELECT * FROM wattwise.v_monthly_usage;</code>
            </div>
          </div>

          <div className="col-12 col-md-6">
            <div className="p-3 bg-light rounded-3 h-100">
              <span className="fw-bold text-dark d-block mb-1">2. View: v_appliance_share</span>
              <p className="text-muted mb-2">
                Appliance-level consumption ranking using <code>DENSE_RANK() OVER(PARTITION BY household_id)</code>, percentage shares, and BEE star rating distributions.
              </p>
              <code>SELECT * FROM wattwise.v_appliance_share;</code>
            </div>
          </div>
        </div>
      </div>

      {/* Archetype Distribution & Catalog */}
      <div className="row g-4">
        <div className="col-12 col-md-6">
          <div className="card p-4 shadow-sm h-100">
            <h6 className="fw-bold mb-3">Household Archetype Distribution</h6>
            <ul className="list-group list-group-flush small">
              <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                <span><i className="bi bi-building me-2 text-primary"></i> 2BHK Domestic (Sharma Residence, Nagpur)</span>
                <span className="badge bg-secondary">3 kW Load</span>
              </li>
              <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                <span><i className="bi bi-houses me-2 text-primary"></i> 3BHK Villa (Verma Villa, Pune)</span>
                <span className="badge bg-secondary">5 kW Load</span>
              </li>
              <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                <span><i className="bi bi-people me-2 text-primary"></i> Students PG Flat (4-Sharing, Nagpur)</span>
                <span className="badge bg-secondary">3 kW Load</span>
              </li>
              <li className="list-group-item d-flex justify-content-between align-items-center px-0">
                <span><i className="bi bi-house me-2 text-primary"></i> 1BHK Compact (Kulkarni Residence, Nashik)</span>
                <span className="badge bg-secondary">1.5 kW Load</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="card p-4 shadow-sm h-100">
            <h6 className="fw-bold mb-3">Active Tariff Schedule</h6>
            <div className="p-3 bg-light rounded-3 small">
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-muted">Regulatory Order:</span>
                <span className="fw-bold">MERC Case No. 226 of 2022</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-muted">Discom:</span>
                <span>MSEDCL (Mahavitaran)</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-muted">Statutory Duty:</span>
                <span>16.0% (Maharashtra Duty Act)</span>
              </div>
              <div className="d-flex justify-content-between py-1">
                <span className="text-muted">Wheeling Charge:</span>
                <span>₹1.28 / kWh</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
