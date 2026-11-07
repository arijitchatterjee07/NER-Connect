(function () {
  'use strict';
  var KEY = 'ner-connect-demo-v2';
  var initial = {
    roads: [
      { id: 'NH-13', name: 'NH-13 · Bomdila — Tawang', district: 'West Kameng', status: 'ACCESSIBLE', condition: 18, traffic: 22, historical: 18, coords: [[26.91,92.63],[27.18,92.44],[27.43,92.12],[27.59,91.87]] },
      { id: 'NH-15', name: 'NH-15 · Dhemaji — Lakhimpur', district: 'Dhemaji', status: 'MODERATE', condition: 34, traffic: 31, historical: 42, coords: [[27.32,94.36],[27.18,94.18],[27.06,93.91]] },
      { id: 'SH-2', name: 'SH-2 · Aizawl — Lunglei', district: 'Aizawl', status: 'ACCESSIBLE', condition: 20, traffic: 18, historical: 15, coords: [[23.73,92.72],[23.35,92.76],[22.89,92.74]] }
    ],
    districts: [
      { name: 'West Kameng', accessibility: 88, weatherRisk: 22 },
      { name: 'Dhemaji', accessibility: 76, weatherRisk: 38 },
      { name: 'Tawang', accessibility: 82, weatherRisk: 24 },
      { name: 'Kamrup Metro', accessibility: 96, weatherRisk: 10 }
    ],
    weather: { rainfall: 12, floodRisk: 18, landslideRisk: 20, label: 'Clear to partly cloudy' },
    vehicles: [
      { id: 'MED-2841', cargo: 'Medical supplies', routeId: 'NH-13', route: 'Guwahati → Tawang', eta: 680, status: 'MOVING', priority: 'Critical', lat: 26.92, lng: 92.62, progress: 38 },
      { id: 'MED-2885', cargo: 'Vaccines', routeId: 'NH-13', route: 'Tezpur → Tawang', eta: 515, status: 'MOVING', priority: 'Critical', lat: 27.17, lng: 92.45, progress: 55 },
      { id: 'AGR-1059', cargo: 'Fresh produce', routeId: 'NH-15', route: 'Jorhat → Imphal', eta: 265, status: 'MOVING', priority: 'Standard', lat: 27.18, lng: 94.18, progress: 74 },
      { id: 'CON-5532', cargo: 'Construction material', routeId: 'SH-2', route: 'Silchar → Aizawl', eta: 310, status: 'DELAYED', priority: 'Standard', lat: 23.36, lng: 92.76, progress: 38 }
    ],
    deliveries: [
      { id: 'SH-02841', commodity: 'Vaccines', qty: '1,200 doses', vehicleId: 'MED-2841', origin: 'Guwahati', destination: 'Tawang', status: 'IN TRANSIT' },
      { id: 'SH-02845', commodity: 'Medical supplies', qty: '84 crates', vehicleId: 'MED-2885', origin: 'Tezpur', destination: 'Tawang', status: 'IN TRANSIT' },
      { id: 'SH-03918', commodity: 'Rice & pulses', qty: '18 tonnes', vehicleId: 'AGR-1059', origin: 'Jorhat', destination: 'Imphal', status: 'IN TRANSIT' },
      { id: 'SH-04722', commodity: 'Cement', qty: '22 tonnes', vehicleId: 'CON-5532', origin: 'Silchar', destination: 'Aizawl', status: 'DELAYED' }
    ],
    incidents: [],
    alerts: [],
    fieldReports: [],
    routes: [],
    notifications: [],
    offline: false,
    selectedVehicle: 'MED-2841',
    selectedDistrict: 'West Kameng',
    sequence: 101
  };
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function get() { try { return Object.assign(copy(initial), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch(e) { return copy(initial); } }
  var db = get(), mapLayers = [], tracking = false;
  function save() { localStorage.setItem(KEY, JSON.stringify(db)); }
  function now() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  function id(prefix) { db.sequence += 1; return prefix + '-' + String(db.sequence).padStart(4, '0'); }
  function toast(message) { if (typeof note === 'function') note(message); }
  function level(score) { return score >= 75 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 30 ? 'MODERATE' : 'LOW'; }
  function cssStatus(value) { return /BLOCK|CRIT|HIGH|RISK|DELAY|AT /.test(value) ? (value.indexOf('MODERATE') > -1 ? 'delay' : 'stop') : 'move'; }
  function chip(value) { return '<span class="status ' + cssStatus(value) + '">' + value + '</span>'; }
  function minutes(value) { var h = Math.floor(value / 60), m = value % 60; return h + 'h ' + String(m).padStart(2, '0') + 'm'; }
  function road(id) { return db.roads.filter(function (r) { return r.id === id; })[0]; }
  function vehicle(id) { return db.vehicles.filter(function (v) { return v.id === id; })[0]; }
  function risk(input) {
    var score = Math.round(input.rainfall * .20 + input.flood * .20 + input.landslide * .25 + input.condition * .15 + input.traffic * .10 + input.historical * .10);
    return { riskScore: Math.min(99, score), riskLevel: level(score), confidence: Math.max(61, 96 - Math.round(score * .25)), explanation: 'Weighted prototype assessment: rainfall 20%, flood 20%, landslide 25%, road condition 15%, traffic 10%, historical incidents 10%.', recommendedAction: score > 74 ? 'Avoid corridor and use alternate route.' : score > 45 ? 'Use with monitoring and delivery buffer.' : 'Proceed with routine monitoring.' };
  }
  function routeOptions(origin, destination, priority) {
    var r13 = road('NH-13'), r15 = road('NH-15'), critical = priority.indexOf('Emergency') > -1 || priority.indexOf('medical') > -1;
    var a = risk({ rainfall: db.weather.rainfall, flood: db.weather.floodRisk, landslide: db.weather.landslideRisk, condition: r13.condition, traffic: r13.traffic, historical: r13.historical });
    var b = risk({ rainfall: db.weather.rainfall * .65, flood: db.weather.floodRisk * .55, landslide: db.weather.landslideRisk * .45, condition: 28, traffic: 30, historical: 24 });
    var c = risk({ rainfall: 4, flood: 4, landslide: 3, condition: 5, traffic: 14, historical: 8 });
    return [
      { id: 'A', name: 'Route A · Bomdila corridor', distance: 442, eta: 680 + (r13.status === 'BLOCKED' ? 999 : a.riskScore * 2), routeId: 'NH-13', assessment: a, blocked: r13.status === 'BLOCKED', recommended: !r13.status.includes('BLOCK') && a.riskScore < b.riskScore },
      { id: 'B', name: 'Route B · Tezpur diversion', distance: 486, eta: 725 + b.riskScore, routeId: 'ALT-1', assessment: b, blocked: false, recommended: r13.status === 'BLOCKED' || b.riskScore <= a.riskScore },
      { id: 'C', name: 'Route C · Emergency air transfer', distance: 125, eta: critical ? 105 : 155, routeId: 'AIR', assessment: c, blocked: false, recommended: critical && a.riskScore > 82 }
    ];
  }
  function notify(message, type) { db.notifications.unshift({ id: id('NT'), message: message, type: type || 'INFO', time: now(), read: false }); }
  function incident(title, details, severity, roadId, district) {
    var i = { id: id('INC'), title: title, details: details, severity: severity, roadId: roadId, district: district, time: now(), resolved: false, read: false };
    db.incidents.unshift(i); db.alerts.unshift({ id: id('ALT'), incidentId: i.id, title: title, severity: severity, time: now(), read: false, resolved: false }); notify(title, severity); return i;
  }
  function syncDependencies() {
    db.deliveries.forEach(function (d) { var v = vehicle(d.vehicleId); if (!v) return; d.status = v.status === 'AT RISK' ? 'AT RISK' : v.status === 'DELAYED' ? 'DELAYED' : v.status === 'REROUTED' ? 'DIVERTED VIA ALTERNATE ROUTE' : 'IN TRANSIT'; });
    db.routes = routeOptions('Guwahati Logistics Hub', 'Tawang District Hospital', 'Emergency medical supplies');
  }
  function simulateRain() {
    db.weather = { rainfall: 86, floodRisk: 68, landslideRisk: 76, label: 'Heavy rainfall · simulated' };
    db.roads.forEach(function (r) { if (r.district === 'West Kameng' || r.district === 'Dhemaji') r.status = 'HIGH RISK'; });
    db.districts.forEach(function (d) { if (d.name === 'West Kameng') { d.weatherRisk = 84; d.accessibility = 72; } if (d.name === 'Dhemaji') { d.weatherRisk = 78; d.accessibility = 65; } });
    incident('Heavy rainfall warning · mountain corridors', 'Simulated weather event increased disruption probability on vulnerable mountain corridors.', 'HIGH', 'NH-13', 'West Kameng');
    syncDependencies(); save(); render(); toast('Heavy rainfall increased disruption probability on mountain corridors.');
  }
  function simulateLandslide() {
    var r = road('NH-13'); r.status = 'BLOCKED'; r.condition = 98; r.traffic = 88; r.historical = 92;
    db.weather.landslideRisk = Math.max(86, db.weather.landslideRisk); db.weather.label = 'Landslide response · simulated';
    db.districts.forEach(function (d) { if (d.name === 'West Kameng') { d.accessibility = 42; d.weatherRisk = 92; } if (d.name === 'Tawang') d.accessibility = 61; });
    db.vehicles.filter(function (v) { return v.routeId === 'NH-13'; }).forEach(function (v) { v.status = 'AT RISK'; v.eta += 165; });
    incident('Landslide on NH-13 near West Kameng', 'Critical simulated road blockage. Corridor is closed pending field assessment.', 'CRITICAL', 'NH-13', 'West Kameng');
    syncDependencies(); save(); render(); toast('Critical disruption detected on NH-13. 2 vehicles affected. Alternate route recommendations updated.');
  }
  function simulateFlood() { var r = road('NH-15'); r.status = 'BLOCKED'; db.weather.floodRisk = 88; db.districts.forEach(function (d) { if (d.name === 'Dhemaji') d.accessibility = 45; }); db.vehicles.filter(function(v){return v.routeId==='NH-15';}).forEach(function(v){v.status='DELAYED';v.eta+=95;}); incident('Flooding on NH-15 near Dhemaji', 'Simulated flooding has restricted district access.', 'CRITICAL', 'NH-15', 'Dhemaji'); syncDependencies(); save(); render(); toast('Flood scenario applied. Dhemaji accessibility and affected deliveries updated.'); }
  function simulateDelay() { var v = vehicle(db.selectedVehicle) || db.vehicles[0]; v.status = 'DELAYED'; v.eta += 75; incident('Vehicle delay · ' + v.id, 'Simulated GPS delay detected. ETA recalculated.', 'HIGH', v.routeId, road(v.routeId).district); syncDependencies(); save(); render(); toast(v.id + ' delayed. Delivery and alert status updated.'); }
  function simulateField() { go('reports'); document.querySelector('#reports textarea').value = 'Simulated local report: road debris restricting one lane.'; document.querySelector('#reports select').value = 'Road blocked / landslide'; toast('Demo field-report form prepared. Submit to send an incident through the system.'); }
  function renderKPIs() {
    var blocked = db.roads.filter(function(r){return r.status==='BLOCKED';}).length, delays = db.vehicles.filter(function(v){return v.status==='DELAYED'||v.status==='AT RISK';}).length;
    var access = Math.round(db.districts.reduce(function(a,d){return a+d.accessibility;},0)/db.districts.length);
    var ontime = Math.round(100 - (delays / db.vehicles.length) * 38);
    var values = document.querySelectorAll('#dashboard .metric b');
    if (values.length) { values[0].textContent=access+'%'; values[1].textContent=db.vehicles.length.toLocaleString(); values[2].textContent=String(blocked + db.incidents.filter(function(i){return i.severity==='CRITICAL'&&!i.resolved;}).length).padStart(2,'0'); values[3].textContent=ontime+'%'; }
    var alertCard=document.querySelector('#dashboard .two article:last-child');
    if(alertCard){var heading=alertCard.querySelector('.cardhead');alertCard.innerHTML='';alertCard.appendChild(heading);if(!db.alerts.length){var empty=document.createElement('div');empty.className='row';empty.textContent='No critical alerts. Simulated network data is stable.';alertCard.appendChild(empty);}else db.alerts.slice(0,3).forEach(function(a){var row=document.createElement('div');row.className='alert';row.innerHTML='<i data-lucide="triangle-alert"></i><div><b>'+a.title+'</b><p>'+a.severity+' · generated '+a.time+'</p></div>'+chip(a.resolved?'RESOLVED':a.severity);alertCard.appendChild(row);});}
    var fleetCard=document.querySelector('#dashboard .bottom article:first-child');
    if(fleetCard){var fleetHead=fleetCard.querySelector('.cardhead');fleetCard.innerHTML='';fleetCard.appendChild(fleetHead);db.vehicles.slice(0,2).forEach(function(v){var row=document.createElement('div');row.className='row';row.innerHTML='<div><b>'+v.id+' · '+v.cargo+'</b><span>'+v.route+' · '+(100-v.progress)+'% remaining</span></div>'+chip(v.status==='MOVING'?'ETA '+minutes(v.eta):v.status);fleetCard.appendChild(row);});}
  }
  function renderFleet() {
    var body=document.querySelector('#fleet tbody'); if(!body)return;
    body.innerHTML=db.vehicles.map(function(v){var r=road(v.routeId)||{name:'Alternate route'};return '<tr data-vehicle="'+v.id+'" style="cursor:pointer"><td><b>'+v.id+'</b><br>'+v.cargo+'</td><td>'+v.route+' · '+v.progress+'% complete</td><td>'+r.name+'</td><td>'+minutes(v.eta)+'</td><td>'+chip(v.status)+'</td></tr>';}).join('');
    body.querySelectorAll('tr').forEach(function(row){row.onclick=function(){db.selectedVehicle=row.dataset.vehicle;save();showVehicle(db.selectedVehicle);go('access');focusVehicle(db.selectedVehicle);};});
  }
  function showVehicle(vId) {
    var v=vehicle(vId), panel=document.getElementById('vehicle-detail'); if(!v)return;
    if(!panel){panel=document.createElement('div');panel.id='vehicle-detail';panel.className='card';panel.style.marginTop='15px';document.querySelector('#fleet article').after(panel);}
    var a=risk({rainfall:db.weather.rainfall,flood:db.weather.floodRisk,landslide:db.weather.landslideRisk,condition:(road(v.routeId)||{condition:20}).condition,traffic:(road(v.routeId)||{traffic:20}).traffic,historical:(road(v.routeId)||{historical:20}).historical});
    panel.innerHTML='<div class="cardhead"><div><b class="title">Vehicle intelligence · '+v.id+'</b><div class="sub">Simulated GPS position · Prototype data</div></div><button class="btn" id="track-vehicle">'+(tracking?'Stop tracking':'Track vehicle')+'</button></div><div class="row"><div><b>'+v.cargo+'</b><span>'+v.route+' · ETA '+minutes(v.eta)+' · '+v.progress+'% complete</span></div>'+chip(v.status)+'</div><div class="row"><div><b>AI risk assessment</b><span>'+a.riskScore+'% · '+a.explanation+'</span></div>'+chip(a.riskLevel)+'</div>';
    document.getElementById('track-vehicle').onclick=function(){tracking=!tracking;this.textContent=tracking?'Stop tracking':'Track vehicle';toast(tracking?'GPS tracking enabled for '+v.id:'GPS tracking paused');};
  }
  function renderSupplies() { var body=document.querySelector('#supplies tbody');if(!body)return;body.innerHTML=db.deliveries.map(function(d){var v=vehicle(d.vehicleId);return '<tr><td>'+d.id+'</td><td>'+d.commodity+'</td><td>'+d.origin+' → '+d.destination+'</td><td>'+d.qty+'</td><td>'+chip(d.status)+(v?' <small>· '+v.id+'</small>':'')+'</td></tr>';}).join(''); }
  function renderIncidents() {
    var panel=document.querySelector('#alerts .split article:first-child');if(!panel)return;var head=panel.querySelector('.cardhead');panel.innerHTML='';panel.appendChild(head);
    if(!db.incidents.length){var empty=document.createElement('div');empty.className='row';empty.textContent='No critical incidents found.';panel.appendChild(empty);}
    db.incidents.forEach(function(i){var item=document.createElement('div');item.className='alert';item.innerHTML='<i data-lucide="triangle-alert"></i><div><b>'+i.title+'</b><p>'+i.details+' · '+i.time+'</p></div>'+chip(i.resolved?'RESOLVED':i.severity);item.onclick=function(){go('access');focusIncident(i);};panel.appendChild(item);});lucide.createIcons();
  }
  function renderDistricts() { var card=document.querySelector('#access .two article:last-child');if(!card)return;var head=card.querySelector('.cardhead');card.innerHTML='';card.appendChild(head);db.districts.forEach(function(d){var active=db.incidents.filter(function(i){return i.district===d.name&&!i.resolved;}).length;var row=document.createElement('div');row.className='row';row.style.cursor='pointer';row.innerHTML='<div><b>'+d.name+'</b><span>'+active+' active incidents · weather risk '+d.weatherRisk+'%</span></div>'+chip(d.accessibility<55?'CRITICAL':d.accessibility<75?'MODERATE':'ACCESSIBLE');row.onclick=function(){db.selectedDistrict=d.name;save();showDistrict(d);};card.appendChild(row);});}
  function showDistrict(d) { toast(d.name+': '+d.accessibility+'% accessible · '+d.weatherRisk+'% weather risk · '+db.vehicles.filter(function(v){return (road(v.routeId)||{}).district===d.name;}).length+' vehicles affected'); }
  function renderRoutes() {
    var target=document.querySelector('#routes .split article:last-child');if(!target)return;
    var inputs=document.querySelectorAll('#routes .input'), options=routeOptions(inputs[0].value,inputs[1].value,inputs[2].value);db.routes=options;var title=target.querySelector('.title'),sub=target.querySelector('.sub');target.innerHTML='';target.appendChild(title);target.appendChild(sub);sub.textContent='AI Risk Assessment · simulated prototype data';
    options.forEach(function(o){var box=document.createElement('div');box.className='choice '+(o.recommended?'selected':'');box.dataset.route=o.id;box.innerHTML='<b>'+o.name+'</b>'+chip(o.blocked?'BLOCKED':o.recommended?'RECOMMENDED':o.assessment.riskLevel)+'<small>'+o.distance+' km · '+(o.blocked?'Unavailable':minutes(o.eta))+' · Risk '+o.assessment.riskScore+'% · Confidence '+o.assessment.confidence+'%</small><small>'+o.assessment.recommendedAction+'</small>';box.onclick=function(){target.querySelectorAll('.choice').forEach(function(x){x.classList.remove('selected')});box.classList.add('selected');};target.appendChild(box);});
  }
  function renderReports() { var card=document.querySelector('#reports .split article:last-child');if(!card)return;var existing=card.querySelectorAll('.report-dynamic');existing.forEach(function(e){e.remove();});db.fieldReports.forEach(function(r){var row=document.createElement('div');row.className='row report-dynamic';row.innerHTML='<div><b>'+r.id+' · '+r.type+'</b><span>'+r.location+' · '+r.time+'</span></div>'+chip(r.status);card.appendChild(row);}); }
  function renderAnalytics() {
    var values=document.querySelectorAll('#analytics .kpis b');if(values.length){values[0].textContent=db.weather.floodRisk+'%';values[1].textContent=db.weather.landslideRisk+'%';values[2].textContent=db.incidents.length?'+'+db.incidents.length:'0';}
    var table=document.querySelector('#analytics tbody');if(table)table.innerHTML=db.districts.map(function(d){var n=db.incidents.filter(function(i){return i.district===d.name&&!i.resolved;}).length;return '<tr><td>'+d.name+'</td><td>'+d.accessibility+'%</td><td>'+Math.max(52,d.accessibility+2)+'%</td><td>'+n+'</td></tr>';}).join('');
  }
  function clearMapLayers() { mapLayers.forEach(function(g){g.clearLayers();}); }
  function mapGroups() {
    if(!window.L)return; if(!mapLayers.length) leafletMaps.forEach(function(m){mapLayers.push(L.layerGroup().addTo(m));var legend=L.control({position:'bottomleft'});legend.onAdd=function(){var box=L.DomUtil.create('div');box.style.cssText='background:#fffd;padding:7px 9px;border-radius:6px;font:10px Manrope;color:#254';box.innerHTML='<b>Prototype layers</b><br><span style="color:#287655">●</span> Accessible &nbsp;<span style="color:#eba940">●</span> Risk &nbsp;<span style="color:#d9584a">●</span> Blocked';return box;};legend.addTo(m);});
    clearMapLayers();leafletMaps.forEach(function(m,index){var group=mapLayers[index];db.roads.forEach(function(r){var col=r.status==='BLOCKED'?'#d9584a':r.status==='HIGH RISK'?'#eba940':r.status==='MODERATE'?'#eba940':'#287655';L.polyline(r.coords,{color:col,weight:6,dashArray:r.status==='BLOCKED'?'10 7':null}).bindPopup('<b>'+r.name+'</b><br>Status: '+r.status+'<br>AI risk: '+risk({rainfall:db.weather.rainfall,flood:db.weather.floodRisk,landslide:db.weather.landslideRisk,condition:r.condition,traffic:r.traffic,historical:r.historical}).riskScore+'%').addTo(group);});db.vehicles.forEach(function(v){var col=v.status==='MOVING'?'#287655':v.status==='DELAYED'?'#eba940':'#d9584a';L.circleMarker([v.lat,v.lng],{radius:8,color:col,fillColor:col,fillOpacity:.95}).bindPopup('<b>'+v.id+'</b><br>'+v.cargo+'<br>'+v.status+' · ETA '+minutes(v.eta)).on('click',function(){db.selectedVehicle=v.id;showVehicle(v.id);}).addTo(group);});db.incidents.forEach(function(i){var r=road(i.roadId);if(!r)return;var point=r.coords[Math.floor(r.coords.length/2)];L.circleMarker(point,{radius:10,color:'#d9584a',fillColor:'#d9584a',fillOpacity:.9}).bindPopup('<b>'+i.title+'</b><br>'+i.details).addTo(group);});}); }
  function focusVehicle(id) { var v=vehicle(id),m=leafletMaps[1]||leafletMaps[0];if(v&&m){m.setView([v.lat,v.lng],10);toast('Focused map on '+v.id);}}
  function focusIncident(i) { var r=road(i.roadId),m=leafletMaps[1]||leafletMaps[0];if(r&&m)m.setView(r.coords[Math.floor(r.coords.length/2)],10); }
  function bell() {
    var old=document.getElementById('notification-panel');if(old){old.remove();return;}
    var p=document.createElement('div');p.id='notification-panel';p.className='card';p.style.cssText='position:fixed;right:28px;top:72px;width:330px;z-index:200;box-shadow:0 12px 34px #1234';p.innerHTML='<div class="cardhead"><b class="title">Notifications · simulated</b><button class="btn" id="mark-read">Mark all read</button></div>'+db.notifications.slice(0,6).map(function(n){return '<div class="row"><div><b>'+n.message+'</b><span>'+n.time+'</span></div>'+chip(n.read?'READ':n.type)+'</div>';}).join('');
    document.body.appendChild(p);document.getElementById('mark-read').onclick=function(){db.notifications.forEach(function(n){n.read=true;});save();p.remove();toast('Notifications marked as read');};
  }
  function demoControls() {
    var d=document.getElementById('dashboard');if(!d||document.getElementById('demo-scenarios'))return;
    var c=document.createElement('div');c.id='demo-scenarios';c.className='card';c.style.cssText='margin-top:20px;padding:14px 17px';c.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><b class="title">DEMO SIMULATION</b><div class="sub">Simulated prototype data — use these scenarios during the SIH demonstration.</div></div><button class="btn" id="reset-demo">Reset Demo</button></div><div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:12px"><button class="btn" data-sim="rain">Heavy rainfall</button><button class="btn primary" data-sim="landslide">Landslide on NH-13</button><button class="btn" data-sim="flood">Flood</button><button class="btn" data-sim="delay">Vehicle delay</button><button class="btn" data-sim="field">New field incident</button></div>';d.appendChild(c);
    c.querySelector('[data-sim="rain"]').onclick=simulateRain;c.querySelector('[data-sim="landslide"]').onclick=simulateLandslide;c.querySelector('[data-sim="flood"]').onclick=simulateFlood;c.querySelector('[data-sim="delay"]').onclick=simulateDelay;c.querySelector('[data-sim="field"]').onclick=simulateField;c.querySelector('#reset-demo').onclick=function(){localStorage.removeItem(KEY);db=copy(initial);syncDependencies();render();toast('Demo reset to the clean baseline.');};
  }
  function submitField() {
    var form=document.querySelector('#reports'), type=form.querySelector('select').value, location=form.querySelector('input').value, details=form.querySelector('textarea').value||'No additional details supplied.', severity=(form.querySelector('#severity')||{}).value||'MEDIUM';
    var report={id:id('FR'),type:type,location:location,details:details,severity:severity,time:now(),status:db.offline?'QUEUED':'SYNCED'};db.fieldReports.unshift(report);if(severity==='HIGH'||severity==='CRITICAL')incident(type+' · '+location,details,severity,'NH-13','West Kameng');notify('Field report '+report.id+' submitted',severity);save();render();toast(db.offline?'Field report '+report.id+' queued locally for synchronization.':'Field report '+report.id+' submitted successfully.');}
  function offlineToggle() { db.offline=!db.offline;if(!db.offline){var q=db.fieldReports.filter(function(r){return r.status==='QUEUED';});q.forEach(function(r){r.status='SYNCED';});notify(q.length+' field reports synchronized successfully.','INFO');toast(q.length+' field reports synchronized successfully.');}save();render(); }
  function acceptRoute() { var alternate=db.routes.filter(function(r){return r.id==='B';})[0]||routeOptions('','','')[1];var v=vehicle('MED-2841');v.routeId='ALT-1';v.route='Guwahati → Tezpur diversion → Tawang';v.status='REROUTED';v.eta=alternate.eta;notify('MED-2841 rerouted via Tezpur diversion.','INFO');syncDependencies();save();render();toast('Alternate route accepted. MED-2841 has been rerouted.'); }
  function toggleRiskLayer() {
    var map=leafletMaps[1]||leafletMaps[0]; if(!map)return;
    if(map._demoRisk){map.removeLayer(map._demoRisk);map._demoRisk=null;toast('Risk overlay hidden');return;}
    map._demoRisk=L.layerGroup([
      L.circle([27.2,92.4],{radius:25000,color:'#eba940',fillColor:'#eba940',fillOpacity:.15}).bindPopup('<b>Mountain corridor risk</b><br>Rainfall: '+db.weather.rainfall+'% · Landslide: '+db.weather.landslideRisk+'%'),
      L.circle([27.15,94.1],{radius:28000,color:'#d9584a',fillColor:'#d9584a',fillOpacity:.14}).bindPopup('<b>Flood corridor risk</b><br>Flood risk: '+db.weather.floodRisk+'%')
    ]).addTo(map);toast('AI risk overlay enabled');
  }
  function addFilters() {
    var fleetHead=document.querySelector('#fleet .cardhead');
    if(fleetHead&&!document.getElementById('fleet-status-filter')){var f=document.createElement('select');f.id='fleet-status-filter';f.className='input';f.style.cssText='width:125px;margin:0 0 0 8px';f.innerHTML='<option value="">All status</option><option>MOVING</option><option>DELAYED</option><option>AT RISK</option><option>REROUTED</option>';fleetHead.appendChild(f);f.onchange=function(){document.querySelectorAll('#fleet tbody tr').forEach(function(row){row.style.display=!f.value||row.textContent.indexOf(f.value)>-1?'':'none';});};}
    var suppliesHead=document.querySelector('#supplies .cardhead');
    if(suppliesHead&&!document.getElementById('commodity-filter')){var c=document.createElement('select');c.id='commodity-filter';c.className='input';c.style.cssText='width:145px;margin:0';c.innerHTML='<option value="">All commodities</option><option>Vaccine</option><option>Medical</option><option>Rice</option><option>Cement</option>';suppliesHead.appendChild(c);c.onchange=function(){document.querySelectorAll('#supplies tbody tr').forEach(function(row){row.style.display=!c.value||row.textContent.toLowerCase().indexOf(c.value.toLowerCase())>-1?'':'none';});};}
    var alertsHead=document.querySelector('#alerts .split article:first-child .cardhead');
    if(alertsHead&&!document.getElementById('alert-filter')){var s=document.createElement('select');s.id='alert-filter';s.className='input';s.style.cssText='width:112px;margin:0';s.innerHTML='<option value="">Severity</option><option>CRITICAL</option><option>HIGH</option><option>MEDIUM</option>';alertsHead.appendChild(s);s.onchange=function(){document.querySelectorAll('#alerts .alert').forEach(function(row){row.style.display=!s.value||row.textContent.indexOf(s.value)>-1?'':'none';});};}
  }
  function wire() {
    var routeBtn=document.querySelector('#routes [data-toast]');if(routeBtn)routeBtn.onclick=function(){var old=this.textContent;this.textContent='Calculating route intelligence…';setTimeout(function(){renderRoutes();routeBtn.textContent=old;notify('New route recommendation generated.','INFO');save();toast('AI Risk Assessment completed. Route alternatives updated.');},450);};
    var accept=document.querySelector('#alerts .split article:last-child .row .btn');if(accept)accept.onclick=acceptRoute;
    document.querySelectorAll('#alerts .split article:last-child .row .btn').forEach(function(b,i){if(i===1)b.onclick=function(){notify('Tawang depot notice sent.','INFO');save();toast('Simulated delivery-buffer notice sent to Tawang depot.');};if(i===2)b.onclick=function(){var officer=prompt('Assign officer','R. Sharma · West Kameng Field Unit');if(officer){notify('Officer assigned: '+officer,'INFO');save();toast(officer+' assigned to the incident.');}};});
    document.getElementById('report-submit').onclick=submitField;document.getElementById('offline-toggle').onclick=offlineToggle;document.getElementById('offline-enable').onclick=offlineToggle;
    var off=document.getElementById('offline-box');if(off){off.querySelector('b').textContent=db.offline?'☁ Offline mode active':'☁ Online mode active';off.querySelector('p').textContent=db.offline?'Offline mode active. Reports will be synchronized when connectivity is restored.':'Online connection simulated. Field reports are synchronized immediately.';}
    var bellButton=document.querySelector('.top .btn');if(bellButton)bellButton.onclick=bell;
    var accessButtons=document.querySelectorAll('#access .head .btn');if(accessButtons[0])accessButtons[0].onclick=toggleRiskLayer;
    var locate=document.querySelector('#access .cardhead .btn');if(locate)locate.onclick=function(){var map=leafletMaps[1]||leafletMaps[0];if(map){map.setView([26.1445,91.7362],10);toast('Using last known logistics hub location.');}};
    var filters=document.querySelectorAll('#dashboard .head .btn');if(filters[0])filters[0].onclick=function(){this.textContent=this.textContent.indexOf('All')>-1?'West Kameng⌄':'All 8 States⌄';toast('Dashboard district filter applied.');};if(filters[1])filters[1].onclick=function(){this.textContent=this.textContent.indexOf('24')>-1?'Last 7 days⌄':'Last 24 hours⌄';toast('Dashboard reporting period updated.');};
    var search=document.querySelector('#fleet input[placeholder]');if(search)search.oninput=function(){var q=this.value.toLowerCase();document.querySelectorAll('#fleet tbody tr').forEach(function(row){row.style.display=row.textContent.toLowerCase().indexOf(q)>-1?'':'none';});};
    addFilters();
  }
  function render() {
  var live = document.querySelector('.live');

  if (live) {
    live.textContent = 'LIVE NETWORK DATA';
  }

  syncDependencies();

  // Keep the existing demo functionality,
  // but DO NOT overwrite Fleet Tracking
  // or Incidents & Alerts with simulated data.

  renderKPIs();

  // IMPORTANT:
  // Fleet and Incidents are now controlled
  // by the PostgreSQL backend connection in index.html.

  renderSupplies();
  renderDistricts();
  renderRoutes();
  renderReports();
  renderAnalytics();
  mapGroups();
  demoControls();
  wire();

  lucide.createIcons();
}
  function addSeverity() { var form=document.querySelector('#reports .form');if(!form||document.getElementById('severity'))return;var label=document.createElement('label');label.textContent='SEVERITY';var select=document.createElement('select');select.id='severity';select.className='input';select.innerHTML='<option value="LOW">Low</option><option value="MEDIUM" selected>Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option>';form.querySelector('textarea').after(select);form.querySelector('textarea').after(label); }
  function gpsTick() { if(!tracking)return;var v=vehicle(db.selectedVehicle);if(!v)return;v.progress=Math.min(99,v.progress+1);v.lat+=0.003;v.lng+=0.002;save();render(); }
  window.addEventListener('offline',function(){if(!db.offline){db.offline=true;save();render();toast('Offline mode active. Reports will be synchronized when connectivity is restored.');}});
  window.addEventListener('online',function(){if(db.offline)offlineToggle();});
  addSeverity();syncDependencies();render();setInterval(gpsTick,5000);
}());