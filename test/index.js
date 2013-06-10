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

    payload.on('finish', function(){
        test.deepEqual( payload.getDoc() , file_content );
        test.done();
    });

    rs.pipe(payload);
}

T['write after end gives an error'] = function(test){
    var file = './test_files/ok_simple.json'
      , rs = fs.createReadStream(file)
      , payload = new Payload()
    ;

    rs.pipe(payload);

    rs.on('end', function(){
        test.throws(function(){
            payload.write('just a test');
        });

        test.done();
    });
}

T['multiple docs gives an error'] = function(test){
    var payload = new Payload();

    // payload.write('{"node":{"1":[{"value":10,"type":"type"}]}}');
    // payload.end('{"node":{"1":[{"value":10,"type":"type"}]}}');

    test.expect(1);

    payload.on('error', function(err){
        test.ok(err instanceof Error);
        test.done();
    });

    payload.write('{}');
    payload.end('{}');


}