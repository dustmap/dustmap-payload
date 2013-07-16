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

T['finding errors'] = function(test) {
    // "minimal" valid doc: '{"node":{"1":[{"value":10,"type":"type"}]}}'
    var docs = [
        [ 'no type'             , '{"node":{"1234567890":[{"value":10}]}}'     ] ,
        [ 'no value'            , '{"node":{"1234567890":[{"type":"type"}]}}'  ] ,
        [ 'empty value tuple'   , '{"node":{"1234567890":[{}]}}'               ] ,
        [ 'invalid value tuple' , '{"node":{"1234567890":[42]}}'               ] ,
        [ 'empty dataset'       , '{"node":{"1234567890":[]}}'                 ] ,
        [ 'invalid dataset'     , '{"node":{"1234567890":42}}'                 ] ,
        [ 'empty datasets'      , '{"node":{}}'                       ] ,
        [ 'invalid datasets'    , '{"node":"42"}'                     ] ,
        [ 'invalid doc'         , '23'                                ] ,
        [ 'empty doc'           , '{}'                                ]
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

T['pipe'] = function(test) {
    var file = __dirname + '/test_files/ok_simple.json'
      , rs = fs.createReadStream(file)
      , payload = new Payload()
      , file_content = require(file)
    ;

    test.expect(1);

    payload.on('parsed', function(doc){
        test.deepEqual( doc , file_content );
        test.done();
    });

    rs.pipe(payload);
}

T['multiple docs gives an error'] = function(test){
    var payload = new Payload();
    var content = fs.readFileSync(__dirname + '/test_files/ok_simple.json');

    test.expect(1);

    payload.on('error', function(err){
        test.ok(err);
        test.done();
    });

    payload.write(content);
    payload.end(content);
}

T['valid doc emits "parsed"'] = function(test){
    var payload = new Payload();

    test.expect(1);

    payload.on('error', function(){
        test.ok(false, '"error" must not be emitted');
    });
    payload.on('parsed', function(){
        test.ok(true);
    });
    payload.on('finish', function(){
        test.done();
    });

    payload.end(fs.readFileSync(__dirname + '/test_files/ok_simple.json'));
}

T['invalid doc does not emit "parsed"'] = function(test){
    var payload = new Payload();

    test.expect(1);

    payload.on('error', function(){
        test.ok(true);
    });
    payload.on('parsed', function(){
        test.ok(false, '"parsed" must not be emitted');
    });
    payload.on('finish', function(){
        test.done();
    });

    payload.end('{}');
}

T['build new valid payload'] = function(test){
    var payload = new Payload();

    var node_name = 'test node '.concat( Math.random(100, 1000) )
      , ts = parseInt( (new Date()).getTime()/1000 )
      , m = { 'type' : 'temperature' , 'value' : Math.random(0, 100) }
      , doc_expected = {};
    ;

    doc_expected[ node_name ] = {};
    doc_expected[ node_name ][ ts ] = [ m ];

    payload.addUpload(node_name, ts, m);

    test.expect(2);

    payload.on('error', function(err){
        test.ok(false, 'should not emit error');
    });

    payload.on('parsed', function(doc){
        test.ok(doc, 'should emit parsed');
    });

    payload.getDoc(function(err, doc){
        if (err)
            test.ok(false, 'must not emit an error');

        test.deepEqual(doc, doc_expected);
        test.done();
    });
}

T['build new invalid payload'] = function(test){
    var payload = new Payload();

    payload.addUpload('test node', 'invalid');

    test.expect(2);

    payload.on('error', function(err){
        test.ok(err, 'should emit error');
    });

    payload.on('parsed', function(doc){
        test.ok(false, 'should not emit parsed');
    });

    payload.getDoc(function(err, doc){
        if (err)
            test.ok(err, 'should callback with error');
        test.done();
    });
}

T['build new payload with multiple nodes and uploads'] = function(test){
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

    payload.on('error', function(err){
        test.ok(false, 'must not emit an error');
    });

    payload.on('parsed', function(doc){
        test.ok(doc, 'must emit a parsed');
    });

    Object.keys(doc_expected).forEach(function(node){
        var datasets = doc_expected[node];
        Object.keys(datasets).forEach(function(ts){
            var dataset = datasets[ts];
            dataset.forEach(function(m){
                payload.addUpload(node, ts, m);
            });
        });
    });

    payload.getDoc(function(err, doc){
        if (err)
            test.ok(false, 'must not callback with error');
        test.deepEqual(doc, doc_expected);
        test.done();
    });

}