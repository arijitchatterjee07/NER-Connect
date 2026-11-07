const router = require('express').Router();
const db = require('../config/db');
const { z } = require('zod');
const crypto = require('crypto');

const schema = z.object({
  id: z.string().optional(), type: z.string().min(2), location: z.string().optional(), details: z.string().default('No additional details supplied.'),
  severity: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).default('MEDIUM'), latitude: z.number().optional(), longitude: z.number().optional(), reporterId: z.string().optional()
});

router.get('/', async(req,res,next)=>{
  try { const {rows}=await db.query(`SELECT id,type,location,details,severity,latitude,longitude,status,reporter_id AS "reporterId",created_at AS "createdAt",synced_at AS "syncedAt" FROM field_reports ORDER BY created_at DESC`); res.json(rows); }
  catch(e){next(e);}
});

router.post('/', async(req,res,next)=>{
  try {
    const d=schema.parse(req.body); const id=d.id || `FR-${crypto.randomUUID().slice(0,8)}`;
    const {rows}=await db.query(`INSERT INTO field_reports (id,type,location,details,severity,latitude,longitude,status,reporter_id,synced_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'SYNCED',$8,NOW()) ON CONFLICT (id) DO UPDATE SET details=EXCLUDED.details,severity=EXCLUDED.severity,status='SYNCED',synced_at=NOW() RETURNING *`, [id,d.type,d.location||null,d.details,d.severity,d.latitude??null,d.longitude??null,d.reporterId||null]);
    req.app.get('io').emit('field_report.created', rows[0]); res.status(201).json(rows[0]);
  } catch(e){next(e);}
});

router.post('/sync', async(req,res,next)=>{
  try {
    const reports=z.array(schema).parse(req.body.reports || []);
    const synced=[]; const errors=[];
    for(const d of reports){
      try {
        const id=d.id || `FR-${crypto.randomUUID().slice(0,8)}`;
        const {rows}=await db.query(`INSERT INTO field_reports (id,type,location,details,severity,latitude,longitude,status,reporter_id,synced_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'SYNCED',$8,NOW()) ON CONFLICT (id) DO UPDATE SET status='SYNCED',synced_at=NOW() RETURNING id,status`, [id,d.type,d.location||null,d.details,d.severity,d.latitude??null,d.longitude??null,d.reporterId||null]);
        synced.push(rows[0]);
      } catch(error){ errors.push({report:d,error:error.message}); }
    }
    res.json({synced,errors});
  } catch(e){next(e);}
});

router.post('/reports', async(req,res,next)=>{
  try {
    const reports=z.array(schema).parse(req.body.reports || []);
    const synced=[]; const errors=[];
    for(const d of reports){
      try {
        const id=d.id || `FR-${crypto.randomUUID().slice(0,8)}`;
        const {rows}=await db.query(`INSERT INTO field_reports (id,type,location,details,severity,latitude,longitude,status,reporter_id,synced_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'SYNCED',$8,NOW()) ON CONFLICT (id) DO UPDATE SET status='SYNCED',synced_at=NOW() RETURNING id,status`, [id,d.type,d.location||null,d.details,d.severity,d.latitude??null,d.longitude??null,d.reporterId||null]);
        synced.push(rows[0]);
      } catch(error){ errors.push({report:d,error:error.message}); }
    }
    res.json({synced,errors});
  } catch(e){next(e);}
});

module.exports = router;
