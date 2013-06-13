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
        payload.on('error', function(e, r){
            test.ok(e instanceof Error, msg + ' ' + doc);
        });
        payload.end(doc);
    });
}

T['pipe'] = function(test) {
    var file = './test_files/ok_simple.json'
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
    var content = fs.readFileSync('./test_files/ok_simple.json');

    test.expect(1);

    payload.on('error', function(err){
        test.ok(err instanceof Error);
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

    payload.end(fs.readFileSync('./test_files/ok_simple.json'));
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