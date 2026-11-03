import React, { useState, useEffect } from 'react';
import DashboardPage from './pages/DashboardPage';
import BillCheckerPage from './pages/BillCheckerPage';
import WhatIfLabPage from './pages/WhatIfLabPage';
import RealityCheckPage from './pages/RealityCheckPage';
import CopilotChatPage from './pages/CopilotChatPage';
import AdminPage from './pages/AdminPage';
import OnboardingPage from './pages/OnboardingPage';
import DevicesPage from './pages/DevicesPage';
import BillSplitPage from './pages/BillSplitPage';
import AlertsPage from './pages/AlertsPage';
import { fetchAlerts } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [unreadAlerts, setUnreadAlerts] = useState(2);
  const [householdData, setHouseholdData] = useState(() => {
    try {
      const saved = localStorage.getItem('wattwise_household');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Fetch unread alerts count on mount and when alerts tab might be updated
  useEffect(() => {
    let isMounted = true;
    const checkAlerts = async () => {
      try {
        const res = await fetchAlerts(householdData?.id || 1);
        if (isMounted && res && Array.isArray(res.alerts)) {
          const unread = res.alerts.filter(a => !a.is_read).length;
          setUnreadAlerts(unread);
        }
      } catch (e) {
        if (isMounted) setUnreadAlerts(2);
      }
    };
    checkAlerts();
    return () => { isMounted = false; };
  }, [householdData, activeTab]);

  const handleOnboardingComplete = (data) => {
    setHouseholdData(data);
    try {
      localStorage.setItem('wattwise_household', JSON.stringify(data));
    } catch (e) {}
    setActiveTab('dashboard');
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      {/* Top Navbar */}
      <nav className="navbar navbar-expand-xl navbar-dark bg-dark sticky-top shadow-sm py-2">
        <div className="container-fluid px-md-4">
          <a
            className="navbar-brand fw-bold d-flex align-items-center gap-2 cursor-pointer"
            href="#"
            onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}
          >
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
            <ul className="navbar-nav ms-auto mb-2 mb-xl-0 gap-1 small fw-semibold align-items-xl-center">
              {/* 1. Dashboard & 3D */}
              <li className="nav-item">
                <button
                  className={`nav-link btn btn-link text-start px-3 rounded-pill ${activeTab === 'dashboard' ? 'active bg-primary text-white' : 'text-light'}`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  <i className="bi bi-speedometer2 me-1"></i> Dashboard &amp; 3D
                </button>
              </li>

              {/* 2. Bill Auditor */}
              <li className="nav-item">
                <button
                  className={`nav-link btn btn-link text-start px-3 rounded-pill ${activeTab === 'checker' ? 'active bg-primary text-white' : 'text-light'}`}
                  onClick={() => setActiveTab('checker')}
                >
                  <i className="bi bi-receipt me-1"></i> Bill Auditor
                </button>
              </li>

              {/* 3. What-If Lab */}
              <li className="nav-item">
                <button
                  className={`nav-link btn btn-link text-start px-3 rounded-pill ${activeTab === 'whatif' ? 'active bg-primary text-white' : 'text-light'}`}
                  onClick={() => setActiveTab('whatif')}
                >
                  <i className="bi bi-lightbulb me-1"></i> What-If Lab
                </button>
              </li>

              {/* 4. Reality Check */}
              <li className="nav-item">
                <button
                  className={`nav-link btn btn-link text-start px-3 rounded-pill ${activeTab === 'reality' ? 'active bg-primary text-white' : 'text-light'}`}
                  onClick={() => setActiveTab('reality')}
                >
                  <i className="bi bi-pie-chart me-1"></i> Reality Check
                </button>
              </li>

              {/* 5. Devices (NEW) */}
              <li className="nav-item">
                <button
                  className={`nav-link btn btn-link text-start px-3 rounded-pill ${activeTab === 'devices' ? 'active bg-primary text-white' : 'text-light'}`}
                  onClick={() => setActiveTab('devices')}
                >
                  <i className="bi bi-cpu me-1"></i> Devices
                </button>
              </li>

              {/* 6. Split Bill (NEW) */}
              <li className="nav-item">
                <button
                  className={`nav-link btn btn-link text-start px-3 rounded-pill ${activeTab === 'split' ? 'active bg-primary text-white' : 'text-light'}`}
                  onClick={() => setActiveTab('split')}
                >
                  <i className="bi bi-people me-1"></i> Split Bill
                </button>
              </li>

              {/* 7. Alerts (NEW with unread count badge) */}
              <li className="nav-item">
                <button
                  className={`nav-link btn btn-link text-start px-3 rounded-pill d-inline-flex align-items-center ${activeTab === 'alerts' ? 'active bg-primary text-white' : 'text-light'}`}
                  onClick={() => setActiveTab('alerts')}
                >
                  <i className="bi bi-bell me-1"></i>
                  <span>Alerts</span>
                  {unreadAlerts > 0 && (
                    <span className="badge rounded-pill bg-danger ms-1 text-white" style={{ fontSize: '0.68rem', padding: '0.25em 0.5em' }}>
                      {unreadAlerts}
                    </span>
                  )}
                </button>
              </li>

              {/* 8. AI Copilot */}
              <li className="nav-item">
                <button
                  className={`nav-link btn btn-link text-start px-3 rounded-pill ${activeTab === 'copilot' ? 'active bg-primary text-white' : 'text-light'}`}
                  onClick={() => setActiveTab('copilot')}
                >
                  <i className="bi bi-robot me-1"></i> AI Copilot
                </button>
              </li>

              {/* 9. Power BI / Admin */}
              <li className="nav-item">
                <button
                  className={`nav-link btn btn-link text-start px-3 rounded-pill ${activeTab === 'admin' ? 'active bg-primary text-white' : 'text-light'}`}
                  onClick={() => setActiveTab('admin')}
                >
                  <i className="bi bi-bar-chart-fill me-1"></i> Power BI / Admin
                </button>
              </li>

              {/* Onboarding Wizard Action (Accessible via Settings / Setup) */}
              <li className="nav-item ms-xl-2 border-start border-secondary ps-xl-2">
                <button
                  className={`btn btn-sm rounded-pill px-3 ${
                    activeTab === 'onboarding'
                      ? 'btn-outline-warning active fw-bold text-white'
                      : 'btn-outline-secondary text-light'
                  }`}
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => setActiveTab('onboarding')}
                  title="Configure Household Profile &amp; Initial Meter Setup"
                >
                  <i className="bi bi-house-gear me-1"></i> Setup Wizard
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow-1">
        {activeTab === 'onboarding' && <OnboardingPage onComplete={handleOnboardingComplete} />}
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'checker' && <BillCheckerPage />}
        {activeTab === 'whatif' && <WhatIfLabPage />}
        {activeTab === 'reality' && <RealityCheckPage />}
        {activeTab === 'devices' && <DevicesPage householdId={householdData?.id || 1} />}
        {activeTab === 'split' && <BillSplitPage householdId={householdData?.id || 1} />}
        {activeTab === 'alerts' && <AlertsPage householdId={householdData?.id || 1} onNavigateTab={setActiveTab} />}
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
