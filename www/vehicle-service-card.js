/**
 * Vehicle Service Manager \u2013 Lovelace Cards v1.6
 * Loads vehicle-service-compact-card.js automatically.
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
  oil:          "mdi:oil",
  inspection:   "mdi:clipboard-check-outline",
  brake_fluid:  "mdi:car-brake-alert",
  cabin_filter: "mdi:fan",
  air_filter:   "mdi:air-filter",
  spark_plugs:  "mdi:lightning-bolt",
  fuel_filter:  "mdi:gas-station",
  gearbox:      "mdi:car-manual-transmission",
  haldex:       "mdi:car-4wd",
  ac:           "mdi:air-conditioner",
  hu:           "mdi:car-search",
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
// FULL CARD
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

class VehicleServiceCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode:"open"});
    this._hass=null; this._vehicles=[]; this._vehicleIds=[];
    this._cur=0; this._tab="status"; this._loading=true;
    this._err=null; this._modal=null;
  }
  setConfig(c) { this._config = c; }
  set hass(h) { const first=!this._hass; this._hass=h; if(first) this._load(); }

  async _load() {
    this._loading=true; this._err=null; this._paint();
    try {
      const r = await this._hass.callWS({type:`${DOMAIN}/vehicles`});
      const entries = Object.entries(r.vehicles || {});
      this._vehicleIds = entries.map(([id])=>id);
      this._vehicles   = entries.map(([,v])=>v);
      this._loading = false;
    } catch(e) { this._err=`${e.message||e}`; this._loading=false; }
    this._paint();
  }

  async _ws(msg) {
    try { await this._hass.callWS(msg); await this._load(); }
    catch(e) { alert("Fehler: "+(e.message||e)); await this._load(); }
  }

  _v()   { return this._vehicles[this._cur]; }
  _vid() { return this._vehicleIds[this._cur]; }

  _paint() {
    let body = "";
    if (this._loading) body=`<div class="loading"><div class="spin"></div>Lade\u2026</div>`;
    else if (this._err) body=`<div class="errbox"><b>Fehler</b><br>${this._err}</div>`;
    else if (!this._vehicles.length) body=`<div class="empty-big">Keine Fahrzeuge.<br><b>Einstellungen \u2192 Integrationen \u2192 + \u2192 Vehicle Service Manager</b></div>`;
    else body = this._main();
    this.shadowRoot.innerHTML = `<style>${this._css()}</style><ha-card><div class="w">${body}${this._modal||""}</div></ha-card>`;
    this._bind();
  }

  _main() {
    return this._pills() + this._vhdr() + this._metrics() + this._tabbar() + this._content();
  }

  _pills() {
    return `<div class="pills">${this._vehicles.map((v,i)=>{
      const lg=logoHtml(v.make||"",16);
      return `<button class="pill${i===this._cur?" on":""}" data-i="${i}">${lg}${v.make||""} ${v.model||""}</button>`;
    }).join("")}</div>`;
  }

  _vhdr() {
    const v=this._v();
    const lg=logoHtml(v.make||"",16);
    return `<div class="vhdr">${lg}<div>
      <div class="vtit">${v.make||""} ${v.model||""}</div>
      <div class="vmeta">
        ${v.plate?`<span class="chip">${v.plate}</span>`:""}
        ${v.ezDate?`<span class="chip">EZ ${fd(v.ezDate)}</span>`:""}
        ${v.entity?`<span class="chip live">\u2B24 Live KM</span>`:""}
      </div>
    </div></div>`;
  }

  _metrics() {
    const v=this._v();
    let ok=0, warn=0, crit=0;
    for (const sid of (v.services||[])) {
      const {tier}=calcPct(v,sid);
      if (tier==="green") ok++;
      else if (tier==="yellow") warn++;
      else crit++;
    }
    const reps=(v.repairs||[]).length;
    return `<div class="mets">
      <div class="met" style="cursor:pointer" id="met-km" title="KM-Stand aktualisieren">
        <div class="ml">Kilometerstand <span style="font-size:9px;color:var(--primary-color)">\u270E</span></div>
        <div class="mv">${fkm(v.km)}</div>
      </div>
      <div class="met"><div class="ml" style="color:#3B6D11">\u2713 OK</div><div class="mv" style="color:#3B6D11">${ok}</div></div>
      <div class="met"><div class="ml" style="color:#BA7517">\u26A1 Bald</div><div class="mv" style="color:#BA7517">${warn}</div></div>
      <div class="met"><div class="ml" style="color:#A32D2D">\u26A0 F\u00E4llig</div><div class="mv" style="color:#A32D2D">${crit}</div></div>
    </div>`;
  }

  _tabbar() {
    const tabs=[
      {id:"status",  l:"Service Status"},
      {id:"history", l:"Service Historie"},
      {id:"repairs", l:"Reparaturen"},
      {id:"tires",   l:"Reifen"},
    ];
    return `<div class="tabbar">${tabs.map(t=>`<button class="tab${this._tab===t.id?" on":""}" data-tab="${t.id}">${t.l}</button>`).join("")}</div>`;
  }

  _content() {
    const v=this._v();
    if (this._tab==="status")  return this._status(v);
    if (this._tab==="history") return this._history(v);
    if (this._tab==="repairs") return this._repairs(v);
    if (this._tab==="tires")   return this._tires(v);
    return "";
  }

  // \u2500\u2500 Service Status \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  _status(v) {
    if (!(v.services||[]).length) return `<div class="tc"><div class="empty">Keine Service-Punkte konfiguriert.</div></div>`;

    const rows = (v.services||[]).map(sid => {
      const r    = calcPct(v, sid);
      const last = (v.lastService||{})[sid]||{};
      const intv = (v.intervals||{})[sid]||{};
      const col  = TIER_COL[r.tier], bg = TIER_BG[r.tier];

      const lastStr = last.date
        ? `${fd(last.date)}${last.km?" \u00B7 "+fkm(last.km):""}`
        : v.ezDate ? `Kein Eintrag \u2013 Basis: EZ ${fd(v.ezDate)}` : "Kein Eintrag";

      // Status label
      const statusLbl = r.tier==="red"
        ? (r.pct>=100 ? "\u00DCberf\u00E4llig" : "F\u00E4llig bald")
        : r.tier==="yellow" ? "Im Blick" : "OK";

      // Next due info
      const parts=[];
      if (r.kl !== null) parts.push(r.kl<=0 ? "km \u00FCberf\u00E4llig" : fkm(r.kl));
      if (r.ml !== null) parts.push(r.ml<=0 ? "Zeit abgelaufen" : r.ml+" Mon.");

      return `<div class="srow">
        <div class="sico" style="background:${bg};color:${col}"><ha-icon icon="${SVC_ICONS[sid]||"mdi:wrench"}"></ha-icon></div>
        <div class="sbod">
          <div class="snm">${SVC_LABELS[sid]||sid}</div>
          <div class="slt">${lastStr}</div>
          <div class="pbar"><div class="pfil" style="width:${r.pct}%;background:${col}"></div></div>
        </div>
        <div class="srt">
          <span class="badge" style="background:${bg};color:${col}">${statusLbl}</span>
          <div class="ssub">${parts.join(" \u00B7 ")}</div>
        </div>
      </div>`;
    }).join("");

    return `<div class="tc">${rows}</div>`;
  }

  // \u2500\u2500 Service Historie \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  _history(v) {
    const hist = [...(v.history||[])].sort((a,b)=>new Date(b.date)-new Date(a.date));
    const rows = hist.map((h,i) => {
      const chips = (h.services||[]).map(sid =>
        `<span class="chip2"><ha-icon icon="${SVC_ICONS[sid]||"mdi:wrench"}" style="--mdc-icon-size:11px"></ha-icon>${SVC_LABELS[sid]||sid}</span>`
      ).join("");
      const editBtn = h.auto ? "" : `<button class="ibtn edit-svc" data-idx="${i}" title="Bearbeiten">\u270E</button>`;
      return `<div class="hrow">
        <div class="hd">${fd(h.date)}${h.auto?`<span class="atag">auto</span>`:""}<div class="hkm">${fkm(h.km)}</div></div>
        <div class="hb">${h.notes?`<div class="hn">${h.notes}</div>`:""}<div class="chrow">${chips}</div></div>
        <div style="display:flex;gap:2px;align-items:flex-start;padding-top:2px">${editBtn}<button class="ibtn del-svc" data-idx="${i}" title="L\u00F6schen">\u2715</button></div>
      </div>`;
    }).join("");

    return `<div class="tc">
      <div class="shdr">
        <span>Eintr\u00E4ge</span>
        <button class="addbtn" id="btn-svc">+ Eintrag hinzuf\u00FCgen</button>
      </div>
      ${rows||`<div class="empty">Noch keine Eintr\u00E4ge.</div>`}
    </div>`;
  }

  // \u2500\u2500 Reparaturen \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  _repairs(v) {
    const reps = [...(v.repairs||[])].sort((a,b)=>new Date(b.date)-new Date(a.date));
    const rows = reps.map((r,i) => `<div class="rrow">
      <div class="rico"><ha-icon icon="mdi:wrench"></ha-icon></div>
      <div class="rbod">
        <div class="rnm">${REP_LABELS[r.cat]||r.cat}</div>
        ${r.desc?`<div class="rdsc">${r.desc}</div>`:""}
        <div class="rmt">${fd(r.date)}${r.km?" \u00B7 "+fkm(r.km):""}</div>
      </div>
      ${r.cost?`<div class="rco">${parseFloat(r.cost).toLocaleString("de-DE",{minimumFractionDigits:0})} \u20AC</div>`:""}
      <button class="ibtn del-rep" data-idx="${i}" title="L\u00F6schen">\u2715</button>
    </div>`).join("");

    return `<div class="tc">
      <div class="shdr">
        <span>Reparaturen &amp; Verschlei\u00DF</span>
        <button class="addbtn" id="btn-rep">+ Hinzuf\u00FCgen</button>
      </div>
      ${rows||`<div class="empty">Noch keine Reparaturen.</div>`}
    </div>`;
  }

  // \u2500\u2500 Reifen \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  _tires(v) {
    const curKm = v.km || 0;
    const tires = v.tires || [];

    const history = [...tires].sort((a,b)=>new Date(b.date)-new Date(a.date));
    const latest  = tires.length ? tires[tires.length-1] : null;

    // Current tyre status
    let currentHtml = `<div class="empty">Noch keine Reifen eingetragen.</div>`;
    if (latest) {
      const tt   = latest.type || "summer";
      const wm   = TIRE_WARN[tt] || 3;
      const mKm  = parseInt(latest.km) || 0;
      const sz   = latest.width&&latest.ratio&&latest.rim ? `${latest.width}/${latest.ratio} R${latest.rim}` : "";
      const dot  = latest.dot&&latest.dot.length===4 ? `DOT ${latest.dot} \u00B7 KW ${latest.dot.slice(0,2)}/20${latest.dot.slice(2,4)}` : "";
      const tLbl = {summer:"Sommerreifen",winter:"Winterreifen",allseason:"Ganzjahresreifen"}[tt]||tt;
      const aLbl = {all:"Alle vier",front:"VA",rear:"HA"}[latest.axle]||"";

      // Overall tyre status (worst wheel)
      let worstDepth = 999;
      ["vl","vr","hl","hr"].forEach(pos=>{
        const orig=parseFloat(latest[pos])||0;
        if(orig){
          const driven=Math.max(0,curKm-mKm);
          const worn=Math.max(0,orig-driven*WEAR);
          if(worn<worstDepth) worstDepth=worn;
        }
      });
      const overallCol = worstDepth<=TIRE_MIN?"#A32D2D":worstDepth<=wm?"#BA7517":"#3B6D11";
      const overallLbl = worstDepth<=TIRE_MIN?"Kritisch!":worstDepth<=wm?"Grenzwertig":"OK";

      const wheels = ["vl","vr","hl","hr"].map((pos,i)=>{
        const orig=parseFloat(latest[pos])||0;
        if(!orig) return `<div class="tw"><div class="twp">${["VL","VR","HL","HR"][i]}</div><div class="twv" style="color:var(--secondary-text-color)">\u2014</div></div>`;
        const driven=Math.max(0,curKm-mKm);
        const worn=Math.max(0,orig-driven*WEAR).toFixed(1);
        const col=worn<=TIRE_MIN?"#A32D2D":worn<=wm?"#BA7517":"#3B6D11";
        const lbl=worn<=TIRE_MIN?"Kritisch":worn<=wm?"Grenzwertig":"OK";
        const pct=Math.min(100,Math.max(0,(worn/orig)*100));
        const kml=Math.round(Math.max(0,(worn-wm)/WEAR));
        return `<div class="tw">
          <div class="twp">${["VL","VR","HL","HR"][i]}</div>
          <div class="twv" style="color:${col}">${worn} mm</div>
          <div class="twbar"><div style="width:${pct}%;background:${col};height:100%;border-radius:2px"></div></div>
          <div class="twl" style="color:${col}">${lbl}</div>
          ${worn>wm?`<div class="twkm">~${kml.toLocaleString("de-DE")} km</div>`:""}
        </div>`;
      }).join("");

      currentHtml = `
        <div class="tire-status-header">
          <div class="tire-type-badge" style="background:${overallCol}20;color:${overallCol};border:1px solid ${overallCol}40">
            <ha-icon icon="${tt==="winter"?"mdi:snowflake":tt==="allseason"?"mdi:weather-partly-cloudy":"mdi:weather-sunny"}" style="--mdc-icon-size:14px"></ha-icon>
            ${tLbl}
          </div>
          <div class="tire-overall" style="color:${overallCol}">\u25CF ${overallLbl}</div>
        </div>
        <div class="tire-info-row">
          ${aLbl?`<span class="ms">${aLbl}</span>`:""}
          ${sz?`<span class="ms mono">${sz}</span>`:""}
          ${latest.brand?`<span class="ms">${latest.brand}</span>`:""}
          ${dot?`<span class="ms">${dot}</span>`:""}
          <span class="ms">Aufgezogen: ${fd(latest.date)}</span>
        </div>
        <div class="tgrid">${wheels}</div>
        <div class="tnote">Verschlei\u00DF: 1,5 mm / 10.000 km \u00B7 Empf. Grenze: ${wm} mm \u00B7 Gesetzl. Min.: 1,6 mm</div>`;
    }

    // Tyre history
    const histRows = history.map((t,i)=>{
      const tt=t.type||"summer";
      const tLbl={summer:"Sommerreifen",winter:"Winterreifen",allseason:"Ganzjahresreifen"}[tt]||tt;
      const sz=t.width&&t.ratio&&t.rim?`${t.width}/${t.ratio} R${t.rim}`:"";
      return`<div class="hrow" style="grid-template-columns:100px 1fr auto">
        <div class="hd">${fd(t.date)}<div class="hkm">${fkm(t.km)}</div></div>
        <div class="hb">
          <div style="font-size:12px;font-weight:500">${tLbl}${sz?` \u00B7 <span style="font-family:monospace">${sz}</span>`:""}</div>
          ${t.brand?`<div style="font-size:11px;color:var(--secondary-text-color)">${t.brand}</div>`:""}
        </div>
        <button class="ibtn del-tire" data-idx="${i}" title="L\u00F6schen">\u2715</button>
      </div>`;
    }).join("");

    return `<div class="tc">
      <div class="shdr">
        <span>Aktuell montiert</span>
        <button class="addbtn" id="btn-tire">+ Reifen eintragen</button>
      </div>
      <div class="tcard">${currentHtml}</div>
      ${history.length>1?`<div class="shdr" style="margin-top:14px"><span>Reifenhistorie</span></div>${histRows}`:""}
    </div>`;
  }

  // \u2500\u2500 Modals \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  _showSvcModal() {
    const v=this._v();
    const svcs=(v.services||[]).map(sid=>`
      <label class="cblabel" id="cbl-${sid}">
        <input type="checkbox" class="svc-cb" value="${sid}"> ${SVC_LABELS[sid]||sid}
      </label>`).join("");
    this._modal=`<div class="overlay" id="modal">
      <div class="mbox">
        <div class="mhdr">Service-Eintrag <button class="closebtn" id="mclose">\u2715</button></div>
        <div class="mrow2">${inp("m-date","date","",today())} ${inp("m-km","number","Kilometerstand",v.km||"")}</div>
        <div class="mfld"><label>Durchgef\u00FChrte Arbeiten</label><div class="cbgrid">${svcs}</div></div>
        <div class="mfld"><label>Notizen (optional)</label>${inp("m-notes","text","Werkstatt, Bemerkungen...")}</div>
        <div class="mbtn-row"><button class="sbtn" id="m-save-svc">Speichern</button></div>
      </div></div>`;
    this._paint();
  }

  _showRepModal() {
    const v=this._v();
    const catOpts=Object.entries(REP_LABELS).map(([k,l])=>({v:k,l}));
    this._modal=`<div class="overlay" id="modal">
      <div class="mbox">
        <div class="mhdr">Reparatur hinzuf\u00FCgen <button class="closebtn" id="mclose">\u2715</button></div>
        <div class="mrow2">${inp("r-date","date","",today())} ${inp("r-km","number","Kilometerstand",v.km||"")}</div>
        <div class="mfld"><label>Kategorie</label>${sel("r-cat",catOpts)}</div>
        <div class="mfld"><label>Beschreibung (optional)</label>${inp("r-desc","text","z.B. Bremsbel\u00E4ge Textar")}</div>
        <div class="mfld"><label>Kosten in \u20AC (optional)</label>${inp("r-cost","number","z.B. 180")}</div>
        <div class="mbtn-row"><button class="sbtn" id="m-save-rep">Speichern</button></div>
      </div></div>`;
    this._paint();
  }

  _showTireModal() {
    const v=this._v();
    const wOpts=WIDTHS.map(w=>({v:w,l:w}));
    const rOpts=RATIOS.map(r=>({v:r,l:r}));
    const rimOpts=RIMS.map(r=>({v:r,l:r}));
    const pOpts=PROF_STEPS.map(p=>({v:p,l:p.toFixed(1)+" mm"}));
    this._modal=`<div class="overlay" id="modal">
      <div class="mbox">
        <div class="mhdr">Reifen eintragen <button class="closebtn" id="mclose">\u2715</button></div>
        <div class="mrow2">${inp("t-date","date","",today())} ${inp("t-km","number","Kilometerstand",v.km||"")}</div>
        <div class="mrow2">
          <div class="mfld"><label>Typ</label>${sel("t-type",[{v:"summer",l:"Sommerreifen"},{v:"winter",l:"Winterreifen"},{v:"allseason",l:"Ganzjahresreifen"}])}</div>
          <div class="mfld"><label>Achse</label>${sel("t-axle",[{v:"all",l:"Alle vier"},{v:"front",l:"Vorderachse (VA)"},{v:"rear",l:"Hinterachse (HA)"}])}</div>
        </div>
        <div class="mfld"><label>Reifengr\u00F6\u00DFe</label>
          <div class="sizerow">${sel("t-w",wOpts,"205")}<span class="sep">/</span>${sel("t-r",rOpts,"55")}<span class="sep">R</span>${sel("t-rim",rimOpts,"16")}</div>
          <div class="sizeprev" id="sp">\u2192 205/55 R16</div>
        </div>
        <div class="mrow2">
          <div class="mfld"><label>Marke (optional)</label>${inp("t-brand","text","z.B. Michelin")}</div>
          <div class="mfld"><label>DOT (4 Ziffern)</label>${inp("t-dot","text","z.B. 2323","","maxlength='4' pattern='[0-9]{4}'")}
            <div class="dotprev" id="dp"></div></div>
        </div>
        <div class="mfld"><label>Profiltiefe bei Aufziehen</label>
          <div class="profgrid">
            <div><label class="plbl">VL</label>${sel("t-vl",pOpts,"8.0")}</div>
            <div><label class="plbl">VR</label>${sel("t-vr",pOpts,"8.0")}</div>
            <div><label class="plbl">HL</label>${sel("t-hl",pOpts,"8.0")}</div>
            <div><label class="plbl">HR</label>${sel("t-hr",pOpts,"8.0")}</div>
          </div>
        </div>
        <div class="mbtn-row"><button class="sbtn" id="m-save-tire">Speichern</button></div>
      </div></div>`;
    this._paint();
  }

  _showKmModal() {
    const v=this._v();
    this._modal=`<div class="overlay" id="modal">
      <div class="mbox" style="max-width:340px">
        <div class="mhdr">Kilometerstand aktualisieren <button class="closebtn" id="mclose">\u2715</button></div>
        <div class="mfld">
          <label>Aktueller Kilometerstand</label>
          <input id="km-val" type="number" value="${v.km||0}" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--divider-color);background:var(--secondary-background-color);color:var(--primary-text-color);font-size:18px;font-weight:500;box-sizing:border-box;text-align:right"/>
        </div>
        <div style="font-size:11px;color:var(--secondary-text-color);margin-bottom:12px">
          Aktuell gespeichert: <b>${fkm(v.km)}</b>
          ${v.entity?`<br><span style="color:var(--primary-color)">\u2B24 Live KM aktiv (${v.entity})</span>`:""}
        </div>
        <div class="mbtn-row"><button class="sbtn" id="m-save-km">Speichern</button></div>
      </div></div>`;
    this._paint();
  }

  _showEditSvcModal(hist, sortedIdx) {
    const v=this._v();
    const h=hist[sortedIdx];
    const svcs=(v.services||[]).map(sid=>{
      const checked=(h.services||[]).includes(sid)?"checked":"";
      return`<label class="cblabel" id="cbl-${sid}">
        <input type="checkbox" class="svc-cb" value="${sid}" ${checked}> ${SVC_LABELS[sid]||sid}
      </label>`;
    }).join("");
    this._editIdx=sortedIdx;
    this._editHist=hist;
    this._modal=`<div class="overlay" id="modal">
      <div class="mbox">
        <div class="mhdr">Service-Eintrag bearbeiten <button class="closebtn" id="mclose">\u2715</button></div>
        <div class="mrow2">
          <input id="m-date" type="date" value="${h.date}"/>
          <input id="m-km" type="number" value="${h.km||0}"/>
        </div>
        <div class="mfld"><label>Durchgef\u00FChrte Arbeiten</label><div class="cbgrid">${svcs}</div></div>
        <div class="mfld"><label>Notizen (optional)</label><input id="m-notes" type="text" value="${h.notes||""}" placeholder="Werkstatt, Bemerkungen..."/></div>
        <div class="mbtn-row"><button class="sbtn" id="m-save-edit-svc">Aktualisieren</button></div>
      </div></div>`;
    this._paint();
  }

  _closeModal() { this._modal=null; this._editIdx=null; this._editHist=null; this._paint(); }

  // \u2500\u2500 Event binding \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  _bind() {
    const s = this.shadowRoot;
    s.querySelectorAll(".pill").forEach(b=>b.addEventListener("click",()=>{this._cur=parseInt(b.dataset.i);this._paint();}));
    s.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{this._tab=b.dataset.tab;this._paint();}));

    s.getElementById("btn-svc")?.addEventListener("click",()=>this._showSvcModal());
    s.getElementById("btn-rep")?.addEventListener("click",()=>this._showRepModal());
    s.getElementById("btn-tire")?.addEventListener("click",()=>this._showTireModal());
    s.getElementById("mclose")?.addEventListener("click",()=>this._closeModal());

    // Delete service history
    s.querySelectorAll(".del-svc").forEach(b=>b.addEventListener("click",async()=>{
      if(!confirm("Eintrag l\u00F6schen?"))return;
      const v=this._v(); const vid=this._vid();
      const hist=[...(v.history||[])].sort((a,b2)=>new Date(b2.date)-new Date(a.date));
      const h=hist[parseInt(b.dataset.idx)];
      const ri=(v.history||[]).findIndex(x=>x.date===h.date&&x.km===h.km&&JSON.stringify(x.services)===JSON.stringify(h.services));
      await this._ws({type:`${DOMAIN}/delete_service_entry`,vehicle_id:vid,entry_index:ri});
    }));

    // Delete repair
    s.querySelectorAll(".del-rep").forEach(b=>b.addEventListener("click",async()=>{
      if(!confirm("Reparatur l\u00F6schen?"))return;
      const v=this._v(); const vid=this._vid();
      const reps=[...(v.repairs||[])].sort((a,b2)=>new Date(b2.date)-new Date(a.date));
      const r=reps[parseInt(b.dataset.idx)];
      const ri=(v.repairs||[]).findIndex(x=>x.date===r.date&&x.cat===r.cat);
      await this._ws({type:`${DOMAIN}/delete_repair`,vehicle_id:vid,repair_index:ri});
    }));

    // Delete tire
    s.querySelectorAll(".del-tire").forEach(b=>b.addEventListener("click",async()=>{
      if(!confirm("Reifeneintrag l\u00F6schen?"))return;
      const v=this._v(); const vid=this._vid();
      const ti=[...(v.tires||[])].sort((a,b2)=>new Date(b2.date)-new Date(a.date));
      const t=ti[parseInt(b.dataset.idx)];
      const ri=(v.tires||[]).findIndex(x=>x.date===t.date&&x.km===t.km);
      await this._ws({type:`${DOMAIN}/delete_tire`,vehicle_id:vid,tire_index:ri});
    }));

    // Save service entry
    s.getElementById("m-save-svc")?.addEventListener("click",async()=>{
      const vid=this._vid();
      const date=s.getElementById("m-date").value;
      const km=parseInt(s.getElementById("m-km").value)||0;
      const notes=s.getElementById("m-notes").value;
      const services=[...s.querySelectorAll(".svc-cb:checked")].map(x=>x.value);
      if(!date){alert("Bitte Datum eingeben.");return;}
      if(!services.length){alert("Bitte mindestens einen Service-Punkt w\u00E4hlen.");return;}
      this._closeModal();
      await this._ws({type:`${DOMAIN}/add_service_entry`,vehicle_id:vid,entry_date:date,km,services,notes});
    });

    // Save repair
    s.getElementById("m-save-rep")?.addEventListener("click",async()=>{
      const vid=this._vid();
      const date=s.getElementById("r-date").value;
      const km=parseInt(s.getElementById("r-km").value)||0;
      const category=s.getElementById("r-cat").value;
      const description=s.getElementById("r-desc").value;
      const cost=parseFloat(s.getElementById("r-cost").value)||0;
      if(!date){alert("Bitte Datum eingeben.");return;}
      this._closeModal();
      await this._ws({type:`${DOMAIN}/add_repair`,vehicle_id:vid,entry_date:date,km,category,description,cost});
    });

    // Save tire
    s.getElementById("m-save-tire")?.addEventListener("click",async()=>{
      const vid=this._vid();
      const date=s.getElementById("t-date").value;
      const km=parseInt(s.getElementById("t-km").value)||0;
      const tire_type=s.getElementById("t-type").value;
      const axle=s.getElementById("t-axle").value;
      const width=parseInt(s.getElementById("t-w").value);
      const ratio=parseInt(s.getElementById("t-r").value);
      const rim=parseInt(s.getElementById("t-rim").value);
      const brand=s.getElementById("t-brand").value;
      const dot=s.getElementById("t-dot").value.replace(/\D/g,"").slice(0,4);
      const vl=parseFloat(s.getElementById("t-vl").value)||0;
      const vr=parseFloat(s.getElementById("t-vr").value)||0;
      const hl=parseFloat(s.getElementById("t-hl").value)||0;
      const hr=parseFloat(s.getElementById("t-hr").value)||0;
      if(!date){alert("Bitte Datum eingeben.");return;}
      this._closeModal();
      await this._ws({type:`${DOMAIN}/add_tire`,vehicle_id:vid,entry_date:date,km,tire_type,axle,width,ratio,rim,brand,dot,vl,vr,hl,hr});
    });

    // KM update
    s.getElementById("met-km")?.addEventListener("click",()=>this._showKmModal());
    s.getElementById("m-save-km")?.addEventListener("click",async()=>{
      const vid=this._vid();
      const km=parseInt(s.getElementById("km-val").value)||0;
      this._closeModal();
      await this._ws({type:`${DOMAIN}/update_km`,vehicle_id:vid,km});
    });

    // Edit service entry
    s.querySelectorAll(".edit-svc").forEach(b=>b.addEventListener("click",()=>{
      const v=this._v();
      const hist=[...(v.history||[])].sort((a,b2)=>new Date(b2.date)-new Date(a.date));
      this._showEditSvcModal(hist, parseInt(b.dataset.idx));
    }));

    // Save edited service entry
    s.getElementById("m-save-edit-svc")?.addEventListener("click",async()=>{
      const vid=this._vid();
      const v=this._v();
      const date=s.getElementById("m-date").value;
      const km=parseInt(s.getElementById("m-km").value)||0;
      const notes=s.getElementById("m-notes").value;
      const services=[...s.querySelectorAll(".svc-cb:checked")].map(x=>x.value);
      if(!date){alert("Bitte Datum eingeben.");return;}
      if(!services.length){alert("Bitte mindestens einen Service-Punkt w\u00E4hlen.");return;}
      // Find real index in original (unsorted) history
      const h=this._editHist[this._editIdx];
      const ri=(v.history||[]).findIndex(x=>x.date===h.date&&x.km===h.km&&JSON.stringify(x.services)===JSON.stringify(h.services));
      this._closeModal();
      await this._ws({type:`${DOMAIN}/update_service_entry`,vehicle_id:vid,entry_index:ri,entry_date:date,km,services,notes});
    });

    // Tyre size preview
    ["t-w","t-r","t-rim"].forEach(id=>{
      s.getElementById(id)?.addEventListener("change",()=>{
        const w=s.getElementById("t-w")?.value,r=s.getElementById("t-r")?.value,rim=s.getElementById("t-rim")?.value;
        const el=s.getElementById("sp"); if(el)el.textContent=`\u2192 ${w}/${r} R${rim}`;
      });
    });
    s.getElementById("t-dot")?.addEventListener("input",e=>{
      const v=e.target.value.replace(/\D/g,"").slice(0,4); e.target.value=v;
      const el=s.getElementById("dp"); if(el)el.textContent=v.length===4?`KW ${v.slice(0,2)} / 20${v.slice(2,4)}`:"";
    });
  }

  getCardSize() { return 8; }
  static getStubConfig() { return {}; }

  _css() { return `
    ha-card{background:var(--card-background-color,#1c1c1e);border-radius:12px}
    .w{padding:12px 14px 16px;font-family:var(--primary-font-family,sans-serif);color:var(--primary-text-color);position:relative}
    .loading{display:flex;align-items:center;gap:10px;padding:24px;color:var(--secondary-text-color);font-size:13px}
    .spin{width:18px;height:18px;border:2px solid var(--divider-color);border-top-color:var(--primary-color);border-radius:50%;animation:spin .8s linear infinite;flex-shrink:0}
    @keyframes spin{to{transform:rotate(360deg)}}
    .errbox{padding:14px;background:rgba(163,45,45,.12);border:1px solid #A32D2D;border-radius:8px;font-size:12px;line-height:1.6}
    .empty-big,.empty{text-align:center;padding:20px;color:var(--secondary-text-color);font-size:12px;line-height:1.7}
    .pills{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
    .pill{display:flex;align-items:center;gap:5px;padding:4px 10px;border:1px solid var(--divider-color);border-radius:20px;cursor:pointer;font-size:12px;color:var(--secondary-text-color);background:none}
    .pill.on{background:var(--primary-color);color:#fff;border-color:var(--primary-color)}
    .plogo{width:14px;height:14px;object-fit:contain}
    .pinit{width:14px;height:14px;border-radius:50%;background:var(--secondary-background-color);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:600}
    .vhdr{display:flex;align-items:center;gap:10px;margin-bottom:12px}
    .vlogo{width:34px;height:34px;object-fit:contain}
    .vinit{width:34px;height:34px;border-radius:50%;background:var(--secondary-background-color);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:600;flex-shrink:0}
    .vtit{font-size:16px;font-weight:500}
    .vmeta{display:flex;gap:5px;flex-wrap:wrap;margin-top:3px}
    .chip{font-size:11px;padding:1px 7px;border-radius:20px;border:1px solid var(--divider-color);color:var(--secondary-text-color)}
    .chip.live{background:var(--info-color,#2196F3);color:#fff;border-color:transparent}
    .mets{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
    .met{background:var(--secondary-background-color);border-radius:8px;padding:8px 10px}
    .ml{font-size:11px;color:var(--secondary-text-color);margin-bottom:2px}
    .mv{font-size:17px;font-weight:500}
    .tabbar{display:flex;border-bottom:1px solid var(--divider-color);margin-bottom:12px;overflow-x:auto}
    .tab{padding:7px 12px;font-size:12px;font-weight:500;cursor:pointer;border:none;background:none;color:var(--secondary-text-color);border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap}
    .tab.on{color:var(--primary-text-color);border-bottom-color:var(--primary-color)}
    .tc{}
    .srow{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--divider-color)}
    .srow:last-child{border-bottom:none}
    .sico{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;--mdc-icon-size:20px}
    .sbod{flex:1;min-width:0}
    .snm{font-size:13px;font-weight:500}
    .slt{font-size:11px;color:var(--secondary-text-color);margin-top:1px}
    .pbar{height:4px;border-radius:2px;background:var(--divider-color);overflow:hidden;margin:4px 0 2px}
    .pfil{height:100%;border-radius:2px;transition:width .4s}
    .srt{flex-shrink:0;text-align:right;padding-left:8px}
    .ssub{font-size:10px;color:var(--disabled-text-color);margin-top:3px;white-space:nowrap}
    .badge{display:inline-flex;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:500}
    .shdr{display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:500;margin-bottom:8px}
    .addbtn{padding:4px 10px;font-size:11px;border-radius:20px;border:1px solid var(--primary-color);color:var(--primary-color);background:none;cursor:pointer}
    .addbtn:hover{background:rgba(33,150,243,.1)}
    .hrow{display:grid;grid-template-columns:110px 1fr auto;gap:10px;padding:9px 0;border-bottom:1px solid var(--divider-color)}
    .hrow:last-child{border-bottom:none}
    .hd{font-size:12px;font-weight:500}
    .hkm{font-size:10px;color:var(--disabled-text-color);margin-top:2px}
    .hn{font-size:11px;color:var(--secondary-text-color);margin-bottom:4px}
    .chrow{display:flex;flex-wrap:wrap}
    .chip2{display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border-radius:20px;font-size:10px;border:1px solid var(--divider-color);background:var(--secondary-background-color);color:var(--secondary-text-color);margin:2px}
    .atag{display:inline-block;font-size:10px;padding:1px 5px;border-radius:20px;background:rgba(33,150,243,.15);color:#1565C0;margin-left:4px}
    .rrow{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--divider-color)}
    .rrow:last-child{border-bottom:none}
    .rico{width:36px;height:36px;border-radius:8px;background:var(--info-color,#2196F3);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;--mdc-icon-size:20px}
    .rbod{flex:1}
    .rnm{font-size:13px;font-weight:500}
    .rdsc{font-size:11px;color:var(--secondary-text-color);margin-top:1px}
    .rmt{font-size:10px;color:var(--disabled-text-color);margin-top:2px}
    .rco{font-size:12px;font-weight:500;flex-shrink:0;padding-top:1px}
    .ibtn{background:none;border:none;cursor:pointer;color:var(--secondary-text-color);padding:4px 6px;font-size:13px;opacity:.4;flex-shrink:0}
    .ibtn:hover{opacity:1;color:#A32D2D}
    /* Tires */
    .tcard{background:var(--secondary-background-color);border-radius:8px;padding:10px 12px;margin-bottom:8px}
    .tire-status-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
    .tire-type-badge{display:flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500}
    .tire-overall{font-size:12px;font-weight:500}
    .tire-info-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}
    .ms{font-size:11px;color:var(--secondary-text-color)}
    .mono{font-family:monospace}
    .tgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
    .tw{background:var(--card-background-color,#1c1c1e);border-radius:8px;padding:7px 8px;border:1px solid var(--divider-color)}
    .twp{font-size:10px;color:var(--disabled-text-color);font-weight:600;text-transform:uppercase;margin-bottom:3px}
    .twv{font-size:13px;font-weight:500}
    .twbar{height:4px;border-radius:2px;background:var(--divider-color);overflow:hidden;margin:3px 0 2px}
    .twl{font-size:10px;font-weight:500}
    .twkm{font-size:9px;color:var(--disabled-text-color);margin-top:1px}
    .tnote{font-size:10px;color:var(--disabled-text-color);margin-top:8px}
    /* Modal */
    .overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:999;display:flex;align-items:center;justify-content:center}
    .mbox{background:var(--card-background-color,#1c1c1e);border-radius:12px;padding:18px;width:min(460px,92vw);max-height:88vh;overflow-y:auto;border:1px solid var(--divider-color)}
    .mhdr{font-size:15px;font-weight:500;display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
    .closebtn{background:none;border:none;cursor:pointer;font-size:18px;color:var(--secondary-text-color);padding:0 4px}
    .mfld{margin-bottom:10px}
    .mfld label{display:block;font-size:12px;color:var(--secondary-text-color);margin-bottom:4px}
    .mfld input,.mfld select{width:100%;padding:7px 10px;border-radius:8px;border:1px solid var(--divider-color);background:var(--secondary-background-color);color:var(--primary-text-color);font-size:13px;box-sizing:border-box}
    .mrow2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
    .mrow2 input,.mrow2 select{width:100%;padding:7px 10px;border-radius:8px;border:1px solid var(--divider-color);background:var(--secondary-background-color);color:var(--primary-text-color);font-size:13px;box-sizing:border-box}
    .cbgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px}
    .cblabel{display:flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid var(--divider-color);border-radius:8px;cursor:pointer;font-size:12px}
    .cblabel input{width:auto;margin:0}
    .mbtn-row{display:flex;justify-content:flex-end;margin-top:14px}
    .sbtn{padding:8px 20px;background:var(--primary-color);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer}
    .sizerow{display:flex;align-items:center;gap:6px}
    .sizerow select{flex:1;padding:7px 6px;border-radius:8px;border:1px solid var(--divider-color);background:var(--secondary-background-color);color:var(--primary-text-color);font-size:13px}
    .sep{font-size:14px;font-weight:500;color:var(--secondary-text-color);flex-shrink:0}
    .sizeprev,.dotprev{font-size:11px;color:var(--secondary-text-color);margin-top:4px}
    .profgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:6px}
    .profgrid select{width:100%;padding:6px 4px;border-radius:8px;border:1px solid var(--divider-color);background:var(--secondary-background-color);color:var(--primary-text-color);font-size:12px}
    .plbl{display:block;font-size:10px;color:var(--secondary-text-color);margin-bottom:3px;font-weight:600;text-transform:uppercase}
  `; }
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

    // Vehicle pills (only if multiple vehicles)
    const pills=this._vehicles.length>1
      ? `<div class="cpills">${this._vehicles.map((vv,i)=>`
          <button class="cpill${i===this._cur?" on":""}" data-ci="${i}">
            ${logoHtml(vv.make||"",14)}
          </button>`).join("")}</div>`
      : "";

    // Header: logo + name + km
    const vLogo=logoHtml(v.make||"",28);

    // Service icons — colored squares only, no text
    const icons=(v.services||[]).map(sid=>{
      const r  =calcPct(v,sid);
      const col=TIER_COL[r.tier];
      const bg =TIER_BG[r.tier];
      return `<div class="iico" style="background:${bg};color:${col}" title="${SVC_LABELS[sid]||sid}">
        <ha-icon icon="${SVC_ICONS[sid]||"mdi:wrench"}"></ha-icon>
      </div>`;
    }).join("");

    // Tyre icon
    const tires=v.tires||[];
    let tireIco="";
    if(tires.length){
      const lat=tires[tires.length-1];
      const tt=lat.type||"summer"; const wm=TIRE_WARN[tt]||3; const mKm=parseInt(lat.km)||0;
      let worst=999;
      ["vl","vr","hl","hr"].forEach(pos=>{
        const orig=parseFloat(lat[pos])||0;
        if(orig){const worn=Math.max(0,orig-Math.max(0,(v.km||0)-mKm)*WEAR);if(worn<worst)worst=worn;}
      });
      const col=worst<=TIRE_MIN?"#A32D2D":worst<=wm?"#BA7517":"#3B6D11";
      const bg =worst<=TIRE_MIN?"#FCEBEB":worst<=wm?"#FAEEDA":"#EAF3DE";
      tireIco=`<div class="iico" style="background:${bg};color:${col}" title="Reifen">
        <ha-icon icon="mdi:car-tire-alert"></ha-icon>
      </div>`;
    }

    return `${pills}
      <div class="chdr">
        ${vLogo}
        <div class="chdr-text">
          <div class="cvtit">${v.make||""} ${v.model||""}</div>
          <div class="cvkm">${fkm(v.km)}</div>
        </div>
      </div>
      <div class="igrid">${icons}${tireIco}</div>`;
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
    .igrid{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
    .iico{width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;--mdc-icon-size:22px;flex-shrink:0}
    .chdr-text{flex:1;min-width:0}
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


customElements.define("vehicle-service-card",        VehicleServiceCard);
if (!customElements.get("vehicle-service-compact-card")) { customElements.define("vehicle-service-compact-card", VehicleServiceCompactCard); }

console.info("%c VEHICLE-SERVICE-CARD %c v1.6.0 ", "background:#1976D2;color:#fff;font-weight:bold", "background:#4CAF50;color:#fff");

window.customCards = window.customCards || [];
window.customCards = window.customCards.filter(
  c => c.type !== "vehicle-service-card" && c.type !== "vehicle-service-compact-card"
);
window.customCards.push(
  {type:"vehicle-service-card",         name:"Vehicle Service Manager",          description:"Service-Status, Reparaturen und Reifentracking",        preview:true},
  {type:"vehicle-service-compact-card", name:"Vehicle Service Manager \u2013 Kompakt",description:"Kompakte Icon-\u00DCbersicht mit Farbstatus",                 preview:true}
);
window.dispatchEvent(new CustomEvent("ll-custom-cards-updated"));