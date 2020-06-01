var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var appVersionsSchema = new Schema({
  appName: {type: 'String', required: true},
  lastVersion: {type: 'Number', required: true},
  defaultVersion: {type: 'String', required: true},
},
{collection: 'appVersions'},
{versionKey: false});

const AppVersions = module.exports = mongoose.model('appVersions', appVersionsSchema);
