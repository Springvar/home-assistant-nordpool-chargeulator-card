import { describe, it, expect } from 'vitest';
import { getOptimalChargePlan, findCheapestChargeWindow, PriceSlot, findBestPlans } from './ev-charging-calc';

function createPriceSlots(...prices: number[]): PriceSlot[] {
    return prices.map((price, i) => ({
        start: i * 15 * 60,
        end: (i + 1) * 15 * 60,
        price
    }));
}

// NB: Index from 1
function getSlotTime(slotIndex: number): { start: number; end: number } {
    return {
        start: (slotIndex - 1) * 15 * 60,
        end: slotIndex * 15 * 60
    };
}

describe('getOptimalChargePlan', () => {
    const priceSlots = createPriceSlots(2, 2.5, 1.5, 3);

    it('calculates optimal plan for typical case', () => {
        const chargeRateKW = 7.4;
        const slot_kWh = chargeRateKW * 0.25;
        const result = getOptimalChargePlan({
            currentSOC: 75,
            targetSOC: 80,
            batterySizeKWh: 50,
            energy_in_per_slot: slot_kWh,
            energy_out_per_slot: slot_kWh,
            priceSlots,
            minimumPriceSlotsPerChargeSlot: 1,
            maximumChargeSlotsInPlan: 2
        });
        expect(result.totalEnergy).toBeGreaterThan(0);
        expect(result.totalCost).toBeGreaterThan(0);
        expect(result.chargeSlots.length).toBeGreaterThan(0);
    });

    it('returns empty plan for already full battery', () => {
        const result = getOptimalChargePlan({
            currentSOC: 100,
            targetSOC: 100,
            batterySizeKWh: 50,
            energy_in_per_slot: 1,
            energy_out_per_slot: 1,
            priceSlots
        });
        expect(result.totalEnergy).toBe(0);
        expect(result.chargeSlots.length).toBe(0);
    });

    it('returns the whole range as plan when slots are insufficient', () => {
        const chargeRateKW = 7.4;
        const slot_kWh = chargeRateKW * 0.25;
        const result = getOptimalChargePlan({
            currentSOC: 40,
            targetSOC: 80,
            batterySizeKWh: 50,
            energy_in_per_slot: slot_kWh,
            energy_out_per_slot: slot_kWh,
            priceSlots
        });
        expect(result.chargeSlots.length).toBe(1);
        expect(result.chargeSlots[0].start).toBe(0);
        expect(result.chargeSlots[0].end).toBe(getSlotTime(4).end);
        expect(result.totalEnergy).toBeCloseTo(4 * slot_kWh, 2);
    });

    it('finds the better plan split across two charge slots when possible', () => {
        const priceSlots2 = createPriceSlots(1.1, 1.2, 3.5, 1.4, 1.2, 1.1, 2.4);
        const chargeRateKW = 7.4;
        const slot_kWh = chargeRateKW * 0.25;
        const currentSOC = 20;
        const targetSOC = 34.8;
        const batterySizeKWh = 50;
        const minimumPriceSlotsPerChargeSlot = 1;
        const maximumChargeSlotsInPlan = 2;

        const result = getOptimalChargePlan({
            currentSOC,
            targetSOC,
            batterySizeKWh,
            energy_in_per_slot: slot_kWh,
            energy_out_per_slot: slot_kWh,
            priceSlots: priceSlots2,
            minimumPriceSlotsPerChargeSlot,
            maximumChargeSlotsInPlan
        });

        expect(result.chargeSlots.length).toBe(2);
        expect(result.chargeSlots[0].start).toBe(getSlotTime(1).start);
        expect(result.chargeSlots[0].end).toBe(getSlotTime(2).end);
        expect(result.chargeSlots[1].start).toBe(getSlotTime(5).start);
        expect(result.chargeSlots[1].end).toBe(getSlotTime(6).end);

        const expectedCost = (1.1 + 1.2) * slot_kWh + (1.2 + 1.1) * slot_kWh;
        expect(result.totalCost).toBeCloseTo(expectedCost, 2);
    });

    it('handles energy_in_per_slot > energy_out_per_slot (efficiency test)', () => {
        const chargeRateKW = 6;
        const energy_out = chargeRateKW * 0.25;
        const efficiency = 0.9;
        const energy_in = energy_out / efficiency;
        const result = getOptimalChargePlan({
            currentSOC: 0,
            targetSOC: 10,
            batterySizeKWh: 40,
            energy_in_per_slot: energy_in,
            energy_out_per_slot: energy_out,
            priceSlots: createPriceSlots(1, 1, 1, 1, 1),
        });

        expect(result.totalEnergy).toBeGreaterThan(0);
        expect(result.totalCost).toBeGreaterThan(0);
        expect(result.totalEnergy).toBeCloseTo(4.5, 0);
        expect(result.totalCost).toBeGreaterThan(result.totalEnergy);
    });
});
describe('findCheapestChargeWindow', () => {
    const slots = createPriceSlots(3, 1, 2, 5);
    it('finds the cheapest contiguous window of size 2', () => {
        const result = findCheapestChargeWindow(slots, 2, new Set(), 1);
        expect(result.length).toBe(2);
        expect(result[0].start).toBe(getSlotTime(2).start);
        expect(result[1].start).toBe(getSlotTime(3).start);
        expect(result.reduce((sum, s) => sum + s.price, 0)).toBe(3);
    });

    it('excludes specified indexes', () => {
        const result = findCheapestChargeWindow(slots, 2, new Set([1]), 1);
        expect(result[0].start).not.toBe(15);
    });
});

