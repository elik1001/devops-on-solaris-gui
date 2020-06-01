var express = require('express');
var router = express.Router();
var request = require('request');

const autoCaptureServerStat = require(__dirname + '/../jobs/autoCaptureServerStat');
const autoCreateZone = require(__dirname + '/../jobs/autoCreateZone');
const autoUpdateZones = require(__dirname + '/../jobs/autoUpdateZones');
const runMode = 'dev';

// All routes
router.use('/', require('./base'));
router.use('/systemProperties', require('./systemProperties'));
router.use('/users', require('./users'));
router.use('/appVersions', require('./appVersions'));
router.use('/zoneJobs', require('./zoneJobs'));
router.use('/runZfsActions', require('./zfssa'));
router.use('/zones', require('./zones'));

module.exports = router;
