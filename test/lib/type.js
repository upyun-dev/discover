var should = require("should");
var Field = require('../../lib/type');
var moment = require("moment");

describe("lib/type.js", function() {
  var abstract = new Field.raw();
  var json = new Field.json();
  var int = new Field.int();
  var date = new Field.date();

  describe("toDB", function() {
    it("raw abstract type should return original value", function() {
      abstract.toDB("a").should.equal("a");
    });

    context('for json type', function() {
      it("json type should return the stringified value", function() {
        json.toDB({ name: 'Discover', version: "0.1.6" })
        .should.equal('{"name":"Discover","version":"0.1.6"}');
      });

      it('null or undefined value should return it own', function() {
        should.deepEqual(json.toDB(), undefined);
        should.deepEqual(json.toDB(null), null);
      });
    });

    context('for date type', function() {
      it("date type should return a stringified-format notation", function() {
        var now = Date.now();
        date.toDB(now).should.equal(moment(now).format('YYYY-MM-DD HH:mm:ss'));
      });
      it('null or undefined value should return it own', function() {
        should.equal(date.toDB(), undefined);
      });
    });
  });

  describe('fromDB', function() {
    it('raw type should return the original value', function() {
      abstract.fromDB('a').should.equal('a');
    });
    context('for json type', function() {
      it('json type should return a JSON object', function() {
        json.fromDB('{"k": "v"}').k.should.equal('v');
      });

      it('null or undefined value should return it own', function() {
        should.equal(json.fromDB(), undefined);
      });
      it("a non-standard json should return null", function() {
        should.not.exist(json.fromDB("non"));
      });
    });
    context('for date type', function() {
      it('date type should return a Date', function() {
        var val = '1993-11-05 19:39:05';
        date.fromDB(val).toString().should.equal(moment(val).toDate().toString());
      });

      it('null or undefined value should return it own', function() {
        should.equal(date.fromDB(), undefined);
      });
    });
  });

  describe('defaultValue', function() {
    it('raw type return null', function() {
      should.not.exist(abstract.defaultValue());
    });
    it('json type return {}', function() {
      Object.keys(json.defaultValue()).length.should.equal(0);
    });
    it('int return 0', function() {
      int.defaultValue().should.equal(0);
    });
    it('date return now', function() {
      date.defaultValue().constructor.should.be.equal(Date);
    });
  });
});
