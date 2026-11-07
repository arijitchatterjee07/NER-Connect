const router = require('express').Router();

const db = require('../config/db');
const { z } = require('zod');
const { buildRouteOptions } = require('../services/routing.service');

const schema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),

  vehicleWeightTons: z
    .coerce
    .number()
    .nonnegative()
    .default(10),

  cargoType: z
    .string()
    .default('GENERAL'),

  priority: z
    .string()
    .default('Standard'),

  roadId: z
    .string()
    .default('NH-13')
});

router.post('/calculate', async (req, res, next) => {
  try {
    console.log('========================================');
    console.log('ROUTE CALCULATION REQUEST');
    console.log('========================================');
    console.log('Request body:', req.body);

    const data = schema.parse(req.body);

    console.log('Validated data:', data);

    // -----------------------------------------
    // FIND ROAD
    // -----------------------------------------

    const roadResult = await db.query(
      `
      SELECT *
      FROM roads
      WHERE id = $1
      `,
      [data.roadId]
    );

    const road = roadResult.rows[0];

    if (!road) {
      return res.status(404).json({
        error: 'Starting route road not found',
        roadId: data.roadId
      });
    }

    console.log('Road found:', road.id);

    // -----------------------------------------
    // FIND LATEST WEATHER
    // -----------------------------------------

    const weatherResult = await db.query(
      `
      SELECT
        rainfall,
        flood_risk,
        landslide_risk
      FROM weather_observations
      WHERE LOWER(district) = LOWER($1)
      ORDER BY observed_at DESC
      LIMIT 1
      `,
      [road.district]
    );

    const weather =
      weatherResult.rows[0] || {
        rainfall: 0,
        flood_risk: 0,
        landslide_risk: 0
      };

    console.log('Weather found:', weather);

    // -----------------------------------------
    // BUILD ROUTE OPTIONS
    // -----------------------------------------

    const routeOptions = buildRouteOptions({
      road,
      weather,
      vehicleWeightTons: data.vehicleWeightTons,
      cargoType: data.cargoType,
      priority: data.priority
    });

    console.log(
      'Recommended route:',
      routeOptions.recommendedRoute
    );

    console.log(
      'Routes generated:',
      routeOptions.routes.length
    );

    // -----------------------------------------
    // SEND RESPONSE
    // -----------------------------------------

    res.json({
      origin: data.origin,
      destination: data.destination,
      ...routeOptions
    });

  } catch (error) {

    console.error('Route calculation failed:');
    console.error('Message:', error.message);
    console.error('Code:', error.code || 'N/A');
    console.error('Detail:', error.detail || 'N/A');

    next(error);
  }
});

module.exports = router;n