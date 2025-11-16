import { LitElement, html, css, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import styleString from './ev-chargeulator-card.css?raw';
import './ev-chargeulator-card-editor';
import type { EvChargeulatorCardEditor } from './ev-chargeulator-card-editor';
import { ChargeSlot, getOptimalChargePlan, PriceSlot } from './ev-charging-calc';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

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
    show_header?: boolean;
    show_plan_header?: boolean;
    show_summary?: boolean;
    plan_header_text?: string;
    plan_template?: string;
}

class EvChargeulatorCard extends LitElement {
    @property({ attribute: false }) hass: any;
    @property({ type: Object }) private _config!: EvChargeulatorCardConfig;

    private _timerId?: number;
    private _firstChargeSlotStart?: number;

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
            title: 'EV Chargeulator',
            show_header: true,
            show_plan_header: true,
            show_summary: true,
            plan_header_text: 'Charge plan:'
        };
    }

    connectedCallback() {
        super.connectedCallback();
        this._timerId = window.setInterval(() => {
            if (this._firstChargeSlotStart && Date.now() > this._firstChargeSlotStart) {
                this.requestUpdate();
            }
        }, 60000);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._timerId) {
            clearInterval(this._timerId);
            this._timerId = undefined;
        }
    }

    private _renderPlanTemplate(template: string, slots: ChargeSlot[]): string {
        const repeatStart = template.indexOf('%repeat.start%');
        const repeatEnd = template.indexOf('%repeat.end%');
        if (repeatStart === -1 || repeatEnd === -1 || repeatEnd < repeatStart) return template;
        const before = template.substring(0, repeatStart);
        const repeatBlock = template.substring(repeatStart + 14, repeatEnd);
        const after = template.substring(repeatEnd + 13);
        let rows = slots
            .map((cs) => {
                const startDate = new Date(cs.start);
                const endDate = new Date(cs.end);
                const fromDay = startDate.getDate().toString().padStart(2, '0');
                const fromMonth = (startDate.getMonth() + 1).toString().padStart(2, '0');
                const toDay = endDate.getDate().toString().padStart(2, '0');
                const toMonth = (endDate.getMonth() + 1).toString().padStart(2, '0');
                const fromTime = startDate.getHours().toString().padStart(2, '0') + ':' + startDate.getMinutes().toString().padStart(2, '0');
                const toTime = endDate.getHours().toString().padStart(2, '0') + ':' + endDate.getMinutes().toString().padStart(2, '0');
                const sameDay = fromDay === toDay && fromMonth === toMonth;
                const fromFull = sameDay ? fromTime : `${fromDay}.${fromMonth} ${fromTime}`;
                const toFull = sameDay ? toTime : `${toDay}.${toMonth} ${toTime}`;
                let row = repeatBlock
                    .replace(/%from%/g, fromFull)
                    .replace(/%to%/g, toFull)
                    .replace(/%fromTime%/g, fromTime)
                    .replace(/%toTime%/g, toTime)
                    .replace(/%energy%/g, cs.energy?.toFixed(2) ?? '')
                    .replace(/%cost%/g, cs.cost?.toFixed(2) ?? '')
                    .replace(/%charge%/g, cs.charge?.toFixed(0) ?? '');
                return row;
            })
            .join('');
        return before + rows + after;
    }

    render() {
        if (!this.hass || !this._config) {
            return html`<div>Not configured</div>`;
        }
        const {
            price_entity,
            soc_entity,
            battery_size_kwh,
            target_soc,
            title,
            energy_in_value,
            energy_in_unit,
            energy_out_value,
            energy_out_unit,
            show_header = true,
            show_plan_header = true,
            show_summary = true,
            plan_header_text = 'Charge plan:'
            // plan_template
        } = this._config;

        const priceSensor = this.hass.states?.[price_entity];
        const socSensor = this.hass.states?.[soc_entity];

        if (!priceSensor || !socSensor) {
            return html` <ha-card>
                <div class="wrapper with-header">
                    ${show_header
                        ? html`
                              <div id="header">
                                  <div id="header__title">
                                      <span>${title || 'EV Chargeulator'}</span>
                                  </div>
                              </div>
                          `
                        : null}
                    <div class="main-content">
                        <div style="color:red;">Missing sensor data!</div>
                    </div>
                </div>
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
        priceSlots = priceSlots.filter((slot) => slot.start > now);

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

        const planTemplate =
            this._config.plan_template ??
            `<ul>
%repeat.start%
<li>%from%-%to% %energy% kWh %cost%</li>
%repeat.end%
</ul>`;
        let totalEnergy = 0;
        let totalCost = 0;
        if (Array.isArray(plan.chargeSlots) && plan.chargeSlots.length > 0) {
            this._firstChargeSlotStart = plan.chargeSlots[0].start;
            totalEnergy = plan.chargeSlots.reduce((sum, cs) => sum + (cs.energy || 0), 0);
            totalCost = plan.chargeSlots.reduce((sum, cs) => sum + (cs.cost || 0), 0);
        } else {
            this._firstChargeSlotStart = undefined;
        }

        return html`
            <ha-card>
                <div class="wrapper with-header">
                    ${show_header
                        ? html`
                              <div id="header">
                                  <div id="header__title">
                                      <span>${title || 'EV Chargeulator'}</span>
                                  </div>
                              </div>
                          `
                        : null}
                    <div class="main-content">
                        ${show_plan_header ? html`<strong>${plan_header_text}</strong><br />` : null}
                        ${Array.isArray(plan.chargeSlots) && plan.chargeSlots.length > 0
                            ? unsafeHTML(this._renderPlanTemplate(planTemplate, plan.chargeSlots))
                            : html`<em>No charging needed</em>`}
                        ${show_summary && Array.isArray(plan.chargeSlots) && plan.chargeSlots.length > 0
                            ? html`
                                  <div style="margin-top:0.5em;">
                                      <strong>Total energy estimate:</strong> ${totalEnergy.toFixed(2)} kWh<br />
                                      <strong>Total cost estimate:</strong> ${totalCost.toFixed(2)}
                                  </div>
                              `
                            : null}
                    </div>
                </div>
            </ha-card>
        `;
    }

    static styles = css`
        ${unsafeCSS(styleString)}
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
