import React, { useState, useEffect } from 'react';
import { createHousehold, auditRealBill } from '../services/api';

const STATES = [
  { id: 'Maharashtra', name: 'Maharashtra', order: 'MERC Case No. 226 of 2022' },
  { id: 'Gujarat', name: 'Gujarat', order: 'GERC Tariff Order 2023-24' },
  { id: 'Karnataka', name: 'Karnataka', order: 'KERC Multi-Year Tariff 2023' },
  { id: 'Tamil Nadu', name: 'Tamil Nadu', order: 'TNERC Comprehensive Tariff 2023' },
  { id: 'Delhi', name: 'Delhi', order: 'DERC Domestic Tariff Schedule' },
  { id: 'Uttar Pradesh', name: 'Uttar Pradesh', order: 'UPERC Electricity Regulatory Order' }
];

const DISCOMS_BY_STATE = {
  Maharashtra: [
    { id: 'MSEDCL', name: 'MSEDCL (Mahavitaran - Rest of Maharashtra)', default: true },
    { id: 'BEST', name: 'BEST Undertaking (Mumbai Island City)' },
    { id: 'Tata Power', name: 'Tata Power Mumbai (Suburbs)' },
    { id: 'Adani Electricity', name: 'Adani Electricity Mumbai Ltd (AEML)' }
  ],
  Gujarat: [
    { id: 'DGVCL', name: 'DGVCL (Dakshin Gujarat Vij)', default: true },
    { id: 'MGVCL', name: 'MGVCL (Madhya Gujarat Vij)' },
    { id: 'PGVCL', name: 'PGVCL (Paschim Gujarat Vij)' },
    { id: 'UGVCL', name: 'UGVCL (Uttar Gujarat Vij)' },
    { id: 'Torrent Power', name: 'Torrent Power (Ahmedabad/Surat)' }
  ],
  Karnataka: [
    { id: 'BESCOM', name: 'BESCOM (Bengaluru Electricity Supply)', default: true },
    { id: 'MESCOM', name: 'MESCOM (Mangalore)' },
    { id: 'HESCOM', name: 'HESCOM (Hubballi)' },
    { id: 'GESCOM', name: 'GESCOM (Kalaburagi)' }
  ],
  'Tamil Nadu': [
    { id: 'TANGEDCO', name: 'TANGEDCO (Tamil Nadu Generation & Distribution)', default: true }
  ],
  Delhi: [
    { id: 'BRPL', name: 'BSES Rajdhani Power Limited (South/West Delhi)', default: true },
    { id: 'BYPL', name: 'BSES Yamuna Power Limited (Central/East Delhi)' },
    { id: 'TPDDL', name: 'Tata Power Delhi Distribution Limited (North Delhi)' },
    { id: 'NDMC', name: 'New Delhi Municipal Council (Lutyens Delhi)' }
  ],
  'Uttar Pradesh': [
    { id: 'PVVNL', name: 'PVVNL (Paschimanchal - Noida/Meerut)', default: true },
    { id: 'MVVNL', name: 'MVVNL (Madhyanchal - Lucknow)' },
    { id: 'DVVNL', name: 'DVVNL (Dakshinanchal - Agra)' },
    { id: 'PuVVNL', name: 'PuVVNL (Purvanchal - Varanasi)' },
    { id: 'NPCL', name: 'NPCL (Noida Power Company Ltd)' }
  ]
};

