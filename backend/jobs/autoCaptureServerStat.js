const Agenda = require('agenda');
const connectionString = 'mongodb://localhost:27017/unixdevops';

const {
  updateAllDbZoneStats
} = require('../controllers/zones');

const agenda1 = new Agenda({
  db: {
    address: connectionString,
    collection: 'jobCpuStatsSchedule'
  },
  processEvery: '30 seconds'
});

agenda1.define('captureZoneCPUMmeStats', (job, done) => {
  updateAllDbZoneStats();
  done();
});

// capture Devops Server CPU, Mme Stats.
(async function() {
  await agenda1.start();

  await agenda1.every('30 seconds', 'captureZoneCPUMmeStats');
  //await agenda1.every('120 seconds', 'captureZoneCPUMmeStats');
})();
