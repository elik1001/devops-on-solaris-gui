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
} = require('./autoCreateZone');
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
const {
  agenda2
} = require('../jobs/autoCreateZone');
const {
  getSystemProp
} = require('../middleware/systemProperties');
const {
  isDefined
} = require('../middleware/verifyToken');
const {
  runZfsActions
} = require('../controllers/zfssa');


agenda2.define('creatZonesJobs', (job, done) => {
  //addJobToQueue(job.attrs.data);
  createZoneSwitch(job.attrs.data);
  done();
});

function createZoneSwitch(option) {
  switch (option['runOption']) {

    case "configureZone":
      configureZone(option);
      break;

    default:
      resolve({
        'default': 'default'
      })
  }
}

function verifyZone(req, res, next) {
  let zoneName = req.params.zoneID;

  Promise.all([getDbZoneList("fullResults")]).then(zoneList => {

    logger.debug({
      "verifyZone(fullResults)": zoneList
    });
    let index = zoneList[0]['message'].findIndex(x => x.zoneShortName === zoneName);
    let fullResponse = {
      //"token": refreshToken,
      "token": req['refreshToken'],
      //"token": 'refreshToken',
      "zoneFound": index,
    };
    res.json(fullResponse);
  });
}

function getZoneList(req, res, next) {
  let zoneUser = req.body.zoneUser;
  let zonePort = req.body.zonePort;
  let loggedInUser = req.body.loggedInUser;

  if (!zoneUser) {
    zoneUser = "root";
  }
  if (!zonePort) {
    zonePort = 31000;
  }
  const data = {
    'req': req,
    'zoneUser': zoneUser,
    'zonePort': zonePort,
    'dcHosts': req.query.dcHosts,
    'apiCommend': req.query.apiCommend,
    'loggedInUser': loggedInUser
  }

  Promise.all([updateZoneList(data)]).then(finalZoneList => {
    logger.debug({
      "getZoneList": finalZoneList
    });
    let fullResponse = {
      //"token": refreshToken,
      "token": req['refreshToken'],
      //"token": 'refreshToken',
      "message": finalZoneList,
    };
    res.json(fullResponse);
  });
}

function returnZoneStats(req, res, next) {
  (async () => {
    let globalHostList;

    await getSystemProp().then(value => {
      globalHostList = isDefined('globalHostList', value, 'dc1-devops1.domain.com,dc1-devops2.domain.com,dc2-devops1.domain.com,dc2-devops2.domain.com');
      nodeDomain = isDefined('nodeDomain', value, 'domain.com');
    });

    let hostList = [];
    let dcHostList = globalHostList.split(',');
    dcHostList.forEach((item, index, array) => {
      hostList.push({
        'host': 'https://' + item + '.' + nodeDomain + ':6788',
        'apiCommend': '/api/com.oracle.solaris.rad.zonemgr/1.6/Zone?_rad_detail'
      });
    });
    logger.debug({
      "returnZoneStats": dcHostList
    });
    Promise.all([returnZoneDbStats()]).then(zoneCountDbResults => {
      let fullResponse = {
        //"token": refreshToken,
        "token": req['refreshToken'],
        //"token": 'refreshToken',
        "message": zoneCountDbResults[0],
      };
      logger.debug({
        "returnZoneStats": fullResponse
      });
      res.json(fullResponse);
    });
  })();
}

function addNewZone(req, res, next) {
  const zoneData = {
    'buildMsg': 'Initializing...',
    'buildStatus': req.body.buildStatus,
    'selectedSrcVer': req.body.selectedSrcVer,
    'zoneUser': req.body.zoneUser,
    'zoneName': req.body.zoneName,
    'zoneShortName': req.body.zoneShortName,
    'zoneType': req.body.zoneType.split('-')[0],
    'zoneActive': 'building',
    'zoneActivity': 'NEW',
    'zoneLock': 'lock_outlined',
    'zonePort': '00000',
    'zoneServer': 'acquiring...',
    'zoneAddress': '00000000-0000-0000-0000-000000000000',
    'jiraID': req.body.jiraID,
    'zoneDescription': req.body.zoneDescription,
  }
  // add then run function
  logger.debug({
    "addNewZone": zoneData
  });
  Promise.all([addUpdateZoneData(zoneData)]).then(createZoneRes => {
    logger.debug({
      "addNewZone(createZoneRes)": createZoneRes
    });
    (async () => {
      await agenda2.now('creatZonesJobs', {
        'zoneType': req.body.zoneType.split('-')[0],
        'selectedSrcVer': req.body.selectedSrcVer,
        'zoneUser': req.body.zoneUser,
        'jiraID': req.body.jiraID,
        'zoneDescription': req.body.zoneDescription,
        'updateJira': req.body.updateJira,
        'zoneName': req.body.zoneName,
        'zoneShortName': req.body.zoneShortName,
        'runOption': 'configureZone',
        'zoneAddress': '00000000-0000-0000-0000-000000000000',
        'zoneLock': 'lock_outlined',
        'zoneActive': 'building',
      });
      res.json({
        "createRes": 1
      });
    })();
  });
}

