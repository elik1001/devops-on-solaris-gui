var winston = require('winston');
const { format } = require('winston');
// const { createLogger, format, transports } = require('winston');
var expressWinston = require('express-winston');
// expressWinston.emitErrs = true;
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const DailyRotateFile = require('winston-daily-rotate-file');
const cls = require('cls-hooked');
const ns = cls.getNamespace('logger');
const store = cls.createNamespace('logger');
const {
  withId,
  getId
} = require('../middleware/correlationIdBinder');

/*
const getNamespace = require('cls-hooked').getNamespace;
const loggerNamespace = getNamespace('logger');

const myFormat = format.printf(({}) => {
  const correlationId = gns.get('correlationId');
  return correlationId;
});

const myFormat = format((correlation) => {
  if (correlationId) {
    correlation = correlationId;
  } else {
    correlation = 'Uknon-ID';
  }

  return correlation;
});
*/
const addCorrelationId = winston.format((info) => {


  //const correlationId = getId();
  const correlationId = store.get('correlationId') || uuidv4();
  if (correlationId) {

    info.correlationId = correlationId;
  } else {
    
    info.correlationId = 'Uknon-ID';
  }

	return info;

});

const {
  getSystemProp
} = require('../middleware/systemProperties');
const {
  isDefined
} = require('../middleware/verifyToken');

// exclude authorization Headers
const redacted = '[REDACTED]'

function customRequestFilter(req, propName) {

  if (propName === 'headers') {
    return
    _.chain(req)
      .get(propName)
      .cloneDeep()
      .set('cookie', redacted)
      .set('authorization', redacted)
      .value()
  }
  return req[propName]
}

// Create loggers
const expressLogger = expressWinston.logger({
  statusLevels: false,
  level: function(req, res) {
    let level = "";
    if (res.statusCode >= 100) {
      level = "info";
    }
    if (res.statusCode >= 400) {
      level = "warn";
    }
    if (res.statusCode >= 500) {
      level = "error";
    }
    /*
    // Hacking attempts to make Unauthorized and Forbidden critical
    if (res.statusCode == 401 || res.statusCode == 403) {
      level = "debug";
    }*/
    return level;
  },
  requestFilter: customRequestFilter,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.prettyPrint(),
    winston.format.json(),
    winston.format.splat(),
    addCorrelationId()
    //myFormat
  ),
  exitOnError: false,
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      name: 'express-exceptions',
      datePattern: 'MM-DD-YYYY',
      zippedArchive: true,
      // maxSize: '104857600',
      maxSize: '100m',
      maxFiles: '7',
      dirname: 'logs',
      filename: 'express-exceptions-%DATE%.log',
      auditFile: '.express-exceptions-audit.json',
      correlationId: addCorrelationId(),
    })
  ],
  transports: [
    new winston.transports.DailyRotateFile({
      name: 'express-debug',
      datePattern: 'MM-DD-YYYY',
      zippedArchive: true,
      maxSize: '100m',
      maxFiles: '7',
      level: 'debug',
      dirname: 'logs',
      filename: 'express-debug-%DATE%.log',
      auditFile: '.express-debug-audit.json',
      correlationId: addCorrelationId(),
    }),
    new winston.transports.DailyRotateFile({
      name: 'express-error',
      datePattern: 'MM-DD-YYYY',
      zippedArchive: true,
      maxSize: '100m',
      maxFiles: '7',
      level: 'error',
      dirname: 'logs',
      filename: 'express-error-%DATE%.log',
      auditFile: '.express-error-audit.json',
      correlationId: addCorrelationId(),
    }),
    new winston.transports.DailyRotateFile({
      name: 'express-info',
      datePattern: 'MM-DD-YYYY',
      zippedArchive: true,
      maxSize: '100m',
      maxFiles: '1k',
      level: 'info',
      dirname: 'logs',
      filename: 'express-info-%DATE%.log',
      auditFile: '.express-info-audit.json',
      correlationId: addCorrelationId(),
    }),
    new winston.transports.DailyRotateFile({
      name: 'express-warn',
      datePattern: 'MM-DD-YYYY',
      zippedArchive: true,
      maxSize: '100m',
      maxFiles: '7',
      dirname: 'logs',
      level: 'warn',
      filename: 'express-warn-%DATE%.log',
      auditFile: '.express-warn-audit.json',
      correlationId: addCorrelationId(),
    }),
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      handleExceptions: true,
      prettyPrint: true,
      humanReadableUnhandledException: false,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.align(),
        winston.format.colorize(),
        winston.format.splat(),
        winston.format.simple(),
        addCorrelationId()
      ),
      timestamp: new Date(),
    }),
  ]
});

