# Vehicle Service Manager für Home Assistant

Trackt Service-Intervalle, Reparaturen und Reifenverschleiß für deine Fahrzeuge – als native HA-Integration mit echten Entities und einer eigenen Lovelace-Karte.

---

## Features

- **Service Status** mit Fortschrittsbalken und Ampel-System (OK / Im Blick / Bald fällig / Fällig / Überfällig)
- **Erstzulassungsdatum** als Ausgangspunkt für Zeit-Intervalle, solange kein Serviceeintrag vorhanden
- **HU/AU** direkt beim Anlegen des Fahrzeugs erfragen, automatischer Serviceeintrag
- **Live KM-Stand** via beliebiger HA-Entität (OBD-Dongle, Fahrzeugintegration)
- **11 Service-Punkte**: Ölwechsel, Inspektion, Bremsflüssigkeit, Innenraumfilter, Luftfilter, Zündkerzen, Kraftstofffilter, Getriebeöl, Haldex-Öl, Klimawartung, HU/AU
- **Reparaturen & Verschleiß**: Bremsen, Stoßdämpfer, Zahnriemen, Batterie, Kupplung u.a.
- **Reifentracking**: 4 Radpositionen, Profiltiefe, DOT-Alter, Verschleißprojektion (1,5 mm / 10.000 km)
- **Mehrere Fahrzeuge** parallel
- **Binary Sensors** für Automationen (Service fällig)
- **HA Services** zum Hinzufügen von Einträgen aus Automationen

---

## Installation via HACS

### 1. Repository hinzufügen

1. HACS öffnen → **Integrationen** → drei Punkte → **Benutzerdefinierte Repositories**
2. URL: `https://github.com/toxictody1337/vehicle-service-manager`  
   Kategorie: **Integration**
3. **Hinzufügen** → anschließend im HACS-Store suchen und installieren
4. Home Assistant neu starten

### 2. Integration einrichten

**Einstellungen → Integrationen → + Hinzufügen → "Vehicle Service Manager"**

Der Einrichtungsassistent führt durch 3 Schritte:
1. **Fahrzeugdaten**: Hersteller, Modell, Erstzulassung, KM-Stand, letzte HU/AU, optionale Entität für Live-KM
2. **Service-Punkte**: Auswahl der zu überwachenden Punkte
3. **Intervalle**: Anpassung der km- und Zeit-Intervalle

> ⚠️ Die voreingestellten Intervalle sind Richtwerte. Bitte im Serviceheft oder der Bedienungsanleitung prüfen und anpassen. Bei Unsicherheit Werkstatt befragen. Keine Haftung für Schäden durch falsche Werte.

### 3. Lovelace-Karte hinzufügen

Die JavaScript-Datei wird automatisch als Lovelace-Ressource registriert.  
Dashboard → **Karte hinzufügen** → **Benutzerdefinierte Karten** → **Vehicle Service Card**

Oder manuell in der Lovelace-YAML:
```yaml
type: custom:vehicle-service-card
```

---

## Entities

Pro Fahrzeug werden folgende Entities erstellt:

| Typ | Beispiel | Beschreibung |
|-----|----------|--------------|
| `sensor` | `sensor.golf_gti_oelwechsel` | Status: ok / watch / soon / due / overdue |
| `sensor` | `sensor.golf_gti_kilometerstand` | Aktueller KM-Stand |
| `sensor` | `sensor.golf_gti_reifen_vl` | Profiltiefe VL in mm (projiziert) |
| `binary_sensor` | `sensor.golf_gti_oelwechsel_faellig` | True wenn ≥ 90% |
| `binary_sensor` | `sensor.golf_gti_service_faellig` | True wenn irgendetwas ≥ 90% |

### Entity-Attribute

Jede `sensor`-Entity hat u.a. folgende Attribute:
```
vehicle_id, service_id, percentage, status, last_service_date,
last_service_km, km_left, months_left, interval_km, interval_months
```

---

## HA Services

### `vehicle_service.add_service_entry`
```yaml
service: vehicle_service.add_service_entry
data:
  vehicle_id: "abc-123-uuid"
  entry_date: "2024-03-15"
  km: 79500
  services:
    - oil
    - inspection
  notes: "Freie Werkstatt Musterstadt"
```

### `vehicle_service.update_km`
```yaml
service: vehicle_service.update_km
data:
  vehicle_id: "abc-123-uuid"
  km: 80000
```

