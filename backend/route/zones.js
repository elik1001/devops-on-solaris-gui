const router = require('express').Router();

const {
  verifyToken
} = require('../middleware/verifyToken');
const {
  verifyZone,
  getZoneList,
  returnZoneStats,
  addNewZone,
  refreshZone,
  updateZoneInfo,
  zoneMaintenanceUpdate,
  removeZoneDbRecordCmd,
  getDbAppVers,
  getJiraDisc,
  smfMaint,
  // smfTest,
  // copyFilesTest
} = require('../controllers/zones');
const {
  addNewDualZone
} = require('../controllers/dualZones');
/*const {
  testRun,
  testRunJob
} = require('../controllers/test');*/
const {
  refreshZoneJob,
} = require('../controllers/refreshZone');


// List all app or db AppVersions
router.get('/getDbAppVers/:type', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users']), getDbAppVers);
//router.get('/getDbAppVers/:type', getDbAppVers);

// Admin, Zone-Admin, Zone-Users, Zone-Guests
// verify is zone name exist
router.get('/verifyZone/:zoneID', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users']), verifyZone);

// get a list of all zones
router.get('/getZones', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users', 'Zone-Guests']), getZoneList);

// get list of all dveOps server status. i.e. cpu, memory, etc
router.get('/getZoneStats', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users', 'Zone-Guests']), returnZoneStats);

// getSMF status
router.put('/smfMaint', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users']), smfMaint);
//router.get('/getSMFStatus', returnSMFStats);

// get list of all dveOps server status. i.e. cpu, memory, etc
router.get('/getJiraDisc', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users']), getJiraDisc);

// schedule and add new zone db record
router.post('/createZone/:zoneID', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users']), addNewZone);

// schedule and add new zone db record
router.post('/createDualZone/:zoneID', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users']), addNewDualZone);

// schedule a zone app or db file system refresh
router.post('/refreshZone/:zoneID', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users']), refreshZoneJob);

// update zone create user, port, etc
router.put('/updateZoneInfo/:id', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users']), updateZoneInfo);

// delete zone route
router.put('/zoneMaintenance/:id', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users']), zoneMaintenanceUpdate);

// Temp route - used by devops_manager.py to remove zone db record.
router.delete('/removeZoneDbRecord/:id', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users']), removeZoneDbRecordCmd);


// Test route
// router.get('/test', testRunJob);

module.exports = router;
