var fs = require('fs')
  , Payload = require('../index.js')
  , T = module.exports
;

T['object construction'] = function(test) {
    var pl1 = new Payload()
      , pl2 = Payload()
    ;

    test.expect(2);

    test.strictEqual( pl1.prototype , pl2.prototype );
    test.notEqual( pl1, pl2 );

    test.done();
}

T['writable'] = {
    'finding errors' : function(test) {
        // "minimal" valid doc: '{"node":{"1":[{"value":10,"type":"type"}]}}'
        var docs = [
            [ 'no type'             , '{"node":{"1234567890":[{"value":10}]}}' ] ,
            [ 'no value'            , '{"node":{"1234567890":[{"type":"type"}]}}' ] ,
            [ 'empty value tuple'   , '{"node":{"1234567890":[{}]}}' ] ,
            [ 'invalid value tuple' , '{"node":{"1234567890":[42]}}' ] ,
            [ 'empty dataset'       , '{"node":{"1234567890":[]}}' ] ,
            [ 'invalid dataset'     , '{"node":{"1234567890":42}}' ] ,
            [ 'empty datasets'      , '{"node":{}}' ] ,
            [ 'invalid datasets'    , '{"node":"42"}' ] ,
            [ 'invalid doc'         , '23' ] ,
            [ 'empty doc'           , '{}' ]
        ];

        test.expect( docs.length );

        var counter = 0;
        docs.forEach(function(d){
            var msg = d[0]
              , doc = d[1]
              , payload = new Payload()
            ;

            payload.on('finish', function(){
                counter += 1;
                if (counter >= docs.length)
                  test.done();
            });
            payload.on('error', function(e){
                test.ok(msg + ' ' + doc);
            });
            payload.end(doc);
        });
    }

  , 'pipe' : function(test) {
        var file = __dirname + '/test_files/ok_simple.json'
          , rs = fs.createReadStream(file)
          , payload = new Payload()
          , file_content = require(file)
        ;

        test.expect(1);

        payload.on('error', function(err){
            test.ok(false, 'must not emit error');
        });

        payload.on('parsed', function(doc){
            test.deepEqual( doc , file_content );
            test.done();
        });

        rs.pipe(payload);
    }

  , 'multiple docs gives an error' : function(test){
        var payload = new Payload();
        var content = fs.readFileSync(__dirname + '/test_files/ok_simple.json');

        test.expect(1);

        payload.on('error', test.ok.bind(test));
        payload.on('finish', test.done.bind(test));

        payload.on('parsed', function(doc){
            test.ok(false, 'must not emit "parsed"');
        });

        payload.write(content);
        payload.end(content);
    }

  , 'valid doc emits "parsed"' : function(test){
        var payload = new Payload();

        test.expect(1);

        payload.on('error', function(){
            test.ok(false, '"error" must not be emitted');
        });
        payload.on('parsed', test.ok.bind(test));
        payload.on('finish', test.done.bind(test));

        payload.end(fs.readFileSync(__dirname + '/test_files/ok_simple.json'));
    }

  , 'invalid doc does not emit "parsed"' : function(test){
        var payload = new Payload();

        test.expect(1);

        payload.on('error', test.ok.bind(test));
        payload.on('parsed', function(){
            test.ok(false, '"parsed" must not be emitted');
        });
        payload.on('finish', test.done.bind(test));

        payload.end('{}');
    }
};

T['readable'] = {
    'streams simple upload' : function(test){
        var payload = new Payload();

        var node_name = 'test node '.concat( Math.random(100, 1000) )
          , ts = parseInt( (new Date()).getTime()/1000 )
          , m = { 'type' : 'temperature' , 'value' : Math.random(0, 100) }
          , doc_expected = {}
          , raw = new Buffer(0)
        ;

        doc_expected[ node_name ] = {};
        doc_expected[ node_name ][ ts ] = [ m ];

        test.expect(2);

        payload.on('error', function(err){
            test.ok(false, 'must not emit "error"');
        });
        payload.on('data', function(chunk){
            raw = Buffer.concat([raw, chunk]);
        });

        payload.on('end', function(){
            test.ok(true, 'must emit "end"');
            test.deepEqual(doc_expected, JSON.parse(raw.toString()) );
            test.done();
        });

        payload.endUpload(node_name, ts, m);
    }

  , 'error on invalid payload' : function(test){
        var payload = new Payload();

        test.expect(1);

        payload.on('error', function(err){
            test.ok(err, 'must emit "error"');
            test.done();
        });

        payload.on('parsed', function(doc){
            test.ok(false, 'must not emit "parsed"');
        });

        payload.on('end', function(){
            test.ok(false, 'must not emit "end"'); 
        });

        payload.endUpload('test node', 'invalid', 'also invalid');        
    }

  , 'build new payload with multiple nodes and uploads' : function(test){
        var doc_expected = {
            'node 1' : {
                '1234567890' : [
                    { type: 'temperature' , value: 1 }
                  , { type: 'temperature' , value: 2 , id : 'second temp' }
                ]
              , '1234567891' : [
                    { type: 'temperature' , value: 1 }
                  , { type: 'humidity' , value: 50 }
                  , { type: 'humidity' , value: 0 , id : 'second hum' }
                ]
            }
          , 'node 2' : {
                '1212121212' : [
                    { type: 'temperature' , value: 1 }
                  , { type: 'humidity' , value: 50 }
                  , { type: 'humidity' , value: 0 , id : 'second hum' }
                  , { type: 'temperature' , value: 1 }
                  , { type: 'humidity' , value: 50 }
                  , { type: 'humidity' , value: 0 , id : 'second hum' }
                ]
              , '2323232323' : [
                    { type: 'temperature' , value: 1 }
                  , { type: 'humidity' , value: 50 }
                  , { type: 'humidity' , value: 0 , id : 'second hum' }
                  , { type: 'temperature' , value: 1 }
                  , { type: 'humidity' , value: 50 }
                  , { type: 'humidity' , value: 0 , id : 'second hum' }
                ]
            }
        };

        var payload = new Payload();
        var raw = new Buffer(0);

        test.expect(2);

        payload.on('error', function(err){
            test.ok(false, 'must not emit "error"');
        });

        payload.on('data', function(chunk){
            raw = Buffer.concat([raw, chunk]);
        });

        payload.on('end', function(){
            test.ok(true, 'must emit "end"');
            test.deepEqual(doc_expected, JSON.parse(raw.toString()));
            test.done();
        });

        pushWholeDoc(doc_expected, payload);
    }
}

T['pipe in & out'] = function(test) {
    var reader = new Payload();
    var writer = new Payload();

    test.expect(2);

    var fin_count = 0;
    var done = function(){
        fin_count += 1;
        if (fin_count === 2)
            test.done();
    }

    var doc = {
        'test node' : {
            '1234567890' : [
                { type : 'temperature' , value : -3.14e-10 }
            ]
        }
    };

    pushWholeDoc(doc, writer);

    reader.on('parsed', test.deepEqual.bind(test, doc));
    writer.on('parsed', test.deepEqual.bind(test, doc));

    writer.on('finish', done);
    reader.on('finish', done);

    writer.pipe(reader).pipe(writer);
}


function pushWholeDoc(doc, payload) {
    Object.keys(doc).forEach(function(node){
        var datasets = doc[node];
        Object.keys(datasets).forEach(function(ts){
            var dataset = datasets[ts];
            dataset.forEach(function(m){
                payload.addUpload(node, ts, m);
            });
        });
    });
    payload.endUpload();
}

