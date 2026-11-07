const router = require('express').Router();
const { getDashboard } = require('../services/dashboard.service');
router.get('/', async(req,res,next)=>{ try { res.json(await getDashboard()); } catch(e){next(e);} });
module.exports=router;
