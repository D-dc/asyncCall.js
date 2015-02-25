'use strict';

//
// RPC Exceptions
//


/*
	TimeOutError: used when a RPC due is expired.
*/
var TimeOutError = function (message) {
    this.name = "TimeOutError";
    this.message = (message || "");
};

TimeOutError.prototype = new Error();
TimeOutError.prototype.constructor = TimeOutError;


/*
	FunctionNotFoundError: used when performing an RPC but the function is not found.
*/
var FunctionNotFoundError = function (message) {
    this.name = "FunctionNotFoundError";
    this.message = (message || "");
};

FunctionNotFoundError.prototype = new Error();
FunctionNotFoundError.prototype.constructor = FunctionNotFoundError;


//Sadly we have to pollute the global environment with these Errors to make them accessible in the clientside program
global.TimeOutError = TimeOutError;
global.FunctionNotFoundError = FunctionNotFoundError;
