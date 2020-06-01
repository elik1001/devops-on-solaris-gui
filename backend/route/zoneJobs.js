const router = require('express').Router();

const {
  verifyToken
} = require('../middleware/verifyToken');
const {
  getZoneJobs,
  updateZoneJobs,
  deleteZoneJobs
} = require('../controllers/zoneJobs');

// get all jobs
router.get('/', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users']), getZoneJobs);

// update jobs
router.put('/:id', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users']), updateZoneJobs);

// delete jobs
router.delete('/:id', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users']), deleteZoneJobs);

module.exports = router;
