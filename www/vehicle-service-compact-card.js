/**
 * Vehicle Service Manager \u2013 Lovelace Cards v1.6
 * Two cards:
 *   vehicle-service-card        \u2013 full dashboard
 *   vehicle-service-compact-card \u2013 icon-only status strip
 */

const DOMAIN = "vehicle_service";

const BRAND_COLORS = {
  volkswagen:"#00519F", vw:"#00519F",
  skoda:"#4BA82E", "škoda":"#4BA82E",
  audi:"#BB0A30",
  bmw:"#1C69D4",
  mercedes:"#9E9E9E", "mercedes-benz":"#9E9E9E",
  mini:"#000000",
  porsche:"#AE0521",
  opel:"#FFED00",
  ford:"#003476",
  seat:"#E2001A",
  cupra:"#1B1B1B",
  renault:"#FFCC00",
  peugeot:"#003189",
  fiat:"#9B0000",
  toyota:"#EB0A1E",
  honda:"#CC0000",
  mazda:"#910E10",
  nissan:"#C3002F",
  hyundai:"#002C5F",
  kia:"#05141F",
  volvo:"#003057",
  tesla:"#CC0000",
  dacia:"#005BBB",
  citroën:"#9E1B32", citroen:"#9E1B32",
};

function brandColor(make) {
  if (!make) return "#1976D2";
  return BRAND_COLORS[make.toLowerCase().trim()] || "#1976D2";
}

function makeInitials(make) {
  if (!make) return "?";
  const words = make.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return make.slice(0, 2).toUpperCase();
}

function logoHtml(make, size = 20) {
  const color = brandColor(make);
  const initials = makeInitials(make);
  const fontSize = size <= 16 ? Math.round(size * 0.5) : Math.round(size * 0.42);
  return `<div style="width:${size}px;height:${size}px;border-radius:${size <= 20 ? '50%' : '8px'};background:${color};display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;font-weight:700;color:#fff;flex-shrink:0;letter-spacing:-0.5px">${initials}</div>`;
}


const SVC_LABELS = {
  oil:"\u00D6lwechsel", inspection:"Inspektion", brake_fluid:"Bremsfl\u00FCssigkeit",
  cabin_filter:"Innenraumfilter", air_filter:"Luftfilter", spark_plugs:"Z\u00FCndkerzen",
  fuel_filter:"Kraftstofffilter", gearbox:"Getriebe\u00F6l ", haldex:"Haldex-\u00D6l ",
  ac:"Klimawartung", hu:"Hauptuntersuchung (HU/AU)",
};
const SVC_ICONS = {
  oil:"mdi:oil", inspection:"mdi:clipboard-check-outline", brake_fluid:"mdi:disc",
  cabin_filter:"mdi:air-filter", air_filter:"mdi:air-filter", spark_plugs:"mdi:bolt",
  fuel_filter:"mdi:gas-station", gearbox:"mdi:car-manual-transmission",
  haldex:"mdi:car-4wd", ac:"mdi:air-conditioner", hu:"mdi:car-search",
};
const REP_LABELS = {
  brakes_front:"Bremse vorne", brakes_rear:"Bremse hinten", brakes_full:"Bremsen komplett",
  discs_front:"Bremsscheiben vorne", discs_rear:"Bremsscheiben hinten",
  shock_front:"Sto\u00DFd\u00E4mpfer vorne", shock_rear:"Sto\u00DFd\u00E4mpfer hinten",
  timing_belt:"Zahnriemen", battery:"Batterie", clutch:"Kupplung", other:"Sonstiges",
};
const TIRE_WARN = {summer:3.0, winter:4.0, allseason:4.0};
const TIRE_MIN  = 1.6;
const WEAR      = 1.5 / 10000;

// \u2500\u2500 3-tier color system \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// green  = OK (>threshold)
// yellow = coming up (\u226470% left or \u22643 months / \u22643000km)
// red    = due now (\u22641 month / \u22641000km remaining)
function calcPct(v, sid) {
  const last  = (v.lastService || {})[sid] || {};
  const intv  = (v.intervals   || {})[sid] || {};
  const ez    = v.ezDate;
  const curKm = v.km || 0;
  let kp=null, kl=null, tp=null, ml=null;

  if (intv.km) {
    const base  = last.km != null ? last.km : 0;
    const driven = curKm - base;
    kp = Math.min(100, Math.round(driven / intv.km * 100));
    kl = Math.max(0, intv.km - driven);
  }
  if (intv.months) {
    const bd = last.date || ez || null;
    if (bd) {
      const ms = (Date.now() - new Date(bd).getTime()) / (1000*60*60*24*30.44);
      tp = Math.min(100, Math.round(ms / intv.months * 100));
      ml = Math.max(0, Math.round(intv.months - ms));
    } else { tp = 0; ml = intv.months; }
  }

  const pct = Math.max(kp ?? 0, tp ?? 0);

  // Tier logic:
  // red  = \u226590% OR (km_left\u22641000 and tracked) OR (months_left\u22641 and tracked)
  // yellow = \u226570% OR (km_left\u22643000 and tracked) OR (months_left\u22643 and tracked)
  // green = everything else
  const isRed =
    pct >= 90 ||
    (kl !== null && kl <= 1000) ||
    (ml !== null && ml <= 1);
  const isYellow =
    !isRed && (
      pct >= 70 ||
      (kl !== null && kl <= 3000) ||
      (ml !== null && ml <= 3)
    );

  const tier = isRed ? "red" : isYellow ? "yellow" : "green";
  return { pct, kp, tp, kl, ml, tier };
}

