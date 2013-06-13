var stream = require('stream')
  , schema = require('./dustmap-upload-schema.json')
  , JaySchema = new (require('jayschema'))();
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

    this.on('finish', parseOnFinish);
}
Payload.prototype = Object.create( stream.Writable.prototype, {
    constructor: { value: Payload }
});


/**
 * Stream implementation
 */
Payload.prototype._write = function(chunk, enc, cb) {
    appendRaw.call(this, chunk, enc);
    cb();
}


/**
 * Public Methods
 */
Payload.prototype.getDoc = function() {
    return this._.doc;
}

Payload.prototype.getNodes = function() {
    return Object.keys(this._.doc);
}


/**
 * Private Methods and Helper
 */
function parseOnFinish() {
    try {
        this._.doc = JSON.parse( this._.raw );
    } catch (err) {
        return this.emit('error', err);
    }

    /*
     * JSON Schema validation
     */
    var errors = JaySchema.validate(this._.doc, schema);
    if (errors.length)
      return this.emit('error', new Error('Schema validation Error'), errors);

    /*
     * More validation checks ... ?
     */
    // TODO ...
    
    this.emit('parsed', this.getDoc());

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
