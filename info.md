# Vehicle Service Manager

Trackt Service-Intervalle, Reparaturen und Reifenverschleiß für deine Fahrzeuge – als native Home Assistant Integration.

## Features

- **Service Status** mit 3-Farb-Ampel (Grün / Gelb / Rot)
- **11 Service-Punkte**: Ölwechsel, Inspektion, Bremsflüssigkeit, Filter, Zündkerzen, HU/AU u.v.m.
- **Erstzulassung** als Ausgangspunkt – korrekte Fälligkeitsberechnung auch ohne Serviceeinträge
- **HU/AU** direkt beim Anlegen des Fahrzeugs erfassen
- **Live KM-Stand** via beliebiger HA-Sensor-Entität (OBD, Fahrzeugintegration)
- **Reifentracking** mit Profiltiefe, DOT-Alter und Verschleißprojektion (1,5 mm / 10.000 km)
- **Reparaturen & Verschleiß** dokumentieren
- **Mehrere Fahrzeuge** parallel
- **Lovelace Dashboard-Card** + **kompakte Icon-Card**
- **Binary Sensors** für Automationen
- **HA Services** zum Hinzufügen von Einträgen aus Automationen

## Dashboard Cards

```yaml
# Vollständiges Dashboard
type: custom:vehicle-service-card

# Kompakte Icon-Übersicht
type: custom:vehicle-service-compact-card
```

> ⚠️ Die voreingestellten Intervalle sind Richtwerte. Bitte im Serviceheft prüfen. Keine Haftung für Schäden durch falsche Werte.
