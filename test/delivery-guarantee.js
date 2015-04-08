'use strict';

var express = require('express'),
    app = express(),
    Excpt = require('../lib/exception.js'),
    serverHttp = require('http').createServer(app),
    ServerRpc = require('../lib/rpc-server.js'),
    ClientRpc = require('../lib/rpc-client.js'),
    port = 8125,
    assert = require("assert"),
    expect = require('chai').expect;

serverHttp.listen(port, function () {
    console.log('Server listening at port %d', port);
});
app.use("/", express.static(__dirname + '/'));

var list = [];
var smallerThanTwo = 0;

var methods = {
    'testAppend': function (el) {
        list.push(el);
        return true;
    },
    'testErrorFunc': function () {
        throw Error('testError');
    },
    'sideEffectFunc': function () {
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

var checkSequentialOrdering = function (end) {
    var prev = 0;
    for (var i in list) {
        if (list[i] < prev || 1 != list[i] - prev) {
            return false;
        }

        prev = list[i];
    };

    if (prev != end)
        return false;

    return true;
};

var getServerRpcOfClient = function (clientId) {
    return myServer.clientChannels[clientId].RPC;
};



describe('RPC delivery guarantees', function () {

    describe('Case 1: Normal RPC', function () {

        it('RPC should increase \'Counter\'.', function (done) {
            myClient.rpc('testErrorFunc', [], function (err, res, retry) {

                expect(myClient.RPC.sendMsgCounter).to.equal(2)
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(2)
                expect(err).not.to.equal(null);
                done();
            });
        });


        it('RPC should increase \'Counter\'.', function (done) {
            expect(myClient.RPC.sendMsgCounter).to.equal(2);
            var ctr = 0;

            myClient.rpc('testErrorFunc', [], function (err, res, retry) {

                expect(myClient.RPC.sendMsgCounter).to.equal(3)
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(3)
                expect(err).not.to.equal(null);
                ctr++;
            });

            myClient.rpc('testErrorFunc', [], function (err, res, retry) {

                expect(myClient.RPC.sendMsgCounter).to.equal(4)
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(4)
                expect(err).not.to.equal(null);
                ctr++;
                if (ctr == 2)
                    done();
            });
        });


        it('RPC should increase \'Counter\'.', function (done) {
            expect(myClient.RPC.sendMsgCounter).to.equal(4);

            myClient.rpc('testErrorFunc', [], function (err, res, retry) {

                expect(myClient.RPC.sendMsgCounter).to.equal(5)
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(5)
                expect(err).not.to.equal(null);

                myClient.rpc('testErrorFunc', [], function (err, res, retry) {
                    expect(myClient.RPC.sendMsgCounter).to.equal(6)
                    expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(6)
                    expect(err).not.to.equal(null);
                    done();
                });
            });
        });
    });


    describe('Case 2: Reply Omission Failure', function () {

        it('RPC retry should not increase the \'sendMsgCounter\'.', function (done) {
            expect(myClient.RPC.sendMsgCounter).to.equal(6);
            expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(6)
            var ctr = 0;
            myClient.rpc('testErrorFunc', [], function (err, res, retry) {
                ctr++;

                expect(myClient.RPC.sendMsgCounter).to.equal(7);
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(7)
                if (ctr <= 5)
                    retry();
                else
                    done();
            });
        });


        it('retry once.', function (done) {
            this.timeout(5000);
            var counter = 0;
            expect(myClient.RPC.sendMsgCounter).to.equal(7);
            expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(7);

            myClient.rpc('testErrorFunc', [counter], function (err, res, retry) {

                counter++;
                expect(err).not.to.equal(null);

                expect(myClient.RPC.sendMsgCounter).to.equal(8);
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(8);
                if (counter === 2) {
                    done();
                } else {
                    retry();
                }
            });
        });


        it('retry multiple times.', function (done) {
            this.timeout(5000);
            var counter = 0;
            expect(myClient.RPC.sendMsgCounter).to.equal(8);
            expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(8);
            myClient.rpc('testErrorFunc', [counter], function (err, res, retry) {

                counter++;
                expect(err).not.to.equal(null);

                expect(myClient.RPC.sendMsgCounter).to.equal(9);
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(9);
                if (counter === 10) {
                    done();
                } else {
                    retry();
                }
            });
        });


        it('retry should not cause side-effects.', function (done) {
            this.timeout(5000);
            var counter = 0;
            smallerThanTwo = 0;

            expect(myClient.RPC.sendMsgCounter).to.equal(9);
            expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(9);

            myClient.rpc('sideEffectFunc', [], function (err, res, retry) {

                counter++;
                expect(err).not.to.equal(null);

                expect(myClient.RPC.sendMsgCounter).to.equal(10);
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(10);
                if (counter === 10) {
                    expect(smallerThanTwo).to.be.below(2);
                    done();
                } else {
                    retry();
                }
            });
        });


        it('Reply Omission failure: followed by other RPC.', function (done) {
            this.timeout(5000);
            var currentCtr = myClient.RPC.sendMsgCounter;

            expect(myClient.RPC.sendMsgCounter).to.equal(10);
            expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(10);

            myClient.rpc('sideEffectFunc', [], function (err, res) {
                myClient.RPC.sendMsgCounter = currentCtr;

                expect(myClient.RPC.sendMsgCounter).to.equal(10);
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(11);

                //like a reply omission failure
                //that did perform a computation on the callee
                myClient.rpc('testErrorFunc', [], function (err, res) {
                    expect(err).not.to.equal(null);
                    //we should not receive the result from the outer function
                    expect(err.message).to.equal('testError');

                    expect(myClient.RPC.sendMsgCounter).to.equal(11);
                    expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(11);

                    done();
                });

            });
        });


        it('Reply Omission failure (reply): followed by other RPC + retry.', function (done) {
            this.timeout(5000);
            var currentCtr = myClient.RPC.sendMsgCounter;
            var ctr = 0;

            expect(myClient.RPC.sendMsgCounter).to.equal(11);
            expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(11);

            myClient.rpc('sideEffectFunc', [], function (err, res) {
                myClient.RPC.sendMsgCounter = currentCtr;

                expect(myClient.RPC.sendMsgCounter).to.equal(11);
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(12);

                //like a reply omission failure
                //that dit perform a computation on the callee
                myClient.rpc('testErrorFunc', [], function (err, res, retry) {
                    ctr++;
                    expect(err).not.to.equal(null);
                    //we should not receive the result from the outer function
                    expect(err.message).to.equal('testError');

                    expect(myClient.RPC.sendMsgCounter).to.equal(12);
                    expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(12);

                    if (ctr == 5)
                        done();
                    else
                        retry();
                });

            });
        });
    });


    describe('Case 3: Concurrent calls', function () {

        it('rpc ordering should remain sequential.', function (done) {
            this.timeout(5000);
            var currentCtr = myClient.RPC.sendMsgCounter;
            var counter = 1;

            expect(myClient.RPC.sendMsgCounter).to.equal(12);
            expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(12);

            while (counter <= 50) {
                myClient.rpc('testAppend', [counter], function (err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.be.true;
                });
                counter++;
            }

            setTimeout(function () {
                expect(checkSequentialOrdering(50)).to.be.true;
                expect(myClient.RPC.sendMsgCounter).to.equal(currentCtr + counter - 1);

                expect(myClient.RPC.sendMsgCounter).to.equal(62);
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(62);
                done();
            }, 2000)

        });


        it('rpc ordering should remain sequential (with error).', function (done) {
            this.timeout(5000);
            list = [];
            var currentCtr = myClient.RPC.sendMsgCounter;
            var counter = 1;

            expect(myClient.RPC.sendMsgCounter).to.equal(62);
            expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(62);

            while (counter <= 50) {
                myClient.rpc('testErrorFunc', [], function (err, res) {
                    expect(err).not.to.equal(null);
                });

                myClient.rpc('testAppend', [counter], function (err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.be.true;
                });

                myClient.rpc('undefined', [], function (err, res) {
                    expect(err).not.to.equal(null);
                });

                counter++;

            }

            setTimeout(function () {
                expect(checkSequentialOrdering(50)).to.be.true;
                expect(myClient.RPC.sendMsgCounter).to.equal(currentCtr + (counter - 1) * 3);

                expect(myClient.RPC.sendMsgCounter).to.equal(62 + (counter - 1) * 3);
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(62 + (counter - 1) * 3);
                done();
            }, 2000);

        });
    });


    describe('Case 4: already disconnected', function () {

        it('Should not increase \'Counter\', single call.', function (done) {
            expect(myClient.RPC.sendMsgCounter).to.equal(212);
            expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(212);

            myClient.RPC.connected = false;

            myClient.rpc('testErrorFunc', [], function (err, res) {
                expect(myClient.RPC.sendMsgCounter).to.equal(212);
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(212);
                expect(err).not.to.equal(null);
                done();
            });

        });


        it('Should not increase \'Counter\', multiple calls.', function (done) {
            expect(myClient.RPC.sendMsgCounter).to.equal(212);
            expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(212);

            myClient.RPC.connected = false;

            myClient.rpc('testErrorFunc', [], function (err, res) {
                expect(myClient.RPC.sendMsgCounter).to.equal(212);
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(212);
                expect(err).not.to.equal(null);

            });

            myClient.rpc('testErrorFunc', [], function (err, res) {
                expect(myClient.RPC.sendMsgCounter).to.equal(212);
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(212);
                expect(err).not.to.equal(null);
                done();
            });

        });


        it('Should not increase \'Counter\', multiple calls.', function (done) {
            this.timeout(5000);
            expect(myClient.RPC.sendMsgCounter).to.equal(212);
            expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(212);

            myClient.RPC.connected = false;
            var ctr = 1;
            var dones = 1;

            while (ctr <= 5) {

                myClient.rpc('testErrorFunc', [], function (err, res, retry) {
                    expect(myClient.RPC.sendMsgCounter).to.equal(212);
                    expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(212);
                    expect(err).not.to.equal(null);
                    dones++;


                    if (dones === 5) done();

                });

                ctr++;

            }

        });
    });


    describe('Case 5: disconnected during call', function () {

        it('Subsequent calls should fail.', function (done) {
            this.timeout(5000);
            expect(myClient.RPC.sendMsgCounter).to.equal(212);
            expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(212);

            myClient.RPC.connected = true;


            myClient.rpc('testErrorFunc', [], function (err, res, retry) {
                expect(myClient.RPC.sendMsgCounter).to.equal(213);
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(213);
                expect(err).not.to.equal(null);
                expect(err).to.be.an.instanceof(Error);

                myClient.RPC.connected = false;
                myClient.RPC.failOpenCalls();

            });

            //Other waiting calls should fail with NetworkError at this time.

            myClient.rpc('testErrorFunc', [], function (err, res, retry) {
                expect(myClient.RPC.sendMsgCounter).to.equal(213);
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(213);
                expect(err).not.to.equal(null);
                expect(err).to.be.an.instanceof(NetworkError);
            });

            myClient.rpc('testErrorFunc', [], function (err, res, retry) {
                expect(myClient.RPC.sendMsgCounter).to.equal(213);
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(213);
                expect(err).not.to.equal(null);
                expect(err).to.be.an.instanceof(NetworkError);
            });

            myClient.rpc('testErrorFunc', [], function (err, res, retry) {
                expect(myClient.RPC.sendMsgCounter).to.equal(213);
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(213);
                expect(err).not.to.equal(null);
                expect(err).to.be.an.instanceof(NetworkError);

                done();
            });
        });


        it('Subsequent calls should fail.', function (done) {

            expect(myClient.RPC.sendMsgCounter).to.equal(213);
            expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(213);

            myClient.RPC.connected = true;

            var ctr = 0;
            myClient.rpc('testErrorFunc', [], function (err, res, retry) {
                //counters should be 213 or 214
                expect(myClient.RPC.sendMsgCounter).to.be.below(215);
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.be.below(215);
                expect(err).not.to.equal(null);

                if (ctr === 0) {
                    myClient.RPC.connected = false;
                    myClient.RPC.failOpenCalls();
                    ctr++;
                    retry();
                }
            });

            //first call succeeded, rest should fail

            var ctr2 = 0;
            myClient.rpc('testErrorFunc', [], function (err, res, retry) {
                expect(myClient.RPC.sendMsgCounter).to.be.below(215);
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.be.below(215);
                expect(err).not.to.equal(null);
                expect(err).to.be.an.instanceof(NetworkError);

                if (ctr2 === 0) {
                    ctr2++;
                    retry();
                }


            });

            myClient.rpc('testErrorFunc', [], function (err, res, retry) {
                expect(myClient.RPC.sendMsgCounter).to.be.below(215);
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.be.below(215);
                expect(err).not.to.equal(null);
                expect(err).to.be.an.instanceof(NetworkError);

                done();
            });
        });


        it('Retry after reconnect call should work', function (done) {
            this.timeout(5000);
            expect(myClient.RPC.sendMsgCounter).to.equal(214);
            expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(214);

            myClient.RPC.connected = true;

            myClient.rpc('testErrorFunc', [], function (err, res, retry) {
                expect(myClient.RPC.sendMsgCounter).to.equal(215);
                expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(215);
                expect(err).not.to.equal(null);
                expect(err).to.be.an.instanceof(Error);

                myClient.RPC.connected = false;
                myClient.RPC.failOpenCalls();

            });

            var ctr = 0;
            myClient.rpc('testErrorFunc', [], function (err, res, retry) {

                expect(err).not.to.equal(null);

                if (ctr === 0) {
                    myClient.RPC.connected = true;
                    expect(myClient.RPC.sendMsgCounter).to.equal(215);
                    expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(215);
                    expect(err).to.be.an.instanceof(NetworkError);
                    ctr++;

                    setTimeout(function () {
                        retry();
                    }, 500)


                } else {
                    expect(err).not.be.an.instanceof(NetworkError);
                    expect(myClient.RPC.sendMsgCounter).to.equal(216);
                    expect(getServerRpcOfClient(myClient.id).recMsgCounter).to.equal(216);
                    done();
                }

            });
        });
    });
});