const router = require('express').Router();
const db = require('../config/db');
const { buildRouteOptions } = require('../services/routing.service');

router.post('/:vehicleId', async (req,res,next) => {
  try {
    const vehicleResult = await db.query(`SELECT * FROM vehicles WHERE id=$1`, [req.params.vehicleId]);
    const vehicle = vehicleResult.rows[0];
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const roadResult = await db.query(`SELECT * FROM roads WHERE id=$1`, [vehicle.route_id]);
    const road = roadResult.rows[0];
    if (!road) return res.status(404).json({ error: 'Vehicle route road not found' });

    const weatherResult = await db.query(`SELECT rainfall,flood_risk,landslide_risk FROM weather_observations WHERE LOWER(district)=LOWER($1) ORDER BY observed_at DESC LIMIT 1`, [road.district]);
    const weather = weatherResult.rows[0] || { rainfall: 0, flood_risk: 0, landslide_risk: 0 };
    const result = buildRouteOptions({ road, weather, vehicleWeightTons: vehicle.vehicle_weight_tons, cargoType: vehicle.cargo, priority: vehicle.priority });
    const chosen = result.routes.find(r => r.id === result.recommendedRoute);

    await db.query(`UPDATE vehicles SET route_id=$1,route_name=$2,status='REROUTED',eta_minutes=$3,updated_at=NOW() WHERE id=$4`, [chosen.routeId, chosen.name, chosen.etaMinutes, vehicle.id]);
    const response = { vehicleId: vehicle.id, oldRoute: vehicle.route_id, newRoute: chosen.routeId, routeName: chosen.name, reason: 'Dynamic rerouting after current route risk/blockage assessment.', riskBefore: result.routes.find(r => r.id === 'A')?.riskScore ?? null, riskAfter: chosen.riskScore, etaMinutes: chosen.etaMinutes };
    req.app.get('io').emit('route.updated', response);
    req.app.get('io').emit('vehicle.updated', { id: vehicle.id, status: 'REROUTED', routeId: chosen.routeId, route: chosen.name, etaMinutes: chosen.etaMinutes });
    res.json(response);
  } catch(e){next(e);}
});

module.exports = router;
