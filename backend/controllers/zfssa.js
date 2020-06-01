const request = require('request');
const logger = require(__dirname + '/../utils/winstonLogger');
const {
  getSystemProp
} = require('../middleware/systemProperties');
const {
  isDefined
} = require('../middleware/verifyToken');

function zfsActions(req, res, next) {

  let zoneNameSnap = 'snap_' + req.query.zoneName;
  let zoneName = req.query.zoneName;
  let zoneType = req.query.zoneType;
  let zfsApiType = req.query.zfsApiType;
  let zfsReqType = req.query.zfsReqType;
  let zfsSrcFs = req.query.zfsSrcFs;
  let zfsSrcSnap = req.query.zfsSrcSnap;
  let zfsDstFs = req.query.zfsDstFs;
  let zfsQuota = req.query.zfsQuota;
  let dbVersions = req.query.dbVersions;
  let appVersions = req.query.appVersions;

  let zfsParamList = [];
  zfsParamList.push({
    'zfsApiType': zfsApiType,
    'zfsReqType': zfsReqType,
    'zfsSrcFs': zfsSrcFs,
    'zfsSrcSnap': zfsSrcSnap,
    'zfsDstFs': zfsDstFs,
    'zfsQuota': zfsQuota,
  });

  let zfsActions = zfsParamList.map(runZfsActions);
  logger.debug({
    "zfsActions": zfsActions
  });

  let errResult;
  let snapList;
  let snapCount;

  Promise.all(zfsActions).then(responses => {
    responses.map(response => {
      logger.debug({
        "zfsActions response": response
      });
      if (response['errResult'] === true) {
        errResult = true;
        snapList = 'None';
        snapCount = 0;
        retCode = response['retCode'];
      } else {
        if (typeof response['msgResp'] !== 'undefined' && response['msgResp'].length > 0) {

          snapList = [];

          if ((zoneType === 'FS' && zfsSrcFs.startsWith('apps1-prod_v')) || (zoneType === 'DB' && zfsSrcFs.startsWith('ifxdb-do_v'))) {
            snapCount = response['msgResp'].length;
            snapList.push(zfsSrcFs);
          } else {
            response['msgResp'].forEach((item, index, array) => {
              if (item['name'] === zoneNameSnap) {
                snapList.push(item['name']);
              }
            });
            snapCount = snapList.length;
          }

          errResult = false;
          retCode = response['retCode'];
        } else {
          snapList = zfsSrcSnap;
          snapCount = 0;
          errResult = false;
          retCode = response['msgResp'];
        }
      }
      let zfsFullResponse = {
        //"token": refreshToken,
        "token": req['refreshToken'],
        //"token": 'refreshToken',
        "zfsSrcFs": zfsSrcFs,
        "error": errResult,
        "retCode": retCode,
        "snapCount": snapCount,
        "snapList": snapList,
        "zfsReqType": zfsReqType,
      };
      res.json(zfsFullResponse);
    });

  });
}

/*function getSnapList(data) {
  return new Promise(function(resolve, reject) {

    const dbData = {
      'zfsApiType': 'GET',
      'zfsReqType': 'getSnaps',
      'zoneName': this.data.zoneName,
      'zfsSrcFs': 'ifxdb-do_v-' + '5',
      'zfsSrcSnap': '',
      'dbVersions': this.data.dbVersions,
    }

  });
}*/

