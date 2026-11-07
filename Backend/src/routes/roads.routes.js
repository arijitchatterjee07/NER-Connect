const router = require('express').Router();
const db = require('../config/db');

function mapRoad(r) {
  return { ...r, coords: r.coords || [] };
}

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(`SELECT id,name,district,status,condition_score AS "condition",traffic_score AS traffic,historical_risk AS historical,bridge_weight_limit_tons AS "bridgeWeightLimitTons",surface_type AS "surfaceType",distance_km AS distance,"base_eta_minutes" AS "baseEtaMinutes",coords_json AS coords FROM roads ORDER BY id`);
    res.json(rows.map(mapRoad));
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query(`SELECT id,name,district,status,condition_score AS "condition",traffic_score AS traffic,historical_risk AS historical,bridge_weight_limit_tons AS "bridgeWeightLimitTons",surface_type AS "surfaceType",distance_km AS distance,base_eta_minutes AS "baseEtaMinutes",coords_json AS coords FROM roads WHERE id=$1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Road not found' });
    res.json(mapRoad(rows[0]));
  } catch (e) { next(e); }
});

module.exports = router;
