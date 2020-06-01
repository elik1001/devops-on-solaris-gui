var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var zoneJobsSchema = new Schema({
  name:  {type: 'String', required: false},
  data:  {type: {}, required: false},
  jobDetails:  {type: 'String', required: false},
  failCount: {type: 'Number', required: false},
  failReason:  {type: 'String', required: false},
  failedAt:  {type: 'String', required: false},
  lockedAt:  {type: 'String', required: false},
  lastRunAt:  {type: 'String', required: false},
  nextRunAt:  {type: 'Date', required: false},
},
{collection: 'creatDualZones'},
{versionKey: false});

const ZoneJobs = module.exports = mongoose.model('zoneJobs', zoneJobsSchema);
