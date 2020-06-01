const logger = require(__dirname + '/../utils/winstonLogger');

const Agenda = require('agenda');
const connectionString = 'mongodb://localhost:27017/unixdevops';

const {
  getCookieJar
} = require('../controllers/cookieJar');
const {
  //updateAllDbZoneStats,
  getRealTimeZoneInfo,
  removeZoneDbRecord,
  //updateZoneList,
} = require('../controllers/zones');
const {
  getDbZoneList,
  addUpdateZoneData,
  zoneMaintenance
} = require('../controllers/generalZoneFuncs');
const {
  getSystemProp
} = require('../middleware/systemProperties');
const {
  isDefined
} = require('../middleware/verifyToken');

const agenda8 = new Agenda({
  db: {
    address: connectionString,
    collection: 'jobUpdateZones'
  },
  //processEvery: '10 seconds'
  processEvery: '30 seconds'
});

agenda8.define('captureGlobalZoneList', (job, done) => {
  //updateAllDbZoneStats();
  autoUpdateZones();
  done();
});

// capture Devops Server CPU, Mme Stats.
(async function() {
  await agenda8.start();

  await agenda8.every('10 seconds', 'captureGlobalZoneList');
  //await agenda8.every('30 seconds', 'captureGlobalZoneList');
  //await agenda8.every('120 seconds', 'captureGlobalZoneList');
})();

