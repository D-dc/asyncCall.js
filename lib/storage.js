'use strict';

//
// Storage Library
//

var Storage = function(){
	this.s = {};
	this.isBrowser = !(typeof module !== 'undefined' && module.exports);
};          

Storage.prototype.getItem = function(key){
	if(this.isBrowser)
		return localStorage.getItem(key);

	return this.s[key]; 
};

Storage.prototype.setItem = function(key, val){
	if(this.isBrowser)
		return localStorage.setItem(key, val);

	this.s[key] = val; 
};

////////////////////////////////////////////////////////////////////////////////////////////

if (typeof module !== 'undefined' && module.exports){
	module.exports = Storage;
} 