function updateZoneInfo(req, res, next) {
  ZoneInfo.updateMany({
      zoneName: req.params.id
    }, {
      $set: {
        zoneUser: req.body.zoneUser,
        zonePort: req.body.zonePort,
        activeSchema: req.body.activeSchema,
        dbVer: req.body.dbVer,
        appsVer: req.body.appsVer,
        zoneDescription: req.body.zoneDescription,
        zoneLock: req.body.zoneLock,
        zoneMaint: req.body.zoneMaint,
      },
    }, {
      new: true
    },
    function(error, result) {
      if (error) {
        logger.error({
          'updateZoneInfo': error
        });
        res.json(error);
      } else {
        res.json(result);
      }
    });
}

// function returnSMFStats(req, res, next) {
function smfMaint(req, res, next) {
  (async () => {

    let globalDcList;
    let nodeDomain;
    let rootZoneUser;
    let radZonePort;


    await getSystemProp().then(value => {
      globalDcList = isDefined('globalDcList', value, 'dc1,dc2');
      nodeDomain = isDefined('nodeDomain', value, 'domain.com');
      rootZoneUser = isDefined('rootZoneUser', value, 'confmgr');
      radZonePort = isDefined('radZonePort', value, '41');
    });
    let globalHost = req.body.dcHost;
    let zoneName = req.body.zoneName;
    let zoneShortName = req.body.zoneShortName;
    let requestUri = req.body.requestUri;
    let zonePort = req.body.zonePort;
    let smfInst = req.body.smfInst;
    let methudAction = req.body.methudAction;

    let radPort = String(zonePort).substr(-3);
    hostPort = radZonePort + radPort;

    let dcList = globalDcList.split(',');
    let hostPrefix = '.' + nodeDomain + ':' + hostPort;
    let apiDetails = [];
    dcList.forEach((item, index, array) => {
      apiDetails.push({
        'host': 'https://' + item + '-' + globalHost + hostPrefix,
        'zoneName': zoneName,
        'zoneShortName': zoneShortName,
        'reqUser': rootZoneUser,
        'reqPort': hostPort,
        'adminUser': rootZoneUser,
        'keepCookieJar': 'no',
      });
      if (methudAction === 'state') {
        apiDetails[index]['requestUri'] = requestUri + smfInst + '/state';
      } else if (methudAction === 'restart' || methudAction == 'clear' || methudAction == 'refresh') {
        apiDetails[index]['requestUri'] = requestUri + smfInst;
        apiDetails[index]['methudAction'] = methudAction;
        apiDetails[index]['reqBody'] = {}
      } else if (methudAction === 'disable' || methudAction == 'enable') {
        apiDetails[index]['requestUri'] = requestUri + smfInst;
        apiDetails[index]['methudAction'] = methudAction;
        apiDetails[index]['reqBody'] = {
          'temporary': false
        }
      }
    });

    logger.debug({
      "returnSMFStats(apiDetails)": apiDetails
    });

    let zoneStatsCookieJar = apiDetails.map(getCookieJar);
    Promise.all(zoneStatsCookieJar).then(apiAndCookieJar => {
      logger.debug({
        "returnSMFStats(apiAndCookieJar)": apiAndCookieJar
      });

      let actions = apiDetails.map(zoneMaintenance);

      Promise.all(actions).then(results => {
        //resolve(results);
        res.json(results);
      });
    });
  })();
}