function autoUpdateZones() {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        let rootGlobalHostUser;
        let globalHostList;
        let nodeDomain;
        let primeDc;
        let dbZoneList;
        //let userName;
        //let zonePort;
        let userName = 'auto-sys';
        let zonePort = '31000';
        let curBuildStatus;
        let zoneDbUpdateMsg;
        let zoneShortName;
        let zoneType;
        let zoneLock;

        await getSystemProp().then(value => {
          globalHostList = isDefined('globalHostList', value, 'dc1-devops1.domain.com,dc1-devops2.domain.com,dc2-devops1.domain.com,dc2-devops2.domain.com');
          nodeDomain = isDefined('nodeDomain', value, 'domain.com');
          primeDc = isDefined('primeDc', value, 'dc1');
        });
        let dcList = globalHostList.split(',');
        let hostList = [];

        let hostPrefix = '.' + nodeDomain + ':';
        let hostPort = '6788';
        let apiDetails = [];

        // realtime host list
        dcList.forEach((item, index, array) => {
          if (item.startsWith(primeDc)) {
            hostList.push({
              'host': 'https://' + item + '.' + nodeDomain + ':6788',
              'apiCommend': '/api/com.oracle.solaris.rad.zonemgr/1.6/Zone?_rad_detail'
            });
          }
        });

        // all db zones
        await Promise.all([getDbZoneList("fullResults")]).then(zoneList => {
          dbZoneList = zoneList[0]['message'];
        });
        // end of db zones        

        let zoneRealTime = hostList.map(getRealTimeZoneInfo);
        Promise.all(zoneRealTime).then(zoneRealTimeToDb => {

          let zones = [];
          let zoneList = [];
          zoneRealTimeToDb.forEach((item, index) => {
            if (item['errResult'] === true) {
              zoneList.push({
                'remoteHost': item['remoteHost'].split('/').join(':').split('.').join(':').split(':')[3],
                'details': {
                  href: 'api/com.oracle.solaris.rad.zonemgr/1.7/Zone/' + item['remoteHost'].split('/').join(':').split('.').join(':').split(':')[3],
                  Zone: {
                    auxstate: [],
                    brand: 'solaris',
                    id: 0,
                    uuid: '000000-0000-0000-0000-0000000000',
                    name: item['remoteHost'].split('/').join(':').split('.').join(':').split(':')[3],
                    state: item['msgResp']
                  }
                },
                'error': item['errResult']
              });
            } else {
              item['msgResp'].forEach((zone) => {
                zoneList.push({
                  'remoteHost': item['remoteHost'].split('/').join(':').split('.').join(':').split(':')[3],
                  'details': zone,
                  'error': item['errResult']
                });
              });
            }
          });

          // Add new zones
          zoneList.forEach((item) => {
            if (item.error === false) {
              apiDetails = {
                'zoneName': item.details.Zone.name,
                'host': 'https://' + item.remoteHost + hostPrefix + hostPort,
                'requestUri': '/api/com.oracle.solaris.rad.zonemgr/1.6/Zone/' + item.details.Zone.name,
                'methudAction': 'getResources',
                'reqBody': {
                  "filter": {
                    "type": "attr"
                  }
                },
                'keepCookieJar': 'no',
              }

              if (item.details.Zone.name !== 'z-source' && item.details.Zone.name !== 'z-fs-source' && item.details.Zone.name !== 'z-db-source') {

                if (dbZoneList.filter(x => x.zoneName === item.details.Zone.name).length === 1) {
                  let indexOf = dbZoneList.findIndex(i => i.zoneName === item.details.Zone.name);

                  if (dbZoneList[indexOf]['zoneActive'] !== item.details.Zone.state) {
                    if (dbZoneList[indexOf]['zoneActive']['zoneActivity'] === 'NEW') {
                      curBuildStatus = 'fa fa-spinner fa-pulse updating-icon';
                    } else {
                      if (item.details.Zone.state === 'running') {
                        curBuildStatus = 'fa fa-check positive-icon';
                      } else if (item.details.Zone.state === 'installed') {
                        curBuildStatus = 'fa fa-circle pause-icon';
                      } else if (item.details.Zone.state === 'configured') {
                        curBuildStatus = 'fa fa-times negative-icon';
                      } else if (item.details.Zone.state === 'incomplete') {
                        curBuildStatus = 'fa fa-spinner fa-pulse updating-icon';
                      } else {
                        curBuildStatus = 'fa fa-circle neutral-icon';
                      }
                    }
                    (async () => {

                      try {
                        zoneDbUpdateMsg = {
                          'zoneName': item.details.Zone.name,
                          'zoneActive': item.details.Zone.state,
                          'buildStatus': curBuildStatus,
                        }
                        logger.debug({
                          'updateZoneStat(dbUpdateMsg)': zoneDbUpdateMsg
                        });
                        await Promise.all([addUpdateZoneData(zoneDbUpdateMsg)]).then(createZoneRes => {});
                      } catch (error) {
                        logger.error({
                          'AutoUpdateZones Faild(ERROR)': +error
                        });
                      }
                    })()
                  }
                } else {
                  //(async () => {
                  logger.error({
                    'No-match_zone': 'No-Match found adding: ' + item.details.Zone.name + ' on ' + item.remoteHost
                  });

                  getCookieJar(apiDetails).then(apiDetailsWCookie => {
                    logger.debug({
                      'autoAddMissingZone(zoneStatsCookieJar)': apiDetailsWCookie
                    });

                    zoneMaintenance(apiDetailsWCookie).then(results => {
                      results['msgResp'].forEach((attr, index, array) => {

                        attr['properties'].forEach((prop) => {

                          if (prop['value'] === 'user') {
                            let indexOf = results['msgResp'][index]['properties'].findIndex(i => i.name === "value");

                            userName = results['msgResp'][index]['properties'][indexOf]['value'];
                          }
                          if (prop['value'] === 'port') {
                            let indexOf = results['msgResp'][index]['properties'].findIndex(i => i.name === "value");
                            zonePort = parseInt(results['msgResp'][index]['properties'][indexOf]['value'].replace(/['"]+/g, ''));
                          }
                        });
                      });

                      if (item.details.Zone.state === 'running') {
                        curBuildStatus = 'fa fa-check positive-icon';
                      } else if (item.details.Zone.state === 'installed') {
                        curBuildStatus = 'fa fa-circle pause-icon';
                      } else if (item.details.Zone.state === 'configured') {
                        curBuildStatus = 'fa fa-times negative-icon';
                      } else if (item.details.Zone.state === 'incomplete') {
                        curBuildStatus = 'fa fa-spinner fa-pulse updating-icon';
                      } else {
                        curBuildStatus = 'fa fa-circle neutral-icon';
                      }

                      if (item.details.Zone.name.startsWith('z-app-v') || item.details.Zone.name.startsWith('z-db-v')) {
                        zoneShortName = item.details.Zone.name.split('-').splice(4, 4).join('-');
                      } else if (!item.details.Zone.name.startsWith('z-db-source') && !item.details.Zone.name.startsWith('z-source') &&
                        !item.details.Zone.name.startsWith('z-fs-source')) {
                        zoneShortName = item.details.Zone.name.split('-').splice(2).join('-');
                      } else {
                        zoneShortName = item.details.Zone.name.split('-').splice(2).join('-');
                      }

                      if ((item.details.Zone.name.startsWith('z-app-v')) ||
                        (item.details.Zone.name.startsWith('z-source')) ||
                        (item.details.Zone.name.startsWith('z-fs-source'))) {
                        zoneType = 'FS';
                        zoneLock = 'lock_outlined';
                      } else if ((item.details.Zone.name.startsWith('z-db-v')) ||
                        (item.details.Zone.name.startsWith('z-db-source'))) {
                        zoneType = 'DB';
                        zoneLock = 'lock_outlined';
                      } else {
                        zoneType = 'APP';
                        zoneLock = 'lock_open';
                      }

                      zoneDbUpdateMsg = {
                        'zoneType': zoneType,
                        'zoneUser': userName,
                        'zonePort': zonePort,
                        'zoneDescription': 'This zone was auto added by the system',
                        'zoneShortName': zoneShortName,
                        'zoneActive': item.details.Zone.state,
                        'buildStatus': curBuildStatus,
                        'dbVer': 11,
                        'appsVer': 4,
                        'dbVersions': {
                          shortVersion: 'ifxdb-do_v-' + 11,
                          fullVersion: 'ifxdb-do_v-' + 11 + '-' + item.details.Zone.name,
                          versionTime: new Date(Date.now()).toLocaleString()
                        },
                        'appVersions': {
                          shortVersion: 'apps1-prod_v-' + 4,
                          fullVersion: 'apps1-prod_v-' + 4 + '-' + item.details.Zone.name,
                          versionTime: new Date(Date.now()).toLocaleString()
                        },
                        'zoneServer': item.remoteHost,
                        'zoneAddress': '00000000-0000-0000-0000-000000000000',
                        'zoneName': item.details.Zone.name,
                        dc1: {
                          'zoneServer': 'dc1-' + item.remoteHost.split('-')[1],
                          'buildMsg': 'Unknown state',
                          'percentComplete': 100
                        },
                        dc2: {
                          'zoneServer': 'dc2-' + item.remoteHost.split('-')[1],
                          'buildMsg': 'Unknown state',
                          'percentComplete': 100
                        },
                        'buildMsg': 'Unknown state',
                        'zoneLock': zoneLock,
                        'zoneActivity': 'unknown',
                        'percentComplete': 100,
                        'zoneCreated': Math.floor(new Date() / 1000)
                      }

                      logger.debug({
                        'Adding missing zone': 'New zone: ' + zoneDbUpdateMsg
                      });

                      addUpdateZoneData(zoneDbUpdateMsg).then(addZoneToDb => {
                        logger.debug(addZoneToDb);
                      });
                    });
                  });
                }
              }
            }
          });

          // Cleanup - Remove junk zones
          let curentTime = Math.floor(new Date() / 1000) - 1800;
          dbZoneList.forEach((item, index, array1) => {

            if (item.zoneName !== 'z-source' && item.zoneName !== 'z-fs-source' && item.zoneName !== 'z-db-source') {

              let indexOf = zoneList.findIndex(i => i.remoteHost === item.zoneServer);

              if (typeof(zoneList[indexOf]) !== 'undefined' && zoneList[indexOf]['error'] === false) {

                if (zoneList.filter(x => x.details.Zone.name === item.zoneName).length === 1) {
                  //console.log('Match');

                } else {

                  // less then or eq to
                  (async () => {
                    try {
                      if (typeof item.zoneCreated === 'undefined' || curentTime >= item.zoneCreated) {

                        logger.error({
                          'curentTime': curentTime
                        });
                        logger.error({
                          'removing-item': item
                        });

                        logger.error({
                          'No-match_removing': 'No-Match Removing zone: ' + item.zoneName + ' from ' + item.zoneServer
                        });
                        await removeZoneDbRecord(item.zoneName);
                      }
                    } catch (error) {
                      logger.error({
                        'AutoUpdateZones Faild(ERROR)': +error
                      });
                    }
                  })()
                }
              }
            }
          });
        });
      } catch (error) {
        logger.error({
          'Full autoUpdateZones Faild(ERROR)': +error
        });
      }
    })()
  });
}
