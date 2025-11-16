import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import './ev-chargeulator-card-editor';
import type { EvChargeulatorCardEditor } from './ev-chargeulator-card-editor';
import { getOptimalChargePlan, PriceSlot } from './ev-charging-calc';
import type { ChargeSlot } from './ev-charging-calc';
import { formatTime } from './utils';

export interface EvChargeulatorCardConfig {
    price_entity: string;
    soc_entity: string;
    battery_size_kwh: number;
    energy_in_value: number;
    energy_in_unit: string;
    energy_out_value?: number;
    energy_out_unit?: string;
    target_soc: number;
    title?: string;
}

class EvChargeulatorCard extends LitElement {
    @property({ attribute: false }) hass: any;
    @property({ type: Object }) private _config!: EvChargeulatorCardConfig;

    setConfig(config: EvChargeulatorCardConfig) {
        this._config = config;
    }

    static async getConfigElement(config: EvChargeulatorCardConfig) {
        const el = document.createElement('ev-chargeulator-card-editor') as EvChargeulatorCardEditor;
        el.setConfig(config);
        return el;
    }

    static getConfigElementStatic(config: EvChargeulatorCardConfig) {
        const el = document.createElement('ev-chargeulator-card-editor') as EvChargeulatorCardEditor;
        el.setConfig(config);
        return el;
    }

    static getStubConfig(hass: any) {
        const price_entity = Object.keys(hass.states).find((eid) => eid.startsWith('sensor.nordpool_')) || '';
        const soc_entity = Object.keys(hass.states).find((eid) => eid.toLowerCase().includes('state_of_charge') || eid.toLowerCase().includes('soc')) || '';
        return {
            price_entity,
            soc_entity,
            battery_size_kwh: 60,
            charge_rate_kw: 7,
            energy_in_value: 7,
            energy_in_unit: 'kW',
            energy_out_value: 6.6,
            energy_out_unit: 'kW',
            target_soc: 90,
            title: 'EV Chargeulator'
        };
    }

    render() {
        if (!this.hass || !this._config) {
            return html`<div>Not configured</div>`;
        }
    const { price_entity, soc_entity, battery_size_kwh, target_soc, title,
        energy_in_value, energy_in_unit, energy_out_value, energy_out_unit } = this._config;

        const priceSensor = this.hass.states?.[price_entity];
        const socSensor = this.hass.states?.[soc_entity];

        if (!priceSensor || !socSensor) {
            return html`<ha-card>
                <div class="card-header">${title || 'EV Chargeulator'}</div>
                <div style="color:red;">Missing sensor data!</div>
            </ha-card>`;
        }

        type SensorSlot = { start: string; end: string; value: number };
        const slots: SensorSlot[] = [...(priceSensor.attributes?.raw_today || []), ...(priceSensor.attributes?.raw_tomorrow || [])];

        let priceSlots: PriceSlot[] = [];
        if (Array.isArray(slots) && slots.length > 0) {
            slots.forEach((slot) => {
                if (slot && typeof slot.start !== 'undefined') {
                    let startStr = slot.start.replace(/['"]/g, '');
                    let endStr = slot.end.replace(/['"]/g, '');
                    if (startStr.length < 19 && endStr.length >= 19) {
                        startStr = startStr.substring(0, 10) + endStr.substring(10);
                    }
                    priceSlots.push({
                        start: new window.Date(startStr).getTime(),
                        end: new window.Date(endStr).getTime(),
                        price: slot.value
                    });
                } else {
                    console.warn('Slot object is undefined or missing "start" property', slot);
                }
            });
        } else {
            console.warn('No valid slots to render for charging plan');
        }

        const now = Date.now();
        priceSlots = priceSlots.filter((slot) => slot.end > now);

    let inVal = Number(energy_in_value);
    let outVal = energy_out_value != null ? Number(energy_out_value) : inVal;
    let inUnit = energy_in_unit || 'kW';
    let outUnit = energy_out_unit || inUnit;

    const slotLengthH = 0.25;
    function getKWh(val: number, unit: string): number {
        if (!unit || unit === 'kWh') return val;
        if (unit === 'kW') return val * slotLengthH;
        if (unit === 'Wh') return val / 1000;
        return val;
    }
    const inKWh = getKWh(inVal, inUnit);
    const outKWh = getKWh(outVal, outUnit);

        const currentSOC = Number(socSensor.state);
        const targetSOCNum = Number(target_soc);
        const plan = getOptimalChargePlan({
        currentSOC: currentSOC,
            targetSOC: targetSOCNum,
        batterySizeKWh: Number(battery_size_kwh),
        energy_in_per_slot: inKWh,
        energy_out_per_slot: outKWh,
            priceSlots,
            minimumPriceSlotsPerChargeSlot: 1,
            maximumChargeSlotsInPlan: 3
        });

        let chargeSlotsList = html``;
        let totalEnergy = 0;
        let totalCost = 0;

        if (Array.isArray(plan.chargeSlots) && plan.chargeSlots.length > 0) {
            totalEnergy = plan.chargeSlots.reduce((sum, cs) => sum + (cs.energy || 0), 0);
            totalCost = plan.chargeSlots.reduce((sum, cs) => sum + (cs.cost || 0), 0);

            chargeSlotsList = html`
                <ul>
                    ${plan.chargeSlots.map((cs: ChargeSlot) =>
                        cs && typeof cs.start !== 'undefined'
                            ? html`
                                  <li>
                                      ${formatTime(cs.start)}–${formatTime(cs.end)}, ${cs.energy.toFixed(2)} kWh, ${cs.cost.toFixed(2)}
                                  </li>
                              `
                            : html`<li><em>Missing slot data</em></li>`
                    )}
                </ul>
                <div style="margin-top:0.5em;">
                    <strong>Total Energy:</strong> ${totalEnergy.toFixed(2)} kWh<br />
                    <strong>Total Cost:</strong> ${totalCost.toFixed(2)}
                </div>
            `;
        } else {
            chargeSlotsList = html`<em>No charging needed</em>`;
        }
        return html`
            <ha-card>
                <div class="card-header">${title || 'EV Chargeulator'}</div>
                <div style="margin:1em 0;">
                    <strong>Recommended Charge Plan:</strong><br />
                    ${chargeSlotsList}
                </div>
            </ha-card>
        `;
    }
    static styles = css`
        ha-card {
            padding: 16px;
        }
        .card-header {
            font-weight: bold;
            font-size: 1.2em;
            margin-bottom: 10px;
        }
        div {
            margin: 8px 0;
        }
    `;
}

customElements.define('ev-chargeulator-card', EvChargeulatorCard);

if (typeof window !== 'undefined') {
    (window as any).customCards = (window as any).customCards || [];
    (window as any).customCards.push({
        type: 'ev-chargeulator-card',
        name: 'EV Chargeulator Card',
        preview: false,
        description: 'Plan optimal EV charging periods based on Nordpool prices.'
    });
}
