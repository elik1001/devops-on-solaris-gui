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
  getSystemProp
} = require('../middleware/systemProperties');
const {
  isDefined,
  removePrivate
} = require('../middleware/verifyToken');


function returnZoneDbStats() {
  return new Promise(resolve => {
    CpuStats.find({}, function(error, zones) {
      if (error) {
        logger.error({
          'returnZoneDbStats': error
        });
        resolve(error);
      } else {
        resolve(zones);
      }
    }).sort({
      zoneServer: 1
    });
  });
}

function getDbZoneList(req) {
  return new Promise(resolve => {
    let queryopt;
    let query;
    let sortOrder;
    let sortField;
    let pageNo;
    let size;
    let loggedInUser;
    let searchField;

    let zoneUser = req['reqZoneUser'];

    if (req === "fullResults") {

    } else if (typeof zoneUser !== 'undefined') {
      // let query = {}
      let regexLookupStr = {
        "$regex": req['zoneName'],
        "$options": "i"
      };
      if (req['zoneName']) {
        query = {
          $or: [{
            zoneName: regexLookupStr
          }]
        }
      }
    } else {
      searchField = req.query.searchField;
      loggedInUser = req.query.loggedInUser;
      pageNo = parseInt(req.query.pageNumber);
      size = parseInt(req.query.pageSize);
      sortOrder = 1;
      sortField = req.query.sortField;
      if (req.query.sortOrder === 'undefined') {
        sortField = 'zoneServer';
      }
      if (req.query.sortOrder === 'desc') {
        sortOrder = -1
      }
      if (pageNo < 0 || pageNo === 0) {
        response = {
          //"token": refreshToken,
          "error": true,
          "message": "invalid page number, should start with 1",
          "pages": 0,
        };
        logger.debug({
          'getDbZoneList': response
        });
        resolve(response);
      }

      queryopt = {};
      queryopt.skip = size * (pageNo - 1);
      queryopt.limit = size;
      query = {};
      let regexLookupStr = {
        "$regex": req.query.filter,
        "$options": "i"
      };
      let regexLookupNum = {
        "$regex": parseInt(req.query.filter, 10),
        "$options": "i"
      };

      loggedInUserRegEx = {
        "$regex": req.query.loggedInUser,
        "$options": "i"
      };
      let activeDBRegEx = {
        "$regex": parseInt(req.query.loggedInUser, 10),
        "$options": "i"
      };

      let fullSearch = [{
        zonePort: regexLookupStr
      }, {
        zonePort: regexLookupNum
      }, {
        zoneName: regexLookupStr
      }, {
        zoneUser: regexLookupStr
      }, {
        zoneType: regexLookupStr
      }, {
        zoneServer: regexLookupStr
      }, {
        zoneActive: regexLookupStr
      }, {
        buildMsg: regexLookupStr
      }];
      let userSearch = [{
        [searchField]: loggedInUserRegEx
      }];

      if (req.query.filter && req.query.loggedInUser !== 'undefined' && searchField !== 'dbVer') {
        query = {
          $and: [{
              $or: userSearch
            },
            {
              $or: fullSearch
            }
          ]
        }

      } else if (req.query.filter && req.query.loggedInUser === 'undefined') {
        query = {
          $or: fullSearch
        }
      } else if (searchField === 'dbVer') {
        query = {
          $and: [{
              $or: [{
                zoneType: {
                  '$regex': 'DB'
                }
              }]
            },
            {
              $or: [{
                dbVer: parseInt(req.query.loggedInUser, 10)
              }]
            }
          ]
        }
      } else if (!req.query.filter && req.query.loggedInUser !== 'undefined') {
        query = {
          $or: userSearch
        }
      }

    }
    ZoneInfo.countDocuments(query, function(error, totalCount) {

      if (error) {
        response = {
          "error": true,
          "message": "Error fetching data",
          "pages": 0,
        }
        logger.error({
          'getDbZoneList': response
        });
        resolve(response);
      }
      ZoneInfo.find(query, {}, queryopt, function(error, data) {
        if (error) {
          response = {
            "error": true,
            "message": "Error fetching data",
            "pages": 0
          };
          logger.error({
            'getDbZoneList': response
          });
        } else {
          response = {
            //"token": refreshToken,
            "error": false,
            "message": data,
            "pages": totalCount,
          };
          logger.debug({
            'getDbZoneList': response
          });
        }
        resolve(response);
      }).sort({
        [sortField]: sortOrder
      });
    })

  });
};


