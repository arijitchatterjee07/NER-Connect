const router = require('express').Router();
const db = require('../config/db');

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(`SELECT DISTINCT ON (district) district,rainfall,"flood_risk" AS "floodRisk",landslide_risk AS "landslideRisk",temperature,label,observed_at AS "observedAt" FROM weather_observations ORDER BY district,observed_at DESC`);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:district', async (req, res, next) => {
  try {
    const { rows } = await db.query(`SELECT district,rainfall,flood_risk AS "floodRisk",landslide_risk AS "landslideRisk",temperature,label,observed_at AS "observedAt" FROM weather_observations WHERE LOWER(district)=LOWER($1) ORDER BY observed_at DESC LIMIT 1`, [req.params.district]);
    if (!rows[0]) return res.status(404).json({ error: 'Weather data not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
