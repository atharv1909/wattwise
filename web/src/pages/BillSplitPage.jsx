import React, { useState, useEffect } from 'react';
import { fetchSplitGroups, createSplitGroup } from '../services/api';

const COLORS = ['#0d6efd', '#20c997', '#fd7e14', '#6f42c1', '#d63384', '#0dcaf0'];

const INITIAL_GROUPS = [
  {
    id: 1,
    household_id: 1,
    name: 'Flat 302 Roommates (Nagpur PG)',
    total_bill_amount: 3600,
    total_units: 320,
    billing_month: '2024-10',
    split_method: 'by_room',
    members: [
      {
        id: 1,
        name: 'Rahul Sharma',
        room_name: 'Master Bedroom (AC Room)',
        has_ac: true,
        appliances: ['1.5 Ton AC', 'Ceiling Fan', 'Gaming Laptop'],
        measured_units: 175,
        status: 'paid'
      },
      {
        id: 2,
        name: 'Amit Patel',
        room_name: 'Bedroom 2 (Fan Only)',
        has_ac: false,
        appliances: ['Ceiling Fan', 'Study Lamp', 'Work Laptop'],
        measured_units: 75,
        status: 'pending'
      },
      {
        id: 3,
        name: 'Priya Deshmukh',
        room_name: 'Bedroom 3 (Balcony Room)',
        has_ac: false,
        appliances: ['Ceiling Fan', 'Desktop PC', 'LED Light'],
        measured_units: 70,
        status: 'pending'
      }
    ]
  }
];

