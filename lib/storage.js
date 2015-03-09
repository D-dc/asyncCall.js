'use strict';

/*jslint white: true, browser: true, debug: true*/
/*global global, exports, module, require, console*/
/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError*/

var debug = false;
var log = function() {};
if (debug)
    log = console.log;

//
// Storage Library
//

var Storage = function(){
	this.s = {};
	this.storageAvailable = false;

	if(typeof localStorage !== 'undefined')
		this.storageAvailable = true;
};          

Storage.prototype.getItem = function(key){
	log('Storage getItem ', key);
	if(this.storageAvailable)
		return localStorage.getItem(key);

	return this.s[key]; 
};

Storage.prototype.setItem = function(key, val){
	log('Storage setItem ', key, val);
	if(this.storageAvailable)
		return localStorage.setItem(key, val);

	this.s[key] = val; 
};

////////////////////////////////////////////////////////////////////////////////////////////

module.exports = Storage;