// // delete zone route
function zoneMaintenanceUpdate(req, res, next) {
  (async () => {
    let rootGlobalHostUser;
    let globalDcList;
    let nodeDomain;

    await getSystemProp().then(value => {
      rootGlobalHostUser = isDefined('rootGlobalHostUser', value, 'root');
      globalDcList = isDefined('globalDcList', value, 'dc1,dc2');
      nodeDomain = isDefined('nodeDomain', value, 'domain.com');
    });

    let activityType;
    let globalHost = req.body.dcHost;
    let zoneName = req.body.zoneName;
    let zoneShortName = req.body.zoneShortName;
    let zoneUser = req.body.zoneUser;
    let zfsApiType = req.body.zfsApiType;
    let zfsSrcFs = req.body.zfsSrcFs;
    let zfsSrcSnap = req.body.zfsSrcSnap;
    let requestUri = req.body.requestUri;
    let methudAction = req.body.methudAction;
    let reqBody = req.body.reqBody;
    let reqApi = req.body.reqApi;
    let jiraID = req.body.jiraID;
    let reqPort = '6788';
    let reqUser = rootGlobalHostUser;

    if (req.body.reqBody) {
      reqBody = req.body.reqBody;
    } else {
      reqBody = {};
    }

    if (req.body.reqPort) {
      reqPort = req.body.reqPort;
    }

    if (req.body.reqUser) {
      reqUser = req.body.reqUser;
    }

    if ((methudAction === 'halt') || (methudAction === 'boot') || (methudAction === 'reboot')) {
      activityType = 'MAINT';
    } else {
      activityType = 'REMOVE';
    }

    zoneData = {
      'zoneName': zoneName,
      'zoneLock': 'lock_outlined',
      'buildStatus': 'fa fa-spinner fa-pulse updating-icon',
      'zoneActivity': activityType,
      'percentComplete': 20
    }

    logger.debug({
      'configureZone(initalZoneData)': zoneData
    });

    await Promise.all([addUpdateZoneData(zoneData)]).then(createZoneRes => {});

    let dcList = globalDcList.split(',');
    let hostPrefix = '.' + nodeDomain + ':' + reqPort;
    let apiDetails = [];
    dcList.forEach((item, index, array) => {
      apiDetails.push({
        'host': 'https://' + item + '-' + globalHost + hostPrefix,
        'zoneName': zoneName,
        'zoneShortName': zoneShortName,
        'zfsApiType': zfsApiType,
        'zfsSrcFs': zfsSrcFs,
        'zfsSrcSnap': zfsSrcSnap,
        'requestUri': requestUri,
        'methudAction': methudAction,
        'reqBody': reqBody,
        'reqPort': reqPort,
        'reqUser': reqUser,
        'jiraID': jiraID,
        'zoneUser': zoneUser,
      });
    });

    logger.debug({
      "zoneMaintenanceUpdate(apiDetails)": apiDetails
    });

    let zoneStatsCookieJar = apiDetails.map(getCookieJar);
    Promise.all(zoneStatsCookieJar).then(apiAndCookieJar => {
      logger.debug({
        "zoneMaintenanceUpdate(apiAndCookieJar)": apiAndCookieJar
      });

      let actions = apiDetails.map(zoneMaintenance);

      Promise.all(actions).then(results => {
        let fullResponse;
        if (reqApi === 1) {
          fullResponse = {
            //"token": refreshToken,
            "token": req['refreshToken'],
            //"token": 'refreshToken',
            "message": results,
          };
        } else {
          fullResponse = {
            //"token": refreshToken,
            "token": req['refreshToken'],
            //"token": 'refreshToken',
            "message": results,
          };
        }
        if ((methudAction === 'halt') || (methudAction === 'boot') || (methudAction === 'reboot')) {
          logger.debug({
            "zoneMaintenanceUpdate(boot/halt)": fullResponse
          });

          zoneData = {
            'zoneName': zoneName,
            'buildStatus': 'fa fa-check positive-icon',
            'zoneActivity': 'done',
            'buildMsg': methudAction + ' successful',
            'zoneLock': 'lock_open',
            'percentComplete': 100
          }

          logger.debug({
            'configureZone(initalZoneData)': zoneData
          });

          Promise.all([addUpdateZoneData(zoneData)]).then(createZoneRes => {});

          res.json(fullResponse);
        } else {
          Promise.all([removeZoneDbRecord(zoneName)]).then(rmZoneRec => {

            // pdate jira
            // *** Need to add all fields for delete
            jiraID = zoneShortName;
            if (jiraID !== "") {
              jiraID = jiraID
            }

            const jiraIDReq = {
              'zoneUser': zoneUser,
              'restType': 'PUT',
              'jiraID': jiraID,
              'updateJiraFileds': {
                'fields': {
                  'customfield_10905': null,
                  'customfield_14705': null
                }
              }
            }

            Promise.all([updateJira(jiraIDReq)]).then(jiraIDResult => {
              logger.debug({
                'configureZone(jiraIDReq)': jiraIDReq
              });
              // end update jira

              logger.debug({
                "zoneMaintenanceUpdate(other)": fullResponse
              });
              res.json(fullResponse);
            });
          });
        }
      });
    });
  })();
}

