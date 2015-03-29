var express = require('express'),
    app = express(),
    serverHttp = require('http').createServer(app),
    ServerRpc = require('../lib/rpc-server.js'),
    ClientRpc = require('../lib/rpc-client.js'),
    port = 8123,
    assert = require("assert"),
    expect = require('chai').expect;

serverHttp.listen(port, function() {
    console.log('Server listening at port %d', port);
});
app.use("/", express.static(__dirname + '/'));

function simulateSlowComputation(millis) {
    var fixDate = new Date();
    var current = null;
    do {
        current = new Date();
    }
    while (current - fixDate < millis);
};

var g = 0;

var methods = {
    'testFuncNoArgs': function() {
        return true;
    },
    'testFuncSingleArg': function(a) {
        return a;
    },
    'testFuncTwoArg': function(a, b) {
        return a + b;
    },
    'testFuncArgumentsVar': function(a) {
        return Array.prototype.slice.call(arguments);
    },
    'testFuncNoReturn': function() {

    },
    'testFuncSum': function(a, b) {
        return a + b;
    },
    'testFuncIncrement': function(a) {
        a++;
        return a;
    },
    /* Exception testing */
    'testExplicitException': function() {
        throw new Error('Explicit exception!')
    },
    'testExplicitExceptionCustom': function() {
        throw 5;
    },
    'testImplicitException': function(b) {
        return b.length;
    },
    'testImplicitExceptionEvalError': function() {
        throw new EvalError('eval error message');
    },
    'testImplicitExceptionRangeError': function() {
        new Array(-5);
    },
    'testImplicitExceptionReferenceError': function() {
        var a = 5;
        return a + b;
    },
    'testImplicitExceptionSyntaxError': function() {
        eval("var a = *2;");
    },
    'testImplicitExceptionTypeError': function() {
        new 10;
    },
    'testImplicitExceptionURIError': function() {
        decodeURIComponent('%');
    },
    'testSlowComputation': function() {
        simulateSlowComputation(1000); //take some time to give reply
        return true;
    },
    'testProgVar': function() {
        g++;
        return g;
    }
};

var myServer = new ServerRpc(serverHttp, {throwNativeError:false});
myServer.expose(methods);

var myClient = new ClientRpc('http://127.0.0.1:8123', {throwNativeError:false});
myClient.expose({});

// TESTS



