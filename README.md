# Nordpool Chargeulator Card

Custom Lovelace card for Home Assistant to visualize and optimize electric vehicle (EV) charging, especially with dynamic Nordpool electricity prices.

<!-- Add a preview image if desired -->
<!-- <img src="https://raw.githubusercontent.com/Springvar/home-assistant-nordpool-chargeulator-card/main/card.png" width="35%"> -->

## Table of Contents
1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Usage](#usage)
5. [Support](#support)

## Introduction

The **Nordpool Chargeulator Card** helps you visualize and plan charging for your electric vehicle in Home Assistant dashboards.
It uses Nordpool price data, your car’s battery parameters, and charging rate to help identify cost-effective charging slots and monitor charging progress.

**Features**
- Support for dynamic hourly pricing from Nordpool and compatible sensors
- Visualizes charge plan, remaining battery, and projected costs
- Configurable battery size, charge/discharge rate, SOC targets, and more

## Installation

### Prerequisites

This card is designed for use in Home Assistant and requires:
- An entity with dynamic electricity pricing (e.g., Nordpool)
- The appropriate EV battery and charger parameters
- Home Assistant 2022.0 or later is recommended

### HACS (Recommended)

If you use [HACS](https://hacs.xyz/) to manage Home Assistant custom cards:

[![Install quickly via a HACS link](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Springvar&repository=home-assistant-nordpool-chargeulator-card&category=plugin)

1. Go to **HACS** → **Frontend**.
2. Add this repository: `https://github.com/Springvar/home-assistant-nordpool-chargeulator-card` as a [custom repository](https://hacs.xyz/docs/faq/custom_repositories/).
3. Download and install the card, then restart Home Assistant.

### Manual

1. **Download the Card**:
   - Download or clone this repository.
   - Run the build (`yarn build` or `npm run build`) if needed.

2. **Add to Home Assistant**:
   - Copy the built file (`dist/home-assistant-nordpool-chargeulator-card.js`) into your `www/chargeulator-card` directory under your Home Assistant config.

3. **Reference the Card in Lovelace Resources**:
   ```yaml
   resources:
     - url: /local/chargeulator-card/home-assistant-nordpool-chargeulator-card.js
       type: module
   ```

## Configuration

Example configuration and options will be added here.

## Usage

- Add the Nordpool Chargeulator Card to your Home Assistant Dashboard.
- Configure the card with your EV, battery, and pricing data.

## Support

- [GitHub repository](https://github.com/Springvar/home-assistant-nordpool-chargeulator-card)  
- For issues or feature requests, please open an issue on GitHub.
