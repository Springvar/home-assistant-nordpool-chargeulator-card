import { EvChargeulatorCardConfig } from './ev-chargeulator-card';

export const DEFAULT_CONFIG: EvChargeulatorCardConfig = {
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
    over_section_slots: undefined,
    slider_color_low: '#424242',
    slider_color_target: '#1565c0',
    slider_color_high: '#ff6f00',
    slider_color_max: '#d32f2f',
    before_plan_template: '<ul>',
    plan_item_template: '<li>%from%-%to% %energy% kWh %cost% (%gridPricePerKwh%/kWh, %costPerPct%/% charge)</li>',
    after_plan_template: '</ul>',
    plan_summary_template: `
<div>
    <strong>Total energy estimate:</strong> %totalEnergy% kWh<br>
    <strong>Total cost estimate:</strong> %totalCost%<br>
    <strong>Average grid price per kWh:</strong> %avgGridPricePerKwh%<br>
    <strong>Average cost per % charged:</strong> %avgCostPerPct%
</div>`,
    complete_by: undefined,
    program_service: undefined
};
