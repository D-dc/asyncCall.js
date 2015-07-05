var ExceptionHandler = require('../lib/exception-handler.js'),
    assert = require("assert"),
    expect = require('chai').expect;

/*
    Tests for lib/exception.js
*/

function CustomError(message) {
    this.name = "CustomError";
    this.message = (message || "");
}

CustomError.prototype = new Error();
CustomError.prototype.constructor = CustomError;

var Excpt = new ExceptionHandler(true);
var ExcptNoDebug = new ExceptionHandler(false);

describe('lib/exception-handler.js tests', function() {
    describe('internals', function() {
        it('Error', function(done) {
            var e = new Error('message');

            expect(Excpt.isException(e)).to.be.true;
            expect(Excpt.isImplicitException(e)).to.be.false;
            expect(Excpt.isOfError(e)).to.be.true;
            done();
        });

        it('sub type of Error', function(done) {
            var e = new SyntaxError('message');

            expect(Excpt.isException(e)).to.be.true;
            expect(Excpt.isImplicitException(e)).to.be.true;
            expect(Excpt.isOfError(e)).to.be.true;

            done();
        });

        it('library Error', function(done) {
            var e = new FunctionNotFoundError('message');

            expect(Excpt.isException(e)).to.be.true;
            expect(Excpt.isImplicitException(e)).to.be.true;
            expect(Excpt.isOfError(e)).to.be.true;
            done();
        });

        it('other throwables: Number', function(done) {
            var e = 5;

            expect(Excpt.isException(e)).not.to.be.true;
            expect(Excpt.isImplicitException(e)).to.be.false;
            expect(Excpt.isOfError(e)).to.be.false;
            done();
        });

        it('other throwables: String', function(done) {
            var e = 'message';

            expect(Excpt.isException(e)).not.to.be.true;
            expect(Excpt.isImplicitException(e)).to.be.false;
            expect(Excpt.isOfError(e)).to.be.false;
            done();
        });

        it('other throwables: Object', function(done) {
            var e = {};

            expect(Excpt.isException(e)).not.to.be.true;
            expect(Excpt.isImplicitException(e)).to.be.false;
            expect(Excpt.isOfError(e)).to.be.false;
            done();
        });

        it('other throwables: CustomError', function(done) {
            var e = new CustomError("my custom error.");

            expect(Excpt.isException(e)).to.be.true;
            expect(Excpt.isImplicitException(e)).to.be.false;
            expect(Excpt.isOfError(e)).to.be.true;
            done();
        });
    });

    describe('serialization tests', function() {
        it('Error', function(done) {
            var e = new Error('message'),
                s = Excpt.serialize(e);

            expect(s.name).to.equal('Error');
            expect(s.type).to.equal('errio');
            expect(s.error).not.to.be.undefined;
            done();
        });

        it('sub type of Error', function(done) {
            var e = new SyntaxError('message'),
                s = Excpt.serialize(e);

            expect(s.name).to.equal('SyntaxError');
            expect(s.type).to.equal('errio');
            expect(s.error).not.to.be.undefined;    
            done();
        });

        it('library Error', function(done) {
            var e = new FunctionNotFoundError('message'),
                s = Excpt.serialize(e);

            expect(s.name).to.equal('FunctionNotFoundError');
            expect(s.type).to.equal('errio');
            expect(s.error).not.to.be.undefined;    
            done();
        });

        it('other throwables: Number (map to ApplicationLiteralError)', function(done) {
            var e = 5,
                s = Excpt.serialize(e);

            expect(s.name).to.equal('LiteralError');
            expect(s.type).to.equal('LiteralError');
            expect(s.error).not.to.be.undefined;
            done();
        });

        it('other throwables: String (map to ApplicationLiteralError)', function(done) {
            var e = 'message',
                s = Excpt.serialize(e);

            expect(s.name).to.equal('LiteralError');
            expect(s.type).to.equal('LiteralError');
            expect(s.error).not.to.be.undefined;
            done();
        });

        it('other throwables: Object (map to ApplicationLiteralError)', function(done) {
            var e = {},
                s = Excpt.serialize(e);

            expect(s.name).to.equal('LiteralError');
            expect(s.type).to.equal('LiteralError');
            expect(s.error).not.to.be.undefined;
            done();
        });

        it('other throwables: CustomError', function(done) {
            var e = new CustomError("my custom error."),
                s = Excpt.serialize(e);
            
            expect(s.name).to.equal('CustomError');
            expect(s.type).to.equal('errio');
            expect(s.error).not.to.be.undefined;

            done();
        });
    });

    describe('deserialize tests', function() {

        it('error', function(done) {
            var e = new Error('message');
                e.customProperty = 42; //we add a custom property to exception
            var s = Excpt.deserialize(Excpt.serialize(e));

            expect(s.name).to.equal('Error');
            expect(s.name).to.equal(e.name);
            expect(s.message).to.equal(e.message);
            expect(s.stack).not.to.be.undefined;
            expect(s).to.be.an.instanceof(Error);
            expect(s.customProperty).to.equal(42);
            done();
        });

        it('sub type of error', function(done) {
            var e = new SyntaxError('message');
                e.customProperty = 42; //we add a custom property to exception
            var s = Excpt.deserialize(Excpt.serialize(e));

            expect(s.name).to.equal('SyntaxError');
            expect(s.name).to.equal(e.name);
            expect(s.message).to.equal(e.message);
            expect(s.stack).not.to.be.undefined;
            expect(s).to.be.an.instanceof(Error);
            expect(s.customProperty).to.equal(42);
            done();
        });

        it('library Error', function(done) {
            var e = new FunctionNotFoundError('message');
                e.customProperty = 42; //we add a custom property to exception
                s = Excpt.deserialize(Excpt.serialize(e));

            expect(s.name).to.equal('FunctionNotFoundError');
            expect(s.name).to.equal(e.name);
            expect(s.message).to.equal(e.message);
            expect(s.stack).not.to.be.undefined;
            expect(s).to.be.an.instanceof(Error);
            expect(s).to.be.an.instanceof(FunctionNotFoundError);
            expect(s.customProperty).to.equal(42);
            done();
        });

        it('other throwables: number (map to LiteralError)', function(done) {
            var e = 5,
                s = Excpt.deserialize(Excpt.serialize(e));

            expect(s).to.equal(e);
            done();
        });

        it('other throwables: string (map to LiteralError)', function(done) {
            var e = 'message',
                s = Excpt.deserialize(Excpt.serialize(e));

            expect(s).to.equal(e);
            done();
        });

        it('other throwables: object (map to LiteralError)', function(done) {
            var e = {},
                s = Excpt.deserialize(Excpt.serialize(e));

            expect(s).to.eql(e);
            done();
        });

        it('other throwables: CustomError (undefined)', function(done) {
            var e = new CustomError("my custom error."),
                s = Excpt.deserialize(Excpt.serialize(e));

            expect(s.name).to.equal('Error');
            expect(s.stack).not.to.be.undefined;
            expect(s).to.be.an.instanceof(Error);

            //Exception not defined.
            done();
        });

        describe('other throwables: (node)', function() {
            //
            before(function() {
                global.CustomError = CustomError;
            });

            it('other throwables: CustomError', function(done) {
                var e = new CustomError("my custom error.");
                    e.customProperty = 42; //we add a custom property to exception
                var s = Excpt.deserialize(Excpt.serialize(e));

                expect(s.name).to.equal('CustomError');
                expect(s.stack).not.to.be.undefined;
                expect(s).to.be.an.instanceof(Error);
                expect(s).to.be.an.instanceof(CustomError);
                expect(s.customProperty).to.equal(42);
                done();
            });
        });

        describe('other throwables: (browser)', function() {
            before(function() {
                window = {};
                window.CustomError = CustomError;
            });

            it('other throwables: CustomError', function(done) {
                var e = new CustomError("my custom error.");
                    e.customProperty = 42; //we add a custom property to exception
                var s = Excpt.deserialize(Excpt.serialize(e));

                expect(s.name).to.equal('CustomError');
                expect(s.stack).not.to.be.undefined;
                expect(s).to.be.an.instanceof(Error);
                expect(s).to.be.an.instanceof(CustomError);
                expect(s.customProperty).to.equal(42);
                done();
            });
        });

    });

    describe('debug mode', function() {
            
        it('Stacktrace with debug mode should be serialized', function(done) {
            var e = new Error('message'),
            s = ExcptNoDebug.deserialize(Excpt.serialize(e));

            expect(s.name).to.equal('Error');
            expect(s.name).to.equal(e.name);
            expect(s.message).to.equal(e.message);
            expect(s.stack).to.equal(e.stack);
            expect(s).to.be.an.instanceof(Error);
            done();
        });

        it('Stacktrace without debug mode should not be serialized', function(done) {
            var e = new Error('message'),
                ser = ExcptNoDebug.serialize(e),
                s = ExcptNoDebug.deserialize(ser);

            expect(s.name).to.equal('Error');
            expect(s.name).to.equal(e.name);
            expect(s.message).to.equal(e.message);
            expect(ser.stack).to.be.undefined;
            expect(s).to.be.an.instanceof(Error);
            done();
        });
    });

});