const router = require('express').Router();

const {
  verifyToken
} = require('../middleware/verifyToken');
const {
  getAppVersions,
  getAppVersion,
  addAppVersion,
  updateAppVersion,
  deleteAppVersion
} = require('../controllers/appVersions');

// get all app versions
router.get('/', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users']), getAppVersions);

// get single app versions
router.get('/:id', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users']), getAppVersion);

// add New App Version
router.post('/', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users']), addAppVersion);

// update App Version
router.put('/:id', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users']), updateAppVersion);

// delete App Version
router.delete('/:id', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users']), deleteAppVersion);

module.exports = router;