// Get zone real time Load, Memory, etc..
function captureZoneStats(data) {
  return new Promise(resolve => {

    let cookieJar = data['cookieJar'];
    let cookieAddr = data['cookieAddr'];
    let hostUrl = data['host'];
    let requestUri = data['requestUri'];
    let methudAction = data['methudAction'];
    let reqBody = data['reqBody'];
    let reqType = data['reqType'];
    let requestDetail;
    let retrunResults;

    if (methudAction !== '') {
      requestDetail = requestUri + '/_rad_method/' + methudAction;
    } else {
      requestDetail = requestUri;
    }

    request.put({
      url: hostUrl + requestDetail,
      jar: cookieJar,
      json: true,
      rejectUnauthorized: false,
      requestCert: false,
      agent: false,
      body: reqBody,
      timeout: 2500,
      headers: {
        Connection: 'close'
      },
    }, function(error, response, body) {
      let remoteResults;
      if (error) {
        if (error.code === 'ETIMEDOUT') {
          remoteResults = {
            'errResult': true,
            'msgResp': error.code,
            //'remoteHost': 'NA'
            'remoteHost': hostUrl.split('/').join(':').split('.').join(':').split(':')[3]
          }
        } else {
          remoteResults = {
            'errResult': true,
            'msgResp': error,
            'remoteHost': hostUrl.split('/').join(':').split('.').join(':').split(':')[3]
          }
        }
        logger.error({
          'captureZoneStats': remoteResults
        });
        resolve(remoteResults);
      } else {
        let errResult;
        if (typeof response.body.payload === 'undefined' || response.body.payload.length < 1) {
          errResult = true;
        } else {
          errResult = false;
        }
        if (reqType === 'cpuAvg') {
          let avenrun_1min;
          let avenrun_5min;
          let avenrun_15min;
          try {
            avenrun_1min = (response.body.payload['avenrun_1min']['integer'] / 256).toFixed(2);
            avenrun_5min = (response.body.payload['avenrun_5min']['integer'] / 256).toFixed(2);
            avenrun_15min = (response.body.payload['avenrun_15min']['integer'] / 256).toFixed(2);
          } catch (e) {
            avenrun_1min = 0;
            avenrun_5min = 0;
            avenrun_15min = 0;
          }
          retrunResults = {
            cpu_avg: {
              cpu_avg1m: avenrun_1min,
              cpu_avg5m: avenrun_5min,
              cpu_avg15m: avenrun_15min
            },
          }
          logger.debug({
            'captureZoneStats(cpuAvg)': retrunResults
          });
        } else if (reqType === 'avaMem') {
          try {
            mem_free = response.body.payload['mem_free']['integer'] * 8192 / 1024 / 1024 / 1024;
            mem_total = response.body.payload['mem_total']['integer'] * 8192 / 1024 / 1024 / 1024;
          } catch (e) {
            mem_free = 0;
            mem_total = 511;
          }
          retrunResults = {
            avaMem: {
              mem_free: mem_free,
              mem_total: mem_total
            }
          }
          logger.debug({
            'captureZoneStats(avaMem)': retrunResults
          });
        } else {
          retrunResults = {
            'generic_results': {
              results: response.body.payload
            }
          }
        }
        logger.debug({
          'captureZoneStats(generic_results)': retrunResults
        });
        let remoteResults = {
          'errResult': errResult,
          'msgResp': retrunResults,
          'reqType': reqType,
          'remoteHost': hostUrl.split('/').join(':').split('.').join(':').split(':')[3]
        }
        if (reqType === 'avaMem') {
          deleteCookieJar(hostUrl, cookieJar, cookieAddr);
        }
        resolve(remoteResults);
        logger.debug({
          'captureZoneStats': remoteResults
        });
      }
    });
  });
}

function updateZoneList(data) {
  return new Promise(resolve => {

    // removed the auto update zone list
    /*
    let hostList = [];
    if (typeof(data['dcHosts']) === 'string') {
      hostList.push({
        'host': data['dcHosts'],
        'apiCommend': data['apiCommend'],
        'loggedInUser': data['loggedInUser']
      });
    } else {
      data['dcHosts'].forEach((item, index, array) => {
        hostList.push({
          'host': item,
          'apiCommend': data['apiCommend'],
        });
      });
    }

    logger.debug({
      'updateZoneList(hostList)': hostList
    });
    // Get inital DB zone list
    Promise.all([getDbZoneList("fullResults")]).then(zoneList => {
      logger.debug({
        'updateZoneList(zoneList)': zoneList
      });

      // Get rea time zone list
      let zoneRealTime = hostList.map(getRealTimeZoneInfo);
      Promise.all(zoneRealTime).then(zoneRealTimeToDb => {

        // Compare and add realtime zones to db.
        const zonesToUpdate = {
          'realZoneInfo': zoneRealTimeToDb,
          'zoneList': zoneList,
          'zoneUser': data['zoneUser'],
          'zonePort': data['zonePort']
        }
        logger.debug({
          'updateZoneList(zonesToUpdate)': zonesToUpdate
        });

        Promise.all([addDbWithRealZoneInfo(zonesToUpdate)]).then(zoneList => {
          logger.debug({
            'updateZoneList(addDbWithRealZoneInfo)': zoneList
          });*/

    Promise.all([getDbZoneList(data['req'])]).then(finalZoneList => {
      logger.debug({
        'updateZoneList(finalZoneList)': finalZoneList[0]
      });
      resolve(finalZoneList[0]);
    });

    // removed the auto update zone list
    /*});
      });
    });*/

  });
}

