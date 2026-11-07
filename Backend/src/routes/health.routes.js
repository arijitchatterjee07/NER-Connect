const router = require('express').Router();
router.get('/', (req, res) => res.json({ status: 'OK', message: 'NER Connect backend is running' }));
module.exports = router;
