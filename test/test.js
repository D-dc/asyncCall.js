
var ServerRpc = require('./test-server.js'),
    Rpc = require('../public/rpc.js'),
    ClientRpc = require('../public/rpc_client.js'),
    assert = require("assert");


myClient = new ClientRpc('http://127.0.0.1:8123');

//TODO bidirectional tests

/*myClient.expose({
    'testClient': function(a) {
        console.log("testClient")
        return a * a;
    },
    'ping': function(ctr) {
        console.log("ping " + ctr);
        setTimeout(function() {
            myClient.call("pong", [ctr])
        }, 2000);
    }
});*/


// TESTS

describe('server RPC', function() {
    
    /* testFuncNoArgs */
    describe('testFuncNoArgs', function() {
        it('rpc should return true', function(done) {
            myClient.rpcCall('testFuncNoArgs', [], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, true);
                done();
            });
        });


        it('rpc should accept arguments', function(done) {
            myClient.rpcCall('testFuncNoArgs', [1, 2, 3], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, true);
                done();
            });
        });
    });


    /* testFuncSingleArg */
    describe('testFuncSingleArg', function() {
        var arg = 1;
        it('rpc should return the argument', function(done) {
            myClient.rpcCall('testFuncSingleArg', [arg], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, arg);
                done();
            });
        });

        it('rpc should accept no arguments', function(done) {
            myClient.rpcCall('testFuncSingleArg', [], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, undefined);
                done();
            });
        });

        it('rpc should ignore too many arguments', function(done) {
            myClient.rpcCall('testFuncSingleArg', [arg, 2], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, arg);
                done();
            });
        });

    });


    /* testFuncTwoArg */
    describe('testFuncTwoArg', function() {
        var arg1 = 'a';
        var arg2 = 'b';
        it('rpc should return the concat', function(done) {
            myClient.rpcCall('testFuncTwoArg', [arg1, arg2], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, (arg1 + arg2));
                done();
            });
        });

        var arg1 = 1;
        var arg2 = 2;
        it('rpc should return the sum', function(done) {
            myClient.rpcCall('testFuncTwoArg', [arg1, arg2], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, (arg1 + arg2));
                done();
            });
        });

        it('rpc should accept no arguments', function(done) {
            myClient.rpcCall('testFuncTwoArg', [], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, null);
                done();
            });
        });

        it('rpc should ignore too many arguments', function(done) {
            myClient.rpcCall('testFuncTwoArg', [arg1, arg2, arg2], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, (arg1 + arg2));
                done();
            });
        });
    });


    /* testFuncNoReturn*/
    describe('testFuncNoReturn', function() {
        var arg1 = 'a';
        var arg2 = 'b';
        it('rpc should accept no arguments', function(done) {
            myClient.rpcCall('testFuncNoReturn', [], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, undefined);
                done();
            });
        });

        it('rpc should accept 1 argument', function(done) {
            myClient.rpcCall('testFuncNoReturn', [arg1], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, undefined);
                done();
            });
        });

        it('rpc should accept 2 arguments', function(done) {
            myClient.rpcCall('testFuncNoReturn', [arg1, arg2], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, undefined);
                done();
            });
        });

    });


    /* testFuncSum*/
    describe('testFuncSum', function() {
        var arg1 = 1;
        var arg2 = 2;
        it('rpc should return sum', function(done) {
            myClient.rpcCall('testFuncSum', [arg1, arg2], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, arg1 + arg2);
                done();
            });
        });

        it('rpc should return sum', function(done) {
            myClient.rpcCall('testFuncSum', [arg1, arg1], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, arg1 + arg1);
                done();
            });
        });

        it('rpc should accept fewer arguments', function(done) {
            myClient.rpcCall('testFuncSum', [arg1], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, null);
                done();
            });
        });

        it('rpc should return sum', function(done) {
            myClient.rpcCall('testFuncSum', [null, arg1], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, arg1);
                done();
            });
        });

        it('rpc should return sum', function(done) {
            myClient.rpcCall('testFuncSum', [null, arg2], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, arg2);
                done();
            });
        });
    });


    /* testFuncIncrement */
    describe('testFuncIncrement', function() {
        var arg = 1;
        var arg2 = 100
        it('rpc should return incremented argument', function(done) {
            myClient.rpcCall('testFuncIncrement', [arg], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, arg + 1);
                done();
            });
        });

        it('rpc should return incremented argument', function(done) {
            myClient.rpcCall('testFuncIncrement', [arg2], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, arg2 + 1);
                done();
            });
        });

        it('rpc should ignore too many arguments', function(done) {
            myClient.rpcCall('testFuncIncrement', [arg, 2], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, arg + 1);
                done();
            });
        });
    });


    /* testExplicitException */
    describe('testExplicitException', function() {
        var arg = 1;

        it('rpc should have error argument in callback set', function(done) {
            myClient.rpcCall('testExplicitException', [], function(err, res) {
                assert.notEqual(err, null)
                assert.strictEqual(res, undefined);
                done();
            });
        });

        it('rpc should have error argument in callback set', function(done) {
            myClient.rpcCall('testExplicitException', [arg], function(err, res) {
                assert.notEqual(err, null)
                assert.strictEqual(res, undefined);
                done();
            });
        });
    });


    /* testImplicitException */
    describe('testImplicitException', function() {
        var arg = 'abc';

        it('rpc should not have callback error argument set', function(done) {
            myClient.rpcCall('testImplicitException', [arg], function(err, res) {
                assert.ifError(err);
                assert.strictEqual(res, 3);
                done();
            });
        });

        it('rpc should have error argument in callback set', function(done) {
            myClient.rpcCall('testImplicitException', [null], function(err, res) {
                assert.notEqual(err, null)
                assert.strictEqual(res, undefined);
                done();
            });
        });
    });


    /* test undefined function */
    describe('test undefined function', function() {
        it('rpc should have error argument set', function(done) {
            myClient.rpcCall('testFuncUndefined', [], function(err, res) {
                assert.notEqual(err, null)
                assert.strictEqual(res, undefined);
                done();
            });
        });


        it('rpc should have error argument set', function(done) {
            myClient.rpcCall('testFuncUndefined', [1, 2, 3], function(err, res) {
                assert.notEqual(err, null)
                assert.strictEqual(res, undefined);
                done();
            });
        });
    });

})