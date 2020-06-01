const Agenda = require('agenda');
const connectionString = 'mongodb://localhost:27017/unixdevops';
const logger = require(__dirname + '/../utils/winstonLogger');

// Create Job queue for new Zone creation
const agenda2 = new Agenda({
  db: {
    address: connectionString,
    collection: 'creatZones'
  },
  // How often to look for new job
  processEvery: '1 seconds'
});

/*
// run jobs in wating in queue
agenda2.define('creatZonesJobs', (job, done) => {
  //addJobToQueue(job.attrs.data);
  createZoneSwitch(job.attrs.data);
  done();
});*/

// define queue options
agenda2.on('success', job => {
  logger.info(`Job complted success ${job.attrs.data.zoneName}`);
  try {
    job.remove();
    logger.info('Successfully removed job from collection');
  } catch (e) {
    logger.error('Error removing job from collection');
  }
});

// create new zone found in jobs queue
(async function() {
  await agenda2.start();

})()

/* run jobs latter
function addJobToQueue(id) {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      logger.debug(id);
      createZoneSwitch(id);
    }, 5000);
  });
}
*/

module.exports = {
  agenda2
}