// Create loggers
const expressErrorLogger = expressWinston.errorLogger({
  requestFilter: customRequestFilter,
  statusLevels: false,
  level: function(req, res) {
    let level = "";
    if (res.statusCode >= 100) {
      level = "info";
    }
    if (res.statusCode >= 400) {
      level = "warn";
    }
    if (res.statusCode >= 500) {
      level = "error";
    }
    /*
    // Hacking attempts to make Unauthorized and Forbidden critical
    if (res.statusCode == 401 || res.statusCode == 403) {
      level = "debug";
    }*/
    return level;
  },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.prettyPrint(),
    winston.format.json(),
    winston.format.splat(),
    addCorrelationId()
  ),
  exitOnError: false,
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      name: 'express-err-exceptions',
      datePattern: 'MM-DD-YYYY',
      zippedArchive: true,
      maxSize: '100m',
      maxFiles: '7',
      dirname: 'logs',
      filename: 'express-error-exceptions-%DATE%.log',
      auditFile: '.express-error-exceptions-audit.json',
      correlationId: addCorrelationId(),
    })
  ],
  transports: [
    new winston.transports.DailyRotateFile({
      name: 'express-err-error',
      datePattern: 'MM-DD-YYYY',
      zippedArchive: true,
      maxSize: '100m',
      maxFiles: '1k',
      level: 'error',
      dirname: 'logs',
      filename: 'express-err-error-%DATE%.log',
      auditFile: '.express-err-error-audit.json',
      correlationId: addCorrelationId(),
    }),
    new winston.transports.DailyRotateFile({
      name: 'express-err-info',
      datePattern: 'MM-DD-YYYY',
      zippedArchive: true,
      maxSize: '100m',
      maxFiles: '1k',
      level: 'info',
      dirname: 'logs',
      filename: 'express-err-info-%DATE%.log',
      auditFile: '.express-err-info-audit.json',
    }),
    new winston.transports.DailyRotateFile({
      name: 'express-err-warn',
      datePattern: 'MM-DD-YYYY',
      zippedArchive: true,
      maxSize: '100m',
      maxFiles: '7',
      dirname: 'logs',
      level: 'warn',
      filename: 'express-err-warn-%DATE%.log',
      auditFile: '.express-err-warn-audit.json',
      correlationId: addCorrelationId(),
    }),
    new winston.transports.DailyRotateFile({
      name: 'express-err-debug',
      datePattern: 'MM-DD-YYYY',
      zippedArchive: true,
      maxSize: '100m',
      maxFiles: '7',
      dirname: 'logs',
      level: 'debug',
      filename: 'express-err-debug-%DATE%.log',
      auditFile: '.express-err-debug-audit.json',
      correlationId: addCorrelationId(),
    }),
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      handleExceptions: true,
      prettyPrint: true,
      humanReadableUnhandledException: false,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.align(),
        winston.format.colorize(),
        winston.format.splat(),
        winston.format.simple(),
        addCorrelationId()
      ),
      timestamp: new Date(),
    }),
  ]
});

// additional expressWinston settings
expressWinston.requestWhitelist.push('params', 'body', 'res.json');
expressWinston.responseWhitelist.push('body');
expressWinston.bodyBlacklist.push('password', 'token');

module.exports = {
  expressLogger,
  expressErrorLogger
}
