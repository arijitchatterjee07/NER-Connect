const router = require('express').Router();
const db = require('../config/db');
const { z } = require('zod');
const { updateRoadAfterIncident, affectedVehicles } = require('../services/incident.service');

const incidentSchema = z.object({
  title: z.string().min(2), details: z.string().min(2),
  type: z.enum(['LANDSLIDE','FLOOD','BLOCKADE','BRIDGE_DOWN','WEATHER']),
  severity: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']),
  roadId: z.string().optional(), district: z.string().optional(),
  latitude: z.number().optional(), longitude: z.number().optional(),
  reporterId: z.string().optional(), verified: z.boolean().optional()
});

router.get('/', async (req,res,next) => {
  try {
    const { rows } = await db.query(`SELECT id,title,details,type,severity,road_id AS "roadId",district,latitude,longitude,verified,resolved,reporter_id AS "reporterId",created_at AS "createdAt",resolved_at AS "resolvedAt" FROM incidents ORDER BY created_at DESC`);
    res.json(rows);
  } catch(e){next(e);}
});

router.get('/active', async (req,res,next) => {
  try {
    const { rows } = await db.query(`SELECT id,title,details,type,severity,road_id AS "roadId",district,latitude,longitude,verified,resolved,reporter_id AS "reporterId",created_at AS "createdAt" FROM incidents WHERE resolved=false ORDER BY created_at DESC`);
    res.json(rows);
  } catch(e){next(e);}
});

router.post('/', async (req,res,next) => {
  try {
    const data = incidentSchema.parse(req.body);
    await updateRoadAfterIncident(data.roadId, data.severity, data.type);
    const { rows } = await db.query(`INSERT INTO incidents (title,details,type,severity,road_id,district,latitude,longitude,verified,reporter_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id,title,details,type,severity,road_id AS "roadId",district,latitude,longitude,verified,resolved,reporter_id AS "reporterId",created_at AS "createdAt"`, [data.title,data.details,data.type,data.severity,data.roadId || null,data.district || null,data.latitude ?? null,data.longitude ?? null,data.verified ?? false,data.reporterId || null]);
    const incident = rows[0];
    const vehicles = await affectedVehicles(data.roadId);
    req.app.get('io').emit('incident.created', incident);
    req.app.get('io').emit('vehicle.affected', { incident, vehicles });
    res.status(201).json({ incident, affectedVehicles: vehicles });
  } catch(e){next(e);}
});

router.patch('/:id/resolve', async (req,res,next) => {
  try {
    const { rows } = await db.query(`UPDATE incidents SET resolved=true,resolved_at=NOW() WHERE id=$1 RETURNING id,resolved,resolved_at AS "resolvedAt"`, [req.params.id]);
    if(!rows[0]) return res.status(404).json({error:'Incident not found'});
    req.app.get('io').emit('incident.updated', rows[0]);
    res.json(rows[0]);
  } catch(e){next(e);}
});

router.patch('/:id/verify', async (req,res,next) => {
  try {
    const verified = req.body.verified !== false;
    const { rows } = await db.query(`UPDATE incidents SET verified=$1 WHERE id=$2 RETURNING id,verified`, [verified,req.params.id]);
    if(!rows[0]) return res.status(404).json({error:'Incident not found'});
    req.app.get('io').emit('incident.updated', rows[0]);
    res.json(rows[0]);
  } catch(e){next(e);}
});

module.exports = router;
