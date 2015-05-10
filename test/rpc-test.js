var express = require('express'),
    app = express(),
    ServerRpc = require('../lib/rpc-server.js'),
    ClientRpc = require('../lib/rpc-client.js'),
    port = 8124,
    assert = require("assert"),
    expect = require('chai').expect;


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
    'testFuncNoArgs': function(callback) {
        callback(undefined, true);
    },
    'testFuncSingleArg': function(a, callback) {
        callback(undefined, a);
    },
    'testFuncTwoArg': function(a, b, callback) {
        callback(undefined, (a + b));
    },
    'testFuncNoReturn': function(callback) {

    },
    'testFuncSum': function(a, b, callback) {
        callback(undefined, a + b);
    },
    'testFuncIncrement': function(a, callback) {
        a++;
        callback(undefined, a);
    },
    /* Exception testing */
    'testExceptionManualCallback': function(callback) {
        callback(new Error('Exception!'));
    },
    'testExplicitException': function(callback) {
        throw new Error('Explicit exception!')
    },
    'testExplicitExceptionCustom': function(callback) {
        throw 5;
    },
    'testImplicitException': function(b, callback) {
        callback(undefined,  b.length);
    },
    'testImplicitExceptionEvalError': function(callback) {
        throw new EvalError('eval error message');
    },
    'testImplicitExceptionRangeError': function(callback) {
        new Array(-5);
    },
    'testImplicitExceptionReferenceError': function(callback) {
        var a = 5;
        callback(undefined,  a + b);
    },
    'testImplicitExceptionSyntaxError': function(callback) {
        eval("var a = *2;");
    },
    'testImplicitExceptionTypeError': function(callback) {
        new 10;
    },
    'testImplicitExceptionURIError': function(callback) {
        decodeURIComponent('%');
    },
    'testSlowComputation': function(callback) {
        simulateSlowComputation(1000); //take some time to give reply
        callback(undefined, true);
    },
    'testProgVar': function(callback) {
        g++;
        callback(undefined, g);
    }
};

var myServer = new ServerRpc(app, port, {throwNativeError:false});
myServer.expose(methods);

var myClient = new ClientRpc('http://127.0.0.1:8124', {throwNativeError:false});
myClient.expose({});

// TESTS