export default function BillSplitPage({ householdId = 1 }) {
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [activeGroupId, setActiveGroupId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [splitMethod, setSplitMethod] = useState('by_room'); // 'equal' | 'by_room' | 'measured'
  const [totalBillAmount, setTotalBillAmount] = useState(3600);
  const [totalUnits, setTotalUnits] = useState(320);
  const [billingMonth, setBillingMonth] = useState('2024-10');
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Active Group Members
  const [members, setMembers] = useState(INITIAL_GROUPS[0].members);

  // New Member Form State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRoom, setNewMemberRoom] = useState('');
  const [newMemberHasAc, setNewMemberHasAc] = useState(false);
  const [newMemberUnits, setNewMemberUnits] = useState(80);

  // New Group Form State
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Fetch groups on mount
  useEffect(() => {
    loadGroups();
  }, [householdId]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const res = await fetchSplitGroups(householdId);
      if (res && Array.isArray(res.groups) && res.groups.length > 0) {
        setGroups(res.groups);
        setActiveGroupId(res.groups[0].id);
        if (res.groups[0].members) {
          setMembers(res.groups[0].members);
        }
        if (res.groups[0].total_bill_amount) setTotalBillAmount(res.groups[0].total_bill_amount);
        if (res.groups[0].total_units) setTotalUnits(res.groups[0].total_units);
        if (res.groups[0].split_method) setSplitMethod(res.groups[0].split_method);
      }
    } catch (err) {
      console.warn('API error fetching split groups, using local state:', err);
    } finally {
      setLoading(false);
    }
  };

  // Switch Group Handler
  const handleSelectGroup = (id) => {
    setActiveGroupId(id);
    const grp = groups.find(g => g.id === id);
    if (grp) {
      setMembers(grp.members || []);
      setTotalBillAmount(grp.total_bill_amount || 3600);
      setTotalUnits(grp.total_units || 320);
      setSplitMethod(grp.split_method || 'by_room');
    }
  };

  // Create Group Handler
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const newGroup = {
      id: Date.now(),
      household_id: householdId,
      name: newGroupName.trim(),
      total_bill_amount: Number(totalBillAmount),
      total_units: Number(totalUnits),
      billing_month: billingMonth,
      split_method: splitMethod,
      members: [
        {
          id: 1,
          name: 'Flatmate 1',
          room_name: 'Room 1 (AC)',
          has_ac: true,
          appliances: ['1.5T AC', 'Ceiling Fan'],
          measured_units: 160,
          status: 'pending'
        },
        {
          id: 2,
          name: 'Flatmate 2',
          room_name: 'Room 2 (Non-AC)',
          has_ac: false,
          appliances: ['Ceiling Fan', 'Laptop'],
          measured_units: 80,
          status: 'pending'
        }
      ]
    };

    try {
      await createSplitGroup(newGroup);
    } catch (err) {
      console.warn('Backend createSplitGroup failed, using local:', err);
    }

    setGroups([...groups, newGroup]);
    setActiveGroupId(newGroup.id);
    setMembers(newGroup.members);
    setShowNewGroupModal(false);
    setNewGroupName('');
  };

  // Add Member Handler
  const handleAddMember = (e) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const newMem = {
      id: Date.now(),
      name: newMemberName.trim(),
      room_name: newMemberRoom.trim() || `Room ${members.length + 1}`,
      has_ac: newMemberHasAc,
      appliances: newMemberHasAc ? ['1.5 Ton AC', 'Ceiling Fan'] : ['Ceiling Fan', 'Study Light'],
      measured_units: Number(newMemberUnits) || 80,
      status: 'pending'
    };

    setMembers([...members, newMem]);
    setNewMemberName('');
    setNewMemberRoom('');
    setNewMemberHasAc(false);
    setNewMemberUnits(80);
  };

  // Remove Member
  const handleDeleteMember = (id) => {
    if (members.length <= 1) {
      alert('Group must have at least one member.');
      return;
    }
    setMembers(members.filter(m => m.id !== id));
  };

  // Toggle Payment Status
  const toggleMemberStatus = (id) => {
    setMembers(members.map(m => m.id === id ? { ...m, status: m.status === 'paid' ? 'pending' : 'paid' } : m));
  };

  // Compute Splits
  const calculateResults = () => {
    const numMembers = members.length;
    if (numMembers === 0) return [];

    const totalBill = Number(totalBillAmount) || 0;
    const totalKwh = Number(totalUnits) || 0;

    if (splitMethod === 'equal') {
      const sharePct = Number((100 / numMembers).toFixed(2));
      const shareAmt = Number((totalBill / numMembers).toFixed(2));
      const shareKwh = Number((totalKwh / numMembers).toFixed(2));

      return members.map(m => ({
        ...m,
        sharePct,
        allocatedKwh: shareKwh,
        amount: shareAmt
      }));
    }

    if (splitMethod === 'by_room') {
      // Room Appliance Weights: AC room takes ~60-70% of room load, Non-AC takes ~20%
      // 30% of total bill is considered common utility (fridge, kitchen, router, geyser, fixed charges) and split equally!
      // 70% is private room energy split by appliance weight.
      const commonShareRatio = 0.30;
      const commonPerMember = (totalBill * commonShareRatio) / numMembers;
      const commonKwhPerMember = (totalKwh * commonShareRatio) / numMembers;

      const privateBill = totalBill * (1 - commonShareRatio);
      const privateKwh = totalKwh * (1 - commonShareRatio);

      // Weight: AC room = 4.0, Non-AC room = 1.0
      const weights = members.map(m => m.has_ac ? 4.0 : 1.0);
      const totalWeight = weights.reduce((a, b) => a + b, 0);

      return members.map((m, idx) => {
        const memWeight = weights[idx];
        const privateRatio = memWeight / totalWeight;
        const privateAmt = privateBill * privateRatio;
        const privateKwhAlloc = privateKwh * privateRatio;

        const totalAmt = Number((commonPerMember + privateAmt).toFixed(2));
        const totalKwhAlloc = Number((commonKwhPerMember + privateKwhAlloc).toFixed(2));
        const pct = totalBill > 0 ? Number(((totalAmt / totalBill) * 100).toFixed(2)) : 0;

        return {
          ...m,
          sharePct: pct,
          allocatedKwh: totalKwhAlloc,
          amount: totalAmt
        };
      });
    }

    if (splitMethod === 'measured') {
      // Fixed charge (₹128) split equally; energy charges split strictly by sub-meter kWh
      const fixedChargeTotal = 128;
      const energyChargeTotal = Math.max(0, totalBill - fixedChargeTotal);
      const fixedPerMember = fixedChargeTotal / numMembers;

      const totalSubKwh = members.reduce((acc, m) => acc + (Number(m.measured_units) || 1), 0);

      return members.map(m => {
        const units = Number(m.measured_units) || 1;
        const ratio = units / (totalSubKwh || 1);
        const energyAmt = energyChargeTotal * ratio;
        const totalAmt = Number((fixedPerMember + energyAmt).toFixed(2));
        const pct = totalBill > 0 ? Number(((totalAmt / totalBill) * 100).toFixed(2)) : 0;
        const allocKwh = Number((totalKwh * ratio).toFixed(2));

        return {
          ...m,
          sharePct: pct,
          allocatedKwh: allocKwh,
          amount: totalAmt
        };
      });
    }

    return [];
  };

  const calculatedMembers = calculateResults();

  // Recharts Chart Data
  const chartData = calculatedMembers.map(m => ({
    name: m.name,
    amount: m.amount,
    kwh: m.allocatedKwh,
    pct: m.sharePct
  }));

  // WhatsApp Message Generator
  const handleCopyWhatsApp = () => {
    const lines = [
      `⚡ *WattWise Fair Electricity Bill Split* ⚡`,
      `📅 *Billing Month:* ${billingMonth} | *Total:* ₹${Number(totalBillAmount).toLocaleString('en-IN')} (${totalUnits} kWh)`,
      `⚖️ *Split Method:* ${splitMethod.replace('_', ' ').toUpperCase()}`,
      `---------------------------------`
    ];

    calculatedMembers.forEach((m, idx) => {
      lines.push(`${idx + 1}. *${m.name}* (${m.room_name}): ₹${m.amount.toLocaleString('en-IN')} (${m.allocatedKwh} kWh, ${m.sharePct}%) - [${m.status.toUpperCase()}]`);
    });

    lines.push(`---------------------------------`);
    lines.push(`💡 Calculated via WattWise deterministic PG tariff engine.`);
    lines.push(`Please UPI your respective amounts today! Thank you! 🙌`);

    const text = lines.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 3000);
  };

  return (
    <div className="container-fluid py-4 px-md-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">
            <i className="bi bi-people-fill text-primary me-2"></i> Fair Bill Split Calculator
          </h3>
          <p className="text-muted small mb-0">
            Split one meter's electricity bill fairly across rooms or flatmates based on actual appliance loads, sub-meters, or equal occupancy.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-outline-primary btn-sm rounded-pill"
            onClick={() => setShowNewGroupModal(true)}
          >
            <i className="bi bi-plus-lg me-1"></i> New Flat Group
          </button>
          <button
            className="btn btn-success btn-sm rounded-pill px-3 shadow-sm"
            onClick={handleCopyWhatsApp}
          >
            <i className="bi bi-whatsapp me-1"></i> {copiedMessage ? 'Copied to Clipboard!' : 'Share on WhatsApp'}
          </button>
        </div>
      </div>

      {/* Bill Configuration & Group Selector Card */}
      <div className="card shadow-sm border-0 mb-4 bg-white">
        <div className="card-body p-3 p-md-4">
          <div className="row g-3 align-items-center">
            {/* Group Selector */}
            <div className="col-md-3">
              <label className="form-label fw-semibold small text-muted mb-1">SELECT FLAT / GROUP</label>
              <select
                className="form-select shadow-sm"
                value={activeGroupId}
                onChange={(e) => handleSelectGroup(Number(e.target.value))}
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Total Bill Input */}
            <div className="col-md-3">
              <label className="form-label fw-semibold small text-muted mb-1">TOTAL BILL AMOUNT (₹)</label>
              <div className="input-group shadow-sm">
                <span className="input-group-text bg-light fw-bold text-dark">₹</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  className="form-control fw-bold fs-6"
                  value={totalBillAmount}
                  onChange={(e) => setTotalBillAmount(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Total Units Input */}
            <div className="col-md-3">
              <label className="form-label fw-semibold small text-muted mb-1">TOTAL UNITS (kWh)</label>
              <div className="input-group shadow-sm">
                <input
                  type="number"
                  min="0"
                  className="form-control fw-bold fs-6"
                  value={totalUnits}
                  onChange={(e) => setTotalUnits(Number(e.target.value))}
                />
                <span className="input-group-text bg-light">kWh</span>
              </div>
            </div>

            {/* Billing Month */}
            <div className="col-md-3">
              <label className="form-label fw-semibold small text-muted mb-1">BILLING CYCLE</label>
              <input
                type="month"
                className="form-control shadow-sm"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
              />
            </div>
          </div>

          <hr className="my-3 text-muted opacity-25" />

          {/* Split Method Toggle Buttons */}
          <div>
            <label className="form-label fw-semibold small text-muted mb-2">FAIR SPLIT METHOD:</label>
            <div className="btn-group w-100 shadow-sm" role="group">
              <button
                type="button"
                className={`btn py-2 ${splitMethod === 'by_room' ? 'btn-primary fw-bold text-white' : 'btn-outline-secondary'}`}
                onClick={() => setSplitMethod('by_room')}
              >
                <i className="bi bi-fan me-1"></i> By Room Appliances (AC vs Non-AC)
              </button>
              <button
                type="button"
                className={`btn py-2 ${splitMethod === 'measured' ? 'btn-primary fw-bold text-white' : 'btn-outline-secondary'}`}
                onClick={() => setSplitMethod('measured')}
              >
                <i className="bi bi-speedometer2 me-1"></i> By Measured Sub-Meter Units
              </button>
              <button
                type="button"
                className={`btn py-2 ${splitMethod === 'equal' ? 'btn-primary fw-bold text-white' : 'btn-outline-secondary'}`}
                onClick={() => setSplitMethod('equal')}
              >
                <i className="bi bi-pie-chart me-1"></i> Equal Division (1 / N)
              </button>
            </div>
            <small className="text-muted d-block mt-2">
              {splitMethod === 'by_room' && (
                <span>
                  <i className="bi bi-info-circle me-1 text-primary"></i> <strong>Room Appliance Model:</strong> Common utilities (refrigerator, kitchen, lights, Wi-Fi) are split equally (30%), while high-power private room AC usage is billed directly to the AC room occupant (70%).
                </span>
              )}
              {splitMethod === 'measured' && (
                <span>
                  <i className="bi bi-info-circle me-1 text-primary"></i> <strong>Sub-Meter Ingestion:</strong> Fixed utility connection charges (₹128/mo) are split equally among all flatmates, while variable energy slab charges are proportional to each room's measured kWh.
                </span>
              )}
              {splitMethod === 'equal' && (
                <span>
                  <i className="bi bi-info-circle me-1 text-primary"></i> <strong>Flat Equal Split:</strong> Entire bill divided equally across all flatmates regardless of individual appliance usage.
                </span>
              )}
            </small>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Table & Form, Right = Charts */}
      <div className="row g-4">
        {/* Left Column: Members Breakdown & Add Member Form */}
        <div className="col-lg-7">
          {/* Results Table Card */}
          <div className="card shadow-sm border-0 mb-4 bg-white">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0 text-dark">
                <i className="bi bi-table text-primary me-2"></i> Calculated Share Breakdown
              </h5>
              <span className="badge bg-primary-subtle text-primary fw-bold">
                {members.length} Flatmates
              </span>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-muted text-uppercase">
                  <tr>
                    <th>Member &amp; Room</th>
                    <th>Appliances</th>
                    <th className="text-center">Share %</th>
                    <th className="text-center">Units</th>
                    <th className="text-end">Payable (₹)</th>
                    <th className="text-center">Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedMembers.map((m, idx) => (
                    <tr key={m.id}>
                      <td>
                        <div className="fw-bold text-dark">{m.name}</div>
                        <div className="small text-muted">{m.room_name}</div>
                      </td>
                      <td>
                        {m.has_ac ? (
                          <span className="badge bg-warning-subtle text-warning border border-warning-subtle small">
                            <i className="bi bi-snow me-1"></i> AC Room
                          </span>
                        ) : (
                          <span className="badge bg-light text-muted border small">
                            <i className="bi bi-fan me-1"></i> Fan Only
                          </span>
                        )}
                        {splitMethod === 'measured' && (
                          <div className="small text-muted mt-1">
                            Sub-meter: <strong>{m.measured_units} kWh</strong>
                          </div>
                        )}
                      </td>
                      <td className="text-center fw-bold text-primary">
                        {m.sharePct}%
                      </td>
                      <td className="text-center small text-muted">
                        {m.allocatedKwh} kWh
                      </td>
                      <td className="text-end">
                        <span className="fs-6 fw-bold text-dark">
                          ₹{Number(m.amount).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className={`btn btn-sm rounded-pill py-0 px-2 small ${
                            m.status === 'paid' ? 'btn-success text-white' : 'btn-outline-warning text-dark'
                          }`}
                          onClick={() => toggleMemberStatus(m.id)}
                        >
                          {m.status === 'paid' ? 'Paid ✓' : 'Pending'}
                        </button>
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-danger p-0"
                          title="Remove member"
                          onClick={() => handleDeleteMember(m.id)}
                        >
                          <i className="bi bi-x-circle"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="table-light fw-bold">
                  <tr>
                    <td colSpan="2">TOTAL BILL</td>
                    <td className="text-center text-primary">100.0%</td>
                    <td className="text-center">{totalUnits} kWh</td>
                    <td className="text-end text-success fs-5">
                      ₹{Number(totalBillAmount).toLocaleString('en-IN')}
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Add Member Card */}
          <div className="card shadow-sm border-0 bg-white">
            <div className="card-header bg-white py-3">
              <h6 className="fw-bold mb-0 text-dark">
                <i className="bi bi-person-plus-fill text-primary me-2"></i> Add Flatmate to Split Group
              </h6>
            </div>
            <div className="card-body p-3 p-md-4">
              <form onSubmit={handleAddMember}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">MEMBER NAME</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Vicky Kaushal"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">ROOM ASSIGNMENT</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Master Bed / Room 4"
                      value={newMemberRoom}
                      onChange={(e) => setNewMemberRoom(e.target.value)}
                    />
                  </div>

                  <div className="col-md-6">
                    <div className="form-check form-switch mt-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="hasAcCheck"
                        checked={newMemberHasAc}
                        onChange={(e) => setNewMemberHasAc(e.target.checked)}
                      />
                      <label className="form-check-label fw-bold text-dark small" htmlFor="hasAcCheck">
                        Has Dedicated AC Unit in Room
                      </label>
                    </div>
                    <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                      AC rooms are weighted higher in room usage model
                    </small>
                  </div>

                  {splitMethod === 'measured' && (
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">MEASURED SUB-METER UNITS (kWh)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={newMemberUnits}
                        onChange={(e) => setNewMemberUnits(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="col-12 text-end mt-3">
                    <button type="submit" className="btn btn-outline-primary rounded-pill px-4">
                      <i className="bi bi-plus-lg me-1"></i> Add to Group
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Visualizations */}
        <div className="col-lg-5">
          {/* Donut Chart: Bill Share Breakdown */}
          <div className="card shadow-sm border-0 mb-4 bg-white">
            <div className="card-header bg-white py-3">
              <h6 className="fw-bold mb-0 text-dark">
                <i className="bi bi-pie-chart-fill text-primary me-2"></i> Bill Share Proportion
              </h6>
            </div>
            <div className="card-body p-3 text-center">
              {(() => {
                const total = chartData.reduce((acc, d) => acc + (d.amount || 0), 0) || 1;
                const radius = 55;
                const circumference = 2 * Math.PI * radius;
                let offset = 0;
                return (
                  <div className="d-flex flex-column align-items-center">
                    <svg width="200" height="200" viewBox="0 0 160 160" className="mb-3">
                      <circle cx="80" cy="80" r={radius} fill="none" stroke="#e9ecef" strokeWidth="24" />
                      {chartData.map((d, i) => {
                        const pct = (d.amount || 0) / total;
                        const dashArray = `${pct * circumference} ${circumference}`;
                        const currentOffset = -offset;
                        offset += pct * circumference;
                        return (
                          <circle
                            key={i}
                            cx="80"
                            cy="80"
                            r={radius}
                            fill="none"
                            stroke={COLORS[i % COLORS.length]}
                            strokeWidth="24"
                            strokeDasharray={dashArray}
                            strokeDashoffset={currentOffset}
                            transform="rotate(-90 80 80)"
                          />
                        );
                      })}
                      <text x="80" y="77" textAnchor="middle" className="fw-bold" fontSize="16" fill="#212529">
                        ₹{Math.round(total)}
                      </text>
                      <text x="80" y="93" textAnchor="middle" fontSize="9" fill="#6c757d" letterSpacing="1">
                        TOTAL BILL
                      </text>
                    </svg>
                    <div className="w-100 d-flex flex-wrap justify-content-center gap-2 small">
                      {chartData.map((d, i) => (
                        <div key={i} className="d-flex align-items-center gap-1 px-2 py-1 bg-light rounded border">
                          <span className="rounded-circle d-inline-block" style={{ width: 10, height: 10, backgroundColor: COLORS[i % COLORS.length] }}></span>
                          <span className="fw-semibold">{d.name.split(' ')[0]}:</span>
                          <span className="text-muted">₹{d.amount} ({total > 0 ? Math.round((d.amount / total) * 100) : 0}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <small className="text-muted d-block mt-3">
                Visualizing ₹ payable per flatmate based on <strong>{splitMethod.replace('_', ' ').toUpperCase()}</strong>
              </small>
            </div>
          </div>

          {/* Bar Chart: Energy Consumption Allocation (kWh) */}
          <div className="card shadow-sm border-0 bg-white">
            <div className="card-header bg-white py-3">
              <h6 className="fw-bold mb-0 text-dark">
                <i className="bi bi-bar-chart-fill text-primary me-2"></i> Allocated Consumption (kWh)
              </h6>
            </div>
            <div className="card-body p-3">
              {(() => {
                const maxKwh = Math.max(...chartData.map(d => d.kwh || 0), 10);
                return (
                  <div className="p-2">
                    {chartData.map((d, i) => {
                      const pct = Math.min(100, Math.round(((d.kwh || 0) / maxKwh) * 100));
                      return (
                        <div key={i} className="mb-3">
                          <div className="d-flex justify-content-between small fw-semibold mb-1">
                            <span>{d.name} ({d.room})</span>
                            <span className="text-primary fw-bold">{d.kwh} kWh</span>
                          </div>
                          <div className="progress" style={{ height: 12 }}>
                            <div
                              className="progress-bar rounded"
                              role="progressbar"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: COLORS[i % COLORS.length]
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              <small className="text-muted text-center d-block mt-2">
                Estimated electrical energy share per room
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE NEW GROUP MODAL */}
      {showNewGroupModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <form onSubmit={handleCreateGroup}>
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-building-add me-2"></i> Create Flatmate Group
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowNewGroupModal(false)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark">Group / Flat Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Pune Techies Flat 204"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      required
                    />
                  </div>
                  <p className="small text-muted mb-0">
                    A fresh split group will be created with default members that you can customize.
                  </p>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-pill"
                    onClick={() => setShowNewGroupModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4">
                    Create Group
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
