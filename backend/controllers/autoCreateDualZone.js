const request = require('request');
const fs = require('fs');
const logger = require(__dirname + '/../utils/winstonLogger');

let Client = require('ssh2-sftp-client');

let ZoneInfo = require(__dirname + '/../model/zoneInfo');
let CpuStats = require(__dirname + '/../model/cpuStats');
let AppVersions = require(__dirname + '/../model/appVersions');

const {
  createZfsSnapClone,
  runZfsActions
} = require('./zfssa');
const {
  getCookieJar,
  deleteCookieJar
} = require('./cookieJar');
const {
  captureZoneStats,
  updateZoneList,
} = require('./zones');
const {
  getSystemProp
} = require('../middleware/systemProperties');
const {
  isDefined,
  removePrivate
} = require('../middleware/verifyToken');
const {
  setAppVersion
} = require('./appVersions');
const {
  agenda5
} = require('../jobs/autoSingleZone');
const {
  agenda6
} = require('../jobs/autoAppDbZFS');
const {
  agenda7
} = require('../jobs/autoCompleteSingleZone');
const {
  getDbZoneList,
  addUpdateZoneData,
  updateJira,
  getAppVersions,
  zoneMaintenance,
  writeProfile,
  copyFiles,
  cloneRemoteZone,
  chkRemoteZoneStat,
  checkRadAvalble,
  getNextAvalVersion,
  zfsReplStatus,
  lowestUnusedNumber,
} = require('../controllers/generalZoneFuncs');

agenda5.define('createSingleZoneJob', (job, done) => {
  (async () => {
    try {
      await createPerServerZone(job.attrs.data);
      //await Promise.reject(new Error('Oops!'));
      done();
    } catch (error) {
      return done(error);
    }
  })()
});

agenda6.define('createAppDbZFSJob', (job, done) => {
  (async () => {
    try {
      await createAppDbZFSJob(job.attrs.data);
      //await Promise.reject(new Error('Oops!'));
      done();
    } catch (error) {
      return done(error);
    }
  })()
});

agenda7.define('completeSingleZoneJob', (job, done) => {
  (async () => {
    try {
      await completeSingleZoneJob(job.attrs.data);
      //await Promise.reject(new Error('Oops!'));
      done();
    } catch (error) {
      return done(error);
    }
  })()
});

