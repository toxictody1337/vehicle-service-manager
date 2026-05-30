"""Config flow for Vehicle Service Manager."""
from __future__ import annotations

import uuid
import logging
from datetime import date
from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import selector

from .const import (
    DOMAIN,
    CONF_MAKE, CONF_MODEL, CONF_EZ_DATE, CONF_KM, CONF_PLATE,
    CONF_VIN, CONF_HSN, CONF_ENTITY_KM,
    CONF_SERVICES, CONF_INTERVALS,
    CONF_INITIAL_HU_DATE, CONF_INITIAL_HU_KM,
    ALL_SERVICE_IDS, SERVICE_LABELS, SERVICE_INTERVAL_TYPE, DEFAULT_INTERVALS,
    SERVICE_HU,
)

_LOGGER = logging.getLogger(__name__)

MONTHS_DE = [
    "Januar","Februar","März","April","Mai","Juni",
    "Juli","August","September","Oktober","November","Dezember"
]

# Clean service labels for UI — no brand references
UI_SERVICE_LABELS = {
    "oil":          "Ölwechsel",
    "inspection":   "Inspektion",
    "brake_fluid":  "Bremsflüssigkeit",
    "cabin_filter": "Innenraumfilter",
    "air_filter":   "Luftfilter",
    "spark_plugs":  "Zündkerzen (nur Benziner)",
    "fuel_filter":  "Kraftstofffilter (nur Diesel)",
    "gearbox":      "Getriebeöl",
    "haldex":       "Haldex-Öl (nur Allrad)",
    "ac":           "Klimawartung",
    "hu":           "Hauptuntersuchung (HU/AU)",
}

# German labels for interval fields
INTERVAL_LABELS_DE = {
    "oil_km":           "Ölwechsel – km-Intervall",
    "oil_months":       "Ölwechsel – Monate",
    "inspection_km":    "Inspektion – km-Intervall",
    "inspection_months":"Inspektion – Monate",
    "brake_fluid_months":"Bremsflüssigkeit – Monate",
    "cabin_filter_km":  "Innenraumfilter – km-Intervall",
    "cabin_filter_months":"Innenraumfilter – Monate",
    "air_filter_km":    "Luftfilter – km-Intervall",
    "air_filter_months":"Luftfilter – Monate",
    "spark_plugs_km":   "Zündkerzen – km-Intervall",
    "spark_plugs_months":"Zündkerzen – Monate",
    "fuel_filter_km":   "Kraftstofffilter – km-Intervall",
    "fuel_filter_months":"Kraftstofffilter – Monate",
    "gearbox_km":       "Getriebeöl – km-Intervall",
    "haldex_km":        "Haldex-Öl – km-Intervall",
    "haldex_months":    "Haldex-Öl – Monate",
    "ac_months":        "Klimawartung – Monate",
    "hu_months":        "HU/AU – Monate",
}

def _year_options() -> list[str]:
    current = date.today().year
    return [str(y) for y in range(current, current - 40, -1)]

def _month_options_keys() -> list[str]:
    return [str(i + 1) for i in range(12)]

_KM_ENTITY_SELECTOR = selector.EntitySelector(
    selector.EntitySelectorConfig(domain="sensor")
)


class VehicleServiceConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """3-step config flow."""

    VERSION = 1

    def __init__(self) -> None:
        self._vehicle_data: dict[str, Any] = {}

    # ── Step 1: Vehicle data ──────────────────────────────────────────────────

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}

        if user_input is not None:
            # EZ date
            try:
                ez = date(int(user_input["ez_year"]), int(user_input["ez_month"]), 1)
                self._vehicle_data["ez_date"] = ez.isoformat()
            except ValueError:
                errors["ez_month"] = "invalid_date"

            # HU date — only month + year, no day
            hu_known = user_input.get("hu_known", False)
            if hu_known:
                try:
                    hu = date(int(user_input["hu_year"]), int(user_input["hu_month"]), 1)
                    self._vehicle_data[CONF_INITIAL_HU_DATE] = hu.isoformat()
                    self._vehicle_data[CONF_INITIAL_HU_KM] = int(user_input.get("hu_km") or 0)
                except ValueError:
                    errors["hu_month"] = "invalid_date"
            else:
                self._vehicle_data[CONF_INITIAL_HU_DATE] = None
                self._vehicle_data[CONF_INITIAL_HU_KM] = 0

            # VIN length validation
            vin = user_input.get(CONF_VIN, "").strip()
            if vin and len(vin) != 17:
                errors[CONF_VIN] = "vin_length"

            if not errors:
                self._vehicle_data.update({
                    CONF_MAKE:      user_input[CONF_MAKE].strip(),
                    CONF_MODEL:     user_input[CONF_MODEL].strip(),
                    CONF_KM:        int(user_input.get(CONF_KM) or 0),
                    CONF_PLATE:     user_input.get(CONF_PLATE, "").strip(),
                    CONF_VIN:       vin,
                    CONF_HSN:       user_input.get(CONF_HSN, "").strip(),
                    CONF_ENTITY_KM: user_input.get(CONF_ENTITY_KM) or "",
                })
                return await self.async_step_services()

        today = date.today()
        schema = vol.Schema({
            vol.Required(CONF_MAKE): str,
            vol.Required(CONF_MODEL): str,
            # EZ — month + year only
            vol.Required("ez_month", default="1"): vol.In(_month_options_keys()),
            vol.Required("ez_year",  default=str(today.year - 3)): vol.In(_year_options()),
            vol.Required(CONF_KM, default=0): vol.Coerce(int),
            vol.Optional(CONF_PLATE, default=""): str,
            # HU toggle
            vol.Required("hu_known", default=False): bool,
            vol.Optional("hu_month", default="1"): vol.In(_month_options_keys()),
            vol.Optional("hu_year",  default=str(today.year)): vol.In(_year_options()),
            vol.Optional("hu_km",    default=0): vol.Coerce(int),
            # Optional identification
            vol.Optional(CONF_VIN,   default=""): str,
            vol.Optional(CONF_HSN,   default=""): str,
            vol.Optional(CONF_ENTITY_KM): _KM_ENTITY_SELECTOR,
        })

        return self.async_show_form(
            step_id="user",
            data_schema=schema,
            errors=errors,
            description_placeholders={"step": "1/3 – Fahrzeugdaten"},
        )

    # ── Step 2: Service points — NO defaults, start at top ───────────────────

    async def async_step_services(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            selected = [sid for sid in ALL_SERVICE_IDS if user_input.get(sid, False)]
            if not selected:
                return self.async_show_form(
                    step_id="services",
                    data_schema=self._services_schema(),
                    errors={"base": "no_service_selected"},
                )
            self._vehicle_data[CONF_SERVICES] = selected
            return await self.async_step_intervals()

        return self.async_show_form(
            step_id="services",
            data_schema=self._services_schema(),
            errors={},
        )

    def _services_schema(self) -> vol.Schema:
        """All services unchecked by default."""
        fields = {}
        for sid in ALL_SERVICE_IDS:
            fields[vol.Optional(sid, default=False)] = bool
        return vol.Schema(fields)

    # ── Step 3: Intervals ─────────────────────────────────────────────────────

    async def async_step_intervals(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        selected: list[str] = self._vehicle_data.get(CONF_SERVICES, [])

        if user_input is not None:
            intervals: dict[str, dict] = {}
            for sid in selected:
                itype = SERVICE_INTERVAL_TYPE.get(sid, "both")
                entry: dict[str, int] = {}
                if itype != "time":
                    v = int(user_input.get(f"{sid}_km") or 0)
                    if v > 0:
                        entry["km"] = v
                if itype != "km":
                    v = int(user_input.get(f"{sid}_months") or 0)
                    if v > 0:
                        entry["months"] = v
                intervals[sid] = entry

            self._vehicle_data[CONF_INTERVALS] = intervals
            vehicle_id = str(uuid.uuid4())
            return self.async_create_entry(
                title=f"{self._vehicle_data[CONF_MAKE]} {self._vehicle_data[CONF_MODEL]}",
                data={"vehicle_id": vehicle_id, **self._vehicle_data},
            )

        fields: dict = {}
        for sid in selected:
            itype    = SERVICE_INTERVAL_TYPE.get(sid, "both")
            defaults = DEFAULT_INTERVALS.get(sid, {})
            if itype != "time":
                fields[vol.Optional(f"{sid}_km", default=defaults.get("km", 0))] = vol.Coerce(int)
            if itype != "km":
                fields[vol.Optional(f"{sid}_months", default=defaults.get("months", 0))] = vol.Coerce(int)

        return self.async_show_form(
            step_id="intervals",
            data_schema=vol.Schema(fields),
            errors={},
            description_placeholders={
                "disclaimer": (
                    "Richtwerte – bitte im Serviceheft prüfen. "
                    "0 = nicht tracken. Keine Haftung für falsche Werte."
                ),
            },
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return VehicleServiceOptionsFlow(config_entry)


class VehicleServiceOptionsFlow(config_entries.OptionsFlow):
    """Allow editing ALL vehicle data after setup."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self._config_entry = config_entry
        self._new_data: dict[str, Any] = {}

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Step 1: Edit vehicle base data."""
        data = self._config_entry.data
        errors: dict[str, str] = {}

        if user_input is not None:
            # EZ date
            try:
                ez = date(int(user_input["ez_year"]), int(user_input["ez_month"]), 1)
                self._new_data["ez_date"] = ez.isoformat()
            except ValueError:
                errors["ez_month"] = "invalid_date"

            # VIN length
            vin = user_input.get(CONF_VIN, "").strip()
            if vin and len(vin) != 17:
                errors[CONF_VIN] = "vin_length"

            if not errors:
                self._new_data.update({
                    CONF_MAKE:      user_input[CONF_MAKE].strip(),
                    CONF_MODEL:     user_input[CONF_MODEL].strip(),
                    CONF_KM:        int(user_input.get(CONF_KM) or 0),
                    CONF_PLATE:     user_input.get(CONF_PLATE, "").strip(),
                    CONF_VIN:       vin,
                    CONF_HSN:       user_input.get(CONF_HSN, "").strip(),
                    CONF_ENTITY_KM: user_input.get(CONF_ENTITY_KM) or "",
                })
                return await self.async_step_intervals()

        # Parse existing EZ date
        ez_date = data.get("ez_date", "")
        ez_year, ez_month = str(date.today().year - 3), "1"
        if ez_date:
            try:
                d = date.fromisoformat(ez_date)
                ez_year, ez_month = str(d.year), str(d.month)
            except ValueError:
                pass

        schema = vol.Schema({
            vol.Required(CONF_MAKE,  default=data.get(CONF_MAKE, "")): str,
            vol.Required(CONF_MODEL, default=data.get(CONF_MODEL, "")): str,
            vol.Required("ez_month", default=ez_month): vol.In(_month_options_keys()),
            vol.Required("ez_year",  default=ez_year):  vol.In(_year_options()),
            vol.Required(CONF_KM,    default=data.get(CONF_KM, 0)): vol.Coerce(int),
            vol.Optional(CONF_PLATE, default=data.get(CONF_PLATE, "")): str,
            vol.Optional(CONF_VIN,   default=data.get(CONF_VIN, "")): str,
            vol.Optional(CONF_HSN,   default=data.get(CONF_HSN, "")): str,
            vol.Optional(CONF_ENTITY_KM,
                default=data.get(CONF_ENTITY_KM) or vol.UNDEFINED,
            ): _KM_ENTITY_SELECTOR,
        })

        return self.async_show_form(
            step_id="init",
            data_schema=schema,
            errors=errors,
            description_placeholders={"step": "Fahrzeugdaten bearbeiten"},
        )

    async def async_step_intervals(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Step 2: Edit intervals."""
        data     = self._config_entry.data
        selected = data.get(CONF_SERVICES, [])
        cur_intv = data.get(CONF_INTERVALS, {})

        if user_input is not None:
            new_intervals: dict[str, dict] = {}
            for sid in selected:
                itype = SERVICE_INTERVAL_TYPE.get(sid, "both")
                entry: dict[str, int] = {}
                if itype != "time":
                    v = int(user_input.get(f"{sid}_km") or 0)
                    if v > 0:
                        entry["km"] = v
                if itype != "km":
                    v = int(user_input.get(f"{sid}_months") or 0)
                    if v > 0:
                        entry["months"] = v
                new_intervals[sid] = entry

            # Write everything back and reload
            self.hass.config_entries.async_update_entry(
                self._config_entry,
                data={
                    **data,
                    **self._new_data,
                    CONF_INTERVALS: new_intervals,
                },
            )
            await self.hass.config_entries.async_reload(self._config_entry.entry_id)
            return self.async_create_entry(title="", data={})

        fields: dict = {}
        for sid in selected:
            itype    = SERVICE_INTERVAL_TYPE.get(sid, "both")
            cur      = cur_intv.get(sid, {})
            defaults = DEFAULT_INTERVALS.get(sid, {})
            if itype != "time":
                fields[vol.Optional(f"{sid}_km",
                    default=cur.get("km", defaults.get("km", 0)))] = vol.Coerce(int)
            if itype != "km":
                fields[vol.Optional(f"{sid}_months",
                    default=cur.get("months", defaults.get("months", 0)))] = vol.Coerce(int)

        return self.async_show_form(
            step_id="intervals",
            data_schema=vol.Schema(fields),
            description_placeholders={
                "disclaimer": "0 = nicht tracken. Keine Haftung für falsche Werte."
            },
        )
