'use strict';

var express = require('express'),
    app = express(),
    serverHttp = require('http').createServer(app),
    ServerRpc = require('../lib/rpc-server.js'),
    ClientRpc = require('../lib/rpc-client.js'),
    port = 8125,
    assert = require("assert"),
    expect = require('chai').expect;

serverHttp.listen(port, function() {
    console.log('Server listening at port %d', port);
});
app.use("/", express.static(__dirname + '/'));

var list = [];
var smallerThanTwo = 0;

var methods = {
    'testAppend': function(el) {
        list.push(el);
        return true;
    },
    'testErrorFunc': function() {
        throw Error('testError');
    },
    'sideEffectFunc': function() {
        smallerThanTwo++;
        throw Error('sideEffectFunc');
    }
};

var myServer = new ServerRpc(serverHttp, {
    throwNativeError: true
});
myServer.expose(methods);

var myClient = new ClientRpc('http://127.0.0.1:8125', {
    throwNativeError: true
});
var myClient2 = new ClientRpc('http://127.0.0.1:8125', {
    throwNativeError: false
});
myClient.expose({});

var checkSequentialOrdering = function(end) {
    var prev = 0;
    for (var i in list) {
        if (list[i] < prev || 1 != list[i] - prev) {
            return false;
        }

        prev = list[i]
    };

    if (prev != end)
        return false;

    return true;
};

describe('RPC delivery guarantees', function() {

    describe('Send Message counter', function() {

        it('RPC should increase \'sendMsgCounter\'.', function(done) {
            myClient.rpc('testErrorFunc', [], function(err, res, retry) {

                expect(myClient.RPC.sendMsgCounter).to.equal(2)
                expect(err).not.to.equal(null);
                done();
            });
        });

        it('RPC should increase \'sendMsgCounter\'.', function(done) {
            expect(myClient.RPC.sendMsgCounter).to.equal(2);
            var ctr = 0;

            myClient.rpc('testErrorFunc', [], function(err, res, retry) {

                expect(myClient.RPC.sendMsgCounter).to.equal(3)
                expect(err).not.to.equal(null);
                ctr++;
            });

            myClient.rpc('testErrorFunc', [], function(err, res, retry) {

                expect(myClient.RPC.sendMsgCounter).to.equal(4)
                expect(err).not.to.equal(null);
                ctr++;
                if (ctr == 2)
                    done();
            });
        });

        it('RPC should increase \'sendMsgCounter\'.', function(done) {
            expect(myClient.RPC.sendMsgCounter).to.equal(4);

            myClient.rpc('testErrorFunc', [], function(err, res, retry) {

                expect(myClient.RPC.sendMsgCounter).to.equal(5)
                expect(err).not.to.equal(null);

                myClient.rpc('testErrorFunc', [], function(err, res, retry) {
                    expect(myClient.RPC.sendMsgCounter).to.equal(6)
                    expect(err).not.to.equal(null);
                    done();
                });
            });
        });

        it('RPC retry should not increase the \'sendMsgCounter\'.', function(done) {
            expect(myClient.RPC.sendMsgCounter).to.equal(6);
            var ctr = 0;
            myClient.rpc('testErrorFunc', [], function(err, res, retry) {
                ctr++;

                expect(myClient.RPC.sendMsgCounter).to.equal(7);
                if (ctr <= 5)
                    retry();
                else
                    done();
            });
        });
    });

    describe('Retry', function() {

        it('retry once.', function(done) {
            this.timeout(5000);
            var counter = 0;

            myClient.rpc('testErrorFunc', [counter], function(err, res, retry) {

                counter++;
                expect(err).not.to.equal(null);
                if (counter === 2) {
                    done();
                } else {
                    retry();
                }
            });
        });

        it('retry 10 times.', function(done) {
            this.timeout(5000);
            var counter = 0;

            myClient.rpc('testErrorFunc', [counter], function(err, res, retry) {

                counter++;
                expect(err).not.to.equal(null);
                if (counter === 10) {
                    done();
                } else {
                    retry();
                }
            });
        });

        it('Omission failures: retry should not cause side-effects.', function(done) {
            this.timeout(5000);
            var counter = 0;
            smallerThanTwo = 0;

            myClient.rpc('sideEffectFunc', [], function(err, res, retry) {

                counter++;
                expect(err).not.to.equal(null);
                if (counter === 10) {
                    expect(smallerThanTwo).to.be.below(2);
                    done();
                } else {
                    retry();
                }
            });
        });

        it('Omission failure (reply): followed by other RPC.', function(done) {
            this.timeout(5000);
            var currentCtr = myClient.RPC.sendMsgCounter;

            myClient.rpc('sideEffectFunc', [], function(err, res) {
                myClient.RPC.sendMsgCounter = currentCtr;
                //like a reply omission failure
                //that dit perform a computation on the callee
                myClient.rpc('testErrorFunc', [], function(err, res) {
                    expect(err).not.to.equal(null);
                    //we should not receive the result from the outer function
                    expect(err.message).to.equal('testError');

                    done();
                });

            });
        });

        it('Omission failure (reply): followed by other RPC + retry.', function(done) {
            this.timeout(5000);
            var currentCtr = myClient.RPC.sendMsgCounter;
            var ctr = 0;

            myClient.rpc('sideEffectFunc', [], function(err, res) {
                myClient.RPC.sendMsgCounter = currentCtr;
                //like a reply omission failure
                //that dit perform a computation on the callee
                myClient.rpc('testErrorFunc', [], function(err, res, retry) {
                    ctr++;
                    expect(err).not.to.equal(null);
                    //we should not receive the result from the outer function
                    expect(err.message).to.equal('testError');

                    if (ctr == 5)
                        done();
                    else
                        retry();
                });

            });
        });

    });

    describe('Ordering', function() {

        it('rpc ordering should remain sequential.', function(done) {
            this.timeout(5000);

            var counter = 1;
            while (counter <= 50) {
                myClient.rpc('testAppend', [counter], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.be.true;
                });
                counter++;
            }
            setTimeout(function() {
                expect(checkSequentialOrdering(50)).to.be.true;
                done();
            }, 2000)

        });

        it('rpc ordering should remain sequential (with error).', function(done) {
            this.timeout(5000);
            list = [];

            var counter = 1;
            while (counter <= 50) {
                myClient.rpc('testErrorFunc', [], function(err, res) {
                    expect(err).not.to.equal(null);
                });

                myClient.rpc('testAppend', [counter], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.be.true;
                });

                myClient.rpc('undefined', [], function(err, res) {
                    expect(err).not.to.equal(null);
                });

                counter++;

            }

            setTimeout(function() {
                expect(checkSequentialOrdering(50)).to.be.true;
                done();
            }, 2000)

        });

    });
});