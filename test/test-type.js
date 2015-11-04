var should = require("should");
var Field = require('../lib/type');
var moment = require("moment");

describe("Test lib/type.js", function () {
  var abstract = new Field.raw();
  var json = new Field.json();
  var int = new Field.int();
  var date = new Field.date();

  context("toDB method", function () {
    it("raw abstract type should return original value", function () {
      abstract.toDB("a").should.equal("a");
    });

    it("json type should return the stringified value", function () {
      json.toDB({ name: 'Discover', version: "0.1.6" })
      .should.equal('{"name":"Discover","version":"0.1.6"}');
    });

    it("int type should return the original value", function () {
      int.toDB(10).should.equal(10);
    });

    it("date type should return a stringified-format notation", function () {
      var now = Date.now();
      date.toDB(now).should.equal(moment(now).format('YYYY-MM-DD HH:mm:ss'));
    });
  });
});
