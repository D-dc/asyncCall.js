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


var list =[];

var methods = {
    'testAppend': function(el) {
        list.push(el);
        return true;
    },
    'testErrorFunc': function() {
        throw Error();
    },
};

var myServer = new ServerRpc(serverHttp, {throwNativeError:true});
myServer.expose(methods);

var myClient = new ClientRpc('http://127.0.0.1:8125', {throwNativeError:true});
var myClient2 = new ClientRpc('http://127.0.0.1:8125', {throwNativeError:false});
myClient.expose({});


var checkSequentialOrdering = function(end){
    var prev =0;
    for(var i in list){
        if(list[i] < prev || 1 != list[i]-prev){
            return false;
        }

        prev=list[i]
    };

    if(prev != end)
        return false;

    return true;
};



    describe('Ordering', function() {

        it('rpc ordering 1 client', function(done) {
            this.timeout(5000);
        
            var counter = 1
            while(counter <= 50){
                 myClient.rpc('testAppend', [counter], function(err, res) {
                    expect(err).to.equal(null);
                    expect(res).to.be.true;
                 });
                 counter++;
            }
            setTimeout(function(){
                expect(checkSequentialOrdering(50)).to.be.true;
                done();
            }, 2000)
            
        
        });


        it('rpc ordering with error', function(done) {
            this.timeout(5000);
            list =[];

            var counter = 1;
            while(counter <= 50){
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
            setTimeout(function(){
                expect(checkSequentialOrdering(50)).to.be.true;
                done();
            }, 2000)
            
        
        });

    });
    


