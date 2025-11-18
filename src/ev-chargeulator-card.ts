import { LitElement, html, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import styleString from './ev-chargeulator-card.css?raw';
import './ev-chargeulator-card-editor';
import type { EvChargeulatorCardEditor } from './ev-chargeulator-card-editor';
import { ChargeSlot, getOptimalChargePlan, PriceSlot } from './ev-charging-calc';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

export interface EvChargeulatorCardConfig {
    show_header?: boolean;
    title?: string;
    show_plan_header?: boolean;
    plan_header_text?: string;
    show_summary?: boolean;
    show_charge_slider?: boolean;
    price_entity: string;
    soc_entity: string;
    battery_size_kwh: number;
    energy_in_value: number;
    energy_in_unit: string;
    energy_out_value?: number;
    energy_out_unit?: string;
    target_soc: number;
    max_charge_slots?: number;
    over_section_slots?: number;
    before_plan_template?: string;
    plan_item_template?: string;
    after_plan_template?: string;
    plan_summary_template?: string;
    complete_by?: string;
}

export class EvChargeulatorCard extends LitElement {
    public static DEFAULT_CONFIG: EvChargeulatorCardConfig = {
        show_header: true,
        title: 'Chargeulator',
        show_plan_header: true,
        plan_header_text: 'Charge plan:',
        show_summary: true,
        show_charge_slider: true,
        price_entity: '',
        soc_entity: '',
        battery_size_kwh: 60,
        energy_in_value: 7.5,
        energy_in_unit: 'kW',
        energy_out_value: undefined,
        energy_out_unit: undefined,
        target_soc: 80,
        max_charge_slots: 3,
        over_section_slots: 20,
        before_plan_template: '<ul>',
        plan_item_template: '<li>%from%-%to% %energy% kWh %cost% (%costPrKwH%/kWh, %costPerPct%/% charge)</li>',
        after_plan_template: '</ul>',
        plan_summary_template: `
<div>
    <strong>Total energy estimate:</strong> %totalEnergy% kWh<br>
    <strong>Total cost estimate:</strong> %totalCost%<br>
    <strong>Average cost per kWh:</strong> %avgCostPrKwH%<br>
    <strong>Average cost per % charged:</strong> %avgCostPerPct%
</div>`,
        complete_by: undefined
    };

    @property({ attribute: false }) hass: any;
    @property({ type: Object }) private config!: EvChargeulatorCardConfig;
    @property({ type: Number }) private _sliderTargetSoc?: number;

    private _timerId?: number;
    private _firstChargeSlotStart?: number;

    setConfig(config: EvChargeulatorCardConfig) {
        this.config = { ...EvChargeulatorCard.DEFAULT_CONFIG, ...config };
        this._sliderTargetSoc = this.config.target_soc;
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
        return { ...EvChargeulatorCard.DEFAULT_CONFIG, price_entity, soc_entity };
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

    private renderTemplate(template: string, templateValues: Record<string, string>): string {
        let out = template;
        Object.entries(templateValues).forEach(([key, value]) => {
            const re = new RegExp(`%${key}%`, 'g');
            out = out.replace(re, value);
        });
        return out;
    }

    private calculateTemplateValues(
        slot: ChargeSlot | null,
        {
            batterySizeKwh,
            totalEnergyKwh,
            totalCost,
            chargeSlotIndex,
            slots
        }: {
            batterySizeKwh: number;
            totalEnergyKwh: number;
            totalCost: number;
            chargeSlotIndex?: number;
            slots?: ChargeSlot[];
        }
    ): Record<string, string> {
        const values: Record<string, string> = {};
        if (slot) {
            const startDate = new Date(slot.start);
            const endDate = new Date(slot.end);
            const fromDay = startDate.getDate().toString().padStart(2, '0');
            const fromMonth = (startDate.getMonth() + 1).toString().padStart(2, '0');
            const toDay = endDate.getDate().toString().padStart(2, '0');
            const toMonth = (endDate.getMonth() + 1).toString().padStart(2, '0');
            const fromTime = startDate.getHours().toString().padStart(2, '0') + ':' + startDate.getMinutes().toString().padStart(2, '0');
            const toTime = endDate.getHours().toString().padStart(2, '0') + ':' + endDate.getMinutes().toString().padStart(2, '0');
            const sameDay = fromDay === toDay && fromMonth === toMonth;
            const fromFull = sameDay ? fromTime : `${fromDay}.${fromMonth} ${fromTime}`;
            const toFull = sameDay ? toTime : `${toDay}.${toMonth} ${toTime}`;
            const deltaChargePct = slot.energy && batterySizeKwh ? (slot.energy / batterySizeKwh) * 100 : 0;
            const costPerPct = deltaChargePct > 0 && slot.cost !== undefined ? slot.cost / deltaChargePct : 0;
            values['from'] = fromFull;
            values['to'] = toFull;
            values['fromTime'] = fromTime;
            values['toTime'] = toTime;
            values['energy'] = slot.energy?.toFixed(2) ?? '';
            values['cost'] = slot.cost?.toFixed(2) ?? '';
            values['charge'] = slot.charge?.toFixed(0) ?? '';
            values['chargeDelta'] = deltaChargePct.toFixed(1);
            values['costPrKwH'] = slot.energy ? ((slot.cost ?? 0) / slot.energy).toFixed(2) : '';
            values['costPerPct'] = costPerPct.toFixed(2);
            values['costPer10Pct'] = (10 * costPerPct).toFixed(2);
            if (chargeSlotIndex !== undefined) values['idx'] = (chargeSlotIndex + 1).toString();
        }
        values['totalEnergy'] = totalEnergyKwh.toFixed(2);
        values['totalCost'] = totalCost.toFixed(2);
        const totalCharge = totalEnergyKwh / batterySizeKwh;
        values['avgCostPrKwH'] = totalEnergyKwh ? (totalCost / totalEnergyKwh).toFixed(2) : '0';
        values['avgCostPerPct'] = totalCharge ? (totalCost / totalCharge).toFixed(2) : '0';
        return values;
    }

    private renderPlanItems(itemTemplate: string, slots: ChargeSlot[], batterySizeKwh: number, totalEnergyKwh: number, totalCost: number): string {
        return slots
            .map((slot, idx) => this.renderTemplate(itemTemplate, this.calculateTemplateValues(slot, { batterySizeKwh, totalEnergyKwh, totalCost, chargeSlotIndex: idx, slots })))
            .join('');
    }

    private getCompleteByTimestamp(complete_by?: string): number | undefined {
        if (!complete_by) return undefined;
        const now = new Date();
        const [hh, mm] = complete_by.split(':').map((n) => parseInt(n, 10));
        if (isNaN(hh) || isNaN(mm)) return undefined;
        const complete = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
        if (complete.getTime() < now.getTime()) complete.setDate(complete.getDate() + 1);
        return complete.getTime();
    }

    render() {
        const config = { ...EvChargeulatorCard.DEFAULT_CONFIG, ...this.config };
        if (!this.hass || !config) {
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
            plan_header_text = 'Charge plan:',
            max_charge_slots,
            over_section_slots,
            before_plan_template,
            plan_item_template,
            after_plan_template,
            plan_summary_template,
            show_charge_slider = true,
            complete_by
        } = config;

        const priceSensor = this.hass.states?.[price_entity];
        const socSensor = this.hass.states?.[soc_entity];

        if (!priceSensor || !socSensor) {
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
                            <div style="color:red;">Missing sensor data!</div>
                        </div>
                    </div>
                </ha-card>
            `;
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

        if (config.complete_by) {
            const [hour, minute] = config.complete_by.split(':').map(Number);
            const tmrw = new Date(now);
            tmrw.setDate(tmrw.getDate() + 1);
            tmrw.setHours(hour, minute ?? 0, 0, 0);
            const completeByMillis = tmrw.getTime();
            priceSlots = priceSlots.filter((slot) => slot.start < completeByMillis);
        }

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
        const useTargetSoc = show_charge_slider && this._sliderTargetSoc !== undefined ? this._sliderTargetSoc : Number(target_soc);

        let completeByTimestamp: number | undefined = this.getCompleteByTimestamp(complete_by);

        const plan = getOptimalChargePlan({
            currentSOC: currentSOC,
            targetSOC: useTargetSoc,
            batterySizeKWh: Number(battery_size_kwh),
            energy_in_per_slot: inKWh,
            energy_out_per_slot: outKWh,
            priceSlots,
            minimumPriceSlotsPerChargeSlot: 1,
            maximumChargeSlotsInPlan: max_charge_slots ?? 3,
            overSectionSlots: over_section_slots ?? 15,
            completeByTimestamp: completeByTimestamp
        });

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
                        ${show_charge_slider
                            ? html`
                                  <div style="margin-bottom:22px;">
                                      <label for="ev-target-slider"><strong>Target charge:</strong></label>
                                      <input
                                          id="ev-target-slider"
                                          type="range"
                                          min="${Math.max(currentSOC, 0)}"
                                          max="100"
                                          .value=${String(this._sliderTargetSoc ?? target_soc)}
                                          step="1"
                                          @input=${(e: Event) => {
                                              this._sliderTargetSoc = Number((e.target as HTMLInputElement).value);
                                              this.requestUpdate();
                                          }}
                                          style="width: 90%; margin: 12px 0;"
                                      />
                                      <div style="display:flex;justify-content:space-between;font-size:13px;color:#666;">
                                          <span>${Math.max(currentSOC, 0)}%</span>
                                          <span>${useTargetSoc}%</span>
                                          <span>100%</span>
                                      </div>
                                      <div style="position:relative; height:6px; margin-top: 2px;">
                                          <div
                                              style="position:absolute;left:${((target_soc - Math.max(currentSOC, 0)) / Math.max(1, 100 - Math.max(currentSOC, 0))) *
                                              100}%;width:2px;height:14px;background:#2196f3;margin-top:-4px;"
                                          ></div>
                                          <div
                                              style="position:absolute;left:${((useTargetSoc - Math.max(currentSOC, 0)) / Math.max(1, 100 - Math.max(currentSOC, 0))) *
                                              100}%;width:2px;height:18px;background:red;margin-top:-6px;"
                                          ></div>
                                      </div>
                                  </div>
                              `
                            : null}
                        ${show_plan_header ? html`<strong>${plan_header_text}</strong><br />` : null}
                        ${Array.isArray(plan.chargeSlots) && plan.chargeSlots.length > 0
                            ? unsafeHTML(
                                  (before_plan_template ?? '<ul>') +
                                      this.renderPlanItems(
                                          plan_item_template ?? '<li>%from%-%to% %energy% kWh %cost%</li>',
                                          plan.chargeSlots,
                                          Number(battery_size_kwh),
                                          totalEnergy,
                                          totalCost
                                      ) +
                                      (after_plan_template ?? '</ul>') +
                                      (show_summary && plan_summary_template
                                          ? this.renderTemplate(
                                                plan_summary_template,
                                                this.calculateTemplateValues(null, {
                                                    batterySizeKwh: Number(battery_size_kwh),
                                                    totalEnergyKwh: totalEnergy,
                                                    totalCost: totalCost
                                                })
                                            )
                                          : '')
                              )
                            : html`<em>No charging needed</em>`}
                        ${complete_by ? html`<div style="margin-top:10px;"><strong>Complete by:</strong> ${complete_by}</div>` : null}
                    </div>
                </div>
            </ha-card>
        `;
    }

    static styles = unsafeCSS(styleString);
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