// Return lowest port
function lowestUnusedNumber(sequence, startingFrom) {
  const arr = sequence.slice(0);
  arr.sort((a, b) => a - b);

  return arr.reduce((lowest, num, i) => {
    const seqIndex = i + startingFrom;
    return num !== seqIndex && seqIndex < lowest ? seqIndex : lowest
  }, arr.length + startingFrom);
}

// Search replace like Python format
String.prototype.formatUnicorn = String.prototype.formatUnicorn ||
  function() {
    "use strict";
    let str = this.toString();
    if (arguments.length) {
      let t = typeof arguments[0];
      let key;
      let args = ("string" === t || "number" === t) ?
        Array.prototype.slice.call(arguments) :
        arguments[0];

      for (key in args) {
        str = str.replace(new RegExp("\\{" + key + "\\}", "gi"), args[key]);
      }
    }

    return str;
  };

// add / update zone DB data
function addUpdateZoneData(data) {
  return new Promise(resolve => {

    let dataZoneObject;
    if (data['zonePort'] === '00000') {
      dataZoneObject = new ZoneInfo({});
    } else {
      dataZoneObject = {};
    }
    let versions = {};
    let update = {};

    const entries = Object.entries(data);
    for (const [keys, value] of entries) {
      if (`${keys}` === 'dbVersions') {
        versions['dbVersions'] = data.dbVersions;
      } else if (`${keys}` === 'appVersions') {
        versions['appVersions'] = data.appVersions;
      } else if (`${keys}` === 'dc1') {
        dataZoneObject['dc1'] = data.dc1;
      } else if (`${keys}` === 'dc2') {
        dataZoneObject['dc2'] = data.dc2;
      } else {
        dataZoneObject[`${keys}`] = `${value}`;
      }
    }


    if (versions) {
      update = {
        $set: dataZoneObject,
        $push: versions
      }
    } else {
      update = {
        $set: dataZoneObject,
      }
    }

    ZoneInfo.findOneAndUpdate({
        zoneName: data['zoneName']
      }, update, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      },
      function(error, result) {
        if (error) {
          logger.error({
            'addUpdateZoneData': error
          });
          resolve(error);
        } else {
          logger.debug({
            'addUpdateZoneData': result
          });
          resolve(result);
        }
      });
  });
};

// Update Jira with zone data
function updateJira(data) {
  return new Promise(function(resolve, reject) {
    (async () => {
      try {
        const retCode = 200;

        let dc1LdapPorifleName;
        let dc1LdapPorifleIp;
        let dc2LdapPorifleName;
        let dc2LdapPorifleIp;
        let jiraLogin;
        let jiraPassword;
        let jiraApiURL;

        await getSystemProp().then(value => {
          jiraLogin = isDefined('jiraLogin', value, 'nouser');
          jiraPassword = isDefined('jiraPassword', value, 'pas$sorD');
          jiraApiUrl = isDefined('jiraApiUrl', value, 'https://jira.domain.com/rest/api/2/issue/');
        });

        const jiraAuth = {
          user: jiraLogin,
          password: jiraPassword
        }

        // const jiraApiUrl = jiraApiURL;

        const jiraReqest = {
          //url: jiraApiUrl + data['jiraID'],
          method: data['restType'],
          auth: jiraAuth,
          json: true,
          // body: data['updateJiraFileds'],
          rejectUnauthorized: false,
          requestCert: false,
          agent: false,
          //proxy: proxyServer
          timeout: 8000,
          headers: {
            Connection: 'close'
          },
        }
        if (data['restType'] === 'PUT') {
          jiraReqest['url'] = jiraApiUrl + data['jiraID']
          jiraReqest['body'] = data['updateJiraFileds']
        } else {
          jiraReqest['url'] = jiraApiUrl + data['jiraID'] + '?fields=summary'
        }
        let debugJiraReqest = JSON.parse(JSON.stringify(jiraReqest));
        delete debugJiraReqest['auth'];
        logger.debug({
          'updateJira(jiraReqest)': debugJiraReqest
        });
        request(jiraReqest, function(error, response, body) {
          if (error) {
            let remoteResults = {
              'errResult': true,
              'msgResp': error,
              'retCode': response,
            }
            logger.error({
              'updateJira': error
            });
            resolve(remoteResults);
          } else {
            let errResult;
            let bodyResults;
            if (response.statusCode && response.statusCode === retCode) {
              if (data['restType'] === 'GET') {
                bodyResults = body.fields.summary;
              } else {
                bodyResults = response.statusCode;
              }
              errResult = false;
            } else {
              errResult = true;
            }
            let remoteResults = {
              'errResult': errResult,
              'msgResp': bodyResults,
              'retCode': response.statusCode,
            }
            logger.debug({
              'updateJira(remoteResults)': remoteResults
            });
            resolve(remoteResults);
          }
        });
      } catch (error) {
        return Promise.reject(error);
      }
    })();
  });
}

