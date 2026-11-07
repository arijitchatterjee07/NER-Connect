const router = require('express').Router();
const { z } = require('zod');
const { calculateRisk } = require('../services/risk.service');

const schema = z.object({
  rainfall: z.number(), floodRisk: z.number(), landslideRisk: z.number(),
  roadCondition: z.number(), traffic: z.number(), historicalIncidents: z.number()
});

router.post('/calculate', (req,res,next) => {
  try { res.json(calculateRisk(schema.parse(req.body))); }
  catch(e){ next(e); }
});

module.exports = router;
