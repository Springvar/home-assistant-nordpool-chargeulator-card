# Nordpool Chargeulator Card

Custom Lovelace card for Home Assistant to visualize and optimize electric vehicle (EV) charging based on dynamic Nordpool electricity prices.

<!-- Add a preview image if desired -->
<!-- <img src="https://raw.githubusercontent.com/Springvar/home-assistant-nordpool-chargeulator-card/main/card.png" width="35%"> -->

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Configuration](#configuration)
    - [Basic Configuration](#basic-configuration)
    - [Advanced Configuration](#advanced-configuration)
        - [Templates](#template-configuration)
        - [Slider Colors](#slider-color-configuration)
        - [Complete By](#complete-by-configuration)
        - [Automation Trigger](#automation-trigger-configuration)
4. [Usage](#usage)
    - [Features](#features)
    - [Examples](#examples)
5. [Support](#support)

## Introduction

The **Nordpool Chargeulator Card** helps you optimize electric vehicle charging costs by calculating the cheapest charging windows based on dynamic electricity prices. It analyzes Nordpool price data, your vehicle’s battery parameters, and charging capabilities to create an optimal charging plan.

**Key Features:**
- **Optimal Charging Plan**: Automatically finds the cheapest time slots to charge your EV
- **Dynamic Pricing**: Works with Nordpool and other dynamic price sensors with 15-minute granularity
- **Charging Efficiency**: Accounts for charging losses (energy in vs. energy out)
- **Interactive Target**: Adjustable SOC slider to change target charge level on the fly
- **Time Constraints**: Set a "complete by" time to ensure charging finishes when needed
- **Cost Transparency**: Shows both grid prices and effective costs per kWh
- **Automation Integration**: Send charging plans to scripts/automations to program your EV charger
- **Customizable Templates**: Fully customizable display templates for charge plan and summary

## Installation

### Prerequisites

This card requires:
- **Home Assistant** 2022.0 or later
- **Price Sensor**: An entity with dynamic electricity pricing (e.g., Nordpool integration with `raw_today` and `raw_tomorrow` attributes)
- **SOC Sensor**: A sensor reporting your vehicle’s battery State of Charge (%)
- **EV Parameters**: Knowledge of your vehicle’s battery size and charging rate

### HACS (Recommended)

If you use [HACS](https://hacs.xyz/) to manage Home Assistant custom cards:

[![Install quickly via a HACS link](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Springvar&repository=home-assistant-nordpool-chargeulator-card&category=plugin)

1. Go to **HACS** → **Frontend**.
2. Add this repository: `https://github.com/Springvar/home-assistant-nordpool-chargeulator-card` as a [custom repository](https://hacs.xyz/docs/faq/custom_repositories/).
3. Download and install the card, then restart Home Assistant.

### Manual

1. **Download the Card**:
   - Download the latest release from the [GitHub repository](https://github.com/Springvar/home-assistant-nordpool-chargeulator-card/releases).

2. **Add to Home Assistant**:
   - Copy the file (`home-assistant-nordpool-chargeulator-card.js`) into your `www/chargeulator-card` directory under your Home Assistant config.

3. **Reference the Card in Lovelace Resources**:
   ```yaml
   resources:
     - url: /local/chargeulator-card/home-assistant-nordpool-chargeulator-card.js
       type: module
   ```

## Configuration

### Basic Configuration

Minimal configuration to get started:

```yaml
type: custom:ev-chargeulator-card
price_entity: sensor.nordpool_kwh_no3_nok_3_09_025
soc_entity: sensor.my_ev_battery
battery_size_kwh: 60
energy_in_value: 7.5
energy_in_unit: kW
target_soc: 80
```

| Name | Description | Default Value | Constraints |
| ---- | ----------- | ------------- | ----------- |
| `price_entity` | Entity ID for the Nordpool price sensor. Must have `raw_today` and `raw_tomorrow` attributes with 15-minute price data. | **Required** | Must be a valid sensor entity ID |
| `soc_entity` | Entity ID for the vehicle’s State of Charge (battery level) sensor. | **Required** | Must be a valid sensor entity ID with numeric state (0-100) |
| `battery_size_kwh` | Total battery capacity of your EV in kilowatt-hours. | `60` | Number > 0 |
| `energy_in_value` | Charging power consumed from the grid. This is what you pay for. | `7.5` | Number > 0 |
| `energy_in_unit` | Unit for energy_in_value | `kW` | Must be `kW`, `kWh`, or `Wh` |
| `energy_out_value` | Actual charging power delivered to the battery after losses. If not set, uses energy_in_value (100% efficiency). | `undefined` | Number > 0 or undefined |
| `energy_out_unit` | Unit for energy_out_value | Same as `energy_in_unit` | Must be `kW`, `kWh`, or `Wh` |
| `target_soc` | Target State of Charge percentage | `80` | Number 0-100 |
| `show_header` | Show card header with title | `true` | Boolean |
| `title` | Card title text | `Chargeulator` | String |
| `show_plan_header` | Show "Charge plan:" header before the plan list | `true` | Boolean |
| `plan_header_text` | Text for plan header | `Charge plan:` | String |
| `show_summary` | Show summary section with totals | `true` | Boolean |
| `show_charge_slider` | Show interactive SOC target slider | `true` | Boolean |
| `max_charge_slots` | Maximum number of separate charging windows in the plan | `3` | Number 1-10 |
| `over_section_slots` | Maximum splits to try when searching for optimal plan. Higher values explore more possibilities but take longer. | `7 × max_charge_slots` | Number >= max_charge_slots |
| `complete_by` | Time by which charging must be complete (HH:MM format, assumes tomorrow). Slots starting after this are excluded. | `undefined` | String in HH:MM format or undefined |

**Understanding Energy In vs. Energy Out:**
- `energy_in`: Power consumed from the grid (what appears on your electricity bill)
- `energy_out`: Power delivered to the battery after charging losses
- Example: A 7.5 kW charger with 85% efficiency would be:
  - `energy_in_value: 7.5` (grid consumption)
  - `energy_out_value: 6.375` (7.5 × 0.85, actual charging rate)
- If charging efficiency is unknown, omit `energy_out_value` to assume 100% efficiency

### Advanced Configuration

#### Template Configuration

Customize how charging slots and summaries are displayed using template variables.

```yaml
type: custom:ev-chargeulator-card
price_entity: sensor.nordpool_kwh
soc_entity: sensor.ev_battery
battery_size_kwh: 60
energy_in_value: 7.5
target_soc: 80
before_plan_template: ‘<ul style="color: var(--primary-text-color);">’
plan_item_template: ‘<li>%from%-%to% → %charge%% (kr%cost% - %gridPricePerKwh%/kWh - %costPerPct%/%)</li>’
after_plan_template: ‘</ul>’
plan_summary_template: |
  <div>
    <strong>Totalt:</strong> %totalEnergy% kWh<br>
    <strong>Kostnad:</strong> kr%totalCost%<br>
    <strong>Kost pr kWh:</strong> kr%avgGridPricePerKwh%
  </div>
```

| Name | Description | Default Value |
| ---- | ----------- | ------------- |
| `before_plan_template` | HTML/text before the charge plan list | `<ul>` |
| `plan_item_template` | Template for each charging slot (see variables below) | `<li>%from%-%to% %energy% kWh %cost% (%gridPricePerKwh%/kWh, %costPerPct%/% charge)</li>` |
| `after_plan_template` | HTML/text after the charge plan list | `</ul>` |
| `plan_summary_template` | Template for the summary section | See default templates in editor |

**Available Template Variables (per charging slot):**

| Variable | Description | Example |
| -------- | ----------- | ------- |
| `%from%` | Start time (HH:MM or dd.mm HH:MM if next day) | `12:30` or `04.04 12:30` |
| `%to%` | End time (HH:MM or dd.mm HH:MM if next day) | `14:00` or `04.04 14:00` |
| `%fromTime%` | Start time (HH:MM only) | `12:30` |
| `%toTime%` | End time (HH:MM only) | `14:00` |
| `%energy%` | Usable energy delivered to battery (kWh) | `16.00` |
| `%cost%` | Total cost for this slot | `26.07` |
| `%charge%` | Estimated SOC at end of slot (%) | `66` |
| `%chargeDelta%` | SOC increase during this slot (%) | `16.0` |
| `%gridPricePerKwh%` | **Grid price**: Cost per kWh consumed from grid | `1.38` |
| `%costPerUsableKwh%` | **Effective cost**: Cost per usable kWh in battery (accounts for losses) | `1.62` |
| `%costPerPct%` | Cost per percentage point of charge | `1.63` |
| `%costPer10Pct%` | Cost per 10 percentage points of charge | `16.30` |
| `%idx%` | Slot index (1-based) | `1` |

**Available Template Variables (summary):**

| Variable | Description | Example |
| -------- | ----------- | ------- |
| `%totalEnergy%` | Total usable energy (kWh) | `16.00` |
| `%totalCost%` | Total cost | `26.07` |
| `%avgGridPricePerKwh%` | Average grid price per kWh | `1.38` |
| `%avgCostPerUsableKwh%` | Average effective cost per usable kWh | `1.62` |
| `%avgCostPerPct%` | Average cost per percentage point | `1.63` |

**Grid Price vs. Effective Cost:**
- **Grid Price** (`gridPricePerKwh`): The actual electricity price you pay per kWh from the grid. This matches your Nordpool spot price.
- **Effective Cost** (`costPerUsableKwh`): Cost per kWh that ends up in your battery. Higher than grid price due to charging efficiency losses (e.g., if 85% efficient, a 1.38 kr/kWh grid price becomes 1.62 kr/kWh effective cost).

Most users want to see grid prices (the default), while expert users may want to show effective costs for total cost of ownership calculations.

#### Slider Color Configuration

Customize the SOC slider background colors:

```yaml
type: custom:ev-chargeulator-card
price_entity: sensor.nordpool_kwh
soc_entity: sensor.ev_battery
battery_size_kwh: 60
target_soc: 80
slider_color_low: ‘#424242’      # 0% to current SOC (gray)
slider_color_target: ‘#1565c0’   # Current SOC to target (blue)
slider_color_high: ‘#ff6f00’     # Target to ~90% (orange)
slider_color_max: ‘#d32f2f’      # ~90% to 100% (red)
```

| Name | Description | Default Value |
| ---- | ----------- | ------------- |
| `slider_color_low` | Color for 0% to current SOC range | `#424242` (gray) |
| `slider_color_target` | Color for current SOC to target range | `#1565c0` (blue) |
| `slider_color_high` | Color for target to ~90% range | `#ff6f00` (orange) |
| `slider_color_max` | Color for ~90% to 100% range | `#d32f2f` (red) |

Colors should be in hex format (`#RRGGBB`).

#### Complete By Configuration

Set a deadline for when charging must be complete. The card will only consider charging slots that start before this time. Interactive time controls allow adjusting the deadline in 15-minute intervals.

```yaml
type: custom:ev-chargeulator-card
price_entity: sensor.nordpool_kwh
soc_entity: sensor.ev_battery
battery_size_kwh: 60
target_soc: 80
complete_by: ‘07:45’  # Must be charged by 7:45 AM tomorrow
```

The time assumes **tomorrow** (next day) to avoid ambiguity. If you set `complete_by: ‘07:45’` at 11 PM today, it means 7:45 AM tomorrow.

**Interactive Controls:**
- Click the time to expand adjustment controls
- **⏪** Jump to earliest needed time (calculated from current SOC, target, and charge rate)
- **⏴** Decrease by 15 minutes
- **⏵** Increase by 15 minutes
- **⏩** Jump to end of available price data (23:00)

#### Automation Trigger Configuration

Send the calculated charging plan to a Home Assistant script or automation to program your EV charger via API.

```yaml
type: custom:ev-chargeulator-card
price_entity: sensor.nordpool_kwh
soc_entity: sensor.ev_battery
battery_size_kwh: 60
target_soc: 80
program_service: script.program_ev_charging
```

| Name | Description | Default Value | Constraints |
| ---- | ----------- | ------------- | ----------- |
| `program_service` | Service/script/automation to call with charging plan data. When set, a "📋 Program Charging" button appears next to the plan. | `undefined` | String in format `domain.service` (e.g., `script.program_ev_charging`) |

**Service Call Data Structure:**

When the "Program Charging" button is clicked, the card calls your configured service with the following data:

```yaml
charge_slots:
  - start: "2026-04-03T12:30:00+02:00"      # ISO 8601 timestamp
    end: "2026-04-03T14:00:00+02:00"        # ISO 8601 timestamp
    start_time: "12:30"                      # Human-readable time
    end_time: "14:00"                        # Human-readable time
    energy: 16.00                            # kWh delivered to battery
    energy_in: 18.82                         # kWh consumed from grid
    cost: 26.07                              # Total cost for this slot
    charge_level: 66                         # Expected SOC at end (%)
    average_price: 1.38                      # Average grid price (kr/kWh)
  - start: "2026-04-03T14:15:00+02:00"
    # ... (additional slots)
total_energy: 16.00                          # Total usable energy (kWh)
total_cost: 26.07                            # Total cost
current_soc: 50                              # Current battery level (%)
target_soc: 66                               # Target battery level (%)
battery_size_kwh: 60                         # Battery capacity
complete_by: "07:45"                         # Completion deadline (if set)
```

**Example Script:**

Create a script in Home Assistant to receive the charging plan:

```yaml
script:
  program_ev_charging:
    alias: "Program EV Charging"
    sequence:
      - service: notify.mobile_app
        data:
          title: "EV Charging Plan"
          message: "Charging {{charge_slots | length}} slots, total {{total_energy}} kWh for kr{{total_cost}}"
      
      # Example: Call your EV’s API to set charging schedule
      - service: rest_command.set_tesla_charging_schedule
        data:
          slots: "{{ charge_slots }}"
          target_soc: "{{ target_soc }}"
      
      # Or use any other integration that supports scheduling
      # e.g., Easee, Zaptec, Tibber, etc.
```

**Real-World Integration Examples:**

1. **Tesla via TeslaMate**: Use the charging plan times to create automations that start/stop charging via the Tesla integration
2. **Easee Charger**: Call the Easee service to set a charging schedule
3. **Zaptec Charger**: Use the Zaptec integration to configure smart charging
4. **Tibber Smart Charging**: Send the plan to Tibber’s smart charging API
5. **Home Assistant Automations**: Create time-based automations that enable/disable a smart plug
6. **MQTT/NodeRED**: Send the plan data via MQTT for processing in NodeRED

The automation trigger makes it easy to integrate with any EV charger that has an API or Home Assistant integration.

## Usage

### Features

**Optimal Charging Plan Calculation:**
- Analyzes Nordpool spot prices for today and tomorrow (15-minute granularity)
- Finds the cheapest time slots to charge your EV
- Accounts for charging efficiency losses
- Respects "complete by" time constraints
- Automatically calculates required charging duration based on battery size, current SOC, and charge rate

**Interactive Controls:**
- **SOC Slider**: Drag to adjust target charge level on the fly
- **Complete By Controls**: Click time to adjust deadline with ⏪⏴⏵⏩ buttons
- **Program Button**: Send charging plan to your EV charger (when configured)

**Cost Transparency:**
- Shows grid prices (what you pay for electricity)
- Shows effective costs (accounting for charging losses)
- Breaks down cost per kWh, per charging slot, and per percentage point
- Displays total energy and total cost

**Customization:**
- Fully customizable templates for display
- Configurable slider colors
- Control number of charging windows (e.g., prefer one long session vs. multiple short ones)
- Adjust calculation thoroughness vs. speed

### Examples

#### Basic Setup with Default Templates

```yaml
type: custom:ev-chargeulator-card
price_entity: sensor.nordpool_kwh_no3_nok_3_09_025
soc_entity: sensor.my_ev_battery
battery_size_kwh: 77
energy_in_value: 11
energy_in_unit: kW
target_soc: 80
```

#### Accounting for Charging Efficiency

If your charger has 85% efficiency (typical for AC charging):

```yaml
type: custom:ev-chargeulator-card
price_entity: sensor.nordpool_kwh
soc_entity: sensor.ev_battery
battery_size_kwh: 77
energy_in_value: 11      # Grid consumption (what you pay for)
energy_out_value: 9.35   # Battery charging (11 × 0.85)
energy_in_unit: kW
target_soc: 80
```

#### Complete By Time with Automation

Charge by 7:00 AM and program the charger:

```yaml
type: custom:ev-chargeulator-card
price_entity: sensor.nordpool_kwh
soc_entity: sensor.ev_battery
battery_size_kwh: 64
energy_in_value: 7.4
target_soc: 85
complete_by: ‘07:00’
program_service: script.program_ev_charging
```

#### Custom Templates with Currency and Formatting

```yaml
type: custom:ev-chargeulator-card
price_entity: sensor.nordpool_kwh_no3_nok
soc_entity: sensor.ev_battery
battery_size_kwh: 60
target_soc: 80
plan_item_template: ‘<li>🔌 %from%-%to% → %charge%% (<strong>kr%cost%</strong> @ kr%gridPricePerKwh%/kWh)</li>’
plan_summary_template: |
  <div style="background: var(--primary-color); color: white; padding: 8px; border-radius: 4px; margin-top: 8px;">
    <strong>Total:</strong> %totalEnergy% kWh for <strong>kr%totalCost%</strong><br>
    <strong>Average:</strong> kr%avgGridPricePerKwh%/kWh
  </div>
```

#### Minimize Charging Sessions

Only allow one continuous charging session:

```yaml
type: custom:ev-chargeulator-card
price_entity: sensor.nordpool_kwh
soc_entity: sensor.ev_battery
battery_size_kwh: 82
target_soc: 80
max_charge_slots: 1  # Force single continuous session
```

#### Aggressive Optimization

Explore more possibilities for optimal plan (slower but more thorough):

```yaml
type: custom:ev-chargeulator-card
price_entity: sensor.nordpool_kwh
soc_entity: sensor.ev_battery
battery_size_kwh: 60
target_soc: 80
max_charge_slots: 3
over_section_slots: 30  # Try many more combinations (default would be 21)
```

## Support

- **GitHub Repository**: [home-assistant-nordpool-chargeulator-card](https://github.com/Springvar/home-assistant-nordpool-chargeulator-card)
- **Issues & Feature Requests**: [Open an issue](https://github.com/Springvar/home-assistant-nordpool-chargeulator-card/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Springvar/home-assistant-nordpool-chargeulator-card/discussions)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
