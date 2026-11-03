const BACKEND_URL = (import.meta.env && import.meta.env.VITE_API_URL) ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';
const API_BASE = `${BACKEND_URL}/api/v1`;

export async function fetchTariffInfo() {
  const res = await fetch(`${API_BASE}/tariffs/msedcl`);
  return res.json();
}

export async function fetchHouseholdData(id = 1) {
  const res = await fetch(`${API_BASE}/households/${id}`);
  return res.json();
}

export async function fetchReadings(source = 'demo') {
  const res = await fetch(`${API_BASE}/readings?source=${source}`);
  return res.json();
}

export async function postDailyReading(date, units) {
  const res = await fetch(`${API_BASE}/readings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reading_date: date, daily_units: units })
  });
  return res.json();
}

export async function runSimulation(householdId = 1, params = {}) {
  const res = await fetch(`${API_BASE}/simulation/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ householdId, ...params })
  });
  return res.json();
}

export async function auditRealBill(units, amount, billMonth = '2024-09', householdId = 1) {
  const res = await fetch(`${API_BASE}/bills/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ units, amount, billMonth, householdId })
  });
  return res.json();
}

export async function runWhatIf(householdId = 1, scenario = {}, options = {}) {
  const res = await fetch(`${API_BASE}/whatif/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ householdId, scenario, options })
  });
  return res.json();
}

export async function fetchRealityCheck(actualBill, guessedUsage, simulatedUsage) {
  const res = await fetch(`${API_BASE}/whatif/reality-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actualBill, guessedUsage, simulatedUsage })
  });
  return res.json();
}

export async function askCopilot(message, lang = 'en', householdId = 1) {
  const res = await fetch(`${API_BASE}/copilot/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, lang, householdId })
  });
  return res.json();
}

export async function fetchAdminStats() {
  const res = await fetch(`${API_BASE}/admin/stats`);
  return res.json();
}

export async function fetchDevices(householdId = 1) {
  const res = await fetch(`${API_BASE}/devices/${householdId}`);
  return res.json();
}

export async function registerDevice(data) {
  const res = await fetch(`${API_BASE}/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function deleteDevice(id) {
  const res = await fetch(`${API_BASE}/devices/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function fetchAlerts(householdId = 1) {
  const res = await fetch(`${API_BASE}/alerts/${householdId}`);
  return res.json();
}

export async function markAlertRead(id) {
  const res = await fetch(`${API_BASE}/alerts/${id}/read`, { method: 'PATCH' });
  return res.json();
}

export async function createAlert(data) {
  const res = await fetch(`${API_BASE}/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function fetchSplitGroups(householdId = 1) {
  const res = await fetch(`${API_BASE}/split/groups/${householdId}`);
  return res.json();
}

export async function createSplitGroup(data) {
  const res = await fetch(`${API_BASE}/split/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function calculateSplit(groupId) {
  const res = await fetch(`${API_BASE}/split/groups/${groupId}/calculate`);
  return res.json();
}

export async function createHousehold(data) {
  const res = await fetch(`${API_BASE}/households`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}
