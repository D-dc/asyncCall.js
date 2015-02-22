var myServer = require('./test-server.js'),
    ClientRpc = require('../lib/rpc-client.js'),
    Lease = require('../lib/lease.js'),
    assert = require("assert"),
    expect = require('chai').expect;

myClient = new ClientRpc('http://127.0.0.1:8123');


g = 0;
myClient.expose({});

// TESTS

var tests = function(side, info) {

    describe(info, function() {

        /* testFuncNoArgs */
        describe('testFuncNoArgs', function() {
            it('rpc should return true', function(done) {
                side.rpcCall('testFuncNoArgs', [], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.be.true;
                    done();
                });
            });

            it('rpc should accept arguments', function(done) {
                side.rpcCall('testFuncNoArgs', [1, 2, 3], function(err, res) {
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
                side.rpcCall('testFuncSingleArg', [arg], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal(arg);
                    done();
                });
            });

            it('rpc should accept no arguments', function(done) {
                side.rpcCall('testFuncSingleArg', [], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal(undefined);
                    done();
                });
            });

            it('rpc should ignore too many arguments', function(done) {
                side.rpcCall('testFuncSingleArg', [arg, 2], function(err, res) {
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
                side.rpcCall('testFuncTwoArg', [arg1, arg2], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal((arg1 + arg2));
                    done();
                });
            });

            var arg1 = 1;
            var arg2 = 2;
            it('rpc should return the sum', function(done) {
                side.rpcCall('testFuncTwoArg', [arg1, arg2], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal((arg1 + arg2));
                    done();
                });
            });

            it('rpc should accept no arguments', function(done) {
                side.rpcCall('testFuncTwoArg', [], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal(null);
                    done();
                });
            });

            it('rpc should ignore too many arguments', function(done) {
                side.rpcCall('testFuncTwoArg', [arg1, arg2, arg2], function(err, res) {
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
                side.rpcCall('testFuncArgumentsVar', t, function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.eql(t);
                    done();
                });
            });

            it('function body should have access to excessive args using \'arguments\'', function(done) {
                var t = [1, 'two', 3.0, 4];
                side.rpcCall('testFuncArgumentsVar', t, function(err, res) {
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
                side.rpcCall('testFuncNoReturn', [], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal(undefined);
                    done();
                });
            });

            it('rpc should accept 1 argument', function(done) {
                side.rpcCall('testFuncNoReturn', [arg1], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal(undefined);
                    done();
                });
            });

            it('rpc should accept 2 arguments', function(done) {
                side.rpcCall('testFuncNoReturn', [arg1, arg2], function(err, res) {
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
                side.rpcCall('testFuncSum', [arg1, arg2], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal(arg1 + arg2);
                    done();
                });
            });

            it('rpc should return sum', function(done) {
                side.rpcCall('testFuncSum', [arg1, arg1], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal(arg1 + arg1);
                    done();
                });
            });

            it('rpc should accept fewer arguments', function(done) {
                side.rpcCall('testFuncSum', [arg1], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal(null);
                    done();
                });
            });

            it('rpc should return sum', function(done) {
                side.rpcCall('testFuncSum', [null, arg1], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal(arg1);
                    done();
                });
            });

            it('rpc should return sum', function(done) {
                side.rpcCall('testFuncSum', [null, arg2], function(err, res) {
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
                side.rpcCall('testFuncIncrement', [arg], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal(arg + 1);
                    done();
                });
            });

            it('rpc should return incremented argument', function(done) {
                side.rpcCall('testFuncIncrement', [arg2], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal(arg2 + 1);
                    done();
                });
            });

            it('rpc should ignore too many arguments', function(done) {
                side.rpcCall('testFuncIncrement', [arg, 2], function(err, res) {
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
                    side.rpcCall('testExplicitException', [], function(err, res) {
                        expect(err).not.to.be.null;
                        expect(err.name).to.equal('Error')
                        expect(res).to.be.undefined;
                        done();
                    });
                });

                it('rpc should have error argument in callback set', function(done) {
                    side.rpcCall('testExplicitException', [arg], function(err, res) {
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
                    side.rpcCall('testExplicitExceptionCustom', [], function(err, res) {
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
                    side.rpcCall('testImplicitException', [arg], function(err, res) {
                        expect(err).to.equal(null);
                        expect(res).to.equal(3);
                        done();
                    });
                });

                it('rpc should have error argument in callback set', function(done) {
                    side.rpcCall('testImplicitException', [null], function(err, res) {
                        expect(err).not.to.be.null;
                        expect(err.name).to.equal('TypeError');
                        expect(res).to.be.undefined;
                        done();
                    });
                });
            });

            /* testImplicitExceptionEvalError */
            it('EvalError', function(done) {
                side.rpcCall('testImplicitExceptionEvalError', [], function(err, res) {
                    expect(err).not.to.be.null;
                    expect(err.name).to.equal('EvalError');
                    expect(res).to.be.undefined;
                    done();
                });
            });

            /* testImplicitExceptionRangeError */
            it('RangeError', function(done) {
                side.rpcCall('testImplicitExceptionRangeError', [], function(err, res) {
                    expect(err).not.to.be.null;
                    expect(err.name).to.equal('RangeError');
                    expect(res).to.be.undefined;
                    done();
                });
            });

            /* testImplicitExceptionReferenceError */
            it('ReferenceError', function(done) {
                side.rpcCall('testImplicitExceptionReferenceError', [], function(err, res) {
                    expect(err).not.to.be.null;
                    expect(err.name).to.equal('ReferenceError');
                    expect(res).to.be.undefined;
                    done();
                });
            });

            /* testImplicitExceptionSyntaxError */
            it('SyntaxError', function(done) {
                side.rpcCall('testImplicitExceptionSyntaxError', [], function(err, res) {
                    expect(err).not.to.be.null;
                    expect(err.name).to.equal('SyntaxError');
                    expect(res).to.be.undefined;
                    done();
                });
            });

            /* testImplicitExceptionTypeError */
            it('TypeError', function(done) {
                side.rpcCall('testImplicitExceptionTypeError', [], function(err, res) {
                    expect(err).not.to.be.null;
                    expect(err.name).to.equal('TypeError');
                    expect(res).to.be.undefined;
                    done();
                });
            });

            /* testImplicitExceptionURIError */
            it('URIError', function(done) {
                side.rpcCall('testImplicitExceptionURIError', [], function(err, res) {
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
                side.rpcCall('testFuncUndefined', [], function(err, res) {
                    expect(err).not.to.be.null;
                    expect(res).to.equal(undefined);
                    done();
                });
            });

            it('rpc should have error argument set', function(done) {
                side.rpcCall('testFuncUndefined', [1, 2, 3], function(err, res) {
                    expect(err).not.to.be.null;
                    expect(res).to.equal(undefined);
                    done();
                });
            });
        });

        /* test program var */
        describe('test program var sequential', function() {
            it('rpc should increase program var to 1', function(done) {
                side.rpcCall('testProgVar', [], function(err, res) {
                    expect(res).to.equal(1);
                    done();
                });
            });

            it('rpc should increase program var to 2', function(done) {
                side.rpcCall('testProgVar', [], function(err, res) {
                    expect(err).to.be.null;
                    expect(res).to.equal(2);
                    done();
                });
            });

            it('rpc should increase program var to 3', function(done) {
                side.rpcCall('testProgVar', [], function(err, res) {
                    expect(err).to.be.null;
                    expect(res).to.equal(3);
                    done();
                });
            });

            it('rpc should increase program var nested', function(done) {
                side.rpcCall('testProgVar', [], function(err, res) {
                    expect(err).to.be.null;
                    expect(res).to.equal(4);
                    side.rpcCall('testProgVar', [], function(err, res) {
                        expect(err).to.be.null;
                        expect(res).to.equal(5);
                        side.rpcCall('testProgVar', [], function(err, res) {
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
                side.rpcCall('testFuncNoArgs', [], function(err, res) {
                    expect(res).not.to.be.null;
                    done();
                }, 500);
            });

            it('rpc should not timeout', function(done) {
                this.timeout(1500);
                side.rpcCall('testSlowComputation', [], function(err, res) {
                    expect(err).to.be.null;
                    expect(res).to.equal(true);
                    done();
                }, 1500);
            });

            it('rpc should timeout', function(done) {
                this.timeout(1200);
                side.rpcCall('testSlowComputation', [], function(err, res) {
                    expect(err).not.to.be.null;
                    expect(err.name).to.equal('Error');
                    expect(res).to.equal(undefined);
                    done();
                }, 1000);
            });

            it('rpc should timeout', function(done) {
                this.timeout(1200);
                var fixDate = new Date();
                side.rpcCall('testSlowComputation', [], function(err, res) {
                    var now = new Date();
                    assert.strictEqual((now - fixDate < 1200), true);
                    done();
                }, 1000);
            });

            it('rpc timout should remove it from openCalls', function(done) {
                this.timeout(300);
                side.rpcCall('testFuncNoReturn', [], function(err, res) {
                    expect(Object.keys(myClient.RPC.openCalls).length).to.equal(0);
                    done();
                }, 1);
            });

            it('rpc should timout immediately', function(done) {
                this.timeout(400);
                side.rpcCall('testFuncNoArgs', [], function(err, res) {
                    expect(res).not.to.be.null;
                });
                side.rpcCall('testFuncNoReturn', [], function(err, res) {
                    expect(err).not.to.be.null;
                    expect(err.name).to.equal('Error');
                    expect(res).to.equal(undefined);
                    done();
                }, 1);

            });

        });

    });

};

tests(myClient, 'RPC tests');

//TODO bidirectional tests