// Get real time zone list, i.e. zone name, server name, etc
function getRealTimeZoneInfo(data) {
  return new Promise(function(resolve, reject) {
    try {
      let hostUrl = data['host'];
      let requestDetail = data['apiCommend'];
      Promise.all([getCookieJar(data)]).then(cookieJarRes => {
        request.get({
          url: hostUrl + requestDetail,
          jar: cookieJarRes[0]['cookieJar'],
          json: true,
          rejectUnauthorized: false,
          requestCert: false,
          agent: false,
          timeout: 8000,
          headers: {
            Connection: 'close'
          },
        }, function(error, response, body) {
          if (error) {
            let remoteResults = {
              'errResult': true,
              'msgResp': error,
              'remoteHost': hostUrl
            }
            deleteCookieJar(hostUrl, cookieJarRes[0]['cookieJar'], cookieJarRes[0]['cookieAddr']);
            resolve(remoteResults);
            logger.debug({
              'getRealTimeZoneInfo(error)': remoteResults
            });
          } else {
            let errResult;
            if (typeof response.body.payload === 'undefined' || response.body.payload.length < 1) {
              errResult = true;
            } else {
              errResult = false;
            }
            let remoteResults = {
              'errResult': errResult,
              'msgResp': response.body.payload,
              'remoteHost': hostUrl
            }
            deleteCookieJar(hostUrl, cookieJarRes[0]['cookieJar'], cookieJarRes[0]['cookieAddr']);
            resolve(remoteResults);
            logger.debug({
              'getRealTimeZoneInfo': remoteResults
            });
          }
        });
      });
    } catch (error) {
      logger.error({
        'GetRealTimeZoneInfo Faild(ERROR)': +error
      });
      return Promise.reject(error);
    }
  });
}

// Update mongo DB with real time zones, i.e. zone name, server name, etc
function addDbWithRealZoneInfo(data) {
  return new Promise(resolve => {
    logger.debug({
      'addDbWithRealZoneInfo(data)': data
    });
    data['realZoneInfo'].forEach((element, elmIndex, array) => {
      let remoteHost = element['remoteHost'].split('/').join(':').split('.').join(':').split(':')[3];
      logger.debug({
        'addDbWithRealZoneInfo(pre-error)': element['msgResp']
      });
      if (element['errResult'] === true && element['msgResp']['code'] === 'ETIMEDOUT') {
        logger.debug({
          'addDbWithRealZoneInfo(error)': element['msgResp']['code']
        });
        resolve(element['msgResp']['code']);
      } else {
        element['msgResp'].forEach(
          (item, itmIndex, array) => {
            let zoneIndex = data['zoneList'][0]['message'].findIndex(
              x => x.zoneName === item['Zone']['name'] && x.zoneServer === remoteHost
            );
            if (zoneIndex === -1) {
              if (item['Zone']['name'].startsWith('z-app-v') || item['Zone']['name'].startsWith('z-db-v')) {
                zoneShortName = item['Zone']['name'].split('-').splice(4, 4).join('-');
              } else if (!item['Zone']['name'].startsWith('z-db-source') && !item['Zone']['name'].startsWith('z-source') &&
                !item['Zone']['name'].startsWith('z-fs-source')) {
                zoneShortName = item['Zone']['name'].split('-').splice(2).join('-');
              } else {
                zoneShortName = item['Zone']['name'];
              }
              // worked
              let zoneType;
              let zoneLock;
              if ((item['Zone']['name'].startsWith('z-app-v')) ||
                (item['Zone']['name'].startsWith('z-source')) ||
                (item['Zone']['name'].startsWith('z-fs-source'))) {
                zoneType = 'FS';
                zoneLock = 'lock_outlined';
              } else if ((item['Zone']['name'].startsWith('z-db-v')) ||
                (item['Zone']['name'].startsWith('z-db-source'))) {
                zoneType = 'DB';
                zoneLock = 'lock_outlined';
              } else {
                zoneType = 'APP';
                zoneLock = 'lock_open';
              }
              logger.debug({
                'addDbWithRealZoneInfo(zoneInfo)': {
                  zoneLock: zoneLock,
                  zonePort: data['zonePort'],
                  zoneUser: data['zoneUser'],
                  zoneType: zoneType,
                  zoneName: item['Zone']['name'],
                  zoneShortName: zoneShortName,
                  zoneServer: remoteHost,
                  zoneActive: item['Zone']['state'],
                  zoneAddress: item['Zone']['uuid'],
                  zoneActivity: 'done',
                }
              });
              ZoneInfo.findOneAndUpdate({
                  zoneName: item['Zone']['name']
                }, {
                  $set: {
                    zoneLock: zoneLock,
                    zonePort: data['zonePort'],
                    zoneUser: data['zoneUser'],
                    zoneType: zoneType,
                    zoneName: item['Zone']['name'],
                    zoneShortName: zoneShortName,
                    zoneServer: remoteHost,
                    zoneActive: item['Zone']['state'],
                    zoneAddress: item['Zone']['uuid'],
                    zoneActivity: 'done',
                  },
                }, {
                  upsert: true,
                  new: true,
                  setDefaultsOnInsert: true
                },
                function(error, result) {
                  if (error) {
                    logger.debug({
                      'addDbWithRealZoneInfo(error)': error
                    });
                    resolve(result);
                  } else {
                    logger.debug({
                      'addDbWithRealZoneInfo': result
                    });
                    resolve(result);
                  }
                });

            } else {
              if (item['Zone']['state'] !== data['zoneList'][0]['message'][zoneIndex]['zoneActive']) {
                let curBuildStatus;
                if (data['zoneList'][0]['message'][zoneIndex]['zoneActivity'] === 'NEW') {
                  curBuildStatus = 'fa fa-spinner fa-pulse updating-icon';
                } else {
                  if (item['Zone']['state'] === 'running') {
                    curBuildStatus = 'fa fa-check positive-icon';
                  } else if (item['Zone']['state'] === 'installed') {
                    curBuildStatus = 'fa fa-circle pause-icon';
                  } else if (item['Zone']['state'] === 'configured') {
                    curBuildStatus = 'fa fa-times negative-icon';
                  } else if (item['Zone']['state'] === 'incomplete') {
                    curBuildStatus = 'fa fa-spinner fa-pulse updating-icon';
                  } else {
                    curBuildStatus = 'fa fa-circle neutral-icon';
                  }
                }

                logger.debug({
                  'addDbWithRealZoneInfo(zoneInfoUpdate)': {
                    zoneActive: item['Zone']['state'],
                    buildStatus: curBuildStatus,
                    zoneAddress: item['Zone']['uuid']
                  }
                });
                // Add an if to push items only new like uuid.
                // Update DB zone state
                ZoneInfo.findOneAndUpdate({
                    _id: data['zoneList'][0]['message'][zoneIndex]['_id']
                  }, {
                    $set: {
                      zoneActive: item['Zone']['state'],
                      buildStatus: curBuildStatus,
                      zoneAddress: item['Zone']['uuid']
                    },
                  }, {
                    new: true
                  },
                  function(error, result) {
                    if (error) {
                      logger.debug({
                        'addDbWithRealZoneInfo(error)': error
                      });
                    } else {

                    }
                  });
              } else {

              }

            }

          });
      }
    });
    resolve();
  });
}

