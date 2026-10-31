const { calculateBill, auditBill, getSlabGauge } = require('../src/services/billEngine');

describe('⚡ WattWise Bill Engine: Golden Tests & Boundary Verification', () => {
  // 1. Boundary Condition: 0 Units Consumed
  test('0 units: Only fixed charge and statutory electricity duty applied', () => {
    const result = calculateBill(0);
    // Fixed charge = 128.00, Wheeling = 0, FAC = 0, Energy = 0
    // Taxable subtotal = 128.00. Duty 16% = 20.48. Total = 128 + 20.48 = 148.48 -> round to 148
    expect(result.energyCharges).toBe(0);
    expect(result.fixedCharges).toBe(128.00);
    expect(result.wheelingCharges).toBe(0);
    expect(result.facCharges).toBe(0);
    expect(result.taxableSubtotal).toBe(128.00);
    expect(result.dutyAmount).toBe(20.48);
    expect(result.totalBill).toBe(148);
  });

  // 2. Boundary Condition: Exactly 100 Units (Slab 1 Maximum)
  test('Exactly 100 units: Stays strictly within Slab 1 (₹4.41/unit)', () => {
    const result = calculateBill(100);
    // Energy: 100 * 4.41 = 441.00
    // Wheeling: 100 * 1.28 = 128.00
    // Fixed: 128.00
    // FAC: 100 * 0.35 = 35.00
    // Taxable subtotal = 441 + 128 + 128 + 35 = 732.00
    // Duty 16% = 117.12
    // Total = 732 + 117.12 = 849.12 -> round to 849
    expect(result.slabBreakdown[0].unitsInSlab).toBe(100);
    expect(result.slabBreakdown[1].unitsInSlab).toBe(0);
    expect(result.energyCharges).toBe(441.00);
    expect(result.wheelingCharges).toBe(128.00);
    expect(result.fixedCharges).toBe(128.00);
    expect(result.facCharges).toBe(35.00);
    expect(result.taxableSubtotal).toBe(732.00);
    expect(result.dutyAmount).toBe(117.12);
    expect(result.totalBill).toBe(849);
  });

  // 3. Boundary Condition: 101 Units (Crosses into Slab 2 by 1 unit)
  test('101 units: Exactly 100 in Slab 1 and 1 unit in Slab 2 (₹9.64/unit)', () => {
    const result = calculateBill(101);
    expect(result.slabBreakdown[0].unitsInSlab).toBe(100);
    expect(result.slabBreakdown[1].unitsInSlab).toBe(1);
    expect(result.slabBreakdown[1].amount).toBe(9.64);
    // Energy: 441.00 + 9.64 = 450.64
    expect(result.energyCharges).toBe(450.64);
  });

  // 4. Boundary Condition: Exactly 300 Units (Slab 2 Maximum)
  test('Exactly 300 units: 100 units in Slab 1, 200 units in Slab 2', () => {
    const result = calculateBill(300);
    expect(result.slabBreakdown[0].unitsInSlab).toBe(100);
    expect(result.slabBreakdown[1].unitsInSlab).toBe(200);
    expect(result.slabBreakdown[2].unitsInSlab).toBe(0);
    // Energy: (100 * 4.41) + (200 * 9.64) = 441 + 1928 = 2369.00
    expect(result.energyCharges).toBe(2369.00);
  });

  // 5. Golden Test 1: Real Summer Household Bill (342 units)
  test('Golden Bill 1 (May Summer AC Load - 342 units): Reproduces MSEDCL bill to the rupee', () => {
    const result = calculateBill(342);
    // Energy: 100*4.41 (441.00) + 200*9.64 (1928.00) + 42*13.61 (571.62) = 2940.62
    // Wheeling: 342 * 1.28 = 437.76
    // Fixed: 128.00
    // FAC: 342 * 0.35 = 119.70
    // Subtotal: 2940.62 + 437.76 + 128 + 119.70 = 3626.08
    // Duty 16%: 580.17
    // Total: 3626.08 + 580.17 = 4206.25 -> 4206
    expect(result.slabBreakdown[0].unitsInSlab).toBe(100);
    expect(result.slabBreakdown[1].unitsInSlab).toBe(200);
    expect(result.slabBreakdown[2].unitsInSlab).toBe(42);
    expect(result.energyCharges).toBe(2940.62);
    expect(result.totalBill).toBe(4206);
  });

  // 6. Golden Test 2: Monsoon Bill (240 units)
  test('Golden Bill 2 (June Monsoon - 240 units): Reproduces MSEDCL bill', () => {
    const result = calculateBill(240);
    // Energy: 100*4.41 (441) + 140*9.64 (1349.60) = 1790.60
    // Wheeling: 240 * 1.28 = 307.20
    // Fixed: 128.00
    // FAC: 240 * 0.35 = 84.00
    // Subtotal: 1790.60 + 307.20 + 128.00 + 84.00 = 2309.80
    // Duty 16%: 369.57
    // Total: 2309.80 + 369.57 = 2679.37 -> 2679
    expect(result.energyCharges).toBe(1790.60);
    expect(result.totalBill).toBe(2679);
  });

  // 7. Proration Test: Partial Billing Cycle (15 days)
  test('Proration: Fixed charge is proportionally scaled for 15-day cycle', () => {
    const fullCycle = calculateBill(100, null, 30);
    const halfCycle = calculateBill(100, null, 15);
    expect(fullCycle.fixedCharges).toBe(128.00);
    expect(halfCycle.fixedCharges).toBe(64.00);
  });

  // 8. Bill Auditor: Detects Genuine Correct Bills (No False Positives)
  test('Bill Auditor: Confirms valid bill with zero false discrepancy', () => {
    const audit = auditBill(240, 2679);
    expect(audit.isMismatch).toBe(false);
    expect(audit.difference).toBe(0);
    expect(audit.mismatchReason).toBeNull();
  });

  // 9. Bill Auditor: Flags Overcharged Discom Bills (Detects Injected Errors)
  test('Bill Auditor: Flags overcharged bill and explains the variance', () => {
    // True amount is ₹2679, Discom charged ₹3500
    const audit = auditBill(240, 3500);
    expect(audit.isMismatch).toBe(true);
    expect(audit.difference).toBe(821);
    expect(audit.mismatchReason).toContain('Overcharged by ₹821.00');
  });

  // 10. Slab Gauge
  test('Slab Gauge: Accurately identifies current slab and penalty multiplier for crossing', () => {
    const gauge = getSlabGauge(85);
    expect(gauge.currentSlab).toContain('0-100');
    expect(gauge.unitsRemainingInSlab).toBe(15.00);
    expect(gauge.penaltyMultiplier).toBe(2.18);
  });
});