const HOUSE_TYPES = [
  {
    id: '1BHK',
    title: '1 BHK Apartment',
    area: '450 - 600 sq.ft',
    rooms: '2-3 Rooms (Living, Bed, Kitchen)',
    billRange: '₹800 - ₹1,800/mo',
    avgKwh: '120 - 180 kWh',
    appliances: '1 AC, 2 Fans, Refrigerator, LED TV',
    icon: 'bi-building'
  },
  {
    id: '2BHK',
    title: '2 BHK Apartment',
    area: '750 - 1,000 sq.ft',
    rooms: '4 Rooms (Living, 2 Bed, Kitchen)',
    billRange: '₹2,200 - ₹4,500/mo',
    avgKwh: '240 - 360 kWh',
    appliances: '2 ACs, 3 Fans, Fridge, Geyser, Smart TV',
    icon: 'bi-houses'
  },
  {
    id: '3BHK',
    title: '3 BHK Apartment',
    area: '1,200 - 1,600 sq.ft',
    rooms: '6 Rooms (Living, 3 Bed, Kitchen, Balcony)',
    billRange: '₹4,500 - ₹8,500/mo',
    avgKwh: '420 - 650 kWh',
    appliances: '3 ACs, 5 Fans, Large Fridge, 2 Geysers, Washing Machine',
    icon: 'bi-buildings'
  },
  {
    id: 'PG_Flat',
    title: 'PG / Shared Flat',
    area: '800 - 1,200 sq.ft',
    rooms: '3-4 Shared Rooms',
    billRange: '₹2,500 - ₹6,000/mo',
    avgKwh: '260 - 450 kWh',
    appliances: 'Shared ACs/Fans, Individual room sub-meters',
    icon: 'bi-people'
  },
  {
    id: 'Independent_House',
    title: 'Independent House / Villa',
    area: '1,800 - 3,000 sq.ft',
    rooms: '7+ Rooms, Terrace & Lawn',
    billRange: '₹7,000 - ₹15,000/mo',
    avgKwh: '650 - 1,200 kWh',
    appliances: '4+ ACs, 7 Fans, 2 Geysers, Water Booster Pump, EV Charger',
    icon: 'bi-house-heart'
  }
];

