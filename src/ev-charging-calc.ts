import { formatTime } from './utils';

export type PriceSlot = { start: number; end: number; price: number };
export type ChargeSlot = {
    start: number;
    end: number;
    avgPrice: number;
    energy: number;
    cost: number;
    priceSlots: PriceSlot[];
    charge: number;
    chargeDelta: number;
};

export interface ChargePlanResult {
    chargeSlots: ChargeSlot[];
    totalEnergy: number;
    totalCost: number;
}

export function getOptimalChargePlan({
    currentSOC,
    targetSOC,
    batterySizeKWh,
    energy_in_per_slot,
    energy_out_per_slot,
        priceSlots,
    minimumPriceSlotsPerChargeSlot = 1,
    maximumChargeSlotsInPlan = 3
}: {
    currentSOC: number;
    targetSOC: number;
    batterySizeKWh: number;
    energy_in_per_slot: number;
    energy_out_per_slot: number;
    priceSlots: PriceSlot[];
    minimumPriceSlotsPerChargeSlot?: number;
    maximumChargeSlotsInPlan?: number;
}): ChargePlanResult {
    const energyNeededKWh = ((targetSOC - currentSOC) / 100) * batterySizeKWh;
    const slotDurationHours = 0.25;

    const slotsToCharge = Math.ceil(energyNeededKWh / energy_out_per_slot);

    if (energyNeededKWh <= 0) {
        return { chargeSlots: [], totalCost: 0, totalEnergy: 0 };
    }

    if (priceSlots.length < slotsToCharge) {
        const totalEnergyAvailable = priceSlots.length * energy_out_per_slot;
            let totalCost = 0;
        priceSlots.forEach((slot) => {
            totalCost += slot.price * energy_in_per_slot;
            });
        const chargeDelta = (totalEnergyAvailable / batterySizeKWh) * 100;
        const finalCharge = Math.round(currentSOC + chargeDelta);
        return {
            chargeSlots: [
                {
                    start: priceSlots[0].start,
                    end: priceSlots[priceSlots.length - 1].end,
                    energy: totalEnergyAvailable,
                    cost: totalCost,
                    priceSlots: priceSlots,
                    avgPrice: priceSlots.reduce((sum, s) => sum + s.price, 0) / priceSlots.length,
                    charge: finalCharge,
                    chargeDelta
        }
            ],
            totalEnergy: totalEnergyAvailable,
            totalCost
        };
    }

    let bestPlans = findBestPlans({
        slotsToCharge,
        maximumChargeSlotsInPlan,
        minimumPriceSlotsPerChargeSlot,
        priceSlots,
        energyPerSlot: energy_in_per_slot
    });

    bestPlans.sort((a, b) => a.cost - b.cost);
    let bestSlots: PriceSlot[][] = bestPlans.length ? bestPlans[0].slots : [];
    let chargeSlots: ChargeSlot[] = [];
    let totalCost = 0;
    let totalEnergy = 0;
    let socTracker = currentSOC;
    for (let i = 0; i < bestSlots.length; i++) {
        let window = bestSlots[i];
        let windowEnergy = window.length * energy_out_per_slot;
        let windowCost = 0;
        for (let j = 0; j < window.length; j++) {
            windowCost += window[j].price * energy_in_per_slot;
}
        totalEnergy += windowEnergy;
        totalCost += windowCost;
        let chargeDelta = (windowEnergy / batterySizeKWh) * 100;
        socTracker += chargeDelta;
        let charge = Math.round(socTracker);
        chargeSlots.push({
            start: window[0].start,
            end: window[window.length - 1].end,
            energy: windowEnergy,
            cost: windowCost,
            priceSlots: window,
            avgPrice: window.reduce((sum, slot) => sum + slot.price, 0) / window.length,
            charge,
            chargeDelta
        });
    }

    const energySurplus = totalEnergy - energyNeededKWh;
    const surplusMinutes = Math.floor((energySurplus / energy_out_per_slot) * slotDurationHours * 60);
    if (surplusMinutes > 5 && chargeSlots.length) {
        let maxPrice = -Infinity;
        let maxSlotIdx = -1;
        let isStartSlot = true;

        chargeSlots.forEach((slot, i) => {
            if (slot.priceSlots[0].price > maxPrice) {
                maxPrice = slot.priceSlots[0].price;
                maxSlotIdx = i;
                isStartSlot = true;
            }
            if (slot.priceSlots[slot.priceSlots.length - 1].price > maxPrice) {
                maxPrice = slot.priceSlots[slot.priceSlots.length - 1].price;
                maxSlotIdx = i;
                isStartSlot = false;
            }
        });

        if (maxSlotIdx !== -1) {
            const chargeSlot = chargeSlots[maxSlotIdx];
            const edgeSlot = isStartSlot ? chargeSlot.priceSlots[0] : chargeSlot.priceSlots[chargeSlot.priceSlots.length - 1];

            chargeSlot.energy -= energySurplus;
            chargeSlot.cost -= edgeSlot.price * energy_in_per_slot * (energySurplus / energy_out_per_slot);
            chargeSlot.chargeDelta = (chargeSlot.energy / batterySizeKWh) * 100;

            let baseSOC = maxSlotIdx === 0 ? currentSOC : chargeSlots[maxSlotIdx - 1].charge;
            chargeSlot.charge = Math.round(baseSOC + chargeSlot.chargeDelta);

            let tracker = chargeSlot.charge;
            for (let i = maxSlotIdx + 1; i < chargeSlots.length; i++) {
                chargeSlots[i].chargeDelta = (chargeSlots[i].energy / batterySizeKWh) * 100;
                tracker += chargeSlots[i].chargeDelta;
                chargeSlots[i].charge = Math.round(tracker);
        }

            const surplusMs = surplusMinutes * (60 * 1000);
            if (isStartSlot) {
                chargeSlot.start = chargeSlot.start + surplusMs;
            } else {
                chargeSlot.end = chargeSlot.end - surplusMs;
        }

            chargeSlots[maxSlotIdx] = chargeSlot;

            totalEnergy -= energySurplus;
            totalCost -= edgeSlot.price * energy_in_per_slot * (energySurplus / energy_out_per_slot);
        }
    }

    return { totalCost, totalEnergy, chargeSlots };
}

