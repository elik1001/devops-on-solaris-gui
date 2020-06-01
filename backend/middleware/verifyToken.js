const ldap = require('ldapjs');
const tls = require('tls');
const fs = require('fs');
const jwt = require('jsonwebtoken');

let User = require(__dirname + '/../model/user');

const publicKEY = fs.readFileSync(__dirname + '/../keys/public.key', 'utf8');
const privateKEY = fs.readFileSync(__dirname + '/../keys/private.key', 'utf8');
const caFile = fs.readFileSync(__dirname + '/../keys/firewall-domain.cert', 'utf8');

const {
  getSystemProp
} = require('./systemProperties');

function getToken(req, res, next) {
  return new Promise(function(resolve, reject) {
    let userData = req.body;
    User.findOne({
      userID: userData.userID
    }, (err, user) => {
      if (err) {
        res.status(401).send('401 Unauthorized!');
      } else {
        if (!user || !user.isLocal || user.isActive !== 'Active') {
          res.status(401).send('401 Unauthorized!');
        } else {
          verifyAuth(req.body.userID, req.body.password, user.isLocal, user, 'login').then(results => {
            if (results['err'] === 1) {
              return res.status(401).send('401 Unauthorized!');
            } else {
              (async () => {
                let payload = {
                  subject: user.userID,
                  role: user.adminRole,
                }
                let refreshToken;
                let expireTime;
                let sessionIssuer;
                let sessionAudience;
                await getSystemProp().then(value => {
                  expireTime = isDefined('loginSessionTimeout', value, 3600);
                  sessionIssuer = isDefined('sessionIssuer', value, 'YOUR_ORG');
                  sessionAudience = isDefined('sessionAudience', value, '192.168.10.10');
                });
                const signOptions = {
                  issuer: sessionIssuer,
                  subject: user.userID,
                  audience: 'http://' + sessionAudience,
                  expiresIn: expireTime + 's',
                  algorithm: "RS256"
                };
                let token = jwt.sign(payload, privateKEY, signOptions);
                // refreshToken = token;
                req['refreshToken'] = token;
                res.status(200).send({
                  token
                });
              })();
            }
          });
        }
      }
    })
  });
}

function verifyToken(roles = []) {
  return [
    (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send('401 Unauthorized!')
      }
      let token = req.headers.authorization.split(' ')[1];
      if (token === 'null') {
        return res.status(401).send('401 Unauthorized!');
      }
      let decoded = jwt.verify(token, publicKEY, function(err, decoded) {
        if (typeof roles === 'string') {
          roles = [roles];
        }
        if (err) {
          if (err.name === 'TokenExpiredError') {
            return res.status(401).send('Unauthorized request. For your protection you have been signed out, session expired')
          } else {
            return res.status(401).send({
              auth: false,
              message: '401 Unauthorized!'
            });
          }
        } else if (roles.includes(decoded.role)) {
          (async () => {
            let payload = {
              subject: decoded.sub,
              role: decoded.role,
            }

            let refreshToken;
            let expireTime;
            let sessionIssuer;
            let sessionAudience;
            await getSystemProp().then(value => {
              expireTime = isDefined('loginSessionTimeout', value, 3600);
              sessionIssuer = isDefined('sessionIssuer', value, 'YOUR_ORG');
              sessionAudience = isDefined('sessionAudience', value, '192.168.10.10');
            });
            let signOptions = {
              issuer: sessionIssuer,
              subject: decoded.sub,
              audience: 'http://' + sessionAudience,
              expiresIn: expireTime + 's',
              algorithm: "RS256"
            };
            let token = jwt.sign(payload, privateKEY, signOptions);
            //refreshToken = token;
            req['refreshToken'] = token;
            next();
          })();
        } else {
          return res.status(401).send('401 Unauthorized!');
        }
      });
    }
  ]
}

function verifyAuth(user, userPassword, isLocal, userDbObj, authType) {
  return new Promise(function(resolve, reject) {
    (async () => {
      if (isLocal === 'LDAP') {
        let ldapServers;
        let ldapProto;
        let ldapsHostFqDomain;
        let ldapCertCALoc;
        let ldapUserBaseDn;
        let ldapServerConTimeout;
        await getSystemProp().then(value => {
          ldapProto = isDefined('ldapProto', value, 'ldap');
          if (ldapProto === 'ldaps') {
            ldapsHostFqDomain = isDefined('ldapsHostFqDomain', value, 'ldap.domain.com');
            ldapCertCALoc = isDefined('ldapCertCALoc', value, '/sslcert/ldap-dc1ldpr3_domain_com.crt');
          }
          ldapServers = isDefined('ldapServers', value, '10.10.10.10:389');
          ldapUserBaseDn = isDefined('ldapUserBaseDn', value, 'ou=people,o=domain.com,dc=domain,dc=com');
          ldapServerConTimeout = isDefined('ldapServerConTimeout', value, 5000);
        });
        let tlsOptions = {
          host: ldapsHostFqDomain,
          ca: fs.readFileSync(__dirname + '/..' + ldapCertCALoc),
        };

        let client = ldap.createClient({
          url: ldapProto + '://' + ldapServers,
          tlsOptions: tlsOptions,
          connectTimeout: ldapServerConTimeout,
          timeout: ldapServerConTimeout
        });

        client.on('timeout', (err) => {
          resolve({
            'errMsg': err.lde_message,
            'err': 2
          });
        });
        client.on('connectTimeout', (err) => {
          resolve({
            'errMsg': err.lde_message,
            'err': 2
          });
        });
        client.on('error', (err) => {
          resolve({
            'errMsg': err,
            'err': 1
          });
        });

        client.bind('uid=' + user + ',' + ldapUserBaseDn, userPassword, function(err) {

          if (err) {
            resolve({
              'errMsg': err.lde_message,
              'err': 1
            });
          } else {
            resolve({
              'errMsg': 'N/A',
              'err': 0
            });
          }
        });
      } else {
        if (userDbObj && authType === 'login') {
          userDbObj.comparePassword(userPassword, function(err, isMatch) {
            if (err) {
              resolve({
                'errMsg': '401 Unauthorized!',
                'err': 1
              });
            } else {
              if (isMatch) {
                resolve({
                  'errMsg': 'Matchs',
                  'err': 0
                });
              } else {
                resolve({
                  'errMsg': '401 Unauthorized!',
                  'err': 1
                });
              }
            }
          });
        } else {
          resolve({
            'errMsg': 'New user ',
            'err': 0
          });
        }
      }
    })();
  });
}

// Check for null values
function isDefined(attr, retVal, failVal) {
  return (retVal && retVal[attr]) ? retVal[attr] : failVal;
}

function removePrivate(obj) {
  if (typeof obj === 'undefined' || obj.lenght < 1) return {};
  obj.forEach((item) => {
    if (item.keyPassword) {
      delete item['keyPassword'];
    }
  });
  return obj;
};

module.exports = {
  getToken,
  verifyAuth,
  verifyToken,
  isDefined,
  removePrivate,
}
