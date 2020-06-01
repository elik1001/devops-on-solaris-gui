var winston = require('winston');
const { createLogger, format, transports } = require('winston');
// winston.emitErrs = true;
const dotenv = require('dotenv')

const DailyRotateFile = require('winston-daily-rotate-file');
const { v4: uuidv4 } = require('uuid');
const cls = require('cls-hooked');

const ns = cls.getNamespace('logger');

const store = cls.createNamespace('logger');
//const correlationId = ns.get('correlationId');
const {
  withId,
  getId
} = require('../middleware/correlationIdBinder');

const addCorrelationId = winston.format((info) => {

  //const correlationId = getId();
  const correlationId = ns.get('correlationId') || uuidv4();
  if (correlationId) {

    info.correlationId = correlationId;
  } else {

    info.correlationId = 'Uknon-ID';
  }	

	return info;

});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.prettyPrint(),
    winston.format.json(),
    winston.format.splat(),
    //addCorrelationId()
  ),
  exitOnError: false,
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      name: 'error',
      datePattern: 'MM-DD-YYYY',
      zippedArchive: true,
      //maxSize: '104857600',
      maxSize: '100m',
      maxFiles: '7',
      dirname: 'logs',
      filename: 'exceptions-%DATE%.log',
      auditFile: '.exceptions-audit.json',
      correlationId: addCorrelationId(),
    })
  ],
  transports: [
    new winston.transports.DailyRotateFile({
      name: 'error',
      datePattern: 'MM-DD-YYYY',
      zippedArchive: true,
      maxSize: '100m',
      maxFiles: '7',
      level: 'error',
      dirname: 'logs',
      filename: __dirname + '/../logs/error-%DATE%.log',
      auditFile: __dirname + '/../logs/.error-audit.json',
      correlationId: addCorrelationId(),
    }),
    new winston.transports.DailyRotateFile({
      name: 'info',
      datePattern: 'MM-DD-YYYY',
      zippedArchive: true,
      maxSize: '100m',
      maxFiles: '1k',
      level: 'info',
      dirname: 'logs',
      filename: __dirname + '/../logs/info-%DATE%.log',
      auditFile: __dirname + '/../logs/.info-audit.json',
      correlationId: addCorrelationId(),
    }),
    new winston.transports.DailyRotateFile({
      name: 'debug',
      datePattern: 'MM-DD-YYYY',
      zippedArchive: true,
      maxSize: '100m',
      maxFiles: '7',
      dirname: 'logs',
      filename: 'debug-%DATE%.log',
      auditFile: '.debug-audit.json',
      correlationId: addCorrelationId(),
    }),
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.align(),
      winston.format.colorize(),
      winston.format.splat(),
      winston.format.simple(),
      addCorrelationId()
    )
  }));
}

module.exports = logger;
