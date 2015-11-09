var Cache = require("../../lib/cache");
var Memcached = require('memcached');
var should = require('should');

var cacheCfg = {
  servers: "127.0.0.1:11211",
  options: {}
};

describe("Test lib/cache.js", function () {

  context("* initialize cache without option", function () {
    var cache = Cache.init();

    it("should still availiable and fallback into inner-process memory storage", function () {
      cache.should.be.ok();
    });

    it("get should be availiable", function (done) {
      cache.get("key", function (err, value) {
        value.should.be.empty();
        done();
      });
    });
    it("set should be availiable", function (done) {
      cache.set("key", "value", 5000, function (err) {
        should.not.exist(err);
        done();
      });
    });
    it("del should be availiable", function (done) {
      cache.del("key", function (err) {
        should.not.exist(err);
        done();
      });
    });
  });

  context("initialize cache with an option but it's NULL", function () {
    it("should not throw an Error", function () {
      Cache.init({}).should.be.ok();
    });
  });

  context("initialize cache with an option which include the right fields", function () {
    var cache = Cache.init(cacheCfg);

    it("should use memcached as cache", function () {
      cache.constructor.should.be.eql(Memcached);
    });

    it("set/get should be availiable", function (done) {
      cache.set("key", "value", 5000, function () {
        cache.get("key", function (err, value) {
          value.toString().should.be.equal("value");
          done();
        });
      });
    });

    it("del should be availiable", function (done) {
      cache.del("key", function (err) {
        cache.get("key", function (err, value) {
          should.not.exist(value);
          done();
        });
      });
    });
  });
});
