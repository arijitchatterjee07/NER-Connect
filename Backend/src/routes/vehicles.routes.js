const router = require('express').Router();
const db = require('../config/db');
const { z } = require('zod');

const locationSchema = z.object({ latitude: z.number(), longitude: z.number(), progress: z.number().int().min(0).max(100).optional(), etaMinutes: z.number().int().min(0).optional(), status: z.enum(['MOVING','DELAYED','AT RISK','REROUTED','IDLE']).optional() });

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(`SELECT id, vehicle_number AS "vehicleNumber", cargo, status, priority, route_id AS "routeId", route_name AS route, latitude, longitude, progress, eta_minutes AS "etaMinutes", vehicle_weight_tons AS "vehicleWeightTons", updated_at AS "updatedAt" FROM vehicles ORDER BY id`);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query(`SELECT id, vehicle_number AS "vehicleNumber", cargo, status, priority, route_id AS "routeId", route_name AS route, latitude, longitude, progress, eta_minutes AS "etaMinutes", vehicle_weight_tons AS "vehicleWeightTons", updated_at AS "updatedAt" FROM vehicles WHERE id=$1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.post('/:id/location', async (req, res, next) => {
  try {
    const data = locationSchema.parse(req.body);
    const fields = ['latitude=$1','longitude=$2'];
    const values = [data.latitude, data.longitude];
    if (data.progress !== undefined) { fields.push(`progress=$${values.length+1}`); values.push(data.progress); }
    if (data.etaMinutes !== undefined) { fields.push(`eta_minutes=$${values.length+1}`); values.push(data.etaMinutes); }
    if (data.status !== undefined) { fields.push(`status=$${values.length+1}`); values.push(data.status); }
    values.push(req.params.id);
    const { rows } = await db.query(`UPDATE vehicles SET ${fields.join(', ')}, updated_at=NOW() WHERE id=$${values.length} RETURNING id, vehicle_number AS "vehicleNumber", latitude, longitude, progress, eta_minutes AS "etaMinutes", status, updated_at AS "updatedAt"`, values);
    if (!rows[0]) return res.status(404).json({ error: 'Vehicle not found' });
    req.app.get('io').emit('vehicle.updated', rows[0]);
    res.json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
