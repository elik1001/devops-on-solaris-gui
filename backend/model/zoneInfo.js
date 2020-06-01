var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var zoneInfoSchema = new Schema({
  zoneLock: {type: 'String', required: false},
  zonePort: {type: 'String', required: true},
  zoneUser: {type: 'String', required: true},
  zoneType: {type: 'String', required: true},
  zoneName: {type: 'String', required: true},
  zoneShortName: {type: 'String', required: false},
  activeSchema: {type: 'Boolean', required: false},
  zoneServer: {type: 'String', required: true},
  zoneActive: {type: 'String', required: false},
  zoneActivity: {type: 'String', required: false},
  zoneAddress: {type: 'String', required: false},
  buildStatus: {type: 'String', required: false},
  buildMsg: {type: 'String', required: false},
  updateJira: {type: 'Boolean', required: false},
  jiraID: {type: 'String', required: false},
  dbVer: {type: 'Number', required: false},
  appsVer: {type: 'Number', required: false},
  appVersions: {type: [], required: false},
  dbVersions: {type: [], required: false},
  zoneDescription: {type: 'String', required: false},
  zoneMaint: {type: 'Boolean', required: false},
  percentComplete: {type: 'Number', required: false, default: 0},
  dc1: {type: [], required: false},
  dc2: {type: [], required: false},
  zoneCreated: {type: 'String', required: false},
},
{collection: 'zoneInfo'},
{versionKey: false});

const ZoneInfo = module.exports = mongoose.model('zoneInfo', zoneInfoSchema);