### `vehicle_service.add_repair`
```yaml
service: vehicle_service.add_repair
data:
  vehicle_id: "abc-123-uuid"
  entry_date: "2024-03-15"
  km: 79500
  category: brakes_front
  description: "Textar Bremsbeläge"
  cost: 180
```

### `vehicle_service.add_tire`
```yaml
service: vehicle_service.add_tire
data:
  vehicle_id: "abc-123-uuid"
  entry_date: "2024-04-01"
  km: 80000
  type: summer
  axle: all
  width: 205
  ratio: 55
  rim: 16
  brand: Michelin
  dot: "2323"
  vl: 8.0
  vr: 8.0
  hl: 8.0
  hr: 8.0
```

---

## Automationen – Beispiele

### Benachrichtigung bei fälligem Service
```yaml
automation:
  - alias: "Service fällig – Benachrichtigung"
    trigger:
      - platform: state
        entity_id: binary_sensor.golf_gti_service_faellig
        to: "on"
    action:
      - service: notify.mobile_app
        data:
          title: "🔧 Service fällig"
          message: >
            {{ states('sensor.golf_gti_service_faellig') }} –
            Bitte Service-Termin vereinbaren.
```

### Automatische KM-Übernahme aus OBD-Integration
```yaml
# Alternativ zur Konfiguration in der Integration:
automation:
  - alias: "KM-Stand automatisch übernehmen"
    trigger:
      - platform: state
        entity_id: sensor.obd_odometer
    action:
      - service: vehicle_service.update_km
        data:
          vehicle_id: "abc-123-uuid"
          km: "{{ states('sensor.obd_odometer') | int }}"
```

---

## Reifenverschleiß-Berechnung

Die projizierte Profiltiefe wird berechnet als:

```
aktuelle_tiefe = ursprüngliche_tiefe − (gefahrene_km × 1,5 / 10.000)
```

Empfohlene Verschleißgrenzen:
- **Sommerreifen**: 3,0 mm
- **Winterreifen / Ganzjahresreifen**: 4,0 mm
- **Gesetzliches Minimum**: 1,6 mm

---

## Hinweise & Haftungsausschluss

> Die voreingestellten Intervalle und Berechnungen (Reifenverschleiß, Service-Fälligkeiten) sind Richtwerte ohne Gewähr. Der tatsächliche Wartungsbedarf hängt von Fahrzeugmodell, Fahrweise und Umgebungsbedingungen ab. Prüfe alle Angaben anhand des Servicehefts und der Fahrzeugdokumentation. Keine Haftung für Schäden durch fehlerhafte Werte oder fehlerhafte Interpretation der angezeigten Daten.

---


---

## Entwicklung & Attribution

Diese Integration wurde mit Unterstützung von **Claude (Anthropic AI)** entwickelt.

### Verwendete Drittanbieter-Dienste

| Dienst | Verwendung | Lizenz/Bedingungen |
|--------|-----------|-------------------|
| [logo.dev](https://logo.dev) | Herstellerlogos der Fahrzeugkarten | Kostenloser Plan, eigener API-Key erforderlich |
| [Material Design Icons](https://materialdesignicons.com) | Icons via Home Assistant | Apache 2.0 |
| Home Assistant APIs | WebSocket, Config Flow, Storage | Apache 2.0 |

### logo.dev API-Key

Die Integration verwendet logo.dev für automatische Herstellerlogos (Skoda, VW, BMW etc.).
Der im Code enthaltene API-Key ist ein öffentlicher Demo-Key. Für den produktiven Einsatz
empfehle ich einen **eigenen kostenlosen Account** unter [logo.dev](https://logo.dev) zu erstellen
und den Key in der JS-Datei zu ersetzen:

```javascript
// In vehicle-service-card.js, Zeile ~50:
function logoUrl(d) {
  return `https://img.logo.dev/${d}?token=DEIN_EIGENER_KEY&size=64&format=png`;
}
```

---

## Lizenz

MIT License – siehe [LICENSE](LICENSE)

> Diese Software wird ohne Gewähr bereitgestellt. Die Intervalwerte und Berechnungen sind 
> Richtwerte ohne Garantie. Prüfe alle Angaben anhand des Servicehefts deines Fahrzeugs.
> Keine Haftung für Schäden durch fehlerhafte Werte oder Interpretation der Daten.

## Mitwirken / Issues

Fehler oder Verbesserungsvorschläge bitte als [GitHub Issue](https://github.com/toxictody1337/vehicle-service-manager/issues) melden.
