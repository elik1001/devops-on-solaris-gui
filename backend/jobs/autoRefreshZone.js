const Agenda = require('agenda');
const connectionString = 'mongodb://localhost:27017/unixdevops';
const logger = require(__dirname + '/../utils/winstonLogger');

// Create Job queue for new Zone creation
const agenda3 = new Agenda({
  db: {
    address: connectionString,
    collection: 'creatZones'
  },
  // How often to look for new job
  processEvery: '1 seconds'
});

// define queue options
agenda3.on('success', job => {
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
  await agenda3.start();

})()

module.exports = {
  agenda3
}
