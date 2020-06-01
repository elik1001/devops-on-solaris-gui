const { v4: uuidv4 } = require('uuid');
const cls = require('cls-hooked');

const store = cls.createNamespace('logger');


/*
module.exports = ns => {
    if (!ns) throw new Error('CLS namespace required');

    return function clsifyMiddleware(req, res, next) {
        ns.bindEmitter(req);
        ns.bindEmitter(res);

        ns.run(() => {
            const correlationId = uuidv4();            
            cls.getNamespace('logger').set('correlationId', correlationId);
            next();
        });
    };
};
*/

const CORRELATION_ID_KEY = 'logger';

//function withId(fn, id) {
function withId(fn, id) {

  return function clsifyMiddleware(req, res, next) {
      store.bindEmitter(req);
      store.bindEmitter(res);

    store.run(() => {
        const correlationId = (CORRELATION_ID_KEY, id || uuidv4());
        store.set('correlationId', correlationId);
        next();
    });

  }

}

function getId() {

    const correlationId = store.get('correlationId');
    if (store.get('correlationId')) {
    } else {
      withId();
      const correlationId = store.get('correlationId') || uuidv4();

    }
    return correlationId;

}

module.exports = {
    withId,
    getId,
    bindEmitter: store.bindEmitter.bind(store),
    bind: store.bind.bind(store),
};
