const request = require('request');
const logger = require(__dirname + '/../utils/winstonLogger');

let ZoneInfo = require(__dirname + '/../model/zoneInfo');

const {
  getSystemProp
} = require('../middleware/systemProperties');
const {
  isDefined
} = require('../middleware/verifyToken');

// Return cookie good for one hour
function getCookieJar(data) {
  return new Promise(resolve => {
    if (typeof data['cookieJar'] === 'undefined') {
      (async () => {
        try {
          let hostUser;
          let hostPassword;

          await getSystemProp().then(value => {
            hostUser = isDefined('rootGlobalHostUser', value, 'root');
            hostPassword = isDefined('rootGlobalHostPassword', value, 'pas$sorD');
          });

          if (data['reqUser'] === "confmgr") {
            hostUser = data['reqUser'];
            hostPassword = 'confmgr1';
          }

          let hostUrl = data['host'];
          let methudAction = data['methudAction'];
          let authUser = {
            username: hostUser,
            preserve: true,
          }
          let authPassword = {
            value: {
              pam: {
                responses: [hostPassword]
              },
              generation: 1
            }
          }

          let cookieJar = request.jar();
          request.post({
            url: hostUrl + '/api/authentication/2.0/Session/',
            jar: cookieJar,
            body: authUser,
            method: 'POST',
            json: true,
            // ca: caFile,
            rejectUnauthorized: false, //add when working with https sites
            requestCert: false, //add when working with https sites
            agent: false, //add when working with https sites
            //proxy: proxyServer
            timeout: 8000,
            headers: {
              Connection: 'close'
            },
          }, function(error, response, body) {
            let remoteResults;
            if (error) {
              remoteResults = {
                'errResult': true,
                'msgResp': error,
                'remoteHost': hostUrl
              }
              logger.error({
                'getCookieJar(Session)': error,
                'remoteResults': remoteResults
              });
              resolve(remoteResults);
            } else {
              let cookieAddr = response.headers.location.split('/')[6];
              logger.debug({
                'cookieAddr': cookieAddr
              });
              request.put({
                url: hostUrl + '/api/com.oracle.solaris.rad.authentication/2.0/Session/_rad_reference/' + cookieAddr + '/state',
                jar: cookieJar,
                json: true,
                body: authPassword,
                rejectUnauthorized: false,
                requestCert: false,
                agent: false,
                timeout: 2500,
                headers: {
                  Connection: 'close'
                },
              }, function(error, response, body) {
                let remoteResults;
                if (error) {
                  remoteResults = {
                    'errResult': true,
                    'msgResp': error,
                    'remoteHost': hostUrl
                  }
                  logger.error({
                    'getCookieJar(_rad_reference)': remoteResults
                  });
                  resolve(remoteResults);
                } else {
                  data['cookieJar'] = cookieJar;
                  data['cookieAddr'] = cookieAddr;
                  logger.debug({
                    'getCookieJar': {
                      'cookieJar': data['cookieJar'],
                      'cookieAddr': data['cookieAddr']
                    }
                  });
                }
                resolve(data);
              });
            }
          });
        } catch (error) {
          logger.error({
            'getCookieJar(ERROR)': error
          });
        }
      })();
    } else {
      logger.debug({
        'getCookieJar': {
          'cookieJar': data['cookieJar'],
          'cookieAddr': data['cookieAddr']
        }
      });
      resolve(data);
    }
  });
}

function deleteCookieJar(hostUrl, cookieJar, cookieAddr) {
  return new Promise(resolve => {
    try {
      request.delete({
        url: hostUrl + '/api/com.oracle.solaris.rad.authentication/2.0/Session/_rad_reference/' + cookieAddr,
        jar: cookieJar,
        json: true,
        rejectUnauthorized: false,
        requestCert: false,
        agent: false,
        timeout: 2500,
        headers: {
          Connection: 'close'
        },
      }, function(error, response, body) {
        let remoteResults;
        if (error) {
          remoteResults = {
            'errResult': true,
            'msgResp': error,
          }
          logger.error({
            'deleteCookieJar(_rad_reference)': error
          });
          resolve(remoteResults);
        } else {
          remoteResults = {
            'errResult': false,
            'msgResp': body.status
          }
          resolve(remoteResults);
          logger.debug({
            'deleteCookieJar(_rad_reference)': remoteResults
          });
        }
      });
    } catch (error) {
      logger.debug({
        'deleteCookieJar(error-in-deleteCookieJar)': error
      });      
    }
  });
}

module.exports = {
  getCookieJar,
  deleteCookieJar
}
