var Cache = require('../../lib/cache');
var Memcached = require('memcached');
var should = require('should');
var config = require('../conf/config');

describe('lib/cache.js', function() {
  var cacheCfg = config.cache;

  context('when initialize cache without option', function() {
    var cache = Cache.init();

    it('cache should not be instance of Memcached', function() {
      cache.constructor.should.not.be.eql(Memcached);
    });

    it('get should be availiable', function(done) {
      cache.get('key', function(err, value) {
        value.should.be.empty();
        done();
      });
    });
    it('set should be availiable', function(done) {
      cache.set('key', 'value', 5000, function(err) {
        should.not.exist(err);
        done();
      });
    });
    it('del should be availiable', function(done) {
      cache.del('key', function(err) {
        should.not.exist(err);
        done();
      });
    });
  });

  context('when initialize cache with an option but it\'s NULL', function() {
    it('should not throw an Error', function() {
      Cache.init({}).should.be.ok();
    });
  });

  context('when initialize cache with an option which include the right fields', function() {
    var cache = Cache.init(cacheCfg);

    it('should use memcached as cache', function() {
      cache.constructor.should.be.eql(Memcached);
    });

    it('set/get should be availiable', function(done) {
      cache.set('key', 'value', 5000, function() {
        cache.get('key', function(err, value) {
          value.toString().should.be.equal('value');
          done();
        });
      });
    });

    it('del should be availiable', function(done) {
      cache.del('key', function(err) {
        cache.get('key', function(err, value) {
          should.not.exist(value);
          done();
        });
      });
    });
  });
});
