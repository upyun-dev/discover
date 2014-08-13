var node_util = require('util');

var _ = require('underscore');

exports = module.exports = _.extend({}, _, node_util);

exports.Class = function(params){//{{{
    var superClass = params.Extends;

    delete params.Extends;

    var newClass = function(){
        var value = (this.initialize) ? this.initialize.apply(this, arguments) : this;
        return value;
    }
    newClass.$constructor = exports.Class;
    if (superClass) node_util.inherits(newClass, superClass);

    exports.extend(newClass.prototype, params);
    return newClass;
};//}}}