// update All Zone Db Stats
function updateAllDbZoneStats() {
  return new Promise((resolve, reject) => {
    (async () => {

      let rootGlobalHostUser;
      let globalHostList;
      let nodeDomain;

      await getSystemProp().then(value => {
        rootGlobalHostUser = isDefined('rootGlobalHostUser', value, 'root');
        globalHostList = isDefined('globalHostList', value, 'dc1-devops1.domain.com,dc1-devops2.domain.com,dc2-devops1.domain.com,dc2-devops2.domain.com');
        nodeDomain = isDefined('nodeDomain', value, 'domain.com');
      });

      // cpu uri
      let requestUri = '/api/com.oracle.solaris.rad.kstat/2.0/Kstat/kstat%3A%2Fmisc%2Funix%2Fsystem_misc';
      let reqType = 'cpuAvg';

      let statResults = [];
      let methudAction = 'getMap';
      let reqBody = {};

      let dcList = globalHostList.split(',');

      let apiDetails = [];
      dcList.forEach((item, index, array) => {
        apiDetails.push({
          //'cookieJar': cookieJar,
          'host': 'https://' + item + '.' + nodeDomain + ':6788',
          'requestUri': requestUri,
          'methudAction': methudAction,
          'reqBody': reqBody,
          'reqType': reqType,
        });
      });

      logger.debug({
        'updateAllDbZoneStats(apiDetails-1)': apiDetails
      });
      // Return cookieJar.
      let zoneStatsCookieJar = apiDetails.map(getCookieJar);
      Promise.all(zoneStatsCookieJar).then(cookieJar => {
        logger.debug({
          'updateAllDbZoneStats(getCookieJar)': cookieJar
        });

        // Return load avg.
        let zoneStats = apiDetails.map(captureZoneStats);

        Promise.all(zoneStats).then(cpuResults => {
          logger.debug({
            'updateAllDbZoneStats(zoneStats)': cpuResults
          });

          // Update DB with load avg results
          let statDetails = [];
          cpuResults.forEach((item, index, array) => {
            if (item['msgResp'] === 'ETIMEDOUT' || item['errResult'] === true) {
              statDetails.push({
                server: item['remoteHost'],
                cpu_avg1m: 0,
                cpu_avg5m: 0,
                cpu_avg15m: 0
              });
            } else {
              statDetails.push({
                server: item['remoteHost'],
                cpu_avg1m: parseFloat(item['msgResp']['cpu_avg']['cpu_avg1m']),
                cpu_avg5m: parseFloat(item['msgResp']['cpu_avg']['cpu_avg5m']),
                cpu_avg15m: parseFloat(item['msgResp']['cpu_avg']['cpu_avg15m'])
              });
            }
          });

          logger.debug({
            'updateAllDbZoneStats(statDetails)': statDetails
          });
          let updateDbZoneStats = statDetails.map(updateZoneStats);
          Promise.all(updateDbZoneStats).then(cpuDbResults => {
            logger.debug({
              'updateAllDbZoneStats(cpuDbResults)': cpuDbResults
            });

            apiDetails.forEach((item, index, array) => {
              apiDetails[index]['requestUri'] = '/api/com.oracle.solaris.rad.kstat/2.0/Kstat/kstat%3A%2Fvm%2Fusage%2Fmemory';
              apiDetails[index]['reqType'] = 'avaMem';
            });
            logger.debug({
              'updateAllDbZoneStats(apiDetails-2)': apiDetails
            });

            let zoneStats = apiDetails.map(captureZoneStats);
            Promise.all(zoneStats).then(memResults => {
              logger.debug({
                'updateAllDbZoneStats(memResults)': memResults
              });

              // Update DB with memory results
              let statDetails = [];
              memResults.forEach((item, index, array) => {
                if (item['msgResp'] === 'ETIMEDOUT' || item['errResult'] === true) {
                  statDetails.push({
                    server: item['remoteHost'],
                    mem_free: 0,
                    mem_total: 0
                  });
                } else {
                  statDetails.push({
                    server: item['remoteHost'],
                    mem_free: parseInt(item['msgResp']['avaMem']['mem_free']),
                    mem_total: parseInt(item['msgResp']['avaMem']['mem_total'])
                  });
                }
              });

              logger.debug({
                'updateAllDbZoneStats(statDetails)': statDetails
              });
              let updateDbZoneStats = statDetails.map(updateZoneStats);
              Promise.all(updateDbZoneStats).then(memDbResults => {
                logger.debug({
                  'updateAllDbZoneStats(memDbResults)': memDbResults
                });

                let hostList = [];
                dcList.forEach((item, index, array) => {
                  hostList.push({
                    'host': 'https://' + item + '.' + nodeDomain + ':6788',
                    'apiCommend': '/api/com.oracle.solaris.rad.zonemgr/1.6/Zone?_rad_detail'
                  });
                });

                logger.debug({
                  'updateAllDbZoneStats(hostList)': hostList
                });
                let zoneRealTime = hostList.map(getRealTimeZoneInfo);
                Promise.all(zoneRealTime).then(zoneRealTimeToDb => {
                  logger.debug({
                    'updateAllDbZoneStats(zoneRealTimeToDb)': zoneRealTimeToDb
                  });

                  // Return zone count.
                  let zones = [];
                  zoneRealTimeToDb.forEach((item, index) => {
                    let zoneCount;
                    if (item['errResult'] === true) {
                      zoneCount = {
                        'remoteHost': item['remoteHost'].split('/').join(':').split('.').join(':').split(':')[3],
                        'zoneCount': 0
                      }
                    } else {
                      zoneCount = {
                        'remoteHost': item['remoteHost'].split('/').join(':').split('.').join(':').split(':')[3],
                        'zoneCount': item['msgResp'].filter(x => x.Zone.state === 'running').length
                      }
                    }
                    zones.push(zoneCount);
                  });

                  // Update DB with zone count
                  let zoneDetails = [];
                  zones.forEach((item, index, array) => {
                    zoneDetails.push({
                      server: item['remoteHost'],
                      zoneCount: parseInt(item['zoneCount']),
                    });
                  });
                  logger.debug({
                    'updateAllDbZoneStats(zoneDetails)': zoneDetails
                  });

                  //
                  let updateDbZoneStats = zoneDetails.map(updateZoneStats);
                  Promise.all(updateDbZoneStats).then(zoneCountDbResults => {
                    let fullResponse = {
                      //"token": refreshToken,
                      "token": 'refreshToken',
                      "message": zoneCountDbResults,
                    };
                    logger.debug({
                      'updateAllDbZoneStats(fullResponse)': fullResponse
                    });
                    resolve(fullResponse);
                  });
                });
              });
            });
          });
        });
      });
    })();
  });
}

