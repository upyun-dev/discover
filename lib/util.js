var util = require('util');

var _ = require('underscore');

exports = module.exports = _.extend({}, _, util);

exports.Class = function(params) {
  var superClass = params.Extends;

  delete params.Extends;

  var newClass = function() {
    var value = (this.initialize) ? this.initialize.apply(this, arguments) : this;
    return value;
  };
  newClass.$constructor = exports.Class;
  if (superClass) util.inherits(newClass, superClass);

  exports.extend(newClass.prototype, params);
  return newClass;
};