async function getAppVersions(appInfo) {
  try {
    return new Promise(function(resolve, reject) {
      let appName = appInfo['app'];
      let appVerType = appInfo['appVerType'];
      AppVersions.findOne({
        'appName': appName
      }, function(error, apps) {
        if (error) {
          response = {
            "error": true,
            "message": error,
          };
          logger.error({
            'getAppVersions': error
          });
          reject(error);
        } else {
          response = {
            "error": false,
            "message": apps[appVerType],
          };
          logger.debug({
            'getAppVersions': response
          });
          resolve(response);
        }
      });
    });
  } catch (error) {
    return Promise.reject(error);
  }
}

function zoneMaintenance(data) {
  // zone maintenance function
  return new Promise(function(resolve, reject) {
    try {
      let cookieJar = data['cookieJar'];
      let cookieAddr = data['cookieAddr'];

      let hostUrl = data['host'];
      let zoneName = data['zoneName'];
      let zfsApiType = data['zfsApiType'];
      let zfsSrcFs = data['zfsSrcFs'];
      let zfsSrcSnap = data['zfsSrcSnap'];
      let requestUri = data['requestUri'];
      let methudAction = data['methudAction'];
      let reqBody = data['reqBody'];
      let keepCookieJar = data['keepCookieJar']
      let requestDetail;
      let zoneMethud;
      let requestOptions;

      if (typeof methudAction === 'undefined') {
        requestDetail = requestUri;
        requestOptions = {
          method: 'GET',
          url: hostUrl + requestDetail,
          jar: cookieJar,
          json: true,
          rejectUnauthorized: false,
          requestCert: false,
          agent: false,
          timeout: 190000,
          headers: {
            Connection: 'close'
          },
        }

      } else {
        requestDetail = requestUri + '/_rad_method/' + methudAction;
        requestOptions = {
          method: 'PUT',
          url: hostUrl + requestDetail,
          jar: cookieJar,
          json: true,
          body: reqBody,
          rejectUnauthorized: false,
          requestCert: false,
          agent: false,
          timeout: 190000,
          headers: {
            Connection: 'close'
          },
        }
      }

      request(requestOptions, function(error, response, body) {
        let remoteResults;
        if (error) {
          remoteResults = {
            'errResult': true,
            'msgResp': error,
            'remoteHost': hostUrl
          }
          deleteCookieJar(hostUrl, cookieJar, cookieAddr);
          logger.error({
            'zoneMaintenance': error
          });
          resolve(remoteResults);
        } else {

          let errResult;
          let msgResp;
          if (typeof response.body.payload === 'undefined') {
            errResult = true;
            msgResp = 'ERROR';
          } else {
            if (response.body.status === 'success') {
              errResult = false;
              msgResp = response.body.payload;
            } else {
              errResult = true;
              msgResp = response.body.payload;
            }
          }
          let remoteResults = {
            'errResult': errResult,
            'msgResp': msgResp,
            'remoteHost': hostUrl
          }
          if (keepCookieJar !== 'yes') {
            deleteCookieJar(hostUrl, cookieJar, cookieAddr);
          }
          logger.debug({
            'zoneMaintenance': remoteResults
          });
          resolve(remoteResults);
        }
      });
    } catch (error) {
      logger.error({
        'zoneMaintenance(ERROR), ': +requestDetail + ': ' + error
      });
    }
  });
}

