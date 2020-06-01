const request = require('request');
const fs = require('fs');
const logger = require(__dirname + '/../utils/winstonLogger');

let Client = require('ssh2-sftp-client');

let ZoneInfo = require(__dirname + '/../model/zoneInfo');
let CpuStats = require(__dirname + '/../model/cpuStats');
let AppVersions = require(__dirname + '/../model/appVersions');

const {
  getCookieJar,
  deleteCookieJar
} = require('./cookieJar');
const {
  configureZone,
  returnZoneDbStats,
  getDbZoneList,
  lowestUnusedNumber,
  addUpdateZoneData,
  updateJira,
  getAppVersions,
  zoneMaintenance,
  copyFiles,
  getNextAvalVersion,
  zfsReplStatus,
  checkRadAvalble,
} = require('./generalZoneFuncs');
const {
  agenda3
} = require('../jobs/autoRefreshZone');
const {
  getSystemProp
} = require('../middleware/systemProperties');
const {
  isDefined
} = require('../middleware/verifyToken');
const {
  createZfsSnapClone,
  runZfsActions
} = require('./zfssa');
const {
  sleep
} = require('../controllers/zones');


agenda3.define('refreshZoneJobs', (job, done) => {
  //addJobToQueue(job.attrs.data);
  refreshZone(job.attrs.data);
  done();
});

function refreshZoneJob(req, res, next) {
  const zoneData = {
    'buildMsg': 'Refreshing.. please wait...',
    'buildStatus': req.body.buildStatus,
    'zoneServer': req.body.zoneServer,
    'zoneName': req.body.zoneName,
    'zoneShortName': req.body.zoneShortName,
    'zonePort': req.body.zonePort,
    'refreshType': req.body.refreshType,
    'selectedDbSrcVer': req.body.selectedDbSrcVer,
    'selectedAppSrcVer': req.body.selectedAppSrcVer,
    'zoneLock': 'lock_outlined',
    'dbVer': req.body.dbVer,
    'appsVer': req.body.appsVer,
    'percentComplete': 5
  }
  logger.debug({
    "refreshZoneJob": zoneData
  });
  Promise.all([addUpdateZoneData(zoneData)]).then(response => {
    logger.debug({
      "refreshZoneJob(refreshZone)": response
    });
    (async () => {
      await agenda3.now('refreshZoneJobs', {
        'buildMsg': 'Refreshing.. please wait...',
        'zoneServer': req.body.zoneServer,
        'buildStatus': req.body.buildStatus,
        'zoneName': req.body.zoneName,
        'zoneShortName': req.body.zoneShortName,
        'zonePort': req.body.zonePort,
        'refreshType': req.body.refreshType,
        'selectedDbSrcVer': req.body.selectedDbSrcVer,
        'selectedAppSrcVer': req.body.selectedAppSrcVer,
        'zoneLock': 'lock_outlined',
        'dbVer': req.body.dbVer,
        'appsVer': req.body.appsVer,
      });
      res.json({
        "createRes": 1
      });
    })();
  });
}

