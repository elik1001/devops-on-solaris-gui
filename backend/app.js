var fs = require('fs');
var http = require('http');
var https = require('https');

require('dotenv').config({path: __dirname + '/../env.env' });

var express = require('express');
var cors = require('cors');
var mongoose = require('mongoose');
var winston = require('winston');
// const { createLogger, format, transports } = require('winston');

var privateKey = fs.readFileSync(__dirname + '/sslcert/dc2-confmgr1.key', 'utf8');
var certificate = fs.readFileSync(__dirname + '/sslcert/dc2-confmgr1.crt', 'utf8');
var credentials = {
  key: privateKey,
  cert: certificate
};

var app = express();

// correlator id
const cls = require('cls-hooked');
//const ns = cls.createNamespace('logger');

//const correlationIdBinder = require('./middleware/correlationIdBinder');
//const correlator = require('./middleware/correlationIdBinder');
const {
  withId,
  getId
} = require('./middleware/correlationIdBinder');


//app.use(correlationIdBinder(ns));
app.use(withId());

const {
  getSystemProp
} = require('./middleware/systemProperties');
const {
  isDefined
} = require('./middleware/verifyToken');

// winston loggers
const logger = require('./utils/winstonLogger');
const {
  expressLogger,
  expressErrorLogger
} = require('./utils/expressWinstonLogger');

//const gns = cls.getNamespace('logger');
//const correlationId = gns.get('correlationId');

// env settings
const node_env = process.env.NODE_ENV || 'development'
const port = process.env.PORT || 3000;
const db_port = process.env.DB_PORT || 27017;

// expressWinston logger
app.use(expressLogger);

const route = require('./route/routes');

mongoose.connect('mongodb://localhost:' + db_port + '/unixdevops', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
  })
  .catch(error => {
    logger.error(error);
  });

mongoose.connection.on('connected', () => {
  logger.info('Mongodb connected');
});

mongoose.connection.on('Error', (error) => {
  logger.error(error);
});

app.use(cors());

// parse application/x-www-form-urlencoded
app.use(express.urlencoded({
  extended: true
}));

// Error handling for bad json data
app.use((req, res, next) => {
  express.json()(req, res, err => {
    if (err) {
      logger.debug(err);
      return res.sendStatus(400);
    }
    next();
  });
});

app.use(express.json());

app.use('/api', route);

// expressWinston errorLogger
app.use(expressErrorLogger);

// Set log level for logger to db setting
(async () => {
  await getSystemProp().then(value => {
    let winstonLogLevel = isDefined('winstonLogLevel', value, 'info');
    logger.level = winstonLogLevel;
  });
})();

// start server
if (node_env === "production") {
  var server = https.createServer(credentials, app);
  server.listen(port, () => {
    logger.info('server started on port: ' + port);
  });
} else {
  app.listen(port, () => {
    logger.info('server started on port: ' + port);
    // console.log();
        
  });
}
