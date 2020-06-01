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
  returnZoneDbStats,
  getDbZoneList,
  lowestUnusedNumber,
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
} = require('../controllers/generalZoneFuncs');

function configureZone(options) {
  return new Promise(function(resolve, reject) {

    (async () => {
      try {
      logger.debug({
        'configureZone(zoneInfo)': options
      });
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
      let radZonePort;
      let keyPassword;
      let rootGlobalHostUser;
      let rootZoneUser;
      let globalDcList;
      let nodeDomain;
      let zoneDbUpdateMsg;
      let maxSmfAvalTimeOut
      let zfssaUrl;

      await getSystemProp().then(value => {
        minZonePort = isDefined('minZonePort', value, '31011');
        radZonePort = isDefined('radZonePort', value, '41');
        keyPassword = isDefined('keyPassword', value, 'pas$sorD');
        rootGlobalHostUser = isDefined('rootGlobalHostUser', value, 'root');
        rootZoneUser = isDefined('rootZoneUser', value, 'confmgr');
        maxSmfAvalTimeOut = isDefined('radZoneAvalTimeOut', value, '300');
        globalDcList = isDefined('globalDcList', value, 'dc1,dc2');
        nodeDomain = isDefined('nodeDomain', value, 'domain.com');
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

      const initalZoneData = {
        'buildMsg': 'Acquired host and port number...',
        'zoneServer': zoneServer,
        'zoneName': options['zoneName'],
        'zonePort': zonePort,
        'zoneAddress': '00000000-0000-0000-0000-000000000000',
        'zoneLock': 'lock_outlined',
        'zoneActive': 'building',
        'zoneActivity': 'NEW'
      }

      logger.debug({
        'configureZone(initalZoneData)': initalZoneData
      });

      await Promise.all([addUpdateZoneData(initalZoneData)]).then(createZoneRes => {});

      zoneDbUpdateMsg = {
        'zoneName': options['zoneName'],
        'buildMsg': 'Updating Jira..',
        'percentComplete': 5
      }
      logger.debug({
        'configureZone(dbUpdateMsg)': zoneDbUpdateMsg
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
          'configureZone(jiraIDReq)': jiraIDReq
        });
      }

      // Create ZFS filesystem - part 1
      zoneDbUpdateMsg = {
        'zoneName': options['zoneName'],
        'buildMsg': 'Createing ZFS file systems..',
        'percentComplete': 10
      }
      logger.debug({
        'configureZone(dbUpdateMsg)': zoneDbUpdateMsg
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
      if (options['zoneType'] === 'APP' || options['zoneType'] === 'DB' || options['zoneType'] === 'OTHER') {
        // db version
        if (options['selectedSrcVer']) {
          dbVer = options['selectedSrcVer'];
          dbVerNum = options['selectedSrcVer'].split('-')[2];
        } else {
          vers['app'] = 'db';
          await Promise.all([getAppVersions(vers)]).then(results => {
            logger.debug({
              'configureZone(getAppVersions/FS)': results
            });
            dbVer = 'ifxdb-do_v-' + results[0]['message'];
            dbVerNum = results[0]['message'];
          });
        }
        // get latest app version
        vers['app'] = 'app';
        await Promise.all([getAppVersions(vers)]).then(results => {
          logger.debug({
            'configureZone(getAppVersions/OTHER)': results
          });
          appsVer = 'apps1-prod_v-' + results[0]['message'];
          appsVerNum = results[0]['message'];
        });
      }

      if (options['zoneType'] === 'FS') {
        // app version
        appsVer = options['selectedSrcVer'];
        appsVerNum = options['selectedSrcVer'].split('-')[2];
        // get latest db version
        vers['app'] = 'db';
        await Promise.all([getAppVersions(vers)]).then(results => {
          logger.debug({
            'configureZone(getAppVersions/FS)': results
          });
          dbVer = 'ifxdb-do_v-' + results[0]['message'];
          dbVerNum = results[0]['message'];
        });
      }

      zoneDbUpdateMsg = {
        'zoneName': options['zoneName'],
        'dbVer': parseInt(dbVerNum),
        'appsVer': parseInt(appsVerNum),
        'buildMsg': 'Updating Versions..',
        'dbVersions': {
          shortVersion: 'ifxdb-do_v-' + dbVerNum,
          fullVersion: 'ifxdb-do_v-' + dbVerNum + '-' + options['zoneName'],
          versionTime: new Date(Date.now()).toLocaleString()
        },
        'appVersions': {
          shortVersion: 'apps1-prod_v-' + appsVerNum,
          fullVersion: 'apps1-prod_v-' + appsVerNum + '-' + options['zoneName'],
          versionTime: new Date(Date.now()).toLocaleString()
        },
        'percentComplete': 20
      }

      logger.debug({
        'configureZone(dbUpdateMsg)': zoneDbUpdateMsg
      });
      await Promise.all([addUpdateZoneData(zoneDbUpdateMsg)]).then(createZoneRes => {});

      // Create ZFS snap/clone
      let zfsOptions = {
        'zfsApiType': 'POST',
        'zfsReqType': 'setSnap',
        'zoneName': options['zoneName'],
        'zfsSrcSnap': 'snap_' + options['zoneName'],
        'appsVer': appsVer,
        'dbVer': dbVer,
        'zoneType': options['zoneType'],
      }
      logger.debug({
        'configureZone(createZoneRes)': zfsOptions
      });

      // ZFS sanp
      await Promise.all([createZfsSnapClone(zfsOptions)]).then(createZoneRes => {
        logger.debug({
          'configureZone(createZfsSnapClone)': createZoneRes
        });
      });

      zfsOptions['zfsApiType'] = 'PUT';
      zfsOptions['zfsReqType'] = 'createSnapClone';
      logger.debug({
        'configureZone(createZoneRes)': zfsOptions
      });
      // ZFS clone
      await Promise.all([createZfsSnapClone(zfsOptions)]).then(createZoneRes => {
        logger.debug({
          'configureZone(createZfsSnapClone)': createZoneRes
        });
      });

      /*
      // Alrday migrat
      */

      // Configure zone - part 2

      // Configure zone options
      let globalHost = zoneServer.split('-')[1];
      let zoneName = options['zoneName'];
      let requestUri = '/api/com.oracle.solaris.rad.zonemgr/1.6/ZoneManager';
      let methudAction = 'create';
      let keepCookieJar = 'yes';
      let reqBody = {
        'name': options['zoneName'],
        'template': 'SYSsolaris'
      };

      //let dcList = ['https://dc1-', 'https://dc2-'];
      let dcList = globalDcList.split(',');

      let hostPrefix = '.' + nodeDomain + ':';
      let hostPort = '6788';
      let apiDetails = [];

      dcList.forEach((item, index, array) => {
        apiDetails.push({
          'host': 'https://' + item + '-' + globalHost + hostPrefix + hostPort,
          'zoneName': zoneName,
          'requestUri': requestUri,
          'methudAction': methudAction,
          'reqBody': reqBody,
          'keepCookieJar': keepCookieJar,
        });
      });
      logger.debug({
        'configureZone(apiDetails-part1)': apiDetails
      });

      zoneDbUpdateMsg = {
        'zoneName': zoneName,
        'buildMsg': 'Creating zone configuration',
        'percentComplete': 25
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
        'buildMsg': 'Setting zone properties...',
        'percentComplete': 28
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
          'configureZone(zoneCfgEditActions(apiDetails-part3))': apiDetails
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
          'configureZone(zoneModifyActions1(apiDetails-part4))': apiDetails
        });
      });

      let zoneModifyActions2 = apiDetails.map(zoneMaintenance);
      await Promise.all(zoneModifyActions2).then(results => {

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
        'buildMsg': 'Preparing zone profile..',
        'percentComplete': 32
      }
      logger.debug({
        'configureZone(dbUpdateMsg)': zoneDbUpdateMsg
      });
      await Promise.all([addUpdateZoneData(zoneDbUpdateMsg)]).then(createZoneRes => {});

      copyDetails = [];
      dcList.forEach((hostDc) => {
        copyDetails.push({
          'hostDc': hostDc + '-' + globalHost,
          'srcFile': __dirname + '/../tmp/' + hostDc + '-' + zoneName + '-sc_profile.xml',
          'dstFile': '/tmp/' + zoneName + '-sc_profile.xml',
          'zoneServer': zoneServer,
          'zoneName': zoneName,
          'zonePort': zonePort,
          'keyPassword': keyPassword,
          'adminUser': rootGlobalHostUser,
        });
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
        'buildMsg': 'Cloning zone.. Please wait...',
        'percentComplete': 35
      }
      logger.debug({
        'configureZone(dbUpdateMsg)': zoneDbUpdateMsg
      });
      Promise.all([addUpdateZoneData(zoneDbUpdateMsg)]).then(createZoneRes => {});

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
        'buildMsg': 'Booting zone.. Please wait...',
        'percentComplete': 45
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
      let dbMount = dbVer + '-' + options['zoneName'];
      let appMount = appsVer + '-' + options['zoneName'];

      let appLowestPort;
      let appNextVersion;
      let targetUuid;
      let appDbName;

      if (options['zoneType'] === "FS" || options['zoneType'] === "DB") {

        // app
        if (options['zoneType'] === "FS") {
          appDbName = 'app';
          zfsOptions['zfsAppPrefix'] = 'apps1-prod_v-';
          zfsOptions['zfsSrcFs'] = appsVer;
          appLowestPort = 2;
        }
        // db
        if (options['zoneType'] === "DB") {
          appDbName = 'db';
          zfsOptions['zfsAppPrefix'] = 'ifxdb-do_v-';
          zfsOptions['zfsSrcFs'] = dbVer;
          appLowestPort = 5;
        }

        zfsOptions['zfsApiType'] = 'GET';
        zfsOptions['zfsReqType'] = 'getAllFs';
        zfsOptions['zfsProjectTmp'] = Math.floor(new Date() / 1000);

        await Promise.all([getNextAvalVersion(zfsOptions)]).then(results => {
          appNextVersion = lowestUnusedNumber(results[0], parseInt(appLowestPort));
          zfsOptions['zfsNextSrcFs'] = zfsOptions['zfsAppPrefix'] + appNextVersion;
        });

        // Update DB with latest version.
        const data = {
          'appName': appDbName,
          'lastVersion': appNextVersion
        }
        await Promise.all([setAppVersion(data)]).then(results => {});

        // reset db or apps mount to new mount
        if (options['zoneType'] === "FS") {
          appMount = zfsOptions['zfsNextSrcFs'];
          zoneVersionType = 'appsVer';
        } else if (options['zoneType'] === "DB") {
          dbMount = zfsOptions['zfsNextSrcFs'];
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
          [zoneVersionType]: parseInt(appNextVersion),
          'buildMsg': 'Sync in process...',
          'percentComplete': 65
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

      }

      zoneDbUpdateMsg = {
        'zoneName': options['zoneName'],
        'buildMsg': 'Waiting for zone availability...',
        'percentComplete': 60
      }
      logger.debug({
        'configureZone(dbUpdateMsg)': zoneDbUpdateMsg
      });
      await Promise.all([addUpdateZoneData(zoneDbUpdateMsg)]).then(createZoneRes => {});

      let radPort = String(zonePort).substr(-3);
      hostPort = radZonePort + radPort;

      dcList.forEach((dcHost, index, array) => {
        apiDetails[index]['host'] = 'https://' + dcHost + '-' + globalHost + hostPrefix + parseInt(hostPort);
        apiDetails[index]['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/milestone%2Fnetwork,default/state';
        //apiDetails[index]['rootZoneUser'] = rootZoneUser;
        apiDetails[index]['reqUser'] = rootZoneUser;
        apiDetails[index]['reqPort'] = zonePort;
        apiDetails[index]['maxSmfAvalTimeOut'] = maxSmfAvalTimeOut;
        apiDetails[index]['chkInterval'] = 10000;
        apiDetails[index]['incrTimeOut'] = 5;
        apiDetails[index]['expState'] = ['ONLINE'];
      });
      logger.debug({
        'configureZone(dcList(apiDetails-part10))': dcList
      });

      // Make sure zone RAD is available
      let radZoneState = apiDetails.map(checkRadAvalble);
      await Promise.all(radZoneState).then(results => {});

      zoneDbUpdateMsg = {
        'zoneName': options['zoneName'],
        'buildMsg': 'Configuring LDAP...',
        'percentComplete': 75
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
        'buildMsg': 'Configuring mounts...',
        'percentComplete': 85
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
          "values": ['mount -o vers=3 nas-devops:/export/' + dbMount + ' /ifxsrv']
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
          "values": ['mount -o vers=3 nas-devops:/export/' + appMount + ' /apps1']
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
    } catch (error) {
      logger.error({
        'configureZone(ERROR)': "Zone: " + options['zoneName'] + "installation failed with error: " + error
      });
      }
    })();

  });
}

module.exports = {
  configureZone,
}
