var ClientRpc = require('../lib/rpc-client.js'),
    Lease = require('../lib/lease.js'),
    assert = require("assert"),
    expect = require('chai').expect;

myClient = new ClientRpc('http://127.0.0.1:8123');
myClient2 = new ClientRpc('http://127.0.0.1:8123');
myClient3 = new ClientRpc('http://127.0.0.1:8123');


myClient.expose({});

// TESTS


describe('Client RPC tests', function() {
    it('parameters should remove calls on invoking callback', function(done) {
        this.exposedFunctions = [];
        var c = myClient.RPC;
        myClient.rpcCall('testFuncNoArgs', [], function(err, res) {
            expect(Object.keys(c.openCalls).length).to.equal(0);
            done();
        });
    });

    it('parameters should remove calls on invoking callback', function(done) {
        this.exposedFunctions = [];
        var c = myClient.RPC;
        myClient.rpcCall('testFuncNoArgs', [], function(err, res) {
            myClient.rpcCall('testFuncNoArgs', [], function(err, res) {
                myClient.rpcCall('testFuncNoArgs', [], function(err, res) {
                    expect(Object.keys(c.openCalls).length).to.equal(0);
                    done();
                });
            });
        });
    });

    it('parameters should remove calls on invoking callback with exception', function(done) {
        this.exposedFunctions = [];
        var c = myClient.RPC;
        myClient.rpcCall('testExplicitException', [], function(err, res) {
            expect(Object.keys(c.openCalls).length).to.equal(0);
            done();
        });
    });

    it('parameters should remove calls on invoking callback with exception', function(done) {
        this.exposedFunctions = [];
        var c = myClient.RPC;
        myClient.rpcCall('testExplicitException', [], function(err, res) {
            myClient.rpcCall('testExplicitException', [], function(err, res) {
                myClient.rpcCall('testExplicitException', [], function(err, res) {
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
        myClient.rpcCall('nonexist');
        expect(Object.keys(c.openCalls).length).to.equal(1);
        done();
    });

    it('parameters should be correct', function(done) {
        this.exposedFunctions = [];
        var c = myClient2.RPC;
        myClient2.rpcCall('nonexist');
        myClient2.rpcCall('nonexist');
        myClient2.rpcCall('nonexist');
        expect(Object.keys(c.openCalls).length).to.equal(3);
        done();
    });

    it('parameters should be correct', function(done) {
        this.exposedFunctions = [];
        var c = myClient3.RPC;
        myClient3.rpcCall('testFuncNoArgs', [], function(err, res) {
            myClient3.rpcCall('nonexist');
            expect(Object.keys(c.openCalls).length).to.equal(1);
            done();
        });
    });
});

describe('close tests', function() {
    /* FIXME
    it('connection should close', function(done) {
        var c = myClient.RPC;

        myClient.close();
        setTimeout(function(){    
            expect(c.socket.connected).to.be.false;
            done();
        }, 1000);
        
    });*/
});    
