const request = require('request');
const fs = require('fs');
const logger = require(__dirname + '/../utils/winstonLogger');

let Client = require('ssh2-sftp-client');

//let ZoneInfo = require(__dirname + '/../model/zoneInfo');
//let CpuStats = require(__dirname + '/../model/cpuStats');
//let AppVersions = require(__dirname + '/../model/appVersions');

const {
  getCookieJar,
  deleteCookieJar
} = require('./cookieJar');
const {
  prepareZoneConfig,
} = require('./autoCreateDualZone');
const {
  sleep
} = require('./zones');
const {
  agenda4
} = require('../jobs/autoDualZones');
const {
  getSystemProp
} = require('../middleware/systemProperties');
const {
  isDefined
} = require('../middleware/verifyToken');
const {
  runZfsActions
} = require('../controllers/zfssa');
const {
  returnZoneDbStats,
  getDbZoneList,
  lowestUnusedNumber,
  addUpdateZoneData,
} = require('../controllers/generalZoneFuncs');

agenda4.define('createDualZoneJobs', (job, done) => {
  (async () => {
    try {
      // Sample Fail
      //await Promise.reject(new Error('Oops!'));
      // work
      await createZonePerServer(job.attrs.data);
      done();
    } catch (error) {
      return done(error);
    }
  })()
});

// Create zone job - this will create jobs forach server
function addNewDualZone(req, res, next) {

  (async () => {
    try {
    // Get zone Port  - part 1
    let zoneServer;
    await Promise.all([returnZoneDbStats()]).then(zoneCountDbResults => {
      if (parseFloat(zoneCountDbResults[0][0]['cpu_avg1m']) <= parseFloat(zoneCountDbResults[0][1]['cpu_avg1m'])) {
        zoneServer = zoneCountDbResults[0][0]['server'];
      } else {
        zoneServer = zoneCountDbResults[0][1]['server'];
      }
    });

    let minZonePort;
    let zfssaUrl;

    await getSystemProp().then(value => {
      minZonePort = isDefined('minZonePort', value, '31011');
      zfssaUrl = isDefined('zfssaUrl', value, 'https://dc1nas2a.domain.com:215');
    });
    let replication_target = zfssaUrl.split('/').join(':').split('.').join(':').split(':')[3];

    let portList = [];
    await Promise.all([getDbZoneList("fullResults")]).then(zoneList => {
      zoneList[0]['message'].forEach(item => {
        if (item['zoneServer'] === zoneServer) {
          if (item['zonePort'] > parseInt(minZonePort)) {
            portList.push(parseInt(item['zonePort']))
          }
        }
        portList.sort((a, b) => a - b);
      });
    });

    let zonePort = lowestUnusedNumber(portList, parseInt(minZonePort + 1));

    const zoneData = {
      'buildMsg': 'Initializing...',
      'buildStatus': req.body.buildStatus,
      'selectedSrcVer': req.body.selectedSrcVer,
      'zoneUser': req.body.zoneUser,
      'zoneName': req.body.zoneName,
      'zoneShortName': req.body.zoneShortName,
      'zoneType': req.body.zoneType.split('-')[0],
      'zoneActive': 'building',
      'zoneLock': 'lock_outlined',
      'zoneServer': zoneServer,
      'zonePort': zonePort,
      'zoneActivity': 'NEW',
      'zoneAddress': '00000000-0000-0000-0000-000000000000',
      'jiraID': req.body.jiraID,
      'zoneDescription': req.body.zoneDescription,
    }
    // add then run function
    logger.debug({
      "addNewDualZone": zoneData
    });
      await Promise.all([addUpdateZoneData(zoneData)]).then(createZoneRes => {
        logger.debug({
          "addNewDualZone(createZoneRes)": createZoneRes
        });
      });
      await agenda4.now('createDualZoneJobs', {
        'zoneType': req.body.zoneType.split('-')[0],
        'selectedSrcVer': req.body.selectedSrcVer,
        'zoneUser': req.body.zoneUser,
        'jiraID': req.body.jiraID,
        'zoneDescription': req.body.zoneDescription,
        'updateJira': req.body.updateJira,
        'zoneName': req.body.zoneName,
        'zoneShortName': req.body.zoneShortName,
        'zoneServer': zoneServer,
        'zonePort': zonePort,
        'zoneAddress': '00000000-0000-0000-0000-000000000000',
        'zoneLock': 'lock_outlined',
        'zoneActive': 'building',
      });
      res.json({
        "createRes": 1
      });
  } catch (error) {
      logger.error({
        'configureZone(ERROR)': "Zone: " + options['zoneName'] + "installation failed with error: " + error
      });
      res.json({
        "createRes": 2
      });
    }
  })();
}

function createZonePerServer(option) {
  (async () => {
    await prepareZoneConfig(option);
  })();
}


module.exports = {
  addNewDualZone,
  createZonePerServer
}
