# Home Assistant EV Chargeulator Card

Custom Lovelace card for Home Assistant to visualize and optimize electric vehicle (EV) charging, especially with dynamic Nordpool electricity prices.
<!-- Placeholder for preview image -->
<!-- <img src="https://raw.githubusercontent.com/Springvar/home-assistant-ev-charging-optimizer-card/main/card.png" width="35%"> -->

## Table of Contents
1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Usage](#usage)
5. [Support](#support)

## Introduction

The **EV Chargeulator Card** helps you visualize and plan charging for your electric vehicle in Home Assistant dashboards.
It uses Nordpool price data, your car’s battery parameters, and charging rate to help identify cost-effective charging slots and monitor charging progress.

Features:
- Support for dynamic hourly pricing from Nordpool and compatible sensors
- Visualizes charge plan, remaining battery, and projected costs
- Configurable battery size, charge/discharge rate, SOC targets, etc.
## Installation

### Prerequisites

This card is designed for use in Home Assistant and requires:
- An entity with dynamic electricity pricing (e.g., Nordpool)
- The expected EV battery and charger parameters
- Home Assistant 2022.0 or later recommended
### HACS (recommended)
Have [HACS](https://hacs.xyz/) installed to manage custom frontend cards.

[![Install quickly via a HACS link](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Springvar&repository=home-assistant-ev-charging-optimizer-card&category=plugin)

1. Go to **HACS** → **Frontend**.
2. Add this repository ([https://github.com/Springvar/home-assistant-ev-charging-optimizer-card](https://github.com/Springvar/home-assistant-ev-charging-optimizer-card)) as a [custom repository](https://hacs.xyz/docs/faq/custom_repositories/).
3. Download and restart Home Assistant.

### Manual

1. **Download the Card**:
   - Download or clone this repository.

2. **Add to Home Assistant**:
   - Copy the built file (see `dist/` folder after build) into your `www/ev-chargeulator-card` directory under your Home Assistant config.
3. **Reference the Card in Lovelace Resources**:
   ```yaml
   resources:
     - url: /local/ev-chargeulator-card/ev-chargeulator-card.js
       type: module
