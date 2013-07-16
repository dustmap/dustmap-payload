var stream = require('stream')
  , schema = require('./dustmap-upload-schema.json')
  , JaySchema = new (require('jayschema'))()
;

module.exports = Payload;

/**
 * Constructor & Inheritance
 */
function Payload(opts) {
    if (!(this instanceof Payload)) {
        return new Payload(opts);
    }

    stream.Writable.call(this, opts);

    this._ = {
        raw : ''
      , doc : undefined
    };

    this.on('finish', parse);
}
Payload.prototype = Object.create( stream.Writable.prototype, {
    constructor: { value: Payload }
});


/**
 * Writable Stream implementation
 */
Payload.prototype._write = function(chunk, enc, cb) {
    appendRaw.call(this, chunk, enc);
    cb();
};


/**
 * Public Methods
 */
Payload.prototype.getDoc = function(cb) {
    var self = this;
 
    self.on('parsed', function(doc){
        return cb(null, doc);
    });

    self.on('error', function(err){
        return cb(err);
    });

    checkDoc.call(self);
};

Payload.prototype.clear = function() {
    this._.doc = undefined;
};

Payload.prototype.addUpload = function(node, ts, m, replace) {
    if (this._.doc === undefined)
        this._.doc = {};

    var D = this._.doc;

    if (! D.hasOwnProperty(node))
        D[node] = {};

    if (! D[node].hasOwnProperty(ts) || replace)
        D[node][ts] = [];

    ( Array.isArray(m) ? m : [m] ).forEach(function(x){
        D[node][ts].push(x);
    });
};


/**
 * Private Methods and Helper
 */
function parse() {
    try {
        this._.doc = JSON.parse( this._.raw );
    } catch (err) {
        return this.emit('error', err);
    }

    return checkDoc.call(this);
}

function checkDoc() {
    /*
     * JSON Schema validation
     */
    var errors = JaySchema.validate(this._.doc, schema);
    if (errors.length)
      return this.emit('error', errors);

    /*
     * More validation checks ... ?
     */
    // TODO ...
    
    this.emit('parsed', this._.doc);

    return this;    
}

function appendRaw(chunk, enc) {
    var isBuffer = Buffer.isBuffer(chunk);

    if (isBuffer) {
        this._.raw += chunk.toString();
    } else {
        throw new Error(
            util.format('got string "%s" and encoding "%s" ... what should i do?', chunk, enc)
        );
    }
}