// Update mongo DB with Zone Stats
function updateZoneStats(data) {
  return new Promise(resolve => {
    CpuStats.findOneAndUpdate({
        server: data['server']
      }, {
        $set: data,
      }, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      },
      function(error, result) {
        if (error) {
          logger.debug({
            'updateZoneStats(error)': error
          });
          resolve(result);
        } else {
          logger.debug({
            'updateZoneStats': result
          });
          resolve(result);
        }
      });
  });
}

// Remove zone db record
function removeZoneDbRecord(zoneName) {
  return new Promise(resolve => {
    ZoneInfo.deleteOne({
      zoneName: zoneName
    }, function(error, result) {
      if (error) {
        logger.debug({
          'removeZoneDbRecord(error)': error
        });
        resolve(result);
      } else {
        logger.debug({
          'removeZoneDbRecord': error
        });
        resolve(result);
      }
    });
  })
}

// Temp route - used by devops_manager.py to remove zone db record.
function removeZoneDbRecordCmd(req, res, next) {
  let zoneName = req.params.id;

  Promise.all([removeZoneDbRecord(zoneName)]).then(rmZoneRec => {
    fullResponse = {
      //"token": refreshToken,
      "token": 'refreshToken',
      "message": rmZoneRec,
    };
    res.json(fullResponse);
  });
}