function prepareZoneConfig(options) {
  return new Promise(function(resolve, reject) {

    (async () => {
      try {
        logger.debug({
          'prepareZoneConfig(zoneInfo)': options
        });

        let minZonePort;
        //let radZonePort;
        //let keyPassword;
        //let rootGlobalHostUser;
        //let rootZoneUser;
        let globalDcList;
        //let nodeDomain;
        let zoneDbUpdateMsg;
        //let maxSmfAvalTimeOut

        let zoneServer = options['zoneServer'];
        let zonePort = options['zonePort'];
        let zfssaUrl;

        await getSystemProp().then(value => {
          minZonePort = isDefined('minZonePort', value, '31011');
          globalDcList = isDefined('globalDcList', value, 'dc1,dc2');
          zfssaUrl = isDefined('zfssaUrl', value, 'https://dc1nas2a.domain.com:215');
        });
        let replication_target = zfssaUrl.split('/').join(':').split('.').join(':').split(':')[3];

        const initalZoneData = {
          'buildMsg': 'Initializing...',
          'zoneServer': options['zoneServer'],
          'zoneName': options['zoneName'],
          'zonePort': options['zonePort'],
          'zoneAddress': '00000000-0000-0000-0000-000000000000',
          'zoneLock': 'lock_outlined',
          'zoneActive': 'building',
          'zoneActivity': 'NEW',
          'zoneCreated': Math.floor(new Date() / 1000)
        }

        logger.debug({
          'prepareZoneConfig(initalZoneData)': initalZoneData
        });

        await Promise.all([addUpdateZoneData(initalZoneData)]).then(createZoneRes => {});

        zoneDbUpdateMsg = {
          'zoneName': options['zoneName'],
          'buildMsg': 'Updating Jira..',
          'percentComplete': 15
        }
        logger.debug({
          'prepareZoneConfig(dbUpdateMsg)': zoneDbUpdateMsg
        });
        await Promise.all([addUpdateZoneData(zoneDbUpdateMsg)]).then(createZoneRes => {});

        if ((options['zoneType'] === "APP") || (options['zoneType'] === "OTHER" && options['updateJira'] === true)) {

          let jiraID = options['zoneShortName'];
          if (options['jiraID'] !== "") {
            jiraID = options['jiraID'];
          }

          const jiraIDReq = {
            'zoneUser': options['zoneUser'],
            'restType': 'PUT',
            'jiraID': jiraID,
            'updateJiraFileds': {
              'fields': {
                'customfield_10905': zoneServer.split('-')[1],
                'customfield_14705': zonePort.toString()
              }
            }
          }

          await Promise.all([updateJira(jiraIDReq)]).then(jiraIDResult => {});
          logger.debug({
            'prepareZoneConfig(jiraIDReq)': jiraIDReq
          });
        }

        // Create ZFS filesystem - part 1
        zoneDbUpdateMsg = {
          'zoneName': options['zoneName'],
          'buildMsg': 'Createing ZFS file systems..',
          'percentComplete': 25
        }
        logger.debug({
          'prepareZoneConfig(dbUpdateMsg)': zoneDbUpdateMsg
        });
        await Promise.all([addUpdateZoneData(zoneDbUpdateMsg)]).then(createZoneRes => {});

        // get apps and db default versions.
        let appsVer;
        let dbVer;
        let appsVerNum;
        let dbVerNum;
        let vers = {
          'appVerType': 'defaultVersion'
        }

        let appLowestPort;
        let appNextVersion;
        let appDbName;
        let zfsOptions = {};

        if (options['zoneType'] === 'APP' || options['zoneType'] === 'DB' || options['zoneType'] === 'OTHER') {
          // db version
          if (options['selectedSrcVer']) {
            options['dbVer'] = options['selectedSrcVer'];
            options['dbVerNum'] = options['selectedSrcVer'].split('-')[2];
          } else {
            vers['app'] = 'db';
            await Promise.all([getAppVersions(vers)]).then(results => {
              logger.debug({
                'prepareZoneConfig(getAppVersions/FS)': results
              });
              options['dbVer'] = 'ifxdb-do_v-' + results[0]['message'];
              options['dbVerNum'] = results[0]['message'];
            });
          }
          // get latest app version
          vers['app'] = 'app';
          await Promise.all([getAppVersions(vers)]).then(results => {
            logger.debug({
              'prepareZoneConfig(getAppVersions/OTHER)': results
            });
            options['appsVer'] = 'apps1-prod_v-' + results[0]['message'];
            options['appsVerNum'] = results[0]['message'];
          });
        }

        if (options['zoneType'] === 'FS') {
          // app version
          options['appsVer'] = options['selectedSrcVer'];
          options['appsVerNum'] = options['selectedSrcVer'].split('-')[2];
          // get latest db version
          vers['app'] = 'db';
          await Promise.all([getAppVersions(vers)]).then(results => {
            logger.debug({
              'prepareZoneConfig(getAppVersions/FS)': results
            });
            options['dbVer'] = 'ifxdb-do_v-' + results[0]['message'];
            options['dbVerNum'] = results[0]['message'];
          });
        }

        if (options['zoneType'] === "FS" || options['zoneType'] === "DB") {

          // app
          if (options['zoneType'] === "FS") {
            appDbName = 'app';
            zfsOptions['zfsAppPrefix'] = 'apps1-prod_v-';
            zfsOptions['zfsSrcFs'] = options['appsVer'];
            appLowestPort = 2;
          }
          // db
          if (options['zoneType'] === "DB") {
            appDbName = 'db';
            zfsOptions['zfsAppPrefix'] = 'ifxdb-do_v-';
            zfsOptions['zfsSrcFs'] = options['dbVer'];
            appLowestPort = 5;
          }

          zfsOptions['zfsApiType'] = 'GET';
          zfsOptions['zfsReqType'] = 'getAllFs';
          options['zfsProjectTmp'] = Math.floor(new Date() / 1000);

          await Promise.all([getNextAvalVersion(zfsOptions)]).then(results => {
            options['appNextVersion'] = lowestUnusedNumber(results[0], parseInt(appLowestPort));
            options['zfsNextSrcFs'] = zfsOptions['zfsAppPrefix'] + options['appNextVersion'];
          });

          // Update DB with latest version.
          const data = {
            'appName': appDbName,
            'lastVersion': options['appNextVersion']
          }
          await Promise.all([setAppVersion(data)]).then(results => {});

          // reset db or apps mount to new mount
          if (options['zoneType'] === "FS") {
            options['appMount'] = options['zfsNextSrcFs'];
            zoneVersionType = 'appsVer';
            options['appsVerNum'] = options['appNextVersion']
          } else if (options['zoneType'] === "DB") {
            options['dbMount'] = options['zfsNextSrcFs'];
            zoneVersionType = 'dbVer';
            options['dbVerNum'] = options['appNextVersion']
          }
        }

        zoneDbUpdateMsg = {
          'zoneName': options['zoneName'],
          'dbVer': parseInt(options['dbVerNum']),
          'appsVer': parseInt(options['appsVerNum']),
          'buildMsg': 'Updating Versions..',
          'dbVersions': {
            shortVersion: 'ifxdb-do_v-' + options['dbVerNum'],
            fullVersion: 'ifxdb-do_v-' + options['dbVerNum'] + '-' + options['zoneName'],
            versionTime: new Date(Date.now()).toLocaleString()
          },
          'appVersions': {
            shortVersion: 'apps1-prod_v-' + options['appsVerNum'],
            fullVersion: 'apps1-prod_v-' + options['appsVerNum'] + '-' + options['zoneName'],
            versionTime: new Date(Date.now()).toLocaleString()
          },
          'percentComplete': 50
        }

        logger.debug({
          'prepareZoneConfig(dbUpdateMsg)': zoneDbUpdateMsg
        });
        await Promise.all([addUpdateZoneData(zoneDbUpdateMsg)]).then(createZoneRes => {});

        // Create ZFS snap/clone
        zfsOptions = {
          'zfsApiType': 'POST',
          'zfsReqType': 'setSnap',
          'zoneName': options['zoneName'],
          'zfsSrcSnap': 'snap_' + options['zoneName'],
          'appsVer': options['appsVer'],
          'dbVer': options['dbVer'],
          'zoneType': options['zoneType'],
        }
        logger.debug({
          'prepareZoneConfig(createZoneRes)': zfsOptions
        });

        // ZFS sanp
        await Promise.all([createZfsSnapClone(zfsOptions)]).then(createZoneRes => {
          logger.debug({
            'prepareZoneConfig(createZfsSnapClone)': createZoneRes
          });
        });

        zfsOptions['zfsApiType'] = 'PUT';
        zfsOptions['zfsReqType'] = 'createSnapClone';
        logger.debug({
          'prepareZoneConfig(createZoneRes)': zfsOptions
        });
        // ZFS clone
        await Promise.all([createZfsSnapClone(zfsOptions)]).then(createZoneRes => {
          logger.debug({
            'prepareZoneConfig(createZfsSnapClone)': createZoneRes
          });
        });

        logger.debug({
          'prepareZoneConfig(Create)': "Zone: " + options['zoneName'] + " Preparation successfully complted."
        });

        zoneDbUpdateMsg = {
          'zoneName': options['zoneName'],
          'buildMsg': 'ZFS build done..',
          'percentComplete': 55
        }

        logger.debug({
          'prepareZoneConfig(dbUpdateMsg)': zoneDbUpdateMsg
        });
        await Promise.all([addUpdateZoneData(zoneDbUpdateMsg)]).then(createZoneRes => {});

        let dcList = globalDcList.split(',');

        dcList.forEach((item, index, array) => {
          options['zoneServer'] = item + '-' + zoneServer.split('-')[1]
          agenda5.now('createSingleZoneJob', options)
        });

      } catch (error) {
        logger.error({
          'prepareZoneConfig(ERROR)': "Zone: " + options['zoneName'] + "installation failed with error: " + error
        });
      }
    })()
  });
}