function runZfsActions(data) {
  return new Promise(function(resolve, reject) {
    (async () => {
      logger.debug({
        "runZfsActions(data)": data
      });

      let zfsHostUrl;
      let zfssaUser;
      let zfssaPassword;
      let zfssaPool;
      let zfssaProject;
      let zfssaAppsQuota;
      let zfssaDbQuota;
      let zfsProjectTmp;
      let zfssaUrl;

      await getSystemProp().then(value => {
        zfsHostUrl = isDefined('zfssaUrl', value, 'https://dc1nas2a.domain.com:215');
        zfssaUser = isDefined('zfssaUser', value, 'pas$sorD');
        zfssaPassword = isDefined('zfssaPassword', value, 'pas$sorD');

        zfssaPool = isDefined('zfssaPool', value, 'HP-pool1');
        zfssaProject = isDefined('zfssaProject', value, 'do-project1');
        zfsProjectTmp = zfssaProject + '_' + data['zfsProjectTmp'];
        zfssaUrl = isDefined('zfssaUrl', value, 'https://dc1nas2a.domain.com:215');
      });

      let zfsReplTarget = zfssaUrl.split('/').join(':').split('.').join(':').split(':')[3];
      let zfsAuth = {
        user: zfssaUser,
        password: zfssaPassword
      }

      let zfsPool = zfssaPool;
      let zfsProject = zfssaProject;
      let zfsApiType = data['zfsApiType'];
      let zfsSrcFs = data['zfsSrcFs'];
      let zfsDstFs = data['zfsDstFs'];
      let zfsSrcSnap = data['zfsSrcSnap'];
      //let zfsDstSnap = data['zfsDstSnap'];
      let zfsQuota = data['zfsQuota'];
      let zfsReqType = data['zfsReqType'];
      let verSrcRenameSnap = data['verSrcRenameSnap'];
      let zfsReqTimeout;
      let zfsApiUrl;
      let zfsBody;
      let retCode = 200;

      if (zfsReqType === "getSnaps") {
        retCode = 200;
        zfsReqTimeout = 15000;
        zfsApiUrl = '/api/storage/v1/pools/' + zfsPool + '/projects/' + zfsProject + '/filesystems/' + zfsSrcFs + '/snapshots';
      } else if (zfsReqType === "getAllFs") {
        retCode = 200;
        zfsReqTimeout = 1520000;
        zfsApiUrl = '/api/storage/v1/pools/' + zfsPool + '/projects/' + zfsProject + '/filesystems?filter=' + data['zfsAppPrefix'];
      } else if (zfsReqType === "setSnap") {
        retCode = 201;
        zfsReqTimeout = 15000;
        zfsBody = {
          'name': zfsSrcSnap
        }
        zfsApiUrl = '/api/storage/v1/pools/' + zfsPool + '/projects/' + zfsProject + '/filesystems/' + zfsSrcFs + '/snapshots';
      } else if (zfsReqType === "createSnapClone") {
        retCode = 201;
        zfsReqTimeout = 22000;
        zfsBody = {
          'share': zfsDstFs,
          'mountpoint': '/export/' + zfsDstFs
        }
        if (typeof zfsQuota !== 'undefined') {
          zfsBody['quota'] = zfsQuota;
        }
        zfsApiUrl = '/api/storage/v1/pools/' + zfsPool + '/projects/' + zfsProject + '/filesystems/' + zfsSrcFs + '/snapshots/' + zfsSrcSnap + '/clone';
      } else if (zfsReqType === "deleteSnapClone") {
        retCode = 204;
        zfsReqTimeout = 60000;
        zfsApiUrl = '/api/storage/v1/pools/' + zfsPool + '/projects/' + zfsProject + '/filesystems/' + zfsSrcFs + '/snapshots/' + zfsSrcSnap;
      } else if (zfsReqType === "deleteFilesystem") {
        retCode = 204;
        zfsReqTimeout = 60000;
        zfsApiUrl = '/api/storage/v1/pools/' + zfsPool + '/projects/' + zfsProject + '/filesystems/' + zfsSrcFs;
      }
      // below are all related to replication and refresh snaps
      else if (zfsReqType === "setReplInheritFlag") {
        retCode = 202;
        zfsReqTimeout = 20000;
        zfsBody = {
          'inherited': 'false'
        }
        zfsApiUrl = '/api/storage/v1/pools/' + zfsPool + '/projects/' + zfsProject + '/filesystems/' + zfsSrcFs + '/replication';
      } else if (zfsReqType === "createReplAction") {
        retCode = 201;
        // POST
        zfsReqTimeout = 20000;
        zfsBody = {
          'pool': 'HP-pool1',
          'target': zfsReplTarget,
          'include_snaps': false
        }
        zfsApiUrl = '/api/storage/v1/pools/' + zfsPool + '/projects/' + zfsProject + '/filesystems/' + zfsSrcFs + '/replication/actions';
      } else if (zfsReqType === "syncReplTarget") {
        retCode = 202;
        zfsReqTimeout = 20000;
        zfsBody = {};
        zfsApiUrl = '/api/storage/v1/replication/actions/' + data['targetUuid'] + '/sendupdate'
      } else if (zfsReqType === "syncReplStatus") {
        retCode = 200;
        zfsReqTimeout = 20000;
        zfsApiUrl = '/api/storage/v1/replication/actions/' + data['targetUuid'];
      } else if (zfsReqType === "renameReplMount") {
        retCode = 202;
        zfsReqTimeout = 20000;
        zfsBody = {
          'mountpoint': '/export/' + data['zfsNextSrcFs']
        }
        zfsApiUrl = '/api/storage/v1/replication/packages/' + data['targetUuid'] + '/projects/' + zfsProject + '/filesystems/' + zfsSrcFs;
      } else if (zfsReqType === "severRepl") {
        retCode = 202;
        zfsReqTimeout = 20000;
        zfsBody = {
          'projname': zfsProjectTmp
        }
        zfsApiUrl = '/api/storage/v1/replication/packages/' + data['targetUuid'] + '/sever';
      } else if (zfsReqType === "renameShare") {
        retCode = 202;
        zfsReqTimeout = 20000;
        zfsBody = {
          'name': data['zfsNextSrcFs']
        }
        zfsApiUrl = '/api/storage/v1/pools/' + zfsPool + '/projects/' + zfsProjectTmp + '/filesystems/' + zfsSrcFs;
      } else if (zfsReqType === "deleteRepl") {
        retCode = 204;
        zfsReqTimeout = 20000;
        zfsApiUrl = '/api/storage/v1/replication/actions/' + data['targetUuid'];
      } else if (zfsReqType === "moveProjctFS") {
        retCode = 202;
        zfsReqTimeout = 20000;
        zfsBody = {
          'project': zfsProject
        }
        zfsApiUrl = '/api/storage/v1/pools/' + zfsPool + '/projects/' + zfsProjectTmp + '/filesystems/' + data['zfsNextSrcFs'];
      } else if (zfsReqType === "deleteProject") {
        retCode = 204;
        zfsReqTimeout = 20000;
        zfsApiUrl = '/api/storage/v1/pools/' + zfsPool + '/projects/' + zfsProjectTmp;
      } else if (zfsReqType === "renameSnap") {
        retCode = 202;
        zfsReqTimeout = 20000;
        zfsBody = {
          'name': verSrcRenameSnap
        }
        zfsApiUrl = '/api/storage/v1/pools/' + zfsPool + '/projects/' + zfsProject + '/filesystems/' + zfsSrcFs + '/snapshots/' + zfsSrcSnap;
      } else if (zfsReqType === "renameClone") {
        retCode = 202;
        zfsReqTimeout = 20000;
        zfsBody = {
          'mountpoint': '/export/' + verSrcRenameClone
        }
        zfsApiUrl = '/api/storage/v1/pools/' + zfsPool + '/projects/' + zfsProject + '/filesystems/' + zfsDstFs;
      }

      let zfsReqest = {
        url: zfsHostUrl + zfsApiUrl,
        method: zfsApiType,
        auth: zfsAuth,
        json: true,
        rejectUnauthorized: false,
        requestCert: false,
        agent: false,
        timeout: zfsReqTimeout,
        headers: {
          Connection: 'close'
        },
      }

      if (zfsApiType === "POST" || zfsApiType === "PUT") {
        zfsReqest['body'] = zfsBody;
      }

      logger.debug({
        "zfsReqest": {
          "zfsReqType": zfsReqType,
          "url": zfsHostUrl + zfsApiUrl,
          "method": zfsApiType,
          "timeout": zfsReqTimeout,
          "body": zfsBody
        }
      });

      request(zfsReqest, function(error, response, body) {
        if (error) {
          let remoteResults = {
            'errResult': true,
            'msgResp': error,
            'retCode': response,
          }
          logger.error({
            'runZfsActions': error
          });
          reject(remoteResults);
        } else {
          logger.debug({
            "zfsReqest(response)": body
          });
          let bodyResults;
          let errResult;
          if (response.statusCode && response.statusCode === retCode) {
            errResult = false;
          } else {
            errResult = true;
          }

          if (zfsReqType === 'getSnaps') {
            bodyResults = body['snapshots'];
          } else if (zfsReqType === 'setReplInheritFlag') {
            bodyResults = response.statusCode;
          } else if (zfsReqType === 'getAllFs') {
            bodyResults = body['filesystems'];
          } else if (zfsReqType === 'createReplAction' || zfsReqType === 'syncReplStatus') {
            bodyResults = body;
          } else if (zfsApiType === "DELETE" || zfsApiType === "POST" || zfsApiType === "PUT") {
            bodyResults = response.statusCode;
          } else {
            bodyResults = body;
          }

          let remoteResults = {
            'errResult': errResult,
            'msgResp': bodyResults,
            'retCode': response.statusCode,
          }

          logger.debug({
            "zfsReqest(remoteResults)": remoteResults
          });
          resolve(remoteResults);
        }
      });
    })()
  });
}