function getDbAppVers(req, res, next) {
  (async () => {

    let options = {
      'zoneType': req.params.type
    }

    let appsVer;
    let dbVer;
    let appLowestPort;
    let zfsOptions = {};
    let vers;

    zfsOptions['zfsApiType'] = 'GET';
    zfsOptions['zfsReqType'] = 'getAllFs';

    if (options['zoneType'] === "FS") {
      vers = vers = {
        'app': 'app',
        'appVerType': 'defaultVersion'
      }
      await Promise.all([getAppVersions(vers)]).then(results => {
        logger.debug({
          'configureZone(getAppVersions/appsVer)': results
        });
        appsVer = results[0]['message'];
      });
      zfsOptions['zfsAppPrefix'] = 'apps1-prod_v-';
      zfsOptions['zfsSrcFs'] = 'apps1-prod_v-' + appsVer;
      appLowestPort = 2;
    }

    if (options['zoneType'] === "DB") {
      vers = vers = {
        'app': 'db',
        'appVerType': 'defaultVersion'
      }
      await Promise.all([getAppVersions(vers)]).then(results => {
        logger.debug({
          'configureZone(getAppVersions/dbVer)': results
        });
        dbVer = results[0]['message'];
      });
      zfsOptions['zfsAppPrefix'] = 'ifxdb-do_v-';
      zfsOptions['zfsSrcFs'] = 'ifxdb-do_v-' + dbVer;
      appLowestPort = 5;
    }

    await Promise.all([getNextAvalVersion(zfsOptions)]).then(results => {
      results[0].sort((a, b) => a - b);
      let nextVer = zfsOptions['zfsAppPrefix'] + lowestUnusedNumber(results[0], parseInt(appLowestPort));
      let fsAvaList = [];
      results[0].forEach((item) => {
        if ((item === parseInt(dbVer)) || (item === parseInt(appsVer))) {
          fsAvaList.push({
            'option': zfsOptions['zfsAppPrefix'] + item + ' **',
            'value': zfsOptions['zfsAppPrefix'] + item
          });
        } else {
          fsAvaList.push({
            'option': zfsOptions['zfsAppPrefix'] + item,
            'value': zfsOptions['zfsAppPrefix'] + item
          });
        }
      });
      logger.debug({
        'configureZone(getAppVersions/appsVer)': {
          "results": {
            'default': zfsOptions['zfsSrcFs'],
            'avaList': fsAvaList.sort((a, b) => a - b),
            'nextVer': nextVer,
          }
        }
      });
      res.send({
        "results": {
          'default': zfsOptions['zfsSrcFs'],
          'avaList': fsAvaList.sort((a, b) => a - b),
          'nextVer': nextVer,
        }
      });
    });
  })();
}

function getJiraDisc(req, res, next) {
  (async () => {
    let jiraID = req.query.zoneShortName;
    if (req.query.jiraIDReq) {
      jiraID = req.query.jiraIDReq;
    }
    const jiraIDReq = {
      'restType': 'GET',
      'jiraID': jiraID,
    }

    await Promise.all([updateJira(jiraIDReq)]).then(jiraDisc => {
      res.send({
        'jiraDescription': jiraDisc
      });
    });

  })()
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms * 1000));
}


module.exports = {
  createZoneSwitch,
  verifyZone,
  getZoneList,
  returnZoneStats,
  addNewZone,
  updateZoneInfo,
  zoneMaintenanceUpdate,
  captureZoneStats,
  updateZoneList,
  getRealTimeZoneInfo,
  addDbWithRealZoneInfo,
  updateAllDbZoneStats,
  updateZoneStats,
  removeZoneDbRecord,
  removeZoneDbRecordCmd,
  sleep,
  getDbAppVers,
  getJiraDisc,
  smfMaint,
}
