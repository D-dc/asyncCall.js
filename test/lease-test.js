var Lease = require('../lib/lease.js'),
    assert = require("assert"),
    expect = require('chai').expect;

/*
	Tests for lib/lease.js
*/

// function testTimeBetween(dateA, dateB, minDiff, maxDiff) {
//     var diff = Math.abs(dateA.getTime() - dateB.getTime());
//     if (diff > minDiff && diff < maxDiff)
//         return true;

//     return false;
// }

// describe('lib/leases.js tests', function() {
//     describe('Normal lease:', function() {
//         it('lease should expire within time bounds.', function(done) {
//             var before = new Date();
//             var a1 = new Lease(500, function() {

//                 expect(testTimeBetween(before, new Date(), 450, 550)).to.be.true;
//                 done();

//             });
//         });

//         it('lease should still expire after \'renew\' within time bounds.', function(done) {
//             var before = new Date();
//             var a1 = new Lease(300, function() {

//                 expect(testTimeBetween(before, new Date(), 250, 350)).to.be.true;
//                 done();

//             });

//             setTimeout(function() {

//                 a1.renew(50);

//             }, 250);
//         });

//         it('lease should still expire after \'renewOnRpc\' within time bounds.', function(done) {
//             var before = new Date();
//             var a1 = new Lease(100, function() {

//                 expect(testTimeBetween(before, new Date(), 100, 200)).to.be.true;
//                 done();

//             }, true);

//             setTimeout(function() {

//                 a1.renewOnRpc();

//             }, 50);
//         });

//         it('lease should expire immediately after \'expire\' call.', function(done) {
//             this.timeout(100);

//             var a1 = new Lease(1000, function() {

//                 done();

//             });

//             setTimeout(function() {

//                 a1.expire();

//             }, 50);
//         });

//         it('lease should expire immediately after \'expire\' call.', function(done) {
//             this.timeout(50);

//             var a1 = new Lease(1000, function() {

//                 done();

//             });

//             a1.expire();
//         });

//         it('lease should not expire after \'revoke\' call.', function(done) {
//             this.timeout(200);

//             var a1 = new Lease(100, function() {

//                 done('fail');

//             });

//             setTimeout(function() {

//                 done();

//             }, 150);

//             a1.revoke();
//         });
//     });
    
//     describe('RenewOnCall lease:', function() {
//         it('lease should expire within certain time bounds.', function(done) {
//             var before = new Date();
//             var a1 = new Lease(500, function() {

//                 expect(testTimeBetween(before, new Date(), 450, 550)).to.be.true;
//                 done();

//             }, true, 500);
//         });

//         it('lease should expire after \'renew\' within time bounds.', function(done) {
//             var before = new Date();
//             var a1 = new Lease(300, function() {

//                 expect(testTimeBetween(before, new Date(), 250, 350)).to.be.true;
//                 done();

//             }, true, 500);

//             setTimeout(function() {

//                 a1.renew(50);

//             }, 250);
//         });

//         it('lease should expire after \'renewOnRpc\' within certain time bounds.', function(done) {
//             var before = new Date();
//             var a1 = new Lease(100, function() {

//                 expect(testTimeBetween(before, new Date(), 150, 250)).to.be.true;
//                 done();

//             }, true, 100);

//             setTimeout(function() {

//                 a1.renewOnRpc();

//             }, 50);
//         });

//         it('lease should expire after \'expire\' method call.', function(done) {
//             this.timeout(100);

//             var a1 = new Lease(1000, function() {

//                 done();

//             }, true, 100);

//             setTimeout(function() {

//                 a1.expire();

//             }, 50);
//         });

//         it('lease should immediately expire after \'expire\' call.', function(done) {
//             this.timeout(50);

//             var a1 = new Lease(1000, function() {

//                 done();

//             }, true, 100);

//             a1.expire();
//         });

//         it('lease should not expire after \'revoke\' call.', function(done) {
//             this.timeout(200);

//             var a1 = new Lease(100, function() {

//                 done('fail');

//             }, true, 100);

//             setTimeout(function() {

//                 done();

//             }, 150);

//             a1.revoke();
//         });
//     });    


//     describe('Other tests:', function() {

//         it('\'timeLeaseLeft\' should be correct.', function(done) {
//             this.timeout(200);

//             var a2 = new Lease(100, function() {});
//             setTimeout(function() {

//                 expect(a2.timeLeaseLeft()).to.be.within(40, 60);
//                 done();

//             }, 50);
//         });

//         it('\'timeLeaseLeft\' should be correct after renew.', function(done) {
//             this.timeout(500);

//             var a1 = new Lease(200, function() {});
//             setTimeout(function() {

//                 expect(a1.timeLeaseLeft()).to.be.within(40, 60);
//                 done();

//             }, 150);

//             setTimeout(function() {

//                 a1.renew(100);

//             }, 100);
//         });

//         it('\'timeLeaseLeft\' should be correct after renewOnCall.', function(done) {
//             this.timeout(500);

//             var a1 = new Lease(200, function() {}, true, 100);
//             setTimeout(function() {

//                 expect(a1.timeLeaseLeft()).to.be.within(40, 60);
//                 done();

//             }, 150);

//             setTimeout(function() {

//                 a1.renewOnRpc(100);

//             }, 100);
//         });

//         it('\'timeLeaseLeft\' of expired lease should be zero after expired.', function(done) {
//             this.timeout(200);

//             var a2 = new Lease(100, function() {});
//             setTimeout(function() {

//                 expect(a2.timeLeaseLeft()).to.equal(0);
//                 done();

//             }, 150);
//         });
//     });    
// });