const TIER_COL = { green:"#3B6D11", yellow:"#BA7517", red:"#A32D2D" };
const TIER_BG  = { green:"#EAF3DE", yellow:"#FAEEDA", red:"#FCEBEB"  };


function fd(iso)         { return iso ? new Date(iso).toLocaleDateString("de-DE") : "\u2014"; }
function fkm(km)         { return km != null ? Number(km).toLocaleString("de-DE") + " km" : "\u2014"; }
function today()         { return new Date().toISOString().split("T")[0]; }

const WIDTHS=[135,145,155,165,175,185,195,205,215,225,235,245,255,265,275,285,295,305,315,325,335];
const RATIOS=[25,30,35,40,45,50,55,60,65,70,75,80];
const RIMS=[13,14,15,16,17,18,19,20,21,22];
const PROF_STEPS=[];for(let v=0;v<=12;v+=0.5)PROF_STEPS.push(parseFloat(v.toFixed(1)));

function sel(id, opts, val="") {
  return `<select id="${id}">${opts.map(o=>`<option value="${o.v||o}"${(o.v||o)==val?"selected":""}>${o.l||o}</option>`).join("")}</select>`;
}
function inp(id, type, ph, val="", extra="") {
  return `<input id="${id}" type="${type}" placeholder="${ph}" value="${val}" ${extra}/>`;
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// COMPACT CARD  \u2013 icon strip with color status + due info
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

class VehicleServiceCompactCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode:"open"});
    this._hass=null; this._vehicles=[]; this._vehicleIds=[];
    this._cur=0; this._loading=true; this._err=null;
  }
  setConfig(c) { this._config=c; }
  set hass(h) { const first=!this._hass; this._hass=h; if(first) this._load(); }

  async _load() {
    this._loading=true; this._paint();
    try {
      const r=await this._hass.callWS({type:`${DOMAIN}/vehicles`});
      const entries=Object.entries(r.vehicles||{});
      this._vehicleIds=entries.map(([id])=>id);
      this._vehicles=entries.map(([,v])=>v);
      this._loading=false;
    } catch(e) { this._err=`${e.message||e}`; this._loading=false; }
    this._paint();
  }

  _v() { return this._vehicles[this._cur]; }

  _paint() {
    let body="";
    if (this._loading) body=`<div class="loading"><div class="spin"></div></div>`;
    else if (this._err) body=`<div style="padding:8px;color:#f44;font-size:11px">Fehler: ${this._err}</div>`;
    else if (!this._vehicles.length) body=`<div style="padding:8px;font-size:11px;color:var(--secondary-text-color)">Keine Fahrzeuge</div>`;
    else body=this._main();
    this.shadowRoot.innerHTML=`<style>${this._css()}</style><ha-card><div class="w">${body}</div></ha-card>`;
    this._bindCompact();
  }

  _main() {
    const v=this._v();
    const pills=this._vehicles.length>1 ? `<div class="cpills">${this._vehicles.map((vv,i)=>{
      const lg=logoHtml(v.make||"",16);
      return`<button class="cpill${i===this._cur?" on":""}" data-ci="${i}">${lg}</button>`;
    }).join("")}</div>` : "";

    // Vehicle name + logo
    const lg=logoHtml(v.make||"",16);

    // Build icon grid
    const icons=(v.services||[]).map(sid=>{
      const r=calcPct(v,sid);
      const col=TIER_COL[r.tier];
      const bg=TIER_BG[r.tier];
      // Due info line
      const parts=[];
      if(r.kl!==null) parts.push(r.kl<=0?"Jetzt!":fkm(r.kl));
      if(r.ml!==null) parts.push(r.ml<=0?"Jetzt!":r.ml+" Mon.");
      const dueStr=parts.join(" / ");
      return`<div class="iblock" title="${SVC_LABELS[sid]||sid}">
        <div class="iico" style="background:${bg};color:${col}"><ha-icon icon="${SVC_ICONS[sid]||"mdi:wrench"}"></ha-icon></div>
        <div class="ilbl">${(SVC_LABELS[sid]||sid).split(" ")[0]}</div>
        <div class="idue" style="color:${col}">${dueStr}</div>
      </div>`;
    }).join("");

    // Tyre status
    const tires=v.tires||[];
    let tireIcon="";
    if(tires.length){
      const lat=tires[tires.length-1];
      const tt=lat.type||"summer"; const wm=TIRE_WARN[tt]||3; const mKm=parseInt(lat.km)||0;
      let worst=999;
      ["vl","vr","hl","hr"].forEach(pos=>{
        const orig=parseFloat(lat[pos])||0;
        if(orig){const worn=Math.max(0,orig-Math.max(0,(v.km||0)-mKm)*WEAR);if(worn<worst)worst=worn;}
      });
      const col=worst<=TIRE_MIN?"#A32D2D":worst<=wm?"#BA7517":"#3B6D11";
      const bg=worst<=TIRE_MIN?"#FCEBEB":worst<=wm?"#FAEEDA":"#EAF3DE";
      const tLbl={summer:"Sommer",winter:"Winter",allseason:"Ganzjahr"}[tt]||tt;
      tireIcon=`<div class="iblock" title="Reifen \u2013 ${tLbl}">
        <div class="iico" style="background:${bg};color:${col}"><ha-icon icon="mdi:tire"></ha-icon></div>
        <div class="ilbl">Reifen</div>
        <div class="idue" style="color:${col}">${worst<=TIRE_MIN?"Kritisch":worst<=wm?"Grenzw.":"OK"}</div>
      </div>`;
    }

    return `${pills}
      <div class="chdr">
        ${lg}
        <div>
          <div class="cvtit">${v.make||""} ${v.model||""}</div>
          <div class="cvkm">${fkm(v.km)}</div>
        </div>
      </div>
      <div class="igrid">${icons}${tireIcon}</div>`;
  }

  _bindCompact() {
    this.shadowRoot.querySelectorAll(".cpill").forEach(b=>b.addEventListener("click",()=>{this._cur=parseInt(b.dataset.ci);this._paint();}));
  }

  getCardSize() { return 3; }
  static getStubConfig() { return {}; }

  _css() { return `
    ha-card{background:var(--card-background-color,#1c1c1e);border-radius:12px}
    .w{padding:10px 12px 12px;font-family:var(--primary-font-family,sans-serif);color:var(--primary-text-color)}
    .loading{display:flex;align-items:center;justify-content:center;padding:12px}
    .spin{width:16px;height:16px;border:2px solid var(--divider-color);border-top-color:var(--primary-color);border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .cpills{display:flex;gap:4px;margin-bottom:8px}
    .cpill{padding:2px 6px;border:1px solid var(--divider-color);border-radius:12px;cursor:pointer;background:none;display:flex;align-items:center;gap:3px}
    .cpill.on{background:var(--primary-color);border-color:var(--primary-color)}
    .cplogo,.cpinit{width:12px;height:12px;object-fit:contain}
    .chdr{display:flex;align-items:center;gap:8px;margin-bottom:10px}
    .clogo{width:28px;height:28px;object-fit:contain}
    .cinit{width:28px;height:28px;border-radius:50%;background:var(--secondary-background-color);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0}
    .cvtit{font-size:13px;font-weight:500}
    .cvkm{font-size:11px;color:var(--secondary-text-color)}
    .igrid{display:flex;flex-wrap:wrap;gap:6px}
    .iblock{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:52px}
    .iico{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;--mdc-icon-size:20px}
    .ilbl{font-size:9px;color:var(--secondary-text-color);text-align:center;max-width:52px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
    .idue{font-size:9px;font-weight:500;text-align:center;max-width:52px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
  `; }
}

if (!customElements.get("vehicle-service-compact-card")) { customElements.define("vehicle-service-compact-card", VehicleServiceCompactCard); }

window.customCards = window.customCards || [];
window.customCards = window.customCards.filter(c => c.type !== "vehicle-service-compact-card");
window.customCards.push({
  type:        "vehicle-service-compact-card",
  name:        "Vehicle Service Manager \u2013 Kompakt",
  description: "Kompakte Icon-\u00DCbersicht mit Farbstatus und F\u00E4lligkeitsanzeige",
  preview:     true,
  documentationURL: "https://github.com/toxictody1337/vehicle-service-manager",
});
window.dispatchEvent(new CustomEvent("ll-custom-cards-updated"));