function createZfsSnapClone(data) {
  return new Promise(function(resolve, reject) {
    (async () => {

      logger.debug({
        "createZfsSnapClone": data
      });

      let zfssaAppsQuota;
      let zfssaDbQuota;

      await getSystemProp().then(value => {
        zfssaAppsQuota = isDefined('zfssaAppsQuota', value, '400');
        zfssaDbQuota = isDefined('zfssaDbQuota', value, '10');
      });

      let zfsDstFs;
      let zfsQuota;
      let snapList;
      let snapCount;
      let errResult;
      let zfsParamList = [];
      let fs_list = [];

      if (data['verSrcRenameSnap'] && data['zfsReqType'] === 'renameSnap') {
        if (data['zoneType'] === 'APP') {
          fs_list = [data['appVerSrc'], data['dbVerSrc']];
        } else if (data['zoneType'] === 'FS') {
          //fs_list = [data['dbVerSrc']];
          fs_list = [data['appVerSrc']];
        } else if (data['zoneType'] === 'DB') {
          //fs_list = [data['appVerSrc']];
          fs_list = [data['dbVerSrc']];
        }
      } else if ((data['verSrcRenameSnap']) && (data['zfsReqType'] === 'createSnapClone' || data['zfsReqType'] === 'setSnap')) {
        if (data['zoneType'] === 'APP') {
          fs_list = [data['appVerDst'], data['dbVerDst']];
        } else if (data['zoneType'] === 'FS') {
          fs_list = [data['appVerDst']];
        } else if (data['zoneType'] === 'DB') {
          fs_list = [data['dbVerDst']];
        }
      } else if (data['zfsReqType'] === 'createSnapClone' || data['zfsReqType'] === 'setSnap') {
        if (data['zoneType'] === 'APP') {
          fs_list = [data['appsVer'], data['dbVer']];
        } else if (data['zoneType'] === 'FS') {
          fs_list = [data['dbVer']];
        } else if (data['zoneType'] === 'DB') {
          fs_list = [data['appsVer']];
        }
      }

      fs_list.forEach((item, index, array) => {
        zfsParamList.push({
          'zfsApiType': data['zfsApiType'],
          'zfsReqType': data['zfsReqType'],
          'zfsSrcSnap': data['zfsSrcSnap'],
          //'zfsDstSnap': data['zfsDstSnap'],
          'verSrcRenameSnap': data['verSrcRenameSnap'],
          'zfsSrcFs': item,
          //'zfsSrcFs': data['dbVerSrc'],

          'zfsQuota': zfsQuota,
        });

        if (data['zfsReqType'] === 'createSnapClone') {
          if (data['verSrcRenameSnap'] && item.startsWith('apps1')) {
            //zfsParamList[index]['zfsSrcFs'] = data['dbVerSrc'];
            zfsParamList[index]['zfsDstFs'] = data['appVerDst'] + '-z-' + data['refreshTime'] + '-' + data['zoneShortName'];
          } else if (data['verSrcRenameSnap'] && item.startsWith('ifxdb')) {            
            zfsParamList[index]['zfsSrcFs'] = data['dbVerDst'];
            zfsParamList[index]['zfsDstFs'] = data['dbVerDst'] + '-z-' + data['refreshTime'] + '-' + data['zoneShortName'];
          } else {
            zfsParamList[index]['zfsDstFs'] = item + '-' + data['zoneName'];
          }
          if (item.startsWith('apps1')) {
            zfsParamList[index]['zfsQuota'] = zfssaAppsQuota + 'G';
          } else {
            zfsParamList[index]['zfsQuota'] = zfssaDbQuota + 'G';;
          }
        }
      });

      logger.debug({
        "createZfsSnapClone(zfsParamList)": zfsParamList
      });
      let zfsActions = zfsParamList.map(runZfsActions);

      Promise.all(zfsActions).then(responses => {
        logger.debug({
          "createZfsSnapClone(zfsActions(responses))": responses
        });
        responses.map(response => {
          if (response['errResult'] === true) {
            errResult = true;
            snapList = 'None';
            snapCount = 0;
            retCode = response['retCode'];
          } else {
            errResult = false;
            snapList = 'None';
            snapCount = 0;
            retCode = response['retCode'];
          }
          let zfsFullResponse = {
            "zfsSrcFs": data['zoneName'],
            "error": errResult,
            "retCode": retCode,
            "snapCount": snapCount,
            "snapList": snapList,
            "zfsParamList": zfsParamList
          };
          logger.debug({
            "createZfsSnapClone(zfsFullResponse)": zfsFullResponse
          });
          resolve(zfsFullResponse);
        });
      });
    })()
  });
}

module.exports = {
  zfsActions,
  runZfsActions,
  createZfsSnapClone
}
