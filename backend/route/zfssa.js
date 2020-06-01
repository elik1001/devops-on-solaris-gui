const router = require('express').Router();

const {
  verifyToken
} = require('../middleware/verifyToken');

const {
  zfsActions
} = require('../controllers/zfssa');

// ZFS actions route
router.get('/', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users']), zfsActions);

module.exports = router;
