var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var cpuStatsSchema = new Schema({
  server: {type: 'String', required: true},
  cpu_avg1m: {type: 'Number', required: true},
  cpu_avg5m: {type: 'Number', required: true},
  cpu_avg15m: {type: 'Number', required: true},
  mem_free: {type: 'Number', required: false},
  mem_total: {type: 'Number', required: false},
  zoneCount: {type: 'Number', required: false},
},
{collection: 'cpuStats'},
{versionKey: false});

const CpuStats = module.exports = mongoose.model('cpuStats', cpuStatsSchema);
