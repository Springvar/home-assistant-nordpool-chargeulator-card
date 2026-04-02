# Test Page

## Usage

1. Build the card:
   ```bash
   yarn build
   ```

2. Start the dev server:
   ```bash
   yarn dev
   ```
   This will automatically open the test page in your browser at `http://localhost:5174/test/card.html`

## Test Configurations

The test page includes realistic Nordic electricity pricing patterns with clear day/night variations:

### Default Configuration (`config.yaml`)
- **Scenario**: Overnight charging from 35% → 85%
- **Charge rate**: 7.5 kW (typical home charger)
- **Complete by**: 07:00 (morning)
- **Battery**: 82 kWh (Tesla Model 3)
- Shows optimal charging during cheapest night hours (02:00-05:00)

### Full Charge (`full-charge.yaml`)
- **Scenario**: Fast charging from 35% → 100%
- **Charge rate**: 11 kW (faster home charger)
- **Complete by**: 06:00 (early morning)
- **Max slots**: 3 charging periods
- Load with: `?config=full-charge`

### Custom Configurations
Create additional YAML files and load them with `?config=filename` (without .yaml extension)

Example: `http://localhost:5174/test/card.html?config=myconfig` loads `myconfig.yaml`

## Dummy Data

The test page includes realistic dummy data simulating Norwegian electricity prices:

- **Night hours** (00:00-06:00): 0.30-0.45 NOK/kWh (cheapest)
- **Morning peak** (07:00-10:00): 0.95-1.10 NOK/kWh (expensive)
- **Midday** (11:00-16:00): 0.68-0.78 NOK/kWh (moderate)
- **Evening peak** (17:00-20:00): 1.25-1.35 NOK/kWh (most expensive)
- **Late evening** (21:00-23:00): 0.52-0.82 NOK/kWh (decreasing)

The optimizer will automatically schedule charging during the cheapest hours while respecting the "complete by" time constraint.

## Modifying Test Data

You can modify `card.html` to test different scenarios:
- Adjust `dummyHass.states['sensor.ev_soc'].state` to change starting battery level
- Modify `dummyPriceData.raw_today` array to test different price patterns
- Change config values to test different charge rates and target levels

## What You Should See

With the default configuration (35% → 85%), the card will display:

1. **Current Status**: Battery at 35%, current price
2. **Optimal Charge Plan**: Scheduled charging times during the cheapest night hours (typically 02:00-05:00)
3. **Cost Summary**: Total cost and energy needed for the charging session
4. **Price Visualization**: Graph showing when charging will occur during low-price periods

The optimizer automatically finds the cheapest consecutive hours to charge while meeting your target SOC by the deadline.