function writeProfile(data) {
  return new Promise(function(resolve, reject) {
    (async () => {
      let hostDc = data['hostDc'];
      let srcFile = data['srcFile'];
      let profile_ip;
      let profile_name;

      let dc1LdapPorifleName;
      let dc1LdapPorifleIp;
      let dc2LdapPorifleName;
      let dc2LdapPorifleIp;
      let nodeDomain;

      await getSystemProp().then(value => {
        dc1LdapPorifleName = isDefined('dc1LdapPorifleName', value, 'dc1_ldap-profile');
        dc2LdapPorifleName = isDefined('dc2LdapPorifleName', value, 'dc2_ldap-profile');
        dc1LdapPorifleIp = isDefined('dc1LdapPorifleIp', value, '10.10.10.10:636');
        dc2LdapPorifleIp = isDefined('dc2LdapPorifleIp', value, '10.10.20.10:636');
        nodeDomain = isDefined('nodeDomain', value, '.domain.com');
      });

      if (hostDc.startsWith('dc2')) {
        profile_name = dc2LdapPorifleName;
        profile_ip = dc2LdapPorifleIp;
      } else {
        profile_name = dc1LdapPorifleName
        profile_ip = dc1LdapPorifleIp
      }

      let sc_profile_temp = fs.readFileSync(__dirname + '/../config/sc_profile_templ.xml', 'utf8');
      let sc_profile = sc_profile_temp.formatUnicorn({
        node_name: data['zoneName'] + '.' + nodeDomain,
        client_id: data['zonePort'],
        profile_name: profile_name,
        profile_ip: profile_ip
      })

      fs.writeFile(srcFile, sc_profile, function(error) {
        if (error) {
          logger.error({
            'writeProfile': error
          });
          reject(error);
        } else {
          logger.debug({
            'writeProfile': sc_profile
          });
          resolve();
        }
      });
    })();
  });
}

async function copyFiles(data) {
  return new Promise(function(resolve, reject) {
    (async () => {
      try {
        let sshConfig;
        sshConfig = await {
          host: data['hostDc'],
          username: data['adminUser'],
          //username: 'root',
          //port: 22,
          port: data['zonePort'],
          //password: 'password'
          privateKey: fs.readFileSync(__dirname + '/../ssh_keys/ssh_private_key', 'utf8'),
          passphrase: data['keyPassword'],
          readyTimeout: 10000,
        };

        let sftpClient = await new Client();
        await sftpClient.connect(sshConfig).then(() => {
          logger.debug(data['srcFile'], data['dstFile']);
          return sftpClient.put(data['srcFile'], data['dstFile']);
          // }).then(() => {
        }).then((res) => {
          resolve({
            'results': res
          });
          logger.debug({
            'copyFiles': res
          });
          return sftpClient.end();
        }).catch(error => {
          logger.error({
            'copyFiles': error
          });
          reject({
            'results': error.message
          });
          return sftpClient.end();
        });
      } catch (error) {
        return Promise.reject(error);
      }
    })();
  });
}

function cloneRemoteZone(data) {
  return new Promise(function(resolve, reject) {
    Promise.all([zoneMaintenance(data)]).then(results => {
      logger.debug({
        'cloneRemoteZone(part-1)': results
      });
      Promise.all([chkRemoteZoneStat(data)]).then(results => {
        logger.debug({
          'cloneRemoteZone(part-2)': results
        });

        resolve(results);
      });
    });
  });
}

function chkRemoteZoneStat(data) {
  return new Promise(function(resolve, reject) {

    delete data["methudAction"];
    delete data['reqBody'];
    delete data["cookieJar"];
    delete data["cookieAddr"];
    data['keepCookieJar'] = 'yes';
    data['requestUri'] = '/api/com.oracle.solaris.rad.zonemgr/1.6/Zone/' + data['zoneName'] + '/state';

    logger.debug({
      'chkRemoteZoneStat': data
    });
    Promise.all([getCookieJar(data)]).then(results => {
      logger.debug({
        'chkRemoteZoneStat(getCookieJar)': results
      });

      let idx = setInterval(function() {
        Promise.all([zoneMaintenance(data)]).then(results => {
          logger.debug({
            'chkRemoteZoneStat(zoneMaintenance)': results
          });

          if (results[0]['msgResp'] === "installed") {
            clearInterval(idx);
            logger.debug({
              'chkRemoteZoneStat(finalStat)': "installed"
            });
            return resolve(results[0]);
          }
        });
      }, '5000');
    });
  });
}