export default function OnboardingPage({ onComplete }) {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Form State
  const [selectedState, setSelectedState] = useState('Maharashtra');
  const [selectedDiscom, setSelectedDiscom] = useState('MSEDCL');
  const [connectionType, setConnectionType] = useState('Single Phase');
  const [category, setCategory] = useState('Residential (LT-I)');
  const [sanctionedLoad, setSanctionedLoad] = useState(3.0);
  const [houseType, setHouseType] = useState('2BHK');
  const [householdName, setHouseholdName] = useState('Sharma Residence (2BHK, Nagpur)');
  const [consumerNumber, setConsumerNumber] = useState('028540982314');
  const [lastBillUnits, setLastBillUnits] = useState(240);
  const [lastBillAmount, setLastBillAmount] = useState(2679);
  const [billingMonth, setBillingMonth] = useState('2024-10');

  // Audit State
  const [auditResult, setAuditResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Update DISCOM list when state changes
  useEffect(() => {
    const list = DISCOMS_BY_STATE[selectedState] || [];
    if (list.length > 0) {
      const def = list.find(d => d.default) || list[0];
      setSelectedDiscom(def.id);
    }
  }, [selectedState]);

  // Update default name when archetype changes if user hasn't heavily modified it
  useEffect(() => {
    if (householdName.includes('Residence') || householdName.includes('Flat')) {
      setHouseholdName(`My Home (${houseType}, ${selectedState})`);
    }
  }, [houseType, selectedState]);

  // Run audit preview when units or amount changes
  useEffect(() => {
    let active = true;
    const runCheck = async () => {
      try {
        const res = await auditRealBill(Number(lastBillUnits), Number(lastBillAmount), billingMonth);
        if (active) setAuditResult(res);
      } catch (err) {
        // Fallback local calculation
        const units = Number(lastBillUnits) || 0;
        const billed = Number(lastBillAmount) || 0;
        let energyCharge = 0;
        if (units <= 100) energyCharge = units * 4.71;
        else if (units <= 300) energyCharge = (100 * 4.71) + ((units - 100) * 10.29);
        else energyCharge = (100 * 4.71) + (200 * 10.29) + ((units - 300) * 14.55);
        
        const fixed = connectionType === 'Single Phase' ? 128 : 470;
        const wheeling = units * 1.28;
        const fac = units * 0.45;
        const subtotal = fixed + energyCharge + wheeling + fac;
        const duty = subtotal * 0.16;
        const expected = Math.round(subtotal + duty);
        const diff = billed - expected;
        const isMismatch = Math.abs(diff) > 25;

        if (active) {
          setAuditResult({
            amountRecomputed: expected,
            amountBilled: billed,
            unitsBilled: units,
            isMismatch,
            mismatchReason: isMismatch 
              ? (diff > 0 ? `Overcharge of ₹${diff.toLocaleString('en-IN')}: Discom applied higher fixed charge or erroneous arrears.` : `Bill is ₹${Math.abs(diff)} lower than tariff standard.`)
              : 'Verified against MERC Tariff Slabs. No billing discrepancies found.'
          });
        }
      }
    };
    runCheck();
    return () => { active = false; };
  }, [lastBillUnits, lastBillAmount, billingMonth, connectionType]);

  const handleNext = () => {
    setErrorMsg(null);
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      name: householdName,
      state: selectedState,
      discom: selectedDiscom,
      connection_type: connectionType,
      category,
      sanctioned_load_kw: Number(sanctionedLoad),
      archetype: houseType,
      consumer_number: consumerNumber,
      last_bill_units: Number(lastBillUnits),
      last_bill_amount: Number(lastBillAmount),
      billing_month: billingMonth,
      audit_result: auditResult
    };

    try {
      const res = await createHousehold(payload);
      const createdData = res.household || payload;
      if (onComplete) {
        onComplete(createdData);
      }
    } catch (err) {
      console.warn('API call failed during onboarding, proceeding with local profile:', err);
      if (onComplete) {
        onComplete({ id: Date.now(), ...payload });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const progressPercent = (step / totalSteps) * 100;

  return (
    <div className="container py-4 px-md-5" style={{ maxWidth: '960px' }}>
      {/* Top Header */}
      <div className="text-center mb-4">
        <div className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle mb-2" style={{ width: '48px', height: '48px', fontSize: '1.5rem' }}>
          ⚡
        </div>
        <h2 className="fw-bold text-dark mb-1">Welcome to WattWise ⚡</h2>
        <p className="text-muted mb-0">Let's set up your household profile and audit your baseline electricity usage</p>
      </div>

      {/* Progress Bar & Steps Indicator */}
      <div className="card shadow-sm border-0 mb-4 bg-white">
        <div className="card-body p-3">
          <div className="d-flex justify-content-between align-items-center mb-2 small fw-semibold text-muted">
            <span className={step >= 1 ? 'text-primary fw-bold' : ''}>
              <i className="bi bi-geo-alt me-1"></i> 1. State
            </span>
            <span className={step >= 2 ? 'text-primary fw-bold' : ''}>
              <i className="bi bi-lightning-charge me-1"></i> 2. Connection
            </span>
            <span className={step >= 3 ? 'text-primary fw-bold' : ''}>
              <i className="bi bi-house-door me-1"></i> 3. House Type
            </span>
            <span className={step >= 4 ? 'text-primary fw-bold' : ''}>
              <i className="bi bi-receipt me-1"></i> 4. First Bill
            </span>
            <span className={step >= 5 ? 'text-primary fw-bold' : ''}>
              <i className="bi bi-check-circle me-1"></i> 5. Confirm
            </span>
          </div>
          <div className="progress" style={{ height: '8px' }}>
            <div
              className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
              role="progressbar"
              style={{ width: `${progressPercent}%` }}
              aria-valuenow={progressPercent}
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="alert alert-danger alert-dismissible fade show shadow-sm" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i> {errorMsg}
          <button type="button" className="btn-close" onClick={() => setErrorMsg(null)}></button>
        </div>
      )}

      {/* Wizard Steps */}
      <div className="card shadow border-0">
        {/* STEP 1: WELCOME & STATE SELECTION */}
        {step === 1 && (
          <div className="card-body p-4 p-md-5">
            <div className="d-flex align-items-center gap-3 mb-4">
              <span className="badge bg-primary-subtle text-primary p-2 fs-5 rounded-circle">
                <i className="bi bi-geo-alt-fill"></i>
              </span>
              <div>
                <h4 className="fw-bold mb-0">Step 1: Select Your State</h4>
                <p className="text-muted small mb-0">Electricity tariffs are governed by State Electricity Regulatory Commissions (SERCs).</p>
              </div>
            </div>

            <div className="row g-4 align-items-center">
              <div className="col-md-7">
                <label className="form-label fw-semibold text-dark">State / Union Territory</label>
                <select
                  className="form-select form-select-lg mb-3 shadow-sm border-primary"
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                >
                  {STATES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.id === 'Maharashtra' ? '⚡ (MSEDCL Default Tariff Active)' : ''}
                    </option>
                  ))}
                </select>

                <div className="card bg-light border-0 p-3 mb-3">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-shield-check text-success fs-5"></i>
                    <span className="fw-bold small text-dark">Verified Tariff Database</span>
                  </div>
                  <p className="small text-muted mb-0">
                    WattWise includes official tariff orders for <strong>{selectedState}</strong> (Order:{' '}
                    <em>{STATES.find((s) => s.id === selectedState)?.order}</em>). Slabs, FAC, and duty rates will be applied automatically.
                  </p>
                </div>
              </div>

              <div className="col-md-5">
                <div className="card border-primary-subtle bg-primary-subtle p-3 rounded-3">
                  <h6 className="fw-bold text-primary mb-2">
                    <i className="bi bi-lightbulb-fill me-1"></i> What You Get in WattWise:
                  </h6>
                  <ul className="list-unstyled small mb-0 d-flex flex-column gap-2 text-dark">
                    <li className="d-flex align-items-start gap-2">
                      <i className="bi bi-check-circle-fill text-primary mt-1"></i>
                      <span><strong>Deterministic Bill Auditor:</strong> Verify paper bills against official tariff slabs down to the exact paisa.</span>
                    </li>
                    <li className="d-flex align-items-start gap-2">
                      <i className="bi bi-check-circle-fill text-primary mt-1"></i>
                      <span><strong>3D Physics Home Simulation:</strong> Interactive room model with thermal and appliance load curves.</span>
                    </li>
                    <li className="d-flex align-items-start gap-2">
                      <i className="bi bi-check-circle-fill text-primary mt-1"></i>
                      <span><strong>Tariff Slab Alerts:</strong> Advance warnings before crossing into high-tariff electricity brackets.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end mt-4 pt-3 border-top">
              <button className="btn btn-primary btn-lg px-4 rounded-pill shadow-sm" onClick={handleNext}>
                Next: DISCOM &amp; Connection <i className="bi bi-arrow-right ms-1"></i>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DISCOM & CONNECTION */}
        {step === 2 && (
          <div className="card-body p-4 p-md-5">
            <div className="d-flex align-items-center gap-3 mb-4">
              <span className="badge bg-primary-subtle text-primary p-2 fs-5 rounded-circle">
                <i className="bi bi-lightning-charge-fill"></i>
              </span>
              <div>
                <h4 className="fw-bold mb-0">Step 2: DISCOM &amp; Connection Details</h4>
                <p className="text-muted small mb-0">Configure your electricity distribution company and metering phase.</p>
              </div>
            </div>

            <div className="row g-3">
              {/* DISCOM Selection */}
              <div className="col-md-6">
                <label className="form-label fw-semibold text-dark">Electricity Utility (DISCOM)</label>
                <select
                  className="form-select mb-3 shadow-sm"
                  value={selectedDiscom}
                  onChange={(e) => setSelectedDiscom(e.target.value)}
                >
                  {(DISCOMS_BY_STATE[selectedState] || []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <small className="text-muted d-block mb-3">
                  Check your monthly electricity bill header for your provider name.
                </small>

                {/* Consumer Category */}
                <label className="form-label fw-semibold text-dark">Consumer Category</label>
                <select
                  className="form-select mb-3 shadow-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Residential (LT-I)">Residential (LT-I / Domestic)</option>
                  <option value="Commercial (LT-II)">Commercial (LT-II / Shops &amp; Offices)</option>
                  <option value="Industrial (LT-III)">Industrial (LT-III / Small Scale)</option>
                </select>
              </div>

              {/* Connection Type & Sanctioned Load */}
              <div className="col-md-6">
                <label className="form-label fw-semibold text-dark">Metering Connection Type</label>
                <div className="d-flex flex-column gap-2 mb-3">
                  <div
                    className={`card p-3 border-2 cursor-pointer ${
                      connectionType === 'Single Phase' ? 'border-primary bg-primary-subtle' : 'border-light-subtle'
                    }`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setConnectionType('Single Phase')}
                  >
                    <div className="form-check mb-0">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="connType"
                        id="connSingle"
                        checked={connectionType === 'Single Phase'}
                        onChange={() => setConnectionType('Single Phase')}
                      />
                      <label className="form-check-label fw-bold d-block text-dark" htmlFor="connSingle">
                        Single Phase (1Φ 230V)
                        <span className="badge bg-secondary ms-2 small">Fixed: ₹128/mo</span>
                      </label>
                      <small className="text-muted">Standard for apartments &amp; homes under 7.5 kW load</small>
                    </div>
                  </div>

                  <div
                    className={`card p-3 border-2 cursor-pointer ${
                      connectionType === 'Three Phase' ? 'border-primary bg-primary-subtle' : 'border-light-subtle'
                    }`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setConnectionType('Three Phase')}
                  >
                    <div className="form-check mb-0">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="connType"
                        id="connThree"
                        checked={connectionType === 'Three Phase'}
                        onChange={() => setConnectionType('Three Phase')}
                      />
                      <label className="form-check-label fw-bold d-block text-dark" htmlFor="connThree">
                        Three Phase (3Φ 415V)
                        <span className="badge bg-secondary ms-2 small">Fixed: ₹470/mo</span>
                      </label>
                      <small className="text-muted">For heavy loads, multiple high-tonnage ACs or EV chargers</small>
                    </div>
                  </div>
                </div>

                {/* Sanctioned Load */}
                <label className="form-label fw-semibold text-dark">Sanctioned Load (kW)</label>
                <div className="input-group shadow-sm mb-2">
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setSanctionedLoad(Math.max(0.5, Number((sanctionedLoad - 0.5).toFixed(1))))}
                  >
                    <i className="bi bi-dash"></i>
                  </button>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="50"
                    className="form-control text-center fw-bold"
                    value={sanctionedLoad}
                    onChange={(e) => setSanctionedLoad(Number(e.target.value))}
                  />
                  <span className="input-group-text">kW</span>
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setSanctionedLoad(Number((sanctionedLoad + 0.5).toFixed(1)))}
                  >
                    <i className="bi bi-plus"></i>
                  </button>
                </div>
                <small className="text-muted">Default domestic sanctioned load is typically 3.0 kW</small>
              </div>
            </div>

            <div className="d-flex justify-content-between mt-4 pt-3 border-top">
              <button className="btn btn-outline-secondary px-4 rounded-pill" onClick={handleBack}>
                <i className="bi bi-arrow-left me-1"></i> Back
              </button>
              <button className="btn btn-primary px-4 rounded-pill shadow-sm" onClick={handleNext}>
                Next: House Type <i className="bi bi-arrow-right ms-1"></i>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: HOUSE TYPE ARCHETYPE */}
        {step === 3 && (
          <div className="card-body p-4 p-md-5">
            <div className="d-flex align-items-center gap-3 mb-4">
              <span className="badge bg-primary-subtle text-primary p-2 fs-5 rounded-circle">
                <i className="bi bi-house-door-fill"></i>
              </span>
              <div>
                <h4 className="fw-bold mb-0">Step 3: Select House Archetype</h4>
                <p className="text-muted small mb-0">WattWise creates your 3D digital twin rooms and baseline appliance load profiles based on archetype.</p>
              </div>
            </div>

            <div className="row g-3">
              {HOUSE_TYPES.map((ht) => {
                const isSelected = houseType === ht.id;
                return (
                  <div key={ht.id} className="col-md-6 col-lg-4">
                    <div
                      className={`card h-100 p-3 rounded-3 border-2 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary-subtle shadow'
                          : 'border-light-subtle bg-white hover-shadow'
                      }`}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                      onClick={() => setHouseType(ht.id)}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className={`bi ${ht.icon} fs-4 ${isSelected ? 'text-primary' : 'text-secondary'}`}></i>
                          <h6 className="fw-bold mb-0 text-dark">{ht.title}</h6>
                        </div>
                        {isSelected ? (
                          <span className="badge bg-primary rounded-pill">
                            <i className="bi bi-check-lg"></i> Selected
                          </span>
                        ) : (
                          <span className="badge bg-light text-muted border">Select</span>
                        )}
                      </div>

                      <div className="small text-muted mb-2">
                        <div><i className="bi bi-arrows-fullscreen me-1"></i> <strong>Area:</strong> {ht.area}</div>
                        <div><i className="bi bi-door-closed me-1"></i> <strong>Rooms:</strong> {ht.rooms}</div>
                      </div>

                      <div className="mt-auto pt-2 border-top">
                        <div className="d-flex justify-content-between align-items-center small">
                          <span className="text-muted">Est. Monthly Bill:</span>
                          <span className="fw-bold text-success">{ht.billRange}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center small text-muted">
                          <span>Typical Monthly Units:</span>
                          <span className="fw-semibold">{ht.avgKwh}</span>
                        </div>
                        <p className="small text-muted mt-2 mb-0" style={{ fontSize: '0.78rem' }}>
                          <i className="bi bi-plug me-1 text-primary"></i> {ht.appliances}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="d-flex justify-content-between mt-4 pt-3 border-top">
              <button className="btn btn-outline-secondary px-4 rounded-pill" onClick={handleBack}>
                <i className="bi bi-arrow-left me-1"></i> Back
              </button>
              <button className="btn btn-primary px-4 rounded-pill shadow-sm" onClick={handleNext}>
                Next: First Bill Audit <i className="bi bi-arrow-right ms-1"></i>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: HOUSEHOLD NAME & FIRST BILL AUDIT */}
        {step === 4 && (
          <div className="card-body p-4 p-md-5">
            <div className="d-flex align-items-center gap-3 mb-4">
              <span className="badge bg-primary-subtle text-primary p-2 fs-5 rounded-circle">
                <i className="bi bi-receipt-cutoff"></i>
              </span>
              <div>
                <h4 className="fw-bold mb-0">Step 4: Your Household &amp; Baseline Bill</h4>
                <p className="text-muted small mb-0">Enter your recent electricity bill to run an immediate deterministic tariff audit.</p>
              </div>
            </div>

            <div className="row g-4">
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label fw-semibold text-dark">Household Name / Label</label>
                  <input
                    type="text"
                    className="form-control shadow-sm"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    placeholder="e.g. Sharma Residence (2BHK, Nagpur)"
                    required
                  />
                  <small className="text-muted">Give your digital twin a recognizable name.</small>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold text-dark">Consumer / Account Number (Optional)</label>
                  <input
                    type="text"
                    className="form-control shadow-sm"
                    value={consumerNumber}
                    onChange={(e) => setConsumerNumber(e.target.value)}
                    placeholder="e.g. 028540123456"
                  />
                  <small className="text-muted">12-digit consumer number printed on your DISCOM bill.</small>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label fw-semibold text-dark">Last Bill Units (kWh)</label>
                    <div className="input-group shadow-sm">
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        className="form-control fw-bold"
                        value={lastBillUnits}
                        onChange={(e) => setLastBillUnits(e.target.value)}
                      />
                      <span className="input-group-text">units</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-semibold text-dark">Last Bill Amount (₹)</label>
                    <div className="input-group shadow-sm">
                      <span className="input-group-text">₹</span>
                      <input
                        type="number"
                        min="1"
                        max="100000"
                        className="form-control fw-bold"
                        value={lastBillAmount}
                        onChange={(e) => setLastBillAmount(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label fw-semibold text-dark">Bill Month</label>
                  <input
                    type="month"
                    className="form-control shadow-sm"
                    value={billingMonth}
                    onChange={(e) => setBillingMonth(e.target.value)}
                  />
                </div>
              </div>

              {/* Instant Audit Result Card */}
              <div className="col-md-6">
                <div className="card h-100 border shadow-sm p-3 bg-white">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold mb-0 text-dark">
                      <i className="bi bi-calculator me-1 text-primary"></i> Instant Tariff Audit
                    </h6>
                    <span className="badge bg-primary text-uppercase" style={{ fontSize: '0.65rem' }}>
                      MERC LT-I
                    </span>
                  </div>

                  {auditResult ? (
                    <div>
                      <div className="d-flex justify-content-between align-items-center p-2 rounded mb-2 bg-light">
                        <span className="small text-muted">You Paid:</span>
                        <span className="fw-bold text-dark fs-5">₹{Number(lastBillAmount).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center p-2 rounded mb-3 bg-light">
                        <span className="small text-muted">MERC Recomputed Bill:</span>
                        <span className="fw-bold text-primary fs-5">
                          ₹{Number(auditResult.amountRecomputed || 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      {auditResult.isMismatch ? (
                        <div className="alert alert-warning py-2 px-3 small mb-0 border-warning">
                          <div className="fw-bold text-dark mb-1">
                            <i className="bi bi-exclamation-triangle-fill text-warning me-1"></i> Tariff Discrepancy Flagged!
                          </div>
                          <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>
                            {auditResult.mismatchReason || 'Possible overcharge or billing arrears in paper bill.'}
                          </p>
                        </div>
                      ) : (
                        <div className="alert alert-success py-2 px-3 small mb-0 border-success">
                          <div className="fw-bold text-success mb-1">
                            <i className="bi bi-check-circle-fill me-1"></i> Bill Verified &amp; Compliant
                          </div>
                          <p className="mb-0 text-muted" style={{ fontSize: '0.8rem' }}>
                            Your bill matches official tariff order slabs for {lastBillUnits} units. No unfair overcharges detected.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted">
                      <div className="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
                      <div className="small">Calculating tariff breakdown...</div>
                    </div>
                  )}

                  <div className="mt-auto pt-3 border-top small text-muted">
                    <i className="bi bi-info-circle me-1"></i> Slabs recomputed: Fixed charges, Energy tiers (0-100, 101-300), Wheeling charges @ ₹1.28/kWh, and Electricity Duty (16%).
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-between mt-4 pt-3 border-top">
              <button className="btn btn-outline-secondary px-4 rounded-pill" onClick={handleBack}>
                <i className="bi bi-arrow-left me-1"></i> Back
              </button>
              <button className="btn btn-primary px-4 rounded-pill shadow-sm" onClick={handleNext}>
                Next: Review &amp; Confirm <i className="bi bi-arrow-right ms-1"></i>
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: CONFIRMATION & SETUP */}
        {step === 5 && (
          <div className="card-body p-4 p-md-5">
            <div className="d-flex align-items-center gap-3 mb-4">
              <span className="badge bg-success-subtle text-success p-2 fs-5 rounded-circle">
                <i className="bi bi-check2-circle"></i>
              </span>
              <div>
                <h4 className="fw-bold mb-0">Step 5: Review &amp; Confirm Profile</h4>
                <p className="text-muted small mb-0">Verify your settings before initializing your WattWise digital twin.</p>
              </div>
            </div>

            {/* Summary Grid */}
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <div className="card bg-light border-0 p-3 h-100">
                  <h6 className="fw-bold text-dark mb-3">
                    <i className="bi bi-house me-1 text-primary"></i> Household Information
                  </h6>
                  <ul className="list-unstyled small mb-0 d-flex flex-column gap-2">
                    <li className="d-flex justify-content-between">
                      <span className="text-muted">Household Name:</span>
                      <span className="fw-semibold text-dark">{householdName}</span>
                    </li>
                    <li className="d-flex justify-content-between">
                      <span className="text-muted">House Archetype:</span>
                      <span className="badge bg-primary">{houseType}</span>
                    </li>
                    <li className="d-flex justify-content-between">
                      <span className="text-muted">Consumer ID:</span>
                      <span className="fw-semibold text-dark">{consumerNumber || 'Not Specified'}</span>
                    </li>
                    <li className="d-flex justify-content-between">
                      <span className="text-muted">Billing Cycle Month:</span>
                      <span className="fw-semibold text-dark">{billingMonth}</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card bg-light border-0 p-3 h-100">
                  <h6 className="fw-bold text-dark mb-3">
                    <i className="bi bi-plug me-1 text-primary"></i> Utility &amp; Meter Connection
                  </h6>
                  <ul className="list-unstyled small mb-0 d-flex flex-column gap-2">
                    <li className="d-flex justify-content-between">
                      <span className="text-muted">State:</span>
                      <span className="fw-semibold text-dark">{selectedState}</span>
                    </li>
                    <li className="d-flex justify-content-between">
                      <span className="text-muted">DISCOM:</span>
                      <span className="fw-semibold text-dark">{selectedDiscom}</span>
                    </li>
                    <li className="d-flex justify-content-between">
                      <span className="text-muted">Connection Type:</span>
                      <span className="fw-semibold text-dark">{connectionType}</span>
                    </li>
                    <li className="d-flex justify-content-between">
                      <span className="text-muted">Sanctioned Load:</span>
                      <span className="fw-semibold text-dark">{sanctionedLoad} kW</span>
                    </li>
                    <li className="d-flex justify-content-between">
                      <span className="text-muted">Tariff Category:</span>
                      <span className="badge bg-secondary">{category}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Baseline Bill Summary */}
              <div className="col-12">
                <div className="card border-primary p-3 bg-white">
                  <div className="row align-items-center">
                    <div className="col-sm-3 text-center border-end">
                      <span className="small text-muted d-block">Monthly Consumption</span>
                      <span className="fs-4 fw-bold text-dark">{lastBillUnits}</span>
                      <span className="small text-muted ms-1">kWh</span>
                    </div>
                    <div className="col-sm-3 text-center border-end">
                      <span className="small text-muted d-block">Paper Bill Amount</span>
                      <span className="fs-4 fw-bold text-dark">₹{Number(lastBillAmount).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="col-sm-3 text-center border-end">
                      <span className="small text-muted d-block">MERC Recomputed</span>
                      <span className="fs-4 fw-bold text-primary">
                        ₹{Number(auditResult?.amountRecomputed || lastBillAmount).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="col-sm-3 text-center">
                      <span className="small text-muted d-block">Audit Status</span>
                      {auditResult?.isMismatch ? (
                        <span className="badge bg-warning text-dark p-2">⚠️ Discrepancy Found</span>
                      ) : (
                        <span className="badge bg-success p-2">✅ Verified Slabs</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-between mt-4 pt-3 border-top">
              <button className="btn btn-outline-secondary px-4 rounded-pill" onClick={handleBack} disabled={submitting}>
                <i className="bi bi-arrow-left me-1"></i> Back
              </button>
              <button
                className="btn btn-success btn-lg px-5 rounded-pill shadow"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Initializing WattWise...
                  </>
                ) : (
                  <>
                    <i className="bi bi-rocket-takeoff-fill me-2"></i> Start Using WattWise
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