describe('RPC tests', function() {

    /* testFuncNoArgs */
    describe('testFuncNoArgs', function() {
        it('rpc should return true', function(done) {
            myClient.rpcCall('testFuncNoArgs', [], function(err, res) {
                console.log('AAAA' + err)
                expect(err).to.equal(null);
                expect(res).to.be.true;
                done();
            });
        });

        it('rpc should accept arguments', function(done) {
            myClient.rpcCall('testFuncNoArgs', [1, 2, 3], function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.be.true;
                done();
            });
        });
    });

    /* testFuncSingleArg */
    describe('testFuncSingleArg', function() {
        var arg = 1;
        it('rpc should return the argument', function(done) {
            myClient.rpcCall('testFuncSingleArg', [arg], function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(arg);
                done();
            });
        });

        it('rpc should accept no arguments', function(done) {
            myClient.rpcCall('testFuncSingleArg', [], function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(undefined);
                done();
            });
        });

        it('rpc should ignore too many arguments', function(done) {
            myClient.rpcCall('testFuncSingleArg', [arg, 2], function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(arg);
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
                expect(err).to.equal(null);
                expect(res).to.equal((arg1 + arg2));
                done();
            });
        });

        var arg1 = 1;
        var arg2 = 2;
        it('rpc should return the sum', function(done) {
            myClient.rpcCall('testFuncTwoArg', [arg1, arg2], function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal((arg1 + arg2));
                done();
            });
        });

        it('rpc should accept no arguments', function(done) {
            myClient.rpcCall('testFuncTwoArg', [], function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(null);
                done();
            });
        });

        it('rpc should ignore too many arguments', function(done) {
            myClient.rpcCall('testFuncTwoArg', [arg1, arg2, arg2], function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal((arg1 + arg2));
                done();
            });
        });
    });

    /* testFuncArgumentsVar*/
    describe('testFuncArgumentsVar', function() {
        it('function body should have access to excessive args using \'arguments\'', function(done) {
            var t = [1, 2, 3, 4];
            myClient.rpcCall('testFuncArgumentsVar', t, function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.eql(t);
                done();
            });
        });

        it('function body should have access to excessive args using \'arguments\'', function(done) {
            var t = [1, 'two', 3.0, 4];
            myClient.rpcCall('testFuncArgumentsVar', t, function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.eql(t);
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
                expect(err).to.equal(null);
                expect(res).to.equal(undefined);
                done();
            });
        });

        it('rpc should accept 1 argument', function(done) {
            myClient.rpcCall('testFuncNoReturn', [arg1], function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(undefined);
                done();
            });
        });

        it('rpc should accept 2 arguments', function(done) {
            myClient.rpcCall('testFuncNoReturn', [arg1, arg2], function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(undefined);
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
                expect(err).to.equal(null);
                expect(res).to.equal(arg1 + arg2);
                done();
            });
        });

        it('rpc should return sum', function(done) {
            myClient.rpcCall('testFuncSum', [arg1, arg1], function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(arg1 + arg1);
                done();
            });
        });

        it('rpc should accept fewer arguments', function(done) {
            myClient.rpcCall('testFuncSum', [arg1], function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(null);
                done();
            });
        });

        it('rpc should return sum', function(done) {
            myClient.rpcCall('testFuncSum', [null, arg1], function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(arg1);
                done();
            });
        });

        it('rpc should return sum', function(done) {
            myClient.rpcCall('testFuncSum', [null, arg2], function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(arg2);
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
                expect(err).to.equal(null);
                expect(res).to.equal(arg + 1);
                done();
            });
        });

        it('rpc should return incremented argument', function(done) {
            myClient.rpcCall('testFuncIncrement', [arg2], function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(arg2 + 1);
                done();
            });
        });

        it('rpc should ignore too many arguments', function(done) {
            myClient.rpcCall('testFuncIncrement', [arg, 2], function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(arg + 1);
                done();
            });
        });
    });

    describe('Exceptions', function() {
        /* testExplicitException */
        describe('testExplicitException', function() {
            var arg = 1;

            it('rpc should have error argument in callback set', function(done) {
                myClient.rpcCall('testExplicitException', [], function(err, res) {
                    expect(err).not.to.be.null;
                    expect(err.name).to.equal('Error')
                    expect(res).to.be.undefined;
                    done();
                });
            });

            it('rpc should have error argument in callback set', function(done) {
                myClient.rpcCall('testExplicitException', [arg], function(err, res) {
                    expect(err).not.to.be.null;
                    expect(err.name).to.equal('Error')
                    expect(res).to.be.undefined;
                    done();
                });
            });
        });

        /* testExplicitExceptionCustom */
        describe('testExplicitExceptionCustom', function() {
            var arg = 1;

            it('rpc body custom throwable should map to Error', function(done) {
                myClient.rpcCall('testExplicitExceptionCustom', [], function(err, res) {
                    expect(err).not.to.be.null;
                    expect(err.name).to.equal('Error');
                    expect(res).to.be.undefined;
                    done();
                });
            });
        });

        /* testImplicitException */
        describe('testImplicitException', function() {
            var arg = 'abc';

            it('rpc should not have callback error argument set', function(done) {
                myClient.rpcCall('testImplicitException', [arg], function(err, res) {
                        expect(err).to.equal(null);
                        expect(res).to.equal(3);
                        done();
                    });
            });

            it('rpc should have error argument in callback set', function(done) {
                myClient.rpcCall('testImplicitException', [null], function(err, res) {
                        expect(err).not.to.be.null;
                        expect(err.name).to.equal('TypeError');
                        expect(res).to.be.undefined;
                        done();
                    });
            });
        });

        /* testImplicitExceptionEvalError */
        it('EvalError', function(done) {
            myClient.rpcCall('testImplicitExceptionEvalError', [], function(err, res) {
                expect(err).not.to.be.null;
                expect(err.name).to.equal('EvalError');
                expect(res).to.be.undefined;
                done();
            });
        });

        /* testImplicitExceptionRangeError */
        it('RangeError', function(done) {
            myClient.rpcCall('testImplicitExceptionRangeError', [], function(err, res) {
                expect(err).not.to.be.null;
                expect(err.name).to.equal('RangeError');
                expect(res).to.be.undefined;
                done();
            });
        });

        /* testImplicitExceptionReferenceError */
        it('ReferenceError', function(done) {
            myClient.rpcCall('testImplicitExceptionReferenceError', [], function(err, res) {
                expect(err).not.to.be.null;
                expect(err.name).to.equal('ReferenceError');
                expect(res).to.be.undefined;
                done();
            });
        });

        /* testImplicitExceptionSyntaxError */
        it('SyntaxError', function(done) {
            myClient.rpcCall('testImplicitExceptionSyntaxError', [], function(err, res) {
                expect(err).not.to.be.null;
                expect(err.name).to.equal('SyntaxError');
                expect(res).to.be.undefined;
                done();
            });
        });

        /* testImplicitExceptionTypeError */
        it('TypeError', function(done) {
            myClient.rpcCall('testImplicitExceptionTypeError', [], function(err, res) {
                expect(err).not.to.be.null;
                expect(err.name).to.equal('TypeError');
                expect(res).to.be.undefined;
                done();
            });
        });

        /* testImplicitExceptionURIError */
        it('URIError', function(done) {
            myClient.rpcCall('testImplicitExceptionURIError', [], function(err, res) {
                expect(err).not.to.be.null;
                expect(err.name).to.equal('URIError');
                expect(res).to.be.undefined;
                done();
            });
        });

    });

    /* test undefined function */
    describe('test undefined function', function() {
        it('rpc should have error argument set', function(done) {
            myClient.rpcCall('testFuncUndefined', [], function(err, res) {
                expect(err).not.to.be.null;
                expect(res).to.equal(undefined);
                done();
            });
        });

        it('rpc should have error argument set', function(done) {
            myClient.rpcCall('testFuncUndefined', [1, 2, 3], function(err, res) {
                expect(err).not.to.be.null;
                expect(res).to.equal(undefined);
                done();
            });
        });
    });

    /* test program var */
    describe('test program var sequential', function() {
        it('rpc should increase program var to 1', function(done) {
            myClient.rpcCall('testProgVar', [], function(err, res) {
                expect(res).to.equal(1);
                done();
            });
        });

        it('rpc should increase program var to 2', function(done) {
            myClient.rpcCall('testProgVar', [], function(err, res) {
                expect(err).to.be.null;
                expect(res).to.equal(2);
                done();
            });
        });

        it('rpc should increase program var to 3', function(done) {
            myClient.rpcCall('testProgVar', [], function(err, res) {
                expect(err).to.be.null;
                expect(res).to.equal(3);
                done();
            });
        });

        it('rpc should increase program var nested', function(done) {
            myClient.rpcCall('testProgVar', [], function(err, res) {
                expect(err).to.be.null;
                expect(res).to.equal(4);
                myClient.rpcCall('testProgVar', [], function(err, res) {
                    expect(err).to.be.null;
                    expect(res).to.equal(5);
                    myClient.rpcCall('testProgVar', [], function(err, res) {
                        expect(err).to.be.null;
                        expect(res).to.equal(6);
                        done();
                    });
                });
            });
        });
    });

    /* test undefined function */
    describe('test for @due', function() {

        it('rpc should not timeout even when due set', function(done) {
            this.timeout(700);
            myClient.rpcCall('testFuncNoArgs', [], function(err, res) {
                expect(res).not.to.be.null;
                done();
            }, 500);
        });

        it('rpc should not timeout', function(done) {
            this.timeout(1500);
            myClient.rpcCall('testSlowComputation', [], function(err, res) {
                expect(err).to.be.null;
                expect(res).to.equal(true);
                done();
            }, 1500);
        });

        it('rpc should timeout', function(done) {
            this.timeout(1200);
            myClient.rpcCall('testSlowComputation', [], function(err, res) {
                expect(err).not.to.be.null;
                expect(err).to.be.an.instanceof(TimeOutError);
                expect(res).to.equal(undefined);
                done();
            }, 1000);
        });

        it('rpc should timeout', function(done) {
            this.timeout(1200);
            var fixDate = new Date();
            myClient.rpcCall('testSlowComputation', [], function(err, res) {
                var now = new Date();
                assert.strictEqual((now - fixDate < 1200), true);
                done();
            }, 1000);
        });

        it('rpc timout should remove it from openCalls', function(done) {
            this.timeout(300);
            myClient.rpcCall('testFuncNoReturn', [], function(err, res) {
                expect(Object.keys(myClient.RPC.openCalls).length).to.equal(0);
                done();
            }, 1);
        });

        it('rpc should timout immediately', function(done) {
            this.timeout(400);
            myClient.rpcCall('testFuncNoArgs', [], function(err, res) {
                expect(res).not.to.be.null;
            });
            myClient.rpcCall('testFuncNoReturn', [], function(err, res) {
                expect(err).not.to.be.null;
                expect(err).to.be.an.instanceof(TimeOutError);
                expect(res).to.equal(undefined);
                done();
            }, 1);

        });

    });

});

//TODO bidirectional tests