// Create zone / boot
function createPerServerZone(options) {
  return new Promise(function(resolve, reject) {
    (async () => {
      try {

        let radZonePort;
        let keyPassword;
        let rootGlobalHostUser;
        let rootZoneUser;
        let nodeDomain;
        let zoneDbUpdateMsg;
        let maxSmfAvalTimeOut;
        let primeDc;

        let zoneServer = options['zoneServer'];
        let zonePort = options['zonePort'];
        let zfssaUrl;

        await getSystemProp().then(value => {
          radZonePort = isDefined('radZonePort', value, '41');
          keyPassword = isDefined('keyPassword', value, 'pas$sorD');
          rootGlobalHostUser = isDefined('rootGlobalHostUser', value, 'root');
          rootZoneUser = isDefined('rootZoneUser', value, 'confmgr');
          maxSmfAvalTimeOut = isDefined('radZoneAvalTimeOut', value, '300');
          nodeDomain = isDefined('nodeDomain', value, 'domain.com');
          primeDc = isDefined('primeDc', value, 'dc1');
          zfssaUrl = isDefined('zfssaUrl', value, 'https://dc1nas2a.domain.com:215');
        });
        let replication_target = zfssaUrl.split('/').join(':').split('.').join(':').split(':')[3];

        logger.debug({
          'createPerServerZone(begin)': options
        });

        //let globalHost = zoneServer.split('-')[1];
        let zoneName = options['zoneName'];
        let requestUri = '/api/com.oracle.solaris.rad.zonemgr/1.6/ZoneManager';
        let methudAction = 'create';
        let keepCookieJar = 'yes';
        let reqBody = {
          'name': options['zoneName'],
          'template': 'SYSsolaris'
        };

        //let dcList = ['https://dc1-', 'https://dc2-'];
        //let dcList = globalDcList.split(',');

        let hostPrefix = '.' + nodeDomain + ':';
        let hostPort = '6788';
        let apiDetails = [];

        apiDetails.push({
          'host': 'https://' + options['zoneServer'] + hostPrefix + hostPort,
          'zoneName': zoneName,
          'requestUri': requestUri,
          'methudAction': methudAction,
          'reqBody': reqBody,
          'keepCookieJar': keepCookieJar,
        });

        logger.debug({
          'configureZone(apiDetails-part1)': apiDetails
        });

        zoneDbUpdateMsg = {
          'zoneName': zoneName,
          [options['zoneServer'].split('-')[0]]: {
            'zoneServer': options['zoneServer'],
            'buildMsg': 'Creating zone configuration',
            'percentComplete': 15
          },
        }
        logger.debug({
          'configureZone(dbUpdateMsg)': zoneDbUpdateMsg
        });

        await Promise.all([addUpdateZoneData(zoneDbUpdateMsg)]).then(createZoneRes => {});

        let zoneStatsCookieJar1 = apiDetails.map(getCookieJar);
        await Promise.all(zoneStatsCookieJar1).then(results => {
          logger.debug({
            'configureZone(zoneStatsCookieJar1)': results
          });
        });

        let zoneCfgCreateActions = apiDetails.map(zoneMaintenance);
        await Promise.all(zoneCfgCreateActions).then(results => {

          apiDetails.forEach((item) => {
            item['requestUri'] = '/api/com.oracle.solaris.rad.zonemgr/1.6/Zone/' + item['zoneName'];
            item['methudAction'] = 'editConfig';
            item['reqBody'] = {};
          });
          logger.debug({
            'configureZone(zoneCfgCreateActions(apiDetails-part2))': apiDetails
          });
        });

        zoneDbUpdateMsg = {
          'zoneName': zoneName,
          [options['zoneServer'].split('-')[0]]: {
            'zoneServer': options['zoneServer'],
            'buildMsg': 'Setting zone properties...',
            'percentComplete': 28
          },
        }
        logger.debug({
          'configureZone(dbUpdateMsg)': zoneDbUpdateMsg
        });
        await Promise.all([addUpdateZoneData(zoneDbUpdateMsg)]).then(createZoneRes => {});

        let zoneCfgEditActions = apiDetails.map(zoneMaintenance);
        await Promise.all(zoneCfgEditActions).then(results => {

          apiDetails.forEach((item) => {
            item['methudAction'] = 'setResourceProperties';
            item['reqBody'] = {
              "filter": {
                "type": "global"
              },
              "properties": [{
                "name": "autoboot",
                "value": "true"
              }, {
                "name": "zonepath",
                "value": "/zones/%{zonename}"
              }]
            }
          });
          logger.debug({
            'configureZone(zoneCfgEditActions(apiDetails-part3-A))': apiDetails
          });
        });

        let zoneModifyActions1 = apiDetails.map(zoneMaintenance);
        await Promise.all(zoneModifyActions1).then(results => {

          apiDetails.forEach((item) => {
            item['methudAction'] = 'setResourceProperties';
            item['reqBody'] = {
              "filter": {
                "type": "anet"
              },
              "properties": [{
                "name": "lower-link",
                "value": "etherstub0"
              }]
            }
          });
          logger.debug({
            'configureZone(zoneModifyActions2(apiDetails-part3-B))': apiDetails
          });
        });

        let zoneModifyActions2 = apiDetails.map(zoneMaintenance);
        await Promise.all(zoneModifyActions2).then(results => {
          apiDetails.forEach((item) => {
            item['methudAction'] = 'addResource';
            item['reqBody'] = {
              "resource": {
                "type": "attr",
                "properties": [{
                  "name": "name",
                  "value": "port"
                }, {
                  "name": "type",
                  "value": "string"
                }, {
                  "name": "value",
                  "value": '"' + options['zonePort'] + '"'
                }]
              }
            }
          });

          logger.debug({
            'configureZone(zoneModifyActions3(apiDetails-part3-C))': apiDetails
          });
        });

        let zoneModifyActions3 = apiDetails.map(zoneMaintenance);
        await Promise.all(zoneModifyActions3).then(results => {

          apiDetails.forEach((item) => {
            item['methudAction'] = 'addResource';
            item['reqBody'] = {
              "resource": {
                "type": "attr",
                "properties": [{
                  "name": "name",
                  "value": "user"
                }, {
                  "name": "type",
                  "value": "string"
                }, {
                  "name": "value",
                  "value": options['zoneUser']
                }]
              }
            }
          });

          logger.debug({
            'configureZone(zoneModifyActions3(apiDetails-part3-D))': apiDetails
          });
        });

        let zoneModifyActions4 = apiDetails.map(zoneMaintenance);
        await Promise.all(zoneModifyActions4).then(results => {

          apiDetails.forEach((item) => {
            item['keepCookieJar'] = 'no';
            item['methudAction'] = 'commitConfig';
            item['reqBody'] = {};
          });
          logger.debug({
            'configureZone(zoneModifyActions2(apiDetails-part5))': apiDetails
          });
        });

        let zoneCfgCommitActions = apiDetails.map(zoneMaintenance);
        // const zoneCfgCommit = Promise.all(zoneCfgCommitActions).then(results => {});
        await Promise.all(zoneCfgCommitActions).then(results => {
          logger.debug({
            'configureZone(zoneCfgCommitActions)': results
          });
        });

        // Install zone - part 3
        zoneDbUpdateMsg = {
          'zoneName': options['zoneName'],
          [options['zoneServer'].split('-')[0]]: {
            'zoneServer': options['zoneServer'],
            'buildMsg': 'Preparing zone profile..',
            'percentComplete': 32
          },
        }
        logger.debug({
          'configureZone(dbUpdateMsg)': zoneDbUpdateMsg
        });
        await Promise.all([addUpdateZoneData(zoneDbUpdateMsg)]).then(createZoneRes => {});

        let copyDetails = [];
        copyDetails.push({
          'hostDc': options['zoneServer'],
          'srcFile': __dirname + '/../tmp/' + options['zoneServer'] + '-' + zoneName + '-sc_profile.xml',
          'dstFile': '/tmp/' + zoneName + '-sc_profile.xml',
          'zoneServer': options['zoneServer'],
          'zoneName': zoneName,
          'zonePort': zonePort,
          'keyPassword': keyPassword,
          'adminUser': rootGlobalHostUser,
        });

        let debugCopyDetails = JSON.parse(JSON.stringify(copyDetails));
        logger.debug({
          'configureZone(copyDetails-part1)': removePrivate(debugCopyDetails)
        });

        let writeZoneCfg = copyDetails.map(writeProfile);
        await Promise.all(writeZoneCfg).then(results => {
          logger.debug({
            'configureZone(writeZoneCfg)': results
          });
        });

        // Update copy port
        copyDetails.forEach((item) => {
          item['zonePort'] = 22
        });

        debugCopyDetails = JSON.parse(JSON.stringify(copyDetails));
        logger.debug({
          'configureZone(copyDetails-part2)': removePrivate(debugCopyDetails)
        });

        let copyZoneCfg = copyDetails.map(copyFiles);
        await Promise.all(copyZoneCfg).then(results => {});

        zoneDbUpdateMsg = {
          'zoneName': options['zoneName'],
          [options['zoneServer'].split('-')[0]]: {
            'zoneServer': options['zoneServer'],
            'buildMsg': 'Cloning zone.. Please wait...',
            'percentComplete': 35
          },
        }
        logger.debug({
          'configureZone(dbUpdateMsg)': zoneDbUpdateMsg
        });
        await Promise.all([addUpdateZoneData(zoneDbUpdateMsg)]).then(createZoneRes => {});

        apiDetails.forEach((item) => {
          delete item["cookieJar"];
          delete item["cookieAddr"];
          item['requestUri'] = '/api/com.oracle.solaris.rad.zonemgr/1.6/Zone/' + zoneName;
          item['methudAction'] = 'clone';
          item['keepCookieJar'] = 'no';
          item['reqBody'] = {
            'options': ['-c', '/tmp/' + zoneName + '-sc_profile.xml', 'z-source']
          };
        });
        logger.debug({
          'configureZone(addUpdateZoneData(apiDetails-part6))': apiDetails
        });

        let zoneStatsCookieJar2 = apiDetails.map(getCookieJar);
        await Promise.all(zoneStatsCookieJar2);

        logger.debug({
          'configureZone(getCookieJar(apiDetails-part7))': apiDetails
        });

        let cloneZoneAdm = apiDetails.map(cloneRemoteZone);
        await Promise.all(cloneZoneAdm).then(results => {});
        logger.debug({
          'configureZone(cloneRemoteZone(apiDetails-part8))': apiDetails
        });

        zoneDbUpdateMsg = {
          'zoneName': options['zoneName'],
          [options['zoneServer'].split('-')[0]]: {
            'zoneServer': options['zoneServer'],
            'buildMsg': 'Booting zone.. Please wait...',
            'percentComplete': 45
          },
        }
        logger.debug({
          'configureZone(dbUpdateMsg)': zoneDbUpdateMsg
        });
        await Promise.all([addUpdateZoneData(zoneDbUpdateMsg)]).then(createZoneRes => {});

        apiDetails.forEach((item) => {
          item['requestUri'] = '/api/com.oracle.solaris.rad.zonemgr/1.6/Zone/' + item['zoneName'];
          item['methudAction'] = 'boot';
          item['reqBody'] = {};
          item['keepCookieJar'] = 'no';
        });
        logger.debug({
          'configureZone(apiDetails-part9)': apiDetails
        });

        let bootZoneAdm = apiDetails.map(zoneMaintenance);
        await Promise.all(bootZoneAdm).then(results => {});

        // set db and apps mounts
        options['dbMount'] = options['dbVer'] + '-' + options['zoneName'];
        options['appMount'] = options['appsVer'] + '-' + options['zoneName'];

        if ((options['zoneType'] === "FS" && options['zoneServer'].split('-')[0].startsWith(primeDc)) ||
          (options['zoneType'] === "DB" && options['zoneServer'].split('-')[0].startsWith(primeDc))) {
          agenda6.now('createAppDbZFSJob', options)
        } else {
          agenda7.now('completeSingleZoneJob', options)
        }
        // create an error for tst
        // await Promise.reject(new Error('Oops!'));

        resolve();
      } catch (error) {
        logger.error({
          'createPerServerZone(ERROR)': "Zone: " + options['zoneName'] + " installation failed with error: " + error
        });
        reject(error);
      }
    })()
  });
}