function checkRadAvalble(data) {
  return new Promise(function(resolve, reject) {

    (async () => {

      delete data["methudAction"];
      delete data['reqBody'];
      delete data["cookieJar"];
      delete data["cookieAddr"];

      data['keepCookieJar'] = 'no';
      //data['requestUri'] = '/api/com.oracle.solaris.rad.smf/1.0/Instance/milestone%2Fnetwork,default/state';
      data['requestUri'] = data['requestUri'];
      data['reqUser'] = data['reqUser'];
      data['reqPort'] = data["reqPort"];

      //let statTimeOut = 300;
      let curTimeOut = 0;
      let idx = setInterval(function() {
        (async () => {
          try {
            await Promise.all([getCookieJar(data)]);
            Promise.all([zoneMaintenance(data)]).then(results => {
              logger.debug({
                'checkRadAvalble(zoneMaintenance)': results
              });

              if (results[0]['errResult'] === true) {
                (async () => {

                  delete data["cookieJar"];
                  delete data["cookieAddr"];
                  await Promise.all([getCookieJar(data)]);
                  logger.debug({
                    'checkRadAvalble(zoneMaintenance)': 'getNewCookieJar'
                  });
                })()
              }

              if (data['expState'].includes(results[0]['msgResp'])) {
                clearInterval(idx);
                logger.debug({
                  'checkRadAvalble(zoneMaintenance)': data['expState']
                });
                return resolve(results[0]);
              } else {
                if (curTimeOut >= parseInt(data['maxSmfAvalTimeOut'])) {
                  let msgResp = [{
                    "errResult": true,
                    "msgResp": results[0]['msgResp'],
                    "remoteHost": "NA",
                    "error": "TIMEOUT"
                  }]
                  logger.debug({
                    'checkRadAvalble(zoneMaintenance)': msgResp,
                    "error": "TIMEOUT"
                  });
                  clearInterval(idx);
                  delete data["cookieJar"];
                  delete data["cookieAddr"];
                  return reject(msgResp);
                }
                delete data["cookieJar"];
                delete data["cookieAddr"];
                curTimeOut += data['incrTimeOut'];
              }
            });
          } catch (error) {
            logger.error({
              'checkRadAvalble(ERROR)': +error
            });
          }
        })();
      }, data['chkInterval']);
    })();
  });
}

function getNextAvalVersion(data) {
  return new Promise(function(resolve, reject) {
    (async () => {
      logger.debug({
        'getNextAvalVersion(data)': data
      });

      await Promise.all([runZfsActions(data)]).then(createZoneRes => {
        logger.debug({
          'getNextAvalVersion(results)': createZoneRes
        });

        let fsList = new Set();
        createZoneRes[0]['msgResp'].forEach((fs) => {
          fsList.add(parseInt(fs['name'].split('-')[2]));
        });

        logger.debug({
          'getNextAvalVersion(fsList)': Array.from(fsList)
        });
        resolve(Array.from(fsList));
      });
    })();
  });
}

function zfsReplStatus(data) {
  return new Promise(function(resolve, reject) {

    let curTimeOut = 0;
    let radZoneAvalTimeOut;
    if (data['zoneType'] === 'FS') {
      radZoneAvalTimeOut = 7200;
    } else {
      radZoneAvalTimeOut = 300;
    }

    let idx = setInterval(function() {
      (async () => {
        await Promise.all([runZfsActions(data)]).then(results => {
          if (results[0]['msgResp']['action']['state'] === 'idle') {
            let msgResp = {
              "errResult": false,
              "msgResp": 'idle',
              'curTimeOut': curTimeOut,
              'error': 'NA',
            }
            logger.debug(msgResp);
            clearInterval(idx);
            return resolve(msgResp);
          } else {
            let msgResp = {
              'errResult': true,
              'msgResp': 'error',
              'curTimeOut': curTimeOut,
              'error': 'TIMEOUT',
            }
            logger.debug({
              "createZfsSnapClone(zfsParamList)": {
                'errResult': true,
                'msgResp': results[0]['msgResp'],
                'curTimeOut': curTimeOut,
                'error': 'TIMEOUT',
              }
            });
            if (curTimeOut >= parseInt(radZoneAvalTimeOut)) {
              logger.debug(msgResp);
              clearInterval(idx);
              return reject(msgResp);
            } else {
              curTimeOut += 5;
            }
          }
        });
      })()
    }, 30000);
  });
}

module.exports = {
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
}
