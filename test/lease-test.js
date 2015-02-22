var Lease = require('../lib/lease.js'),
    assert = require("assert"),
    expect = require('chai').expect;

/*
	Tests for lib/lease.js
*/

function testTimeBetween(dateA, dateB, minDiff, maxDiff) {
    var diff = Math.abs(dateA.getTime() - dateB.getTime());
    console.log(diff)
    if (diff > minDiff && diff < maxDiff)
        return true;

    return false;
}

describe('lib/leases.js tests', function() {
    it('lease should expire', function(done) {
        var before = new Date();
        var a1 = new Lease(500, function() {

            expect(testTimeBetween(before, new Date(), 450, 550)).to.be.true;
            done();

        });
    });

    it('lease should expire after \'renew\'', function(done) {
        var before = new Date();
        var a1 = new Lease(300, function() {

            expect(testTimeBetween(before, new Date(), 300, 350)).to.be.true;
            done();

        });

        setTimeout(function() {

            a1.renew(50);

        }, 250);
    });

    it('lease should expire after \'renewOnRpc\'', function(done) {
        var before = new Date();
        var a1 = new Lease(100, function() {

            expect(testTimeBetween(before, new Date(), 100, 200)).to.be.true;
            done();

        });

        setTimeout(function() {

            a1.renewOnRpc();

        }, 50);
    });

    it('lease should expire after \'expire\'', function(done) {
        this.timeout(100);

        var a1 = new Lease(1000, function() {

            done();

        });

        setTimeout(function() {

            a1.expire();

        }, 50);
    });

    it('lease should expire after \'expire\'', function(done) {
        this.timeout(50);

        var a1 = new Lease(1000, function() {

            done();

        });

        a1.expire();
    });

    it('lease should expire after \'revoke\'', function(done) {
        this.timeout(200);

        var a1 = new Lease(100, function() {

            done('fail');

        });

        setTimeout(function() {

            done();

        }, 150);

        a1.revoke();
    });

    it('lease \'timeLeaseLeft\' should be correct', function(done) {
        this.timeout(200);

        var a2 = new Lease(100, function() {});
        setTimeout(function() {

            expect(a2.timeLeaseLeft()).to.be.within(40, 60);
            done();

        }, 50);
    });

    it('lease \'timeLeaseLeft\' should be correct', function(done) {
        this.timeout(500);

        var a1 = new Lease(200, function() {});
        setTimeout(function() {

            expect(a1.timeLeaseLeft()).to.be.within(40, 60);
            done();

        }, 150);

        setTimeout(function() {

            a1.renew(100);

        }, 100);
    });
});