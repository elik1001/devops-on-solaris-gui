var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var systemPropertiesSchema = new Schema({
  // 37 verifyToken
  environment: {type: 'String', required: false},
  loginSessionTimeout: {type: 'String', required: false},
  sessionIssuer: {type: 'String', required: false},
  sessionAudience: {type: 'String', required: false},
  // 95 verifyToken
  ldapServers: {type: 'String', required: false},
  ldapUserBindDn: {type: 'String', required: false},
  ldapUserBaseDn: {type: 'String', required: false},
  ldapServerConTimeout: {type: 'Number', sparse: true, required: false},
  // ldaps verifyToken
  ldapProto: {type: 'String', required: false},
  ldapsHostFqDomain: {type: 'String', required: false},
  ldapCertCALoc: {type: 'String', required: false},
  // 941 profile name/ip
  dc1LdapPorifleName: {type: 'String', required: false},
  dc1LdapPorifleIp: {type: 'String', required: false},
  dc2LdapPorifleName: {type: 'String', required: false},
  dc2LdapPorifleIp: {type: 'String', required: false},
  // 42 low zone port
  minZonePort: {type: 'Number', sparse: true, required: true},
  // 262 middleware/autcreatezone
  keyPassword: {type: 'String', required: true},
  // 349 zone rad port hostPrefix
  radZonePort: {type: 'Number', sparse: true, required: true},
  // 744
  jiraLogin: {type: 'String', required: false},
  jiraPassword: {type: 'String', required: false},
  jiraApiUrl: {type: 'String', required: false},
  radZoneAvalTimeOut: {type: 'Number', sparse: true},
  // 13 cooikeJar
  rootGlobalHostUser: {type: 'String', required: false},
  rootGlobalHostPassword: {type: 'String', required: false},
  rootZoneUser: {type: 'String', required: false},
  rootZonePassword: {type: 'String', required: false},
  // 71 zfssa
  zfssaUrl: {type: 'String', required: true},
  zfssaUser: {type: 'String', required: true},
  zfssaPassword: {type: 'String', required: true},
  zfssaPool: {type: 'String', required: true},
  zfssaProject: {type: 'String', required: true},
  zfssaAppsQuota: {type: 'String', required: false},
  zfssaDbQuota: {type: 'String', required: false},
  // 97 zones
  globalHostList: {type: 'String', required: true},
  // 210 & 612
  globalDcList: {type: 'String', required: true},
  primeDc: {type: 'String', required: true},
  nodeDomain: {type: 'String', required: true},
  winstonLogLevel: {type: 'String', required: false},
},
{collection: 'systemProperties'},
{versionKey: false});

systemPropertiesSchema.set('toJSON', {
  transform: function(doc, ret, opt) {
    ret['keyPassword'] = 'redacted'
    ret['jiraPassword'] = 'redacted'
    ret['rootGlobalHostPassword'] = 'redacted'
    ret['rootZonePassword'] = 'redacted'
    ret['zfssaPassword'] = 'redacted'

    return ret
  }
})

const SystemProperties = module.exports = mongoose.model('systemProperties', systemPropertiesSchema);
