'use strict';
//
// Leases
//

var Lease = function(timeLeft, invokeOnExpire, renewOnCall, renewalTime){
	if(timeLeft === Infinity){
		this.isExpired = true;
		return;
	}

	this.timeLeft = timeLeft;
	this.renewOnCall = renewOnCall || false;
	this.renewalTime = renewalTime || timeLeft;
	this.invokeOnExpire = invokeOnExpire;
			
	var that = this;
	var current = new Date();
	this.expireTimer = setTimeout(function(){
			that._invokeExpired(that);
		}, timeLeft);
	this.expireTime = current.getTime() + timeLeft;
	this.isExpired = false;

	console.log('new lease with ', timeLeft, invokeOnExpire, renewOnCall, renewalTime);
};

//Renew the expiration time by predetermined 'renewalTime'
Lease.prototype.renewOnRpc = function(){
	if(this.isExpired) return;
	console.log('renewing lease for', this.renewalTime);

	if(this.renewOnCall)
		this.renew(this.renewalTime);
};

//Renew the expiration time by given 
Lease.prototype.renew = function(renewalTime){
	if(this.isExpired) return;
	
	var that = this;
	clearTimeout(this.expireTimer);
	var current = new Date();
	this.expireTimer = setTimeout(
		function(){
			that._invokeExpired(that);
		}, renewalTime);
	this.expireTime = current.getTime() + renewalTime;
};

//Expire the lease now
Lease.prototype.expire = function(){
	if(this.isExpired) return;

	clearTimeout(this.expireTimer);
	this._invokeExpired(this);
	this.isExpired = true;
};

//Revoke the lease
Lease.prototype.revoke = function(){
	if(this.isExpired) return;

	clearTimeout(this.expireTimer);
};

//The time in Milliseconds left until expiration
Lease.prototype.timeLeaseLeft = function(){
	var current = new Date();
	var timeLeft = this.expireTime - current.getTime();

	if(timeLeft < 0)
		return 0;

	return timeLeft;
};

Lease.prototype._invokeExpired = function(context){
	if(context.isExpired) return;

	context.invokeOnExpire();
	context.isExpired = true;
};

//////////////////////////////////////////////////////////////////////////


if (typeof module !== 'undefined' && module.exports){
	module.exports =  Lease;
} 