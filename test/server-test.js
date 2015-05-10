'use strict';

var express = require('express'),
    ServerRpc = require('../lib/rpc-server.js'),
    ClientRpc = require('../lib/rpc-client.js'),
    port = 8126,
    assert = require('assert'),
    expect = require('chai').expect;

var serverHttp;

var makeServer = function(methods, options) {
    var app = express();
    app.use('/', express.static(__dirname + '/'));
    var s = new ServerRpc(app, port, options);
    s.expose(methods);
    return s;
};

var clientOptions = {
    reconnection: true, //auto reconnect
    reconnectionAttempts: Infinity, //attempts before giving up
    reconnectionDelay: 1000, //how long to wait before reconnect (doubles + randomized by randomizationFactor)
    reconnectionDelayMax: 5000, //max delay before reconnection
    randomizationFactor: 0.5,
    timeout: 2000, //time before connect_error, connect_timeout events
    autoConnect: true, //automatically connect
    defaultRpcTimeout: Infinity //default delay before an RPC call should have its reply. Infinity = no timeout
};

var makeBrowserClient = function(clientId, options) {
    if (options)
        var c = new ClientRpc('http://127.0.0.1:' + port, options);
    else
        var c = new ClientRpc('http://127.0.0.1:' + port, clientOptions);

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

var cleanup = function() {
    port++;
};

describe('Server tests', function() {

    it('exposed methods', function(done) {
        var myServer = makeServer(methods, defaultOptions);
        expect(Object.keys(myServer.exposedFunctions).length).to.be.equal(1);

        cleanup();
        done();
    });

    describe('clientChannels tests', function() {

        it('new client', function(done) {
            var myServer = makeServer(methods, defaultOptions);

            myServer.onConnection(function(s) {
                expect(Object.keys(myServer.clientChannels).length).to.be.equal(1);
                expect(Object.keys(s.RPC.exposedFunctions).length).to.be.equal(1);

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

                cleanup();
                done();
            });
            makeBrowserClient('client-426-855');
        });

        it('server should remove connection when client send close message', function(done) {
            this.timeout(10000);
            var myServer = makeServer(methods, defaultOptions);
            var c = makeBrowserClient();

            setTimeout(function() {
                expect(c.RPC.socket.connected).to.be.true;
                expect(Object.keys(myServer.clientChannels).length).to.be.equal(1);

            }, 2000);

            setTimeout(function() {
                c._close(); //client closes connection

            }, 2500);

            setTimeout(function() {
                expect(c.RPC.socket.connected).not.to.be.true;
                expect(Object.keys(myServer.clientChannels).length).to.be.equal(1);

                cleanup();
                done();
            }, 3000);
        });
    });
});