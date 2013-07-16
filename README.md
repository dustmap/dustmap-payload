# dustmap-payload


This module includes two central parts of the dustmap project

  1. the JSON schema for a dustmap (upload) payload
  1. an implementation of a duplex stream(2) for node.js - to help both sending and receiving data

## JSON Schema

The [JSON Schema] can be found [here][dm-schema] and can be used with any schema validator which can handle [draft-04 schemas][schema-draft-4].

## Implementation

### Writable Stream

For example when using [express] to handle data uploads, you can use this module as follows:

```javascript
var Payload = require('dustmap-payload');

app.post('/upload', function(req, res){
    var payload = new Payload();

    payload.on('error', res.send.bind(res, 400));

    payload.on('parsed', function(upload){
        // ... "upload" is now a javascript object which can be saved to the DB or whatever ...
        db.save(upload, function(err, done){
             if (!err)
                 res.send(201);
        });
    });

    req.pipe(payload);
});
```

When all writes to the `payload` are done, it starts to parse and validate the data.
In case there is some sort of error it emit the `error` event. If there are no errors the
`parsed` Event gets emitted with the parsed/validated dosument as an argument.

### Readable Stream

For usage as a helper to push the upload to the server you can use the module this way:

```javascript
var request = require('request');
var Payload = require('dustmap-payload');

var payload = new Payload();
var ts = parseInt( Date.now() / 1000 , 10 );

payload.pipe( request.post('http://some.where/upload') );

payload.addUpload('node 1', ts, [
    { type : 'temperature' , value : 13 }
  , { type : 'humidity' , value : 75 }
]);
payload.endUpload('node 2', ts, { type : 'humidity' , value : 50 });
```

You can add uploads/measurements to the payload by either `addUpload` or `endUpload`

#### `addUpload(node_id, ts, measurement, replace)`

Adds one (single `object`) or multiple (`array` of `object`s) `measurement`s to the payloads,
belonging to the dustmap node identified be `node_id` and for the time `ts`. All given `measurement`s
for the specified `node_id` and the timestamp `ts` get appended; unless `replace` is true, then any
former added `measurement`s get replaced.

#### `endUpload(...)`

Takes the same arguments as `addUpload(...)` and does the same and more:

 * validates the added data
 * pushes data out to any connected readers

In case of a validation error it again emits an `error` event.



[JSON Schema]: http://json-schema.org/
[dm-schema]: https://raw.github.com/dustmap/dustmap-payload/master/dustmap-upload-schema.json
[schema-draft-4]: https://tools.ietf.org/html/draft-zyp-json-schema-04
[express]: http://expressjs.com/