export function findBestPlans({
    slotsToCharge,
    maximumChargeSlotsInPlan,
    minimumPriceSlotsPerChargeSlot,
    priceSlots,
    energyPerSlot
}: {
    slotsToCharge: number;
    maximumChargeSlotsInPlan: number;
    minimumPriceSlotsPerChargeSlot: number;
    priceSlots: PriceSlot[];
    energyPerSlot: number;
}): { cost: number; slots: PriceSlot[][] }[] {
    let bestPlans: { cost: number; slots: PriceSlot[][] }[] = [];
    for (let splitCount = 1; splitCount <= Math.min(slotsToCharge, maximumChargeSlotsInPlan); splitCount++) {
        let blockSizes = Array(splitCount).fill(minimumPriceSlotsPerChargeSlot);
        let slotsLeft = slotsToCharge - minimumPriceSlotsPerChargeSlot * splitCount;
        let idx = 0;
        while (slotsLeft > 0) {
            blockSizes[idx % splitCount]++;
            slotsLeft--;
            idx++;
        }

        let usedIndexes = new Set<number>();
        let chargeWindows: PriceSlot[][] = [];
        let valid = true;
        for (let b = 0; b < blockSizes.length; b++) {
            let window = findCheapestChargeWindow(priceSlots, blockSizes[b], usedIndexes, energyPerSlot);
            if (!window.length || window.length !== blockSizes[b]) {
                valid = false;
                break;
            }
            const startIdx = priceSlots.indexOf(window[0]);
            for (let k = 0; k < window.length; k++) usedIndexes.add(startIdx + k);
            chargeWindows.push(window);
        }
        if (valid && chargeWindows.flat().length === slotsToCharge) {
            let totalCost = 0;
            chargeWindows.forEach((window) => {
                totalCost += window.reduce((sum, slot) => sum + slot.price * energyPerSlot, 0);
            });
            chargeWindows = chargeWindows.sort((a, b) => a[0].start - b[0].start);
            bestPlans.push({ cost: totalCost, slots: chargeWindows });
        }
    }
    return bestPlans;
}

export function findCheapestChargeWindow(
    slots: PriceSlot[],
    windowSize: number,
    excludeIndexes: Set<number> = new Set(),
    energyPerSlot: number
): PriceSlot[] {
    let minCost = Infinity;
    let bestWindow: PriceSlot[] = [];
    for (let start = 0; start <= slots.length - windowSize; start++) {
        let valid = true;
        for (let k = 0; k < windowSize; k++) {
            if (excludeIndexes.has(start + k)) {
                valid = false;
                break;
            }
            if (k > 0 && slots[start + k - 1].end !== slots[start + k].start) {
                valid = false;
                break;
            }
        }
        const chargeWindow = slots.slice(start, start + windowSize);
        const cost = chargeWindow.reduce((sum, s) => sum + s.price * energyPerSlot, 0);
        if (!valid) {
            continue;
        }
        if (cost < minCost) {
            minCost = cost;
            bestWindow = chargeWindow;
        }
    }
    return bestWindow;
}
