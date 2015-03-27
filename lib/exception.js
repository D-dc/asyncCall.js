'use strict';

/*jslint white: true, browser: true, debug: true*/
/*global global, exports, module, require*/
/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError*/

var customExcptions = require('./rpc-exception.js');

//
// Exceptions
//

/*
Standard, build-in JavaScript errors (usually seen as implicit exceptions):
	– Error 
	– EvalError  
	– RangeError 
	– ReferenceError 
	– SyntaxError 
	– TypeError 
	– URIError 

Explicit exceptions:
	Other throwables (like throw 5) are mapped onto Error.
	Custom subtypes of Error are also mapped onto Error (As these might not be defined on the other side).

There are some custom RPC exceptions:
	– see ./rpc-exception.js
	These are all subtypes of Javascript Error type.
*/

var javascriptDefinedErrors = [
		EvalError, 
		RangeError, 
		ReferenceError, 
		SyntaxError, 
		TypeError, 
		URIError
	];

var rpcDefinedErrors = [
		TimeOutError,
		FunctionNotFoundError,
		LeaseExpiredError,
		SerializationError,
		DeserializionError,
		NoConnectionError
	];


var excpt = {};
excpt.serialize = function(exception){
	try{

		// JS exceptions and library exceptions.
		// e.g. throw new ReferenceError();
		if(this.isOfError(exception) || this.isImplicitException(exception)){
			return {
				name: exception.name,
				message: exception.message,
				stack: exception.stack //!
			};
		}

		// Application / user defined exceptions.
		// e.g. throw new MyCustomException();
		// IMPORTANT: make sure the 'other side' knows about the exception!
		if(exception instanceof Error){
			return {
				name: exception.name,
				message: exception.message,
				stack: exception.stack //!
			};
		}

		// Others.
		// e.g. throw new 5; --> Error.
		return {
			name: 'Error',
			message: JSON.stringify(exception),
			stack: ''
		};

	}catch(e){
		return excpt.serialize(new SerializationError('Exception serialize error, ' + e.message));
		/*return {
			name: 'Error',
			message: 'Exception serialize error, ' + e.message,
			stack: ''
		};*/

	}
};

excpt.deserialize = function(object){
	try{	
		var name = object.name,
			message = object.message,
			stack = object.stack,
			ExcFunc;

		if(typeof window !== 'undefined' && window[name]){ //browser

			ExcFunc = window[name];

		}else if(typeof global !== 'undefined' && global[name])	{ //node

			ExcFunc = global[name];

		}else{
			
			return new Error('Exception not defined, ' + message);

		}	

		var exception = new ExcFunc(message);
		exception.stack = stack;

		return exception;
		
	}catch(e){
		return new DeserializionError('Exception deserialize error, ' + e.message);
		//return new Error('Exception deserialize error, ' + e.message);
	}
};

excpt.isException = function(value){
	if (
		(value.name && value.message && value.stack) &&
		(value.name === 'Error' || value instanceof Error 
			//|| filter(value.name, function(){ return true;}, function(){ return false;})
			)
		)
		return true;

	return false;
};

var filter = function (value, caseTrue, caseFalse){
	if(
		javascriptDefinedErrors.some(function(error){
			if(value instanceof error)
				return true;

			return false;
		}) ||
		rpcDefinedErrors.some(function(error){
			if(value instanceof error)
				return true;

			return false;
		})
	)
		return caseTrue();	
		
		//custom exception
		return caseFalse();
};

excpt.isImplicitException = function(value){
	return filter(value, function(){ return true;}, function(){ return false;});
};

excpt.isOfError = function(value){
	return (value instanceof Error && value.name === 'Error');
};

////////////////////////////////////////////////////////////////////////////////////////////


module.exports =  excpt;