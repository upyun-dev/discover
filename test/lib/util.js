var util = require('../../lib/util');
require('should');

describe('util.js', function() {
  describe('isEntity', function() {
    it('should return false if no model passed', function() {
      util.isEntity().should.false();
    });
  });
  describe('Class', function() {
    it('should be ok', function() {
      var NewClass = util.Class({});
      var newClass = new NewClass();
      newClass.should.be.ok();
    });
  });
});