// Create ZFS filesystem for DB or FS zone type
function createAppDbZFSJob(options) {
  return new Promise(function(resolve, reject) {
    (async () => {
      try {

        let appLowestPort;
        let appNextVersion;
        let targetUuid;
        let appDbName;
        let zfsOptions = {};

        // app
        if (options['zoneType'] === "FS") {
          appDbName = 'app';
          zfsOptions['zfsAppPrefix'] = 'apps1-prod_v-';
          zfsOptions['zfsSrcFs'] = options['appsVer'];
          appLowestPort = 2;
        }
        // db
        if (options['zoneType'] === "DB") {
          appDbName = 'db';
          zfsOptions['zfsAppPrefix'] = 'ifxdb-do_v-';
          zfsOptions['zfsSrcFs'] = options['dbVer'];
          appLowestPort = 5;
        }

        zfsOptions['zfsNextSrcFs'] = options['zfsNextSrcFs'];
        zfsOptions['zfsProjectTmp'] = options['zfsProjectTmp'];

        // Update DB with latest version.
        const data = {
          'appName': appDbName,
          'lastVersion': options['appNextVersion']
        }
        await Promise.all([setAppVersion(data)]).then(results => {});

        // reset db or apps mount to new mount
        if (options['zoneType'] === "FS") {
          options['appMount'] = options['zfsNextSrcFs'];
          zoneVersionType = 'appsVer';
        } else if (options['zoneType'] === "DB") {
          options['dbMount'] = options['zfsNextSrcFs'];
          zoneVersionType = 'dbVer';
        }

        zfsOptions['zfsApiType'] = 'PUT';
        zfsOptions['zfsReqType'] = 'setReplInheritFlag';

        await Promise.all([runZfsActions(zfsOptions)]).then(results => {});

        zfsOptions['zfsApiType'] = 'POST';
        zfsOptions['zfsReqType'] = 'createReplAction';

        await Promise.all([runZfsActions(zfsOptions)]).then(results => {
          zfsOptions['targetUuid'] = results[0]['msgResp']['action']['id'];
        });

        zfsOptions['zfsApiType'] = 'PUT';
        zfsOptions['zfsReqType'] = 'syncReplTarget';

        await Promise.all([runZfsActions(zfsOptions)]).then(results => {});

        zoneDbUpdateMsg = {
          'zoneName': options['zoneName'],
          [options['zoneServer'].split('-')[0]]: {
            'zoneServer': options['zoneServer'],
            'buildMsg': 'Sync in process...',
            'percentComplete': 65
          },
        }

        logger.debug({
          'configureZone(dbUpdateMsg)': zoneDbUpdateMsg
        });
        await Promise.all([addUpdateZoneData(zoneDbUpdateMsg)]).then(createZoneRes => {});

        zfsOptions['zfsApiType'] = 'GET';
        zfsOptions['zfsReqType'] = 'syncReplStatus';
        await Promise.all([zfsReplStatus(zfsOptions)]).then(results => {
          if (results[0]['errResult'] === false) {
            zfsOptions['zfsReplSyncTime'] = results[0]['curTimeOut'];
          } else {
            zfsOptions['zfsReplSyncTime'] = 'ERROR';
          }
        });

        zfsOptions['zfsApiType'] = 'PUT';
        zfsOptions['zfsReqType'] = 'renameReplMount';

        await Promise.all([runZfsActions(zfsOptions)]).then(results => {});

        zfsOptions['zfsApiType'] = 'PUT';
        zfsOptions['zfsReqType'] = 'severRepl';

        await Promise.all([runZfsActions(zfsOptions)]).then(results => {});

        zfsOptions['zfsApiType'] = 'PUT';
        zfsOptions['zfsReqType'] = 'renameShare';
        await Promise.all([runZfsActions(zfsOptions)]).then(results => {});

        zfsOptions['zfsApiType'] = 'DELETE';
        zfsOptions['zfsReqType'] = 'deleteRepl';
        await Promise.all([runZfsActions(zfsOptions)]).then(results => {});

        zfsOptions['zfsApiType'] = 'PUT';
        zfsOptions['zfsReqType'] = 'moveProjctFS';
        await Promise.all([runZfsActions(zfsOptions)]).then(results => {});

        zfsOptions['zfsApiType'] = 'DELETE';
        zfsOptions['zfsReqType'] = 'deleteProject';
        await Promise.all([runZfsActions(zfsOptions)]).then(results => {});

        //}

        // complete other zone tasks.
        agenda7.now('completeSingleZoneJob', options)

        resolve();
      } catch (error) {
        logger.error({
          'createPerServerZone(ERROR)': "Zone: " + options['zoneName'] + " installation failed with error."
        });
        logger.error({
          'createPerServerZone(ERROR detail)': error
        });
        /*logger.error({
          'createPerServerZone(ERROR)': "Zone: " + options['zoneName'] + " installation failed with error: " + error
        });*/
        reject(error);
      }
    })()
  });
}

