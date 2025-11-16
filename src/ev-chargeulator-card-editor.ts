import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { EvChargeulatorCardConfig } from './ev-chargeulator-card';

export class EvChargeulatorCardEditor extends LitElement {
    @property({ attribute: false }) public hass: any;
    @state() private _config: EvChargeulatorCardConfig = {
        price_entity: '',
        soc_entity: '',
        battery_size_kwh: 60,
        energy_in_value: 7,
        energy_in_unit: 'kW',
        energy_out_value: undefined,
        energy_out_unit: undefined,
        target_soc: 90,
        title: 'EV Chargeulator'
    };

    setConfig(config: EvChargeulatorCardConfig) {
        this._config = { ...config };
        this.requestUpdate();
    }

    render() {
        if (!this.hass) return html``;
        const priceEntities = Object.keys(this.hass.states)
            .filter(([_eid, state]) => (state as any)?.attributes?.device_class === 'monetary' && !isNaN(Number((state as any).state)))
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
                    if (lower.includes('charge')) return 3;
                    return 4;
                }
                const scoreA = socScore(a);
                const scoreB = socScore(b);
                if (scoreA !== scoreB) return scoreA - scoreB;
                return a.localeCompare(b);
            });
        return html`
            <div>
                <label>Card Title:</label>
                <input type="text" .value=${this._config.title ?? 'EV Chargeulator'} @input=${this._titleChanged} />
            </div>
            <div>
                <label>Nordpool Price Sensor:</label>
                <select @change=${this._priceEntityChanged} .value=${this._config.price_entity}>
                    <option value="">Select entity...</option>
                    ${priceEntities.map((eid) => html`<option value=${eid}>${eid}</option>`)}
                </select>
            </div>
            <div>
                <label>Battery Size (kWh):</label>
                <input type="number" min="1" step="1" .value=${this._config.battery_size_kwh} @input=${this._batterySizeChanged} />
            </div>
            <div>
                <label>Energy In (what you pay for):</label>
                <input type="number" min="0.1" step="0.1" .value=${this._config.energy_in_value} @input=${this._energyInValueChanged} />
                <select @change=${this._energyInUnitChanged} .value=${this._config.energy_in_unit}>
                    <option value="kW">kW</option>
                    <option value="kWh">kWh</option>
                    <option value="Wh">Wh</option>
                </select>
            </div>
            <div>
                <label>Energy Out (into battery, optional):</label>
                <input type="number" min="0.1" step="0.1" .value=${this._config.energy_out_value ?? ''} @input=${this._energyOutValueChanged} />
                <select @change=${this._energyOutUnitChanged} .value=${this._config.energy_out_unit ?? this._config.energy_in_unit}>
                    <option value="kW">kW</option>
                    <option value="kWh">kWh</option>
                    <option value="Wh">Wh</option>
                </select>
                <span style="color: #888">(defaults to Energy In)</span>
            </div>
            <div>
                <label>Charging SOC Sensor:</label>
                <select @change=${this._socEntityChanged} .value=${this._config.soc_entity}>
                    <option value="">Select entity...</option>
                    ${socEntities.map((eid) => html`<option value=${eid}>${eid}</option>`)}
                </select>
            </div>
            <div>
                <label>Target SOC (%):</label>
                <input type="number" min="1" max="100" step="1" .value=${this._config.target_soc} @input=${this._targetSocChanged} />
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
        div {
            margin-bottom: 1em;
        }
        label {
            display: inline-block;
            min-width: 170px;
            margin-right: 0.5em;
        }
        input,
        select {
            margin-bottom: 4px;
        }
    `;
}

customElements.define('ev-chargeulator-card-editor', EvChargeulatorCardEditor);
