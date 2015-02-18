
var myServer = require('./test-server.js'),
    ClientRpc = require('../rpc_client.js'),
    assert = require("assert"),
    expect = require('chai').expect;


myClient = new ClientRpc('http://127.0.0.1:8123');
myClient2 = new ClientRpc('http://127.0.0.1:8123');

g=0;
myClient.expose({
    'testFuncNoArgs': function() {
        return true;
    },
    'testFuncSingleArg': function(a) {
        return a;
    },
    'testFuncTwoArg': function(a, b) {
        return a + b;
    },
    'testFuncArgumentsVar': function(a){
        return Array.prototype.slice.call(arguments);;
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
    'testExplicitException': function() {
        throw new Error('Explicit exception!')
    },
    'testImplicitException': function(b) {
        return b.length;
    },
    'testSlowComputation': function() {
        simulateSlowComputation(1000); //take some time to give reply
        return true;
    },
    'testProgVar': function() {
        g++;
        return g;
    }
});


// TESTS



describe('general tests', function() {
    it('openCalls parameters should be correct', function(done) {
            this.exposedFunctions = [];
            var c = myClient.RPC;          
            expect(c.openCalls.length).to.equal(0);
            done();
    });

    it('openCalls parameters should be correct', function(done) {
            this.exposedFunctions = [];
            var c = myClient.RPC;
            myClient.rpcCall('nonexist');
            expect(c.openCalls.length).to.equal(1);
            done();
    });

    it('openCalls parameters should be correct', function(done) {
            this.exposedFunctions = [];
            var c = myClient2.RPC;
            myClient2.rpcCall('nonexist');
            myClient2.rpcCall('nonexist');
            myClient2.rpcCall('nonexist');
            expect(c.openCalls.length).to.equal(3);
            done();
    });

});


var tests = function(side, info){
    

    describe(info, function() {
        
        /* testFuncNoArgs */
        describe('testFuncNoArgs', function() {
            it('rpc should return true', function(done) {
                console.log('exec');
                side.rpcCall('testFuncNoArgs', [], function(err, res) {
                    console.log('exec', myServer.connectedClients.length, err, res);
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
                    expect(res).to.equal( arg);
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
                    expect(res).to.equal( (arg1 + arg2));
                    done();
                });
            });

            var arg1 = 1;
            var arg2 = 2;
            it('rpc should return the sum', function(done) {
                side.rpcCall('testFuncTwoArg', [arg1, arg2], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal( (arg1 + arg2));
                    done();
                });
            });

            it('rpc should accept no arguments', function(done) {
                side.rpcCall('testFuncTwoArg', [], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal( null);
                    done();
                });
            });

            it('rpc should ignore too many arguments', function(done) {
                side.rpcCall('testFuncTwoArg', [arg1, arg2, arg2], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal( (arg1 + arg2));
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
                    expect(res).to.equal( undefined);
                    done();
                });
            });

            it('rpc should accept 1 argument', function(done) {
                side.rpcCall('testFuncNoReturn', [arg1], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal( undefined);
                    done();
                });
            });

            it('rpc should accept 2 arguments', function(done) {
                side.rpcCall('testFuncNoReturn', [arg1, arg2], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal( undefined);
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
                    expect(res).to.equal( arg1 + arg2);
                    done();
                });
            });

            it('rpc should return sum', function(done) {
                side.rpcCall('testFuncSum', [arg1, arg1], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal( arg1 + arg1);
                    done();
                });
            });

            it('rpc should accept fewer arguments', function(done) {
                side.rpcCall('testFuncSum', [arg1], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal( null);
                    done();
                });
            });

            it('rpc should return sum', function(done) {
                side.rpcCall('testFuncSum', [null, arg1], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal( arg1);
                    done();
                });
            });

            it('rpc should return sum', function(done) {
                side.rpcCall('testFuncSum', [null, arg2], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal( arg2);
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
                    expect(res).to.equal( arg + 1);
                    done();
                });
            });

            it('rpc should return incremented argument', function(done) {
                side.rpcCall('testFuncIncrement', [arg2], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal( arg2 + 1);
                    done();
                });
            });

            it('rpc should ignore too many arguments', function(done) {
                side.rpcCall('testFuncIncrement', [arg, 2], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.equal( arg + 1);
                    done();
                });
            });
        });


        /* testExplicitException */
        describe('testExplicitException', function() {
            var arg = 1;

            it('rpc should have error argument in callback set', function(done) {
                side.rpcCall('testExplicitException', [], function(err, res) {
                    expect(err).not.to.be.null;
                    expect(res).to.be.undefined;
                    done();
                });
            });

            it('rpc should have error argument in callback set', function(done) {
                side.rpcCall('testExplicitException', [arg], function(err, res) {
                    expect(err).not.to.be.null;
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
                    expect(res).to.equal( 3);
                    done();
                });
            });

            it('rpc should have error argument in callback set', function(done) {
                side.rpcCall('testImplicitException', [null], function(err, res) {
                    expect(err).not.to.be.null;
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
                    expect(res).to.equal( undefined);
                    done();
                });
            });


            it('rpc should have error argument set', function(done) {
                side.rpcCall('testFuncUndefined', [1, 2, 3], function(err, res) {
                    expect(err).not.to.be.null;
                    expect(res).to.equal( undefined);
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

            it('rpc should timeout', function(done) {
                this.timeout(1200);
                side.rpcCall('testSlowComputation', [], function(err, res) {
                    expect(err).not.to.be.null;
                    expect(res).to.equal( undefined);
                    done();
                }, 1000);
            });

            it('rpc should timeout', function(done) {
                this.timeout(1200);
                var fixDate = new Date();
                side.rpcCall('testSlowComputation', [], function(err, res) {
                    var now =  new Date();
                    assert.strictEqual((now-fixDate<1500), true);
                    done();
                }, 1000);
            });

            it('rpc should fail immediately', function(done) {
                this.timeout(25);
                var fixDate = new Date();
                side.rpcCall('testFuncNoReturn', [], function(err, res) {
                    done();
                }, 1);
            });

        });

    });

};

//Run the tests from both sides
tests(myClient, 'From Client RPC to server');


//TODO bidirectional tests
