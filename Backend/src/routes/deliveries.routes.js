const router = require('express').Router();
const db = require('../config/db');
router.get('/', async(req,res,next)=>{
  try { const {rows}=await db.query(`SELECT id,commodity,quantity,origin,destination,vehicle_id AS "vehicleId",status,priority,eta_minutes AS "etaMinutes",created_at AS "createdAt",updated_at AS "updatedAt" FROM deliveries ORDER BY created_at DESC`); res.json(rows); }
  catch(e){next(e);}
});
module.exports=router;
