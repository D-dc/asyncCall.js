'use strict';

var express = require('express'),
    ServerRpc = require('../lib/rpc-server.js'),
    ClientRpc = require('../lib/rpc-client.js'),
    port = 8124,
    assert = require("assert"),
    expect = require('chai').expect;

var serverHttp;

var makeServer = function(methods, options) {
    var app = express();
    serverHttp = require('http').createServer(app).listen(port);
    app.use("/", express.static(__dirname + '/'));
    var s = new ServerRpc(serverHttp, options);
    s.expose(methods);
    return s;
};

var makeBrowserClient = function(clientId) {
    var c = new ClientRpc('http://127.0.0.1:' + port);

    if (clientId)
        c.storage.setItem('client', clientId); //mock storage
    return c;
};

var methods = {
    'dummy': function() {}
};

var defaultOptions = {
    pingTimeout: 6000,
    pingInterval: 2500,
    leaseLifeTime: 60000,
    leaseRenewOnCall: true,
    leaseRenewalTime: 60000,
    defaultRpcTimeout: Infinity
};

var leaseShortTime = {
    pingTimeout: 6000,
    pingInterval: 2500,
    leaseLifeTime: 2000,
    leaseRenewOnCall: true,
    leaseRenewalTime: 2000,
    defaultRpcTimeout: Infinity
};

var leaseShortTimeNoRenew = {
    pingTimeout: 6000,
    pingInterval: 2500,
    leaseLifeTime: 2000,
    leaseRenewOnCall: false,
    leaseRenewalTime: 2000,
    defaultRpcTimeout: Infinity
};

var cleanup = function() {
    port++;
    serverHttp.close();
};

describe('Server tests', function() {

    it('exposed methods', function(done) {
        var myServer = makeServer(methods, defaultOptions);
        expect(Object.keys(myServer.exposedFunctions).length).to.be.equal(1);

        myServer.close();
        cleanup();
        done();
    });

    describe('clientChannels tests', function() {

        it('new client', function(done) {
            var myServer = makeServer(methods, defaultOptions);

            myServer.onConnection(function(s) {
                expect(Object.keys(myServer.clientChannels).length).to.be.equal(1);
                expect(Object.keys(s.RPC.exposedFunctions).length).to.be.equal(1);

                myServer.close();
                cleanup();
                done();
            });
            makeBrowserClient();
        });

        it('existing client', function(done) {
            var myServer = makeServer(methods, defaultOptions);

            myServer.onConnection(function(s) {
                expect(Object.keys(myServer.clientChannels).length).to.be.equal(1);
                expect(Object.keys(s.RPC.exposedFunctions).length).to.be.equal(1);

                myServer.close();
                cleanup();
                done();
            });
            makeBrowserClient('client-426-855');
        });
    });

    describe('lease tests', function() {
        describe('leaseRenewOnCall', function() {

            it('server should have closed connection', function(done) {
                this.timeout(4000);
                var myServer = makeServer(methods, leaseShortTime);

                var c = makeBrowserClient();

                setTimeout(function() {
                    expect(c.RPC.socket.connected).not.to.be.true;
                    expect(Object.keys(myServer.clientChannels).length).to.be.equal(0);

                    myServer.close();
                    cleanup();
                    done();
                }, 3000);

            });

            it('server should have renewed lease', function(done) {
                this.timeout(6000);
                var myServer = makeServer(methods, leaseShortTime);

                var c = makeBrowserClient();

                setTimeout(function() {
                    c.rpcCall('dummy', []);
                }, 1500);

                setTimeout(function() {
                    expect(c.RPC.socket.connected).to.be.true;
                    expect(Object.keys(myServer.clientChannels).length).to.be.equal(1);

                }, 3000);

                setTimeout(function() {
                    expect(c.RPC.socket.connected).not.to.be.true;
                    expect(Object.keys(myServer.clientChannels).length).to.be.equal(0);

                    myServer.close();
                    cleanup();
                    done();
                }, 4000);

            });

            it('server should have renewed lease (undefined function)', function(done) {
                this.timeout(6000);
                var myServer = makeServer(methods, leaseShortTime);

                var c = makeBrowserClient();

                setTimeout(function() {
                    c.rpcCall('undefined', []);
                }, 1500);

                setTimeout(function() {
                    expect(c.RPC.socket.connected).to.be.true;
                    expect(Object.keys(myServer.clientChannels).length).to.be.equal(1);

                }, 3000);

                setTimeout(function() {
                    expect(c.RPC.socket.connected).not.to.be.true;
                    expect(Object.keys(myServer.clientChannels).length).to.be.equal(0);

                    myServer.close();
                    cleanup();
                    done();
                }, 4000);
            });

        });

        describe('No leaseRenewOnCall', function() {

            it('server should not renew lease on RPC', function(done) {
                this.timeout(6000);
                var myServer = makeServer(methods, leaseShortTimeNoRenew);
                var c = makeBrowserClient();

                setTimeout(function() {
                    c.rpcCall('dummy', []);
                }, 1500);

                setTimeout(function() {
                    expect(c.RPC.socket.connected).not.to.be.true;
                    expect(Object.keys(myServer.clientChannels).length).to.be.equal(0);

                    myServer.close();
                    cleanup();
                    done();
                }, 3000);

            });

            it('server should not renew lease on RPC undefined function', function(done) {
                this.timeout(6000);
                var myServer = makeServer(methods, leaseShortTimeNoRenew);

                var c = makeBrowserClient();

                setTimeout(function() {
                    c.rpcCall('undefined', []);
                }, 1500);

                setTimeout(function() {
                    expect(c.RPC.socket.connected).not.to.be.true;
                    expect(Object.keys(myServer.clientChannels).length).to.be.equal(0);

                    myServer.close();
                    cleanup();
                    done();
                }, 3000);

            });
        });
    });
});