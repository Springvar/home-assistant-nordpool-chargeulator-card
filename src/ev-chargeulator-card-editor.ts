import { LitElement, html, css, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { EvChargeulatorCardConfig } from './ev-chargeulator-card';
import styleString from './ev-chargeulator-card.css?raw';

export class EvChargeulatorCardEditor extends LitElement {
    @property({ attribute: false }) public hass: any;
    @state() private _config: EvChargeulatorCardConfig = {
        price_entity: '',
        soc_entity: '',
        battery_size_kwh: 60,
        energy_in_value: 7.5,
        energy_in_unit: 'kW',
        energy_out_value: undefined,
        energy_out_unit: undefined,
        target_soc: 80,
        max_charge_slots: 3,
        title: 'Chargeulator',
        show_header: true,
        show_plan_header: true,
        show_summary: true,
        plan_header_text: 'Charge plan:',
        plan_template: `<ul>\n%repeat.start%\n<li>%from%-%to% %energy% kWh %cost%</li>\n%repeat.end%\n</ul>`
    };

    setConfig(config: EvChargeulatorCardConfig) {
        this._config = { ...config };
        this.requestUpdate();
    }

    render() {
        if (!this.hass) return html``;
        const priceEntities = Object.entries(this.hass.states)
            .filter(([_eid, state]) => (state as any)?.attributes?.device_class === 'monetary')
            .map(([eid]) => eid)
            .sort((a, b) => {
                const aIsNordpool = a.toLowerCase().includes('nordpool');
                const bIsNordpool = b.toLowerCase().includes('nordpool');
                if (aIsNordpool && !bIsNordpool) return -1;
                if (!aIsNordpool && bIsNordpool) return 1;
                return a.localeCompare(b);
            });
        const socEntities = Object.entries(this.hass.states)
            .filter(([_eid, state]) => (state as any)?.attributes?.device_class === 'battery' && !isNaN(Number((state as any).state)))
            .map(([eid]) => eid)
            .sort((a, b) => {
                function socScore(entityId: string): number {
                    const lower = entityId.toLowerCase();
                    if (lower.includes('vehicle') || lower.includes('car')) return 1;
                    if (lower.startsWith('ev_') || lower.endsWith('_ev') || lower.startsWith('ev-') || lower.endsWith('-ev')) return 2;
                    if (lower.includes('range')) return 3;
                    if (lower.includes('battery') || lower.includes('charge') || lower.includes('percentage')) return 4;
                    return 5;
                }
                const scoreA = socScore(a);
                const scoreB = socScore(b);
                if (scoreA !== scoreB) return scoreA - scoreB;
                return a.localeCompare(b);
            });
        return html`
            <div class="editor-form-row">
                <label class="editor-label">Card title:</label>
                <div class="minor-label-group">
                    <input type="checkbox" class="editor-checkbox" .checked=${this._config.show_header ?? true} @change=${this._showHeaderChanged} />
                    <label class="inline-minor-label">(show)</label>
                </div>
                <input type="text" class="editor-field" .value=${this._config.title ?? 'Chargeulator'} @input=${this._titleChanged} />
            </div>
            <div class="editor-form-row">
                <label class="editor-label">Plan header:</label>
                <div class="minor-label-group">
                    <input type="checkbox" class="editor-checkbox" .checked=${this._config.show_plan_header ?? true} @change=${this._showPlanHeaderChanged} />
                    <label class="inline-minor-label">(show)</label>
                </div>
                <input type="text" class="editor-field" .value=${this._config.plan_header_text ?? 'Charge plan:'} @input=${this._planHeaderTextChanged} />
            </div>
            <div class="editor-form-row">
                <label class="editor-label">Nordpool price sensor:</label>
                <select class="editor-field" @change=${this._priceEntityChanged} .value=${this._config.price_entity}>
                    <option value="">Select entity...</option>
                    ${priceEntities.map((eid) => html`<option value=${eid}>${eid}</option>`)}
                </select>
            </div>
            <div class="editor-form-row">
                <label class="editor-label">Battery level sensor:</label>
                <select class="editor-field" @change=${this._socEntityChanged} .value=${this._config.soc_entity}>
                    <option value="">Select entity...</option>
                    ${socEntities.map((eid) => html`<option value=${eid}>${eid}</option>`)}
                </select>
            </div>
            <div class="editor-form-row">
                <label class="editor-label">Battery size (kWh):</label>
                <input type="number" class="editor-field" min="1" step="1" .value=${this._config.battery_size_kwh} @input=${this._batterySizeChanged} />
            </div>
            <div class="editor-form-row">
                <label class="editor-label">Energy in (what you pay for):</label>
                <input type="number" class="editor-field" min="0.1" step="0.1" .value=${this._config.energy_in_value} @input=${this._energyInValueChanged} />
                <select class="editor-field" @change=${this._energyInUnitChanged} .value=${this._config.energy_in_unit}>
                    <option value="kW">kW</option>
                    <option value="kWh">kWh</option>
                    <option value="Wh">Wh</option>
                </select>
            </div>
            <div class="editor-form-row">
                <label class="editor-label">Energy out (into battery, optional):</label>
                <input type="number" class="editor-field" min="0.1" step="0.1" .value=${this._config.energy_out_value ?? ''} @input=${this._energyOutValueChanged} />
                <select class="editor-field" @change=${this._energyOutUnitChanged} .value=${this._config.energy_out_unit ?? this._config.energy_in_unit}>
                    <option value="kW">kW</option>
                    <option value="kWh">kWh</option>
                    <option value="Wh">Wh</option>
                </select>
                <span class="editor-note">(defaults to Energy In)</span>
            </div>
            <div class="editor-form-row">
                <label class="editor-label">Target charge level (%):</label>
                <input type="number" class="editor-field" min="1" max="100" step="1" .value=${this._config.target_soc} @input=${this._targetSocChanged} />
            </div>
            <div class="editor-form-row">
                <label class="editor-label">Max charge slots:</label>
                <input type="number" class="editor-field" min="1" max="12" step="1" .value=${this._config.max_charge_slots ?? 3} @input=${this._maxChargeSlotsChanged} />
                <div class="editor-note">
                    <em> Sets the maximum number of chunks to split the charge plan into. Different cars/chargers may only support a limited number of scheduling periods. </em>
                </div>
            </div>
            <div class="editor-form-row">
                <label class="editor-label">Charge plan template:</label>
                <textarea class="editor-field" style="width:100%;min-height:80px;" @input=${this._planTemplateChanged}>
${this._config.plan_template ?? `<ul>%repeat.start%\n<li>%from%-%to% %energy%kWh %cost%</li>\n%repeat.end%\n</ul>`}
                </textarea
                >
                <div class="editor-note">
                    <strong>Available variables:</strong><br />
                    <code>%from%</code> — From (HH:MM or dd.mm HH:MM if next day)<br />
                    <code>%to%</code> — To (HH:MM or dd.mm HH:MM if next day)<br />
                    <code>%fromTime%</code> — From (HH:MM)<br />
                    <code>%toTime%</code> — To (HH:MM)<br />
                    <code>%energy%</code> — Est. energy usage<br />
                    <code>%cost%</code> — Est. cost<br />
                    <code>%charge%</code> — Est. charge level (at end of slot)
                </div>
            </div>
            <div class="editor-form-row">
                <label class="editor-label">Show Summary:</label>
                <input type="checkbox" class="editor-checkbox" .checked=${this._config.show_summary ?? true} @change=${this._showSummaryChanged} />
            </div>
        `;
    }

    _titleChanged(e: Event) {
        const value = (e.target as HTMLInputElement).value;
        this._config = { ...this._config, title: value };
        this._emitConfigChanged();
    }
    _priceEntityChanged(e: Event) {
        this._config = { ...this._config, price_entity: (e.target as HTMLSelectElement).value };
        this._emitConfigChanged();
    }
    _socEntityChanged(e: Event) {
        this._config = { ...this._config, soc_entity: (e.target as HTMLSelectElement).value };
        this._emitConfigChanged();
    }
    _batterySizeChanged(e: Event) {
        this._config = { ...this._config, battery_size_kwh: Number((e.target as HTMLInputElement).value) };
        this._emitConfigChanged();
    }
    _energyInValueChanged(e: Event) {
        const v = Number((e.target as HTMLInputElement).value);
        const autoOutValue = this._config.energy_out_value == null || this._config.energy_out_value === this._config.energy_in_value;
        this._config = { ...this._config, energy_in_value: v, ...(autoOutValue && { energy_out_value: v }) };
        this._emitConfigChanged();
    }
    _energyInUnitChanged(e: Event) {
        const v = (e.target as HTMLSelectElement).value;
        const autoOutUnit = !this._config.energy_out_unit || this._config.energy_out_unit === this._config.energy_in_unit;
        this._config = { ...this._config, energy_in_unit: v, ...(autoOutUnit && { energy_out_unit: v }) };
        this._emitConfigChanged();
    }
    _energyOutValueChanged(e: Event) {
        const val = (e.target as HTMLInputElement).value;
        this._config = { ...this._config, energy_out_value: val ? Number(val) : undefined };
        this._emitConfigChanged();
    }
    _energyOutUnitChanged(e: Event) {
        const val = (e.target as HTMLSelectElement).value;
        this._config = { ...this._config, energy_out_unit: val !== '' ? val : undefined };
        this._emitConfigChanged();
    }
    _targetSocChanged(e: Event) {
        this._config = { ...this._config, target_soc: Number((e.target as HTMLInputElement).value) };
        this._emitConfigChanged();
    }
    _showHeaderChanged(e: Event) {
        this._config = { ...this._config, show_header: (e.target as HTMLInputElement).checked };
        this._emitConfigChanged();
    }
    _showPlanHeaderChanged(e: Event) {
        this._config = { ...this._config, show_plan_header: (e.target as HTMLInputElement).checked };
        this._emitConfigChanged();
    }
    _planHeaderTextChanged(e: Event) {
        this._config = { ...this._config, plan_header_text: (e.target as HTMLInputElement).value };
        this._emitConfigChanged();
    }
    _planTemplateChanged(e: Event) {
        this._config = { ...this._config, plan_template: (e.target as HTMLTextAreaElement).value };
        this._emitConfigChanged();
    }
    _maxChargeSlotsChanged(e: Event) {
        const val = Number((e.target as HTMLInputElement).value);
        this._config = { ...this._config, max_charge_slots: val > 0 ? val : 3 };
        this._emitConfigChanged();
    }
    _showSummaryChanged(e: Event) {
        this._config = { ...this._config, show_summary: (e.target as HTMLInputElement).checked };
        this._emitConfigChanged();
    }
    _emitConfigChanged() {
        this.dispatchEvent(
            new CustomEvent('config-changed', {
                detail: { config: this._config },
                bubbles: true,
                composed: true
            })
        );
    }
    static styles = css`
        ${unsafeCSS(styleString)}
    `;
}
customElements.define('ev-chargeulator-card-editor', EvChargeulatorCardEditor);
