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

    stream.Duplex.call(this, opts);

    this._ = {
        raw : ''
      , doc : undefined
      , readable : false
    };

    this.on('finish', parse);

    // give it a kick whenever the source is readable
    // read(0) will not consume any bytes
    this.on('parsed', this.read.bind(this, 0));

    return this;
}
Payload.prototype = Object.create( stream.Duplex.prototype, {
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
 * Readable Stream implementation
 */
Payload.prototype._read = function(size) {
    if (! this._.readable) {
        return this.push('');
    } else {
        this.push( JSON.stringify(this._.doc) );
        return this.push(null);
    }
};


/**
 * Public Methods
 */
Payload.prototype.endUpload = function() {
    this.addUpload.apply(this, arguments);
    return checkDoc.call(this);
};

Payload.prototype.addUpload = function(node, ts, m, replace) {
    if (arguments.length < 3)
        return;

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

    this._.readable = true;    
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

