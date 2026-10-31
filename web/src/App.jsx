import React, { useState } from 'react';
import DashboardPage from './pages/DashboardPage';
import BillCheckerPage from './pages/BillCheckerPage';
import WhatIfLabPage from './pages/WhatIfLabPage';
import RealityCheckPage from './pages/RealityCheckPage';
import CopilotChatPage from './pages/CopilotChatPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      {/* Top Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top shadow-sm py-2">
        <div className="container-fluid px-md-4">
          <a className="navbar-brand fw-bold d-flex align-items-center gap-2" href="#">
            <span className="fs-4">⚡</span>
            <span>WattWise</span>
            <span className="badge bg-primary text-uppercase" style={{ fontSize: '0.65rem' }}>TPDS 3</span>
          </a>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarContent"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarContent">
            <ul className="navbar-nav ms-auto mb-2 mb-lg-0 gap-1 small fw-semibold">
              <li className="nav-item">
                <button
                  className={`nav-link btn btn-link text-start px-3 rounded-pill ${activeTab === 'dashboard' ? 'active bg-primary text-white' : 'text-light'}`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  <i className="bi bi-speedometer2 me-1"></i> Dashboard &amp; 3D
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link btn btn-link text-start px-3 rounded-pill ${activeTab === 'checker' ? 'active bg-primary text-white' : 'text-light'}`}
                  onClick={() => setActiveTab('checker')}
                >
                  <i className="bi bi-receipt me-1"></i> Bill Auditor
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link btn btn-link text-start px-3 rounded-pill ${activeTab === 'whatif' ? 'active bg-primary text-white' : 'text-light'}`}
                  onClick={() => setActiveTab('whatif')}
                >
                  <i className="bi bi-lightbulb me-1"></i> What-If Lab
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link btn btn-link text-start px-3 rounded-pill ${activeTab === 'reality' ? 'active bg-primary text-white' : 'text-light'}`}
                  onClick={() => setActiveTab('reality')}
                >
                  <i className="bi bi-pie-chart me-1"></i> Reality Check
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link btn btn-link text-start px-3 rounded-pill ${activeTab === 'copilot' ? 'active bg-primary text-white' : 'text-light'}`}
                  onClick={() => setActiveTab('copilot')}
                >
                  <i className="bi bi-robot me-1"></i> AI Copilot
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link btn btn-link text-start px-3 rounded-pill ${activeTab === 'admin' ? 'active bg-primary text-white' : 'text-light'}`}
                  onClick={() => setActiveTab('admin')}
                >
                  <i className="bi bi-bar-chart-fill me-1"></i> Power BI / Admin
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow-1">
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'checker' && <BillCheckerPage />}
        {activeTab === 'whatif' && <WhatIfLabPage />}
        {activeTab === 'reality' && <RealityCheckPage />}
        {activeTab === 'copilot' && <CopilotChatPage />}
        {activeTab === 'admin' && <AdminPage />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-top py-3 mt-auto text-center small text-muted">
        <div className="container">
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
            <span>
              ⚡ <strong>WattWise</strong> • Tools &amp; Platforms for Data Science 3 (TPDS 3 Project)
            </span>
            <span>
              Citations: MERC Tariff Order Case No. 226 of 2022 • BEE Standards 2024
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

