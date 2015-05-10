'use strict';

/*jslint white: true, browser: true, debug: true*/
/*global global, exports, module, require*/
/*global TimeOutError, FunctionNotFoundError, LeaseExpiredError, SerializationError,DeserializionError, NoConnectionError*/

require('./rpc-exception.js');

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

var nativeJSErrors = [
	EvalError,
	RangeError,
	ReferenceError,
	SyntaxError,
	TypeError,
	URIError
];

var libraryErrors = [
	FunctionNotFoundError,
	SerializationError,
	DeserializionError,
	TooManyArgumentsError
];

var networkErrors = [
	TimeOutError,
	NoConnectionError
];



var excpt = {};
excpt.serialize = function (exception) {
	try {

		// JS exceptions and library exceptions.
		// e.g. throw new ReferenceError();
		if (this.isOfError(exception) || this.isImplicitException(exception)) {
			return {
				name: exception.name,
				message: exception.message,
				stack: exception.stack //!
			};
		}

		// Application / user defined exceptions.
		// e.g. throw new MyCustomException();
		// IMPORTANT: make sure the 'other side' knows about the exception!
		if (exception instanceof Error) {
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

	} catch (e) {

		return excpt.serialize(new SerializationError('Exception serialize error, ' + e.message));

	}
};

excpt.deserialize = function (object) {
	try {
		var name = object.name,
			message = object.message,
			stack = object.stack,
			ExcFunc;

		if (typeof window !== 'undefined' && window[name]) { //browser

			ExcFunc = window[name];

		} else if (typeof global !== 'undefined' && global[name]) { //node

			ExcFunc = global[name];

		} else {

			return new Error('Exception not defined, ' + message);

		}

		var exception = new ExcFunc(message);
		exception.stack = stack;

		return exception;

	} catch (e) {

		return new DeserializionError('Exception deserialize error, ' + e.message);

	}
};

excpt.isException = function (value) {
	if ((value.name && value.message && value.stack) &&
		(value.name === 'Error' || value instanceof Error))
		return true;

	return false;
};

excpt.isNativeError = function (value) {
	var e =
		nativeJSErrors.some(function (error) {
			if (value instanceof error) {

				return true;
			}

			return false;
		});

	return e;
};

excpt.isLibraryError = function (value) {
	var e =
		libraryErrors.some(function (error) {
			if (value instanceof error) {
				return true;
			}

			return false;
		});

	return e;
};

excpt.isNetworkError = function (value) {
	var e =
		networkErrors.some(function (error) {
			if (value instanceof error) {
				return true;
			}

			return false;
		});

	return e;
};

var filter = function (value, caseTrue, caseFalse) {
	if (
		excpt.isNativeError(value) ||
		excpt.isLibraryError(value) ||
		excpt.isNetworkError(value)
	)
		return caseTrue();

	//custom exception
	return caseFalse();
};

excpt.isImplicitException = function (value) {
	return filter(value, function () {
		return true;
	}, function () {
		return false;
	});
};

excpt.isOfError = function (value) {
	return (value instanceof Error);
};
////////////////////////////////////////////////////////////////////////////////////////////


module.exports = excpt;