function refreshZone(options) {
  return new Promise(function(resolve, reject) {
    (async () => {
      try {

      let zoneData;
      let zoneDataMsg;
      let zfssaUrl;

      logger.debug({
        'configureZone(zoneInfo)': options
      });

      await getSystemProp().then(value => {
        zfssaUrl = isDefined('zfssaUrl', value, 'https://dc1nas2a.domain.com:215');
      });
      let replication_target = zfssaUrl.split('/').join(':').split('.').join(':').split(':')[3];

      zoneData = {
        'zoneServer': options['zoneServer'],
        'zoneName': options['zoneName'],
        'zoneShortName': options['zoneShortName'],
        'refreshType': options['refreshType'],
        'selectedDbSrcVer': options['selectedDbSrcVer'],
        'selectedAppSrcVer': options['selectedAppSrcVer'],
        'zoneLock': 'lock_outlined',
        'buildStatus': 'fa fa-spinner fa-pulse updating-icon',
        'zoneActivity': 'SYNC',
        'percentComplete': 10
      }

      logger.debug({
        'configureZone(initalZoneData)': zoneData
      });

      await Promise.all([addUpdateZoneData(zoneData)]).then(createZoneRes => {});

      let appsVer;
      let dbVer;
      let dbMount;
      let appMount;
      let renameFrom;
      let radZonePort;
      let keyPassword;
      let rootGlobalHostUser;
      let rootZoneUser;
      let globalDcList;
      let nodeDomain;
      let zfsNewTime = Math.floor(new Date() / 1000);
      let smfState;
      let smfCookieJar;

      await getSystemProp().then(value => {
        radZonePort = isDefined('radZonePort', value, '41');
        keyPassword = isDefined('keyPassword', value, 'pas$sorD');
        rootGlobalHostUser = isDefined('rootGlobalHostUser', value, 'root');
        rootZoneUser = isDefined('rootZoneUser', value, 'confmgr');
        globalDcList = isDefined('globalDcList', value, 'dc1,dc2');
        nodeDomain = isDefined('nodeDomain', value, 'domain.com');
      });

      let globalHost = options['zoneServer'].split('-')[1];
      let dcList = globalDcList.split(',');
      let hostPrefix = '.' + nodeDomain + ':';
      let hostPort = '6788';
      let apiDetails = [];
      let apiDetailTmp = [];

      // ZFS options
      let zfsOptions = {
        'zfsApiType': 'PUT',
        'zfsReqType': 'renameSnap',
        'zoneName': options['zoneName'],
        'zoneShortName': options['zoneShortName'],
        'zfsSrcSnap': 'snap_' + options['zoneName'],
        //'zfsDstSnap': 'snap_' + options['zoneName'],
        'refreshTime': zfsNewTime,
        'verSrcRenameSnap': 'snap_' + options['zoneName'] + '-' + zfsNewTime,
      }

      if (options['refreshType'] === 'Both') {
        zfsOptions['zoneType'] = 'APP';
        zfsOptions['appVerDst'] = options['selectedAppSrcVer'];
        zfsOptions['dbVerDst'] = options['selectedDbSrcVer'];
        zfsOptions['dbVerSrc'] = 'ifxdb-do_v-' + options['dbVer'];
        zfsOptions['appVerSrc'] = 'apps1-prod_v-' + options['appsVer'];
      } else if (options['refreshType'] === 'DB') {
        zfsOptions['zoneType'] = 'DB';
        zfsOptions['dbVerDst'] = options['selectedDbSrcVer'];
        zfsOptions['dbVerSrc'] = 'ifxdb-do_v-' + options['dbVer'];
      } else if (options['refreshType'] === 'FS') {
        zfsOptions['zoneType'] = 'FS';
        zfsOptions['appVerDst'] = options['selectedAppSrcVer'];
        zfsOptions['appVerSrc'] = 'apps1-prod_v-' + options['appsVer'];
      }

      zoneDataMsg = {
        'zoneName': options['zoneName'],
        'buildMsg': 'Refreshing ZFS filesystems',
        'percentComplete': 25
      }
      logger.debug({
        'configureZone(dbUpdateMsg)': zoneDataMsg
      });
      await Promise.all([addUpdateZoneData(zoneDataMsg)]).then(createZoneRes => {});

      logger.debug({
        'configureZone(createZoneRes)': zfsOptions
      });

      await Promise.all([createZfsSnapClone(zfsOptions)]).then(createZoneRes => {
        logger.debug({
          'configureZone(createZfsSnapClone)': createZoneRes
        });
      });

      zfsOptions['zfsApiType'] = 'POST';
      zfsOptions['zfsReqType'] = 'setSnap';

      // create NEW ZFS sanp
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

      await Promise.all([createZfsSnapClone(zfsOptions)]).then(renameFrom => {
        logger.debug({
          'configureZone(createZfsSnapClone)': renameFrom
        });

        renameFrom[0]['zfsParamList'].forEach((item) => {
          if (item['zfsSrcFs'].startsWith('apps1')) {
            appMount = item['zfsDstFs'];
          } else {
            dbMount = item['zfsDstFs'];
          }
        });
      });

      zoneDataMsg = {
        'zoneName': options['zoneName'],
        'buildMsg': 'Refreshing mounted filesystems',
        'percentComplete': 55
      }
      logger.debug({
        'configureZone(dbUpdateMsg)': zoneDataMsg
      });
      await Promise.all([addUpdateZoneData(zoneDataMsg)]).then(createZoneRes => {});


      let radPort = String(options['zonePort']).substr(-3);
      hostPort = radZonePort + radPort;

      dcList.forEach((dcHost, index, array) => {
        apiDetails.push({
          'host': 'https://' + dcHost + '-' + globalHost + hostPrefix + parseInt(hostPort),
          'keepCookieJar': 'yes',
          'zoneName': options['zoneName'],
          'reqUser': rootZoneUser,
          'reqPort': hostPort
        });
      });

      /**/
      if (options['refreshType'] === 'Both' || options['refreshType'] === 'FS') {

        zoneDataMsg = {
          'zoneName': options['zoneName'],
          'buildMsg': 'Refreshing APPS mount',
          'percentComplete': 65
        }
        logger.debug({
          'configureZone(dbUpdateMsg)': zoneDataMsg
        });
        await Promise.all([addUpdateZoneData(zoneDataMsg)]).then(createZoneRes => {});

        smfCookieJar = apiDetails.map(getCookieJar);
        await Promise.all(smfCookieJar);

        // Set new app service
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
          'configureZone(apps1_mount-writeProperty(apiDetails-1))': apiDetails
        });
        let setAppSrc = apiDetails.map(zoneMaintenance);
        await Promise.all(setAppSrc).then(results => {});

        // Disable app service
        apiDetails.forEach((item) => {
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Fapps1_mount,apps1src';
          item['methudAction'] = 'disable';
          item['reqBody'] = {
            'temporary': false
          };
        });
        logger.debug({
          'configureZone(apps1_mount-enable/(apiDetails-2))': apiDetails
        });
        let uMountAppsServer = apiDetails.map(zoneMaintenance);
        await Promise.all(uMountAppsServer).then(results => {});

        // Wait smf to complete
        apiDetails.forEach((item) => {
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Fapps1_mount,apps1src/state';
          //'rootZoneUser': rootZoneUser,
          item['maxSmfAvalTimeOut'] = 20; // count
          item['chkInterval'] = 1000; // mili seconds
          item['incrTimeOut'] = 1; // count
          item['expState'] = ['DISABLED', 'OFFLINE', 'MAINT', 'DEGRADED'];
        });

        smfState = apiDetails.map(checkRadAvalble);
        await Promise.all(smfState).then(results => {});

        // Enable app service
        apiDetails.forEach((item) => {
          delete item["cookieJar"];
          delete item["cookieAddr"];
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Fapps1_mount,apps1src';
          item['methudAction'] = 'enable';
          item['reqBody'] = {
            'temporary': false
          };
        });
        smfCookieJar = apiDetails.map(getCookieJar);
        await Promise.all(smfCookieJar);
        logger.debug({
          'configureZone(apps1_mount-enable/(apiDetails-3))': apiDetails
        });
        let mountApps = apiDetails.map(zoneMaintenance);
        await Promise.all(mountApps).then(results => {});

        // Wait smf to complete
        apiDetails.forEach((item) => {
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Fapps1_mount,apps1src/state';
          //'rootZoneUser': rootZoneUser,
          item['maxSmfAvalTimeOut'] = 20; // count
          item['chkInterval'] = 1000; // mili seconds
          item['incrTimeOut'] = 1; // count
          item['expState'] = ['ONLINE'];
        });

        smfState = apiDetails.map(checkRadAvalble);
        await Promise.all(smfState).then(results => {});

        apiDetails.forEach((item) => {
          deleteCookieJar(item['host'], item['cookieJar'], item['cookieAddr']);
          delete item["cookieJar"];
          delete item["cookieAddr"];
        });

        zoneDataMsg = {
          'zoneName': options['zoneName'],
          'appsVer': parseInt(options['selectedAppSrcVer'].split('-')[2]),
          'appVersions': {
            shortVersion: options['selectedAppSrcVer'],
            fullVersion: appMount,
            versionTime: new Date(Date.now()).toLocaleString()
          },
          'percentComplete': 75,
        }
        logger.debug({
          'configureZone(dbUpdateMsg-1)': zoneDataMsg
        });
        await Promise.all([addUpdateZoneData(zoneDataMsg)]).then(results => {
          logger.info({
            'ayncZone(dBUpdateAppVersion)': results
          });
        });

        // Delete old ZFS sanp
        zfsOptions['zfsApiType'] = 'DELETE';
        zfsOptions['zfsReqType'] = 'deleteSnapClone';
        zfsOptions['zfsSrcFs'] = zfsOptions['appVerSrc'];
        zfsOptions['zfsSrcSnap'] = zfsOptions['verSrcRenameSnap'];

        // Delete old ZFS sanp
        await Promise.all([runZfsActions(zfsOptions)]).then(results => {
          logger.debug({
            'configureZone(createZfsSnapClone)': results
          });
        });

        zoneDataMsg = {
          'zoneName': options['zoneName'],
          'buildMsg': 'Delete APPS done',
          'percentComplete': 85
        }
        logger.debug({
          'configureZone(dbUpdateMsg-2)': zoneDataMsg
        });
        await Promise.all([addUpdateZoneData(zoneDataMsg)]).then(createZoneRes => {});
      }

      if (options['refreshType'] === 'Both' || options['refreshType'] === 'DB') {

        zoneDataMsg = {
          'zoneName': options['zoneName'],
          'buildMsg': 'Refreshing DB mount',
          'percentComplete': 65
        }
        logger.debug({
          'configureZone(dbUpdateMsg-3)': zoneDataMsg
        });
        await Promise.all([addUpdateZoneData(zoneDataMsg)]).then(createZoneRes => {});

        smfCookieJar = apiDetails.map(getCookieJar);
        await Promise.all(smfCookieJar);

        // Set new app service
        apiDetails.forEach((item) => {
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Finformix_mount,ifxsrc';
          item['methudAction'] = 'writeProperty';
          item['reqBody'] = {
            "prop_name": "start/exec",
            "prop_type": "ASTRING",
            "values": ['mount -o vers=3 nas-devops:/export/' + dbMount + ' /ifxsrv']
          };
        });
        logger.debug({
          'configureZone(apps1_mount-writeProperty(apiDetails-11))': apiDetails
        });
        let setIfxServerMount = apiDetails.map(zoneMaintenance);
        await Promise.all(setIfxServerMount).then(results => {});

        apiDetails.forEach((item) => {
          delete item["cookieJar"];
          delete item["cookieAddr"];
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Finformix_startup,ifxsrvr';
          item['methudAction'] = 'disable';
          item['reqBody'] = {
            'temporary': false
          };
        });

        smfCookieJar = apiDetails.map(getCookieJar);
        await Promise.all(smfCookieJar).then(results => {});

        logger.debug({
          'configureZone(informix_startup-disable/(apiDetails-12))': apiDetails
        });
        let stopIfxServer = apiDetails.map(zoneMaintenance);
        await Promise.all(stopIfxServer).then(results => {});

        // Wait smf to complete
        apiDetails.forEach((item) => {
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Finformix_startup,ifxsrvr/state';
          item['maxSmfAvalTimeOut'] = 60; // count
          item['chkInterval'] = 1000; // mili seconds
          item['incrTimeOut'] = 1; // count
          item['expState'] = ['DISABLED', 'OFFLINE', 'MAINT', 'DEGRADED'];
        });

        smfState = apiDetails.map(checkRadAvalble);
        await Promise.all(smfState).then(results => {});

        apiDetails.forEach((item) => {
          delete item["cookieJar"];
          delete item["cookieAddr"];
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Finformix_mount,ifxsrc';
          item['methudAction'] = 'disable';
          item['reqBody'] = {
            'temporary': false
          };
        });

        smfCookieJar = apiDetails.map(getCookieJar);
        await Promise.all(smfCookieJar).then(results => {});

        logger.debug({
          'configureZone(informix_mount-disable/(apiDetails-13))': apiDetails
        });
        let uMountIfxServer = apiDetails.map(zoneMaintenance);
        await Promise.all(uMountIfxServer).then(results => {});

        // sleep(2);
        // Wait smf to complete
        apiDetails.forEach((item) => {
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Finformix_mount,ifxsrc/state';
          //'rootZoneUser': rootZoneUser,
          item['maxSmfAvalTimeOut'] = 30; // count
          item['chkInterval'] = 1000; // mili seconds
          item['incrTimeOut'] = 1; // count
          item['expState'] = ['DISABLED', 'OFFLINE', 'MAINT', 'DEGRADED'];
        });

        smfState = apiDetails.map(checkRadAvalble);
        await Promise.all(smfState).then(results => {});

        // Enable app service
        apiDetails.forEach((item) => {
          delete item["cookieJar"];
          delete item["cookieAddr"];
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Finformix_mount,ifxsrc';
          item['methudAction'] = 'enable';
          item['reqBody'] = {
            'temporary': false
          };
        });
        smfCookieJar = apiDetails.map(getCookieJar);
        await Promise.all(smfCookieJar);
        logger.debug({
          'configureZone(informix_mount-enable/(apiDetails-14))': apiDetails
        });
        let mountIfxServer = apiDetails.map(zoneMaintenance);
        await Promise.all(mountIfxServer).then(results => {});

        // Wait smf to complete
        apiDetails.forEach((item) => {
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Finformix_mount,ifxsrc/state';
          //'rootZoneUser': rootZoneUser,
          item['maxSmfAvalTimeOut'] = 30; // count
          item['chkInterval'] = 1000; // mili seconds
          item['incrTimeOut'] = 1; // count
          item['expState'] = ['ONLINE'];
        });

        smfState = apiDetails.map(checkRadAvalble);
        await Promise.all(smfState).then(results => {});

        apiDetails.forEach((item, index, array) => {
          if (item['host'].startsWith('https://dc2')) {
            apiDetailTmp.push(apiDetails[index]);
            delete apiDetails[index];
          }
          delete item["cookieJar"];
          delete item["cookieAddr"];
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Finformix_startup,ifxsrvr';
          item['methudAction'] = 'enable';
          item['reqBody'] = {
            'temporary': false
          };
        });
        smfCookieJar = apiDetails.map(getCookieJar);
        await Promise.all(smfCookieJar);
        logger.debug({
          'configureZone(informix_startup-enable/(apiDetails-15))': apiDetails
        });

        let startIfxServer = apiDetails.map(zoneMaintenance);
        await Promise.all(startIfxServer).then(results => {});

        // Wait smf to complete
        apiDetails.forEach((item) => {
          item['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/application%2Finformix_startup,ifxsrvr/state';
          //'rootZoneUser': rootZoneUser,
          item['maxSmfAvalTimeOut'] = 60; // count
          item['chkInterval'] = 1000; // mili seconds
          item['incrTimeOut'] = 1; // count
          item['expState'] = ['ONLINE'];
        });

        smfState = apiDetails.map(checkRadAvalble);
        await Promise.all(smfState).then(results => {});

        zoneDataMsg = {
          'zoneName': options['zoneName'],
          'dbVer': parseInt(options['selectedDbSrcVer'].split('-')[2]),
          'dbVersions': {
            shortVersion: options['selectedDbSrcVer'],
            fullVersion: dbMount,
            versionTime: new Date(Date.now()).toLocaleString()
          },
          'percentComplete': 75
        }
        logger.debug({
          'configureZone(dbUpdateMsg-11)': zoneDataMsg
        });
        await Promise.all([addUpdateZoneData(zoneDataMsg)]).then(results => {
          logger.info({
            'ayncZone(dBUpdateIfxVersion)': results
          });
        });
        apiDetails.push(apiDetailTmp[0]);

        // delete old snap
        zfsOptions['zfsApiType'] = 'DELETE';
        zfsOptions['zfsReqType'] = 'deleteSnapClone';
        zfsOptions['zfsSrcFs'] = zfsOptions['dbVerSrc'];
        zfsOptions['zfsSrcSnap'] = zfsOptions['verSrcRenameSnap'];

        // Delete old ZFS sanp
        await Promise.all([runZfsActions(zfsOptions)]).then(results => {
          logger.debug({
            'configureZone(createZfsSnapClone)': results
          });
        });

        zoneDataMsg = {
          'zoneName': options['zoneName'],
          'buildMsg': 'Delete DB done',
          'percentComplete': 85
        }
        logger.debug({
          'configureZone(dbUpdateMsg-12)': zoneDataMsg
        });
        await Promise.all([addUpdateZoneData(zoneDataMsg)]).then(createZoneRes => {});

      }

      // Closes connection
      apiDetails.forEach((item, index, array) => {
        deleteCookieJar(item['host'], item['cookieJar'], item['cookieAddr']);
      });

      zoneDataMsg = {
        'zoneName': options['zoneName'],
        'buildStatus': 'fa fa-check positive-icon',
        'buildMsg': 'Refresh successful',
        'zoneLock': 'lock_open',
        'zoneActivity': 'done',
        'percentComplete': 100
      }
      logger.debug({
        'configureZone(dbUpdateMsg-13)': zoneDataMsg
      });
      await Promise.all([addUpdateZoneData(zoneDataMsg)]).then(createZoneRes => {
        logger.info({
          'configureZone(DONE)': "Zone" + options['zoneName'] + ": Refresh successfully completed"
        });
      });
    } catch (error) {
      return Promise.reject(error);
      }
    })();
  });
}

module.exports = {
  refreshZoneJob,
}
