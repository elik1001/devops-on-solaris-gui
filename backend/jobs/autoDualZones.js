const Agenda = require('agenda');
const connectionString = 'mongodb://localhost:27017/unixdevops';
const logger = require(__dirname + '/../utils/winstonLogger');

// Create Job queue for new Zone creation
const agenda4 = new Agenda({
  db: {
    address: connectionString,
    collection: 'creatDualZones'
  },
  // How often to look for new job
  processEvery: '1 seconds'
});

// define queue options
agenda4.on('success', job => {
  logger.info(`Job complted success ${job.attrs.data.zoneName}`);
  try {
    job.remove();
    logger.info('Successfully removed job from collection');
  } catch (e) {
    logger.error('Error removing job from collection');
  }
});

const maxRetries = 3;

agenda4.on('fail', (err, job) => {
  console.log(`Job failed with error: ${err.message}`);
  /* The below can re-run a faild job
  const retryCount = job.attrs.failCount - 1;
  if (retryCount <= maxRetries) {
        // job.attrs.nextRunAt = calcExponentialBackoff(retryCount);
        job.attrs.nextRunAt = new Date();
        job.save();
    }*/
});

// create new zone found in jobs queue
(async function() {
  await agenda4.start();
})()

module.exports = {
  agenda4
}
