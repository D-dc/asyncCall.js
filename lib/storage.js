'use strict';

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
	console.log('Storage is browser ', this.storageAvailable);
	if(this.storageAvailable)
		return localStorage.getItem(key);

	return this.s[key]; 
};

Storage.prototype.setItem = function(key, val){
	console.log('Storage is browser ', this.storageAvailable);
	if(this.storageAvailable)
		return localStorage.setItem(key, val);

	this.s[key] = val; 
};

////////////////////////////////////////////////////////////////////////////////////////////

module.exports = Storage;