describe('RPC tests', function() {

    /* testFuncNoArgs */
    describe('testFuncNoArgs', function() {
        it('rpc should return true', function(done) {
            myClient.rpc('testFuncNoArgs', function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.be.true;
                done();
            });
        });

        it('rpc should not accept excessive arguments', function(done) {
            myClient.rpc('testFuncNoArgs', 1, 2, 3, function(err, res) {
                expect(err).not.to.be.null;
                expect(err.name).to.equal('TooManyArgumentsError');
                done();
            });
        });
    });

    /* testFuncSingleArg */
    describe('testFuncSingleArg', function() {
        var arg = 1;
        it('rpc should return the argument', function(done) {
            myClient.rpc('testFuncSingleArg', arg, function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(arg);
                done();
            });
        });

        it('rpc should accept no arguments', function(done) {
            myClient.rpc('testFuncSingleArg', function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(undefined);
                done();
            });
        });

        it('rpc should throw error on too many arguments', function(done) {
            myClient.rpc('testFuncSingleArg', arg, 2, function(err, res) {
                expect(err).not.to.be.null;
                expect(err.name).to.equal('TooManyArgumentsError');
                done();
            });
        });

    });

    /* testFuncTwoArg */
    describe('testFuncTwoArg', function() {
        var arg1 = 'a';
        var arg2 = 'b';
        it('rpc should return the concat', function(done) {
            myClient.rpc('testFuncTwoArg', arg1, arg2, function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal((arg1 + arg2));
                done();
            });
        });

        var arg1 = 1;
        var arg2 = 2;
        it('rpc should return the sum', function(done) {
            myClient.rpc('testFuncTwoArg', arg1, arg2, function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal((arg1 + arg2));
                done();
            });
        });

        it('rpc should accept no arguments', function(done) {
            myClient.rpc('testFuncTwoArg', function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(null);
                done();
            });
        });

        it('rpc should throw error on too many arguments', function(done) {
            myClient.rpc('testFuncTwoArg', arg1, arg2, arg2, function(err, res) {
                expect(err).not.to.be.null;
                expect(err.name).to.equal('TooManyArgumentsError');
                done();
            });
        });
    });

    // /* testFuncArgumentsVar*/
    // describe('testFuncArgumentsVar', function() {
    //     it('function body should have access to excessive args using \'arguments\'', function(done) {
    //         var t = [1, 2, 3, 4];
    //         myClient.rpc('testFuncArgumentsVar', t, function(err, res) {
    //             expect(err).to.equal(null);
    //             expect(res).to.eql(t);
    //             done();
    //         });
    //     });

    //     it('function body should have access to excessive args using \'arguments\'', function(done) {
    //         var t = [1, 'two', 3.0, 4];
    //         myClient.rpc('testFuncArgumentsVar', t, function(err, res) {
    //             expect(err).to.equal(null);
    //             expect(res).to.eql(t);
    //             done();
    //         });
    //     });
    // });

    /* testFuncNoReturn*/
    describe('testFuncNoReturn', function() {
        var arg1 = 'a';
        var arg2 = 'b';
        it('rpc should not accept no arguments', function(done) {
            myClient.rpc('testFuncNoReturn', function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(undefined);
                done();
            });
        });

        it('rpc should throw error on 1 excessive argument', function(done) {
            myClient.rpc('testFuncNoReturn', arg1, function(err, res) {
                expect(err).not.to.be.null;
                expect(err.name).to.equal('TooManyArgumentsError');
                done();
            });
        });

        it('rpc should throw error on 2 arguments', function(done) {
            myClient.rpc('testFuncNoReturn', arg1, arg2, function(err, res) {
                expect(err).not.to.be.null;
                expect(err.name).to.equal('TooManyArgumentsError');
                done();
            });
        });

    });

    /* testFuncSum*/
    describe('testFuncSum', function() {
        var arg1 = 1;
        var arg2 = 2;
        it('rpc should return sum', function(done) {
            myClient.rpc('testFuncSum', arg1, arg2, function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(arg1 + arg2);
                done();
            });
        });

        it('rpc should return sum', function(done) {
            myClient.rpc('testFuncSum', arg1, arg1, function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(arg1 + arg1);
                done();
            });
        });

        it('rpc should accept fewer arguments', function(done) {
            myClient.rpc('testFuncSum', arg1, function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(null);
                done();
            });
        });

        it('rpc should return sum', function(done) {
            myClient.rpc('testFuncSum', null, arg1, function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(arg1);
                done();
            });
        });

        it('rpc should return sum', function(done) {
            myClient.rpc('testFuncSum', null, arg2, function(err, res) {
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
            myClient.rpc('testFuncIncrement', arg, function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(arg + 1);
                done();
            });
        });

        it('rpc should return incremented argument', function(done) {
            myClient.rpc('testFuncIncrement', arg2, function(err, res) {
                expect(err).to.equal(null);
                expect(res).to.equal(arg2 + 1);
                done();
            });
        });

        it('rpc should throw error on too many arguments', function(done) {
            myClient.rpc('testFuncIncrement', arg, 2, function(err, res) {
                expect(err).not.to.equal(null);
                expect(err.name).to.equal('TooManyArgumentsError');
                done();
            });
        });
    });

    describe('Exceptions', function() {
        /* testExceptionManualCallback */
        describe('testExceptionManualCallback', function() {
            var arg = 1;

            it('rpc should have error argument in callback set', function(done) {
                myClient.rpc('testExplicitException', function(err, res) {
                    expect(err).not.to.be.null;
                    expect(err.name).to.equal('Error')
                    expect(res).to.be.undefined;
                    done();
                });
            });

            it('rpc should have error argument in callback set (TooManyArgumentsError)', function(done) {
                myClient.rpc('testExplicitException', arg, function(err, res) {
                    expect(err).not.to.be.null;
                    expect(err.name).to.equal('TooManyArgumentsError');
                    done();
                });
            });
        });


        /* testExplicitException */
        describe('testExplicitException', function() {
            var arg = 1;

            it('rpc should have error argument in callback set', function(done) {
                myClient.rpc('testExplicitException', function(err, res) {
                    expect(err).not.to.be.null;
                    expect(err.name).to.equal('Error')
                    expect(res).to.be.undefined;
                    done();
                });
            });

            it('rpc should have error argument in callback set (TooManyArgumentsError)', function(done) {
                myClient.rpc('testExplicitException', arg, function(err, res) {
                    expect(err).not.to.be.null;
                    expect(err.name).to.equal('TooManyArgumentsError');
                    done();
                });
            });
        });

        /* testExplicitExceptionCustom */
        describe('testExplicitExceptionCustom', function() {
            var arg = 1;

            it('rpc body custom throwable should map to Error', function(done) {
                myClient.rpc('testExplicitExceptionCustom', function(err, res) {
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
                myClient.rpc('testImplicitException', arg, function(err, res) {
                        expect(err).to.equal(null);
                        expect(res).to.equal(3);
                        done();
                    });
            });

            it('rpc should have error argument in callback set', function(done) {
                myClient.rpc('testImplicitException', null, function(err, res) {
                        expect(err).not.to.be.null;
                        expect(err.name).to.equal('TypeError');
                        expect(res).to.be.undefined;
                        done();
                    });
            });
        });

        /* testImplicitExceptionEvalError */
        it('EvalError', function(done) {
            myClient.rpc('testImplicitExceptionEvalError', function(err, res) {
                expect(err).not.to.be.null;
                expect(err.name).to.equal('EvalError');
                expect(res).to.be.undefined;
                done();
            });
        });

        /* testImplicitExceptionRangeError */
        it('RangeError', function(done) {
            myClient.rpc('testImplicitExceptionRangeError', function(err, res) {
                expect(err).not.to.be.null;
                expect(err.name).to.equal('RangeError');
                expect(res).to.be.undefined;
                done();
            });
        });

        /* testImplicitExceptionReferenceError */
        it('ReferenceError', function(done) {
            myClient.rpc('testImplicitExceptionReferenceError', function(err, res) {
                expect(err).not.to.be.null;
                expect(err.name).to.equal('ReferenceError');
                expect(res).to.be.undefined;
                done();
            });
        });

        /* testImplicitExceptionSyntaxError */
        it('SyntaxError', function(done) {
            myClient.rpc('testImplicitExceptionSyntaxError', function(err, res) {
                expect(err).not.to.be.null;
                expect(err.name).to.equal('SyntaxError');
                expect(res).to.be.undefined;
                done();
            });
        });

        /* testImplicitExceptionTypeError */
        it('TypeError', function(done) {
            myClient.rpc('testImplicitExceptionTypeError', function(err, res) {
                expect(err).not.to.be.null;
                expect(err.name).to.equal('TypeError');
                expect(res).to.be.undefined;
                done();
            });
        });

        /* testImplicitExceptionURIError */
        it('URIError', function(done) {
            myClient.rpc('testImplicitExceptionURIError', function(err, res) {
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
            myClient.rpc('testFuncUndefined', function(err, res) {
                expect(err).not.to.be.null;
                expect(res).to.equal(undefined);
                done();
            });
        });

        it('rpc should have error argument set', function(done) {
            myClient.rpc('testFuncUndefined', 1, 2, 3, function(err, res) {
                expect(err).not.to.be.null;
                expect(res).to.equal(undefined);
                done();
            });
        });
    });

    /* test program var */
    describe('test program var sequential', function() {
        it('rpc should increase program var to 1', function(done) {
            myClient.rpc('testProgVar', function(err, res) {
                expect(res).to.equal(1);
                done();
            });
        });

        it('rpc should increase program var to 2', function(done) {
            myClient.rpc('testProgVar', function(err, res) {
                expect(err).to.be.null;
                expect(res).to.equal(2);
                done();
            });
        });

        it('rpc should increase program var to 3', function(done) {
            myClient.rpc('testProgVar', function(err, res) {
                expect(err).to.be.null;
                expect(res).to.equal(3);
                done();
            });
        });

        it('rpc should increase program var nested', function(done) {
            myClient.rpc('testProgVar', function(err, res) {
                expect(err).to.be.null;
                expect(res).to.equal(4);
                myClient.rpc('testProgVar', function(err, res) {
                    expect(err).to.be.null;
                    expect(res).to.equal(5);
                    myClient.rpc('testProgVar', function(err, res) {
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
            myClient.rpc('testFuncNoArgs', function(err, res) {
                expect(res).not.to.be.null;
                done();
            }, 500);
        });

        it('rpc should not timeout', function(done) {
            this.timeout(1500);
            myClient.rpc('testSlowComputation', function(err, res) {
                expect(err).to.be.null;
                expect(res).to.equal(true);
                done();
            }, 1500);
        });

        it('rpc should timeout', function(done) {
            this.timeout(1200);
            myClient.rpc('testSlowComputation', function(err, res) {
                expect(err).not.to.be.null;
                expect(err).to.be.an.instanceof(TimeOutError);
                expect(res).to.equal(undefined);
                done();
            }, 1000);
        });

        it('rpc should timeout', function(done) {
            this.timeout(1200);
            var fixDate = new Date();
            myClient.rpc('testSlowComputation', function(err, res) {
                var now = new Date();
                assert.strictEqual((now - fixDate < 1200), true);
                done();
            }, 1000);
        });

        it('rpc timout should remove it from openCalls', function(done) {
            this.timeout(300);
            myClient.rpc('testFuncNoReturn', function(err, res) {
                expect(Object.keys(myClient.RPC.openCalls).length).to.equal(0);
                done();
            }, 1);
        });

        it('rpc should timout immediately', function(done) {
            this.timeout(400);
            myClient.rpc('testFuncNoArgs', function(err, res) {
                expect(res).not.to.be.null;
            });
            myClient.rpc('testFuncNoReturn', function(err, res) {
                expect(err).not.to.be.null;
                expect(err).to.be.an.instanceof(TimeOutError);
                expect(res).to.equal(undefined);
                done();
            }, 1);

        });

    });

});



myClient = new ClientRpc('http://127.0.0.1:8124');
myClient2 = new ClientRpc('http://127.0.0.1:8124');
myClient3 = new ClientRpc('http://127.0.0.1:8124');


myClient.expose({});

// TESTS


describe('Client RPC tests', function() {
    it('parameters should remove calls on invoking callback', function(done) {
        this.exposedFunctions = [];
        var c = myClient.RPC;
        myClient.rpc('testFuncNoArgs', function(err, res) {
            expect(Object.keys(c.openCalls).length).to.equal(0);
            done();
        });
    });

    it('parameters should remove calls on invoking callback', function(done) {
        this.exposedFunctions = [];
        var c = myClient.RPC;
        myClient.rpc('testFuncNoArgs', function(err, res) {
            myClient.rpc('testFuncNoArgs', function(err, res) {
                myClient.rpc('testFuncNoArgs', function(err, res) {
                    expect(Object.keys(c.openCalls).length).to.equal(0);
                    done();
                });
            });
        });
    });

    it('parameters should remove calls on invoking callback with exception', function(done) {
        this.exposedFunctions = [];
        var c = myClient.RPC;
        myClient.rpc('testExplicitException', function(err, res) {
            expect(Object.keys(c.openCalls).length).to.equal(0);
            done();
        });
    });

    it('parameters should remove calls on invoking callback with exception', function(done) {
        this.exposedFunctions = [];
        var c = myClient.RPC;
        myClient.rpc('testExplicitException', function(err, res) {
            myClient.rpc('testExplicitException', function(err, res) {
                myClient.rpc('testExplicitException', function(err, res) {
                    expect(Object.keys(c.openCalls).length).to.equal(0);
                    done();
                });
            });
        });
    });

    it('parameters should be correct', function(done) {
        this.exposedFunctions = [];
        var c = myClient.RPC;
        expect(Object.keys(c.openCalls).length).to.equal(0);
        done();
    });

    it('parameters should be correct', function(done) {
        this.exposedFunctions = [];
        var c = myClient.RPC;
        myClient.rpc('nonexist');
        expect(Object.keys(c.openCalls).length).to.equal(1);
        done();
    });

    it('parameters should be correct', function(done) {
        this.exposedFunctions = [];
        var c = myClient2.RPC;
        myClient2.rpc('nonexist');
        myClient2.rpc('nonexist');
        myClient2.rpc('nonexist');
        expect(Object.keys(c.openCalls).length).to.equal(3);
        done();
    });

    it('parameters should be correct', function(done) {
        this.exposedFunctions = [];
        var c = myClient3.RPC;
        myClient3.rpc('testFuncNoArgs', function(err, res) {
            myClient3.rpc('nonexist');
            expect(Object.keys(c.openCalls).length).to.equal(1);
            done();
        });
    });
});