describe('findBestPlans', () => {
    const priceSlots = createPriceSlots(1.1, 1.2, 3.5, 1.3, 1.2, 1.1, 2.4);
    it('finds a better plan split across two charge slots', () => {
        const slotsToCharge = 4;
        const maxChargeSlots = 2;
        const minSlotsPerChargeSlot = 1;
        const energyPerSlot = 1;

        const plans = findBestPlans({
            slotsToCharge,
            maximumChargeSlotsInPlan: maxChargeSlots,
            minimumPriceSlotsPerChargeSlot: minSlotsPerChargeSlot,
            priceSlots,
            energyPerSlot
        });

        expect(plans.length).toBeGreaterThan(0);

        const costs = plans.map((p) => p.cost);
        const minCost = Math.min(...costs);

        const bestPlan = plans.find((p) => p.cost === minCost);
        expect(bestPlan?.slots.length).toBe(2);

        expect(bestPlan?.slots[0]?.[0].start).toBe(getSlotTime(1).start);
        expect(bestPlan?.slots[0]?.[1].end).toBe(getSlotTime(2).end);
        expect(bestPlan?.slots[1]?.[0].start).toBe(getSlotTime(5).start);
        expect(bestPlan?.slots[1]?.[1].end).toBe(getSlotTime(6).end);
    });

    it('finds a better plan split across two charge slots even if the cheapest range is at the end', () => {
        const priceSlots = createPriceSlots(1.5, 1.3, 1.2, 5.0, 1.3, 1.2, 1.1);
        const slotsToCharge = 4;
        const maxChargeSlots = 2;
        const minSlotsPerChargeSlot = 1;
        const energyPerSlot = 1;

        const plans = findBestPlans({
            slotsToCharge,
            maximumChargeSlotsInPlan: maxChargeSlots,
            minimumPriceSlotsPerChargeSlot: minSlotsPerChargeSlot,
            priceSlots,
            energyPerSlot
        });

        expect(plans.length).toBeGreaterThan(0);

        const costs = plans.map((p) => p.cost);
        const minCost = Math.min(...costs);

        const bestPlan = plans.find((p) => p.cost === minCost);
        expect(bestPlan?.slots.length).toBe(2);

        expect(bestPlan?.slots[0]?.[0].start).toBe(getSlotTime(2).start);
        expect(bestPlan?.slots[0]?.[1].end).toBe(getSlotTime(3).end);
        expect(bestPlan?.slots[1]?.[0].start).toBe(getSlotTime(6).start);
        expect(bestPlan?.slots[1]?.[1].end).toBe(getSlotTime(7).end);
    });

    it('finds one block when splits are not beneficial', () => {
        const evenSlots = createPriceSlots(2, 2, 2, 2);
        const plans = findBestPlans({
            slotsToCharge: 4,
            maximumChargeSlotsInPlan: 2,
            minimumPriceSlotsPerChargeSlot: 2,
            priceSlots: evenSlots,
            energyPerSlot: 1
        });
        expect(plans.length).toBeGreaterThan(0);
        expect(plans[0].cost).toBeCloseTo(8);
    });
});