// Final zone work
function completeSingleZoneJob(options) {
  return new Promise(function(resolve, reject) {
    (async () => {
      try {

        let radZonePort;
        let keyPassword;
        let rootGlobalHostUser;
        let rootZoneUser;
        let nodeDomain;
        let zoneDbUpdateMsg;
        let maxSmfAvalTimeOut

        let zoneServer = options['zoneServer'];
        let zonePort = options['zonePort'];
        let zfssaUrl;

        await getSystemProp().then(value => {
          radZonePort = isDefined('radZonePort', value, '41');
          keyPassword = isDefined('keyPassword', value, 'pas$sorD');
          rootGlobalHostUser = isDefined('rootGlobalHostUser', value, 'root');
          rootZoneUser = isDefined('rootZoneUser', value, 'confmgr');
          maxSmfAvalTimeOut = isDefined('radZoneAvalTimeOut', value, '300');
          nodeDomain = isDefined('nodeDomain', value, 'domain.com');
          zfssaUrl = isDefined('zfssaUrl', value, 'https://dc1nas2a.domain.com:215');
        });
        let replication_target = zfssaUrl.split('/').join(':').split('.').join(':').split(':')[3];

        zoneDbUpdateMsg = {
          'zoneName': options['zoneName'],
          [options['zoneServer'].split('-')[0]]: {
            'zoneServer': options['zoneServer'],
            'buildMsg': 'Waiting for zone availability...',
            'percentComplete': 60
          },
        }
        logger.debug({
          'configureZone(dbUpdateMsg)': zoneDbUpdateMsg
        });
        await Promise.all([addUpdateZoneData(zoneDbUpdateMsg)]).then(createZoneRes => {});

        let hostPrefix = '.' + nodeDomain + ':';
        let radPort = String(zonePort).substr(-3);
        hostPort = radZonePort + radPort;

        let apiDetails = [];
        apiDetails.push({
          'host': 'https://' + options['zoneServer'] + hostPrefix + parseInt(hostPort),
          'requestUri': '/api/com.oracle.solaris.rad.smf/1.0/Instance/milestone%2Fnetwork,default/state',
          'reqUser': rootZoneUser,
          'reqPort': zonePort,
          'maxSmfAvalTimeOut': maxSmfAvalTimeOut,
          'chkInterval': 10000,
          'incrTimeOut': 5,
          'expState': ['ONLINE'],
        });

        logger.debug({
          'configureZone(apiDetails-part10)': apiDetails
        });

        // Make sure zone RAD is available
        let radZoneState = apiDetails.map(checkRadAvalble);
        await Promise.all(radZoneState).then(results => {});

        zoneDbUpdateMsg = {
          'zoneName': options['zoneName'],
          [options['zoneServer'].split('-')[0]]: {
            'zoneServer': options['zoneServer'],
            'buildMsg': 'Configuring LDAP...',
            'percentComplete': 75
          },
        }
        logger.debug({
          'configureZone(dbUpdateMsg)': zoneDbUpdateMsg
        });
        await Promise.all([addUpdateZoneData(zoneDbUpdateMsg)]).then(createZoneRes => {});

        apiDetails.forEach((item) => {
          item['keepCookieJar'] = 'no';
          item['reqUser'] = rootZoneUser;
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/network%2Fldap%2Fclient,default';
          //item['methudAction'] = 'restart';
          item['methudAction'] = 'restart';
          item['reqBody'] = {};
          item['reqPort'] = hostPort;
        });
        logger.debug({
          'configureZone(apiDetails-part11)': apiDetails
        });

        let smfCookieJar1 = apiDetails.map(getCookieJar);
        await Promise.all(smfCookieJar1);

        let restartLdapActions = apiDetails.map(zoneMaintenance);
        await Promise.all(restartLdapActions).then(results => {});

        zoneDbUpdateMsg = {
          'zoneName': options['zoneName'],
          [options['zoneServer'].split('-')[0]]: {
            'zoneServer': options['zoneServer'],
            'buildMsg': 'Configuring mounts...',
            'percentComplete': 85
          },
        }
        logger.debug({
          'configureZone(dbUpdateMsg)': zoneDbUpdateMsg
        });
        await Promise.all([addUpdateZoneData(zoneDbUpdateMsg)]).then(createZoneRes => {});

        // Set db mount
        apiDetails.forEach((item) => {
          delete item["cookieJar"];
          delete item["cookieAddr"];
          item['keepCookieJar'] = 'yes';
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Finformix_mount,ifxsrc';
          item['methudAction'] = 'writeProperty';
          item['reqBody'] = {
            "prop_name": "start/exec",
            "prop_type": "ASTRING",
            "values": ['mount -o vers=3 nas-devops:/export/' + options['dbMount'] + ' /ifxsrv']
          };
        });

        logger.debug({
          'configureZone(dbMount(apiDetails-part12))': apiDetails
        });

        let smfCookieJar2 = apiDetails.map(getCookieJar);
        await Promise.all(smfCookieJar2);

        let setIfxSrcMount = apiDetails.map(zoneMaintenance);
        await Promise.all(setIfxSrcMount).then(results => {});

        logger.debug({
          'configureZone(dbMount(apiDetails-part13))': apiDetails
        });

        apiDetails.forEach((item) => {
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Finformix_mount,ifxsrc';
          item['methudAction'] = 'enable';
          item['reqBody'] = {
            'temporary': false
          };
        });

        logger.debug({
          'configureZone(informix_mount-restart/(apiDetails-part13))': apiDetails
        });

        let ifxSrcRestart = apiDetails.map(zoneMaintenance);
        await Promise.all(ifxSrcRestart).then(results => {});

        // If DB/FS zone - this has to run after db/fs is replicated.
        apiDetails.forEach((item) => {
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Fapps1_mount,apps1src';
          item['methudAction'] = 'writeProperty';
          item['reqBody'] = {
            "prop_name": "start/exec",
            "prop_type": "ASTRING",
            "values": ['mount -o vers=3 nas-devops:/export/' + options['appMount'] + ' /apps1']
          };
        });
        logger.debug({
          'configureZone(apps1_mount-writeProperty(apiDetails-part13))': apiDetails
        });

        let setAppSrcMount = apiDetails.map(zoneMaintenance);
        await Promise.all(setAppSrcMount).then(results => {});

        apiDetails.forEach((item) => {
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Fapps1_mount,apps1src';
          item['methudAction'] = 'enable';
          item['reqBody'] = {
            'temporary': false
          };
        });
        logger.debug({
          'configureZone(apps1_mount-enable/(apiDetails-part14))': apiDetails
        });

        let setAppSrcEnable = apiDetails.map(zoneMaintenance);
        await Promise.all(setAppSrcEnable).then(results => {});


        const userReq = {
          'zoneName': options['zoneName'],
          'reqZoneUser': 'true'
        }

        let reqZoneUser
        await Promise.all([getDbZoneList(userReq)]).then(createZoneRes => {
          reqZoneUser = createZoneRes[0]['message'][0]['zoneUser'];
        });

        // will have to see how to get create user
        apiDetails.forEach((item) => {
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Fnode,info';
          item['methudAction'] = 'writeProperty';
          item['reqBody'] = {
            "prop_name": "config/create_user",
            "prop_type": "ASTRING",
            "values": [reqZoneUser]
          };
        });
        logger.debug({
          'configureZone(node_info-writeProperty(apiDetails-part15))': apiDetails
        });

        let setUserAndIP = apiDetails.map(zoneMaintenance);
        await Promise.all(setUserAndIP).then(results => {});

        // Remove dependency of apps1
        if (options['zoneType'] === "DB") {
          apiDetails.forEach((item) => {
            item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Finformix_mount';
            item['methudAction'] = 'writeProperty';
            item['reqBody'] = {
              "prop_name": "apps1_mount/grouping",
              "prop_type": "ASTRING",
              "values": ['optional_all']
            };
          });
          logger.debug({
            'configureZone(node_info-writeProperty(apiDetails-prior-part16))': apiDetails
          });

          let rmAppsDependency = apiDetails.map(zoneMaintenance);
          await Promise.all(rmAppsDependency).then(results => {});

          apiDetails.forEach((item) => {
            item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Fdevops,dbupdate';
            item['methudAction'] = 'enable';
            item['reqBody'] = {
              'temporary': false
            };
          });
          logger.debug({
            'configureZone(devops_schema-enable/(apiDetails-part16))': apiDetails
          });

          let enableSchemaUpdate = apiDetails.map(zoneMaintenance);
          await Promise.all(enableSchemaUpdate).then(results => {});

          apiDetails.forEach((item) => {
            item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Fdevops,rmschmea';
            item['methudAction'] = 'enable';
            item['reqBody'] = {
              'temporary': false
            };
          });
          logger.debug({
            'configureZone(devops_rm_old-schema/(apiDetails-part16))': apiDetails
          });

          let rmOldSchema = apiDetails.map(zoneMaintenance);
          await Promise.all(rmOldSchema).then(results => {});

        }

        apiDetails.forEach((item) => {
          if (item['host'].startsWith('https://dc1')) {
            item['methudAction'] = 'enable';
          } else {
            item['methudAction'] = 'disable';
          }
          // item['keepCookieJar'] = 'no';
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Finformix_startup,ifxsrvr';
          item['reqBody'] = {
            'temporary': false
          };
        });
        logger.debug({
          'configureZone(informix_startup-enable(apiDetails-part16))': apiDetails
        });

        await Promise.all([zoneMaintenance(apiDetails[0])]).then(results => {});

        apiDetails.forEach((item) => {
          item['keepCookieJar'] = 'no';
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/network%2Fldap%2Fclient,default';
          item['methudAction'] = 'restart';
          item['reqBody'] = {};
          item['reqPort'] = hostPort;
        });
        logger.debug({
          'configureZone(apiDetails-part17)': apiDetails
        });

        let restartLdapFinal = apiDetails.map(zoneMaintenance);
        await Promise.all(restartLdapFinal).then(results => {});

        zoneDbUpdateMsg = {
          'zoneName': options['zoneName'],
          [options['zoneServer'].split('-')[0]]: {
            'zoneServer': options['zoneServer'],
            'buildMsg': 'Completed successfull',
            'percentComplete': 100
          },
          'buildStatus': 'fa fa-check positive-icon',
          'buildMsg': 'Completed successfull',
          'zoneLock': 'lock_open',
          'zoneActivity': 'done',
          'percentComplete': 100
        }
        logger.debug({
          'configureZone(dbUpdateMsg)': zoneDbUpdateMsg
        });
        await Promise.all([addUpdateZoneData(zoneDbUpdateMsg)]).then(createZoneRes => {
          logger.info({
            'configureZone(DONE)': "Zone" + options['zoneName'] + "installation completed successfully"
          });
        });

        resolve();
      } catch (error) {
        logger.error({
          'createPerServerZone(ERROR)': "Zone: " + options['zoneName'] + " installation failed with error: " + error
        });
        reject(error);
      }
    })()
  });
}

module.exports = {
  prepareZoneConfig,
  createPerServerZone
}
