'use strict';

/*jslint white: true, browser: true, debug: true*/
/*global global, exports, module, require, console*/

//
// RPC Exceptions
//

var NetworkError = function (message) {
    this.name = 'NetworkError';
    this.message = (message || '');
};

NetworkError.prototype = new Error();
NetworkError.prototype.constructor = NetworkError;



var NoConnectionError = function (message) {
    this.name = 'NoConnectionError';
    this.message = (message || '');
};

NoConnectionError.prototype = new NetworkError();
NoConnectionError.prototype.constructor = NoConnectionError;

var LibraryError = function (message) {
    this.name = 'LibraryError';
    this.message = (message || '');
};

LibraryError.prototype = new Error();
LibraryError.prototype.constructor = LibraryError;


/*
	TimeOutError: used when a RPC due is expired.
*/
var TimeOutError = function (message) {
    this.name = 'TimeOutError';
    this.message = (message || '');
};

TimeOutError.prototype = new NetworkError();
TimeOutError.prototype.constructor = TimeOutError;


/*
	FunctionNotFoundError: used when performing an RPC but the function is not found.
*/
var FunctionNotFoundError = function (message) {
    this.name = 'FunctionNotFoundError';
    this.message = (message || '');
};

FunctionNotFoundError.prototype = new LibraryError();
FunctionNotFoundError.prototype.constructor = FunctionNotFoundError;


/*
	SerializationError
*/
var SerializationError = function (message) {
    this.name = 'SerializationError';
    this.message = (message || '');
};

SerializationError.prototype = new LibraryError();
SerializationError.prototype.constructor = SerializationError;

/*
	DeserializeError
*/
var DeserializionError = function (message) {
    this.name = 'DeserializionError';
    this.message = (message || '');
};

DeserializionError.prototype = new LibraryError();
DeserializionError.prototype.constructor = DeserializionError;

/*
	LeaseExpiredError: used for failing still open RPC calls.
*/
var LeaseExpiredError = function (message) {
    this.name = 'LeaseExpiredError';
    this.message = (message || '');
};

LeaseExpiredError.prototype = new NetworkError();
LeaseExpiredError.prototype.constructor = LeaseExpiredError;


//Sadly we have to pollute the global environment with these Errors to make them accessible in the clientside program
global.NetworkError = NetworkError;
global.NoConnectionError = NoConnectionError;
global.LibraryError = LibraryError;
global.TimeOutError = TimeOutError;
global.FunctionNotFoundError = FunctionNotFoundError;
global.SerializationError = SerializationError;
global.DeserializionError = DeserializionError;
global.LeaseExpiredError = LeaseExpiredError;
