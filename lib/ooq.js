var ooq = require('ooq');
var Parser = ooq.Parser;
var SemanticAnalysis = ooq.SemanticAnalysis;
var setupFFI = ooq.setup_ffi;
var qengine = function(query) {
  var t = new Parser(query);
  return new SemanticAnalysis(t.tree).query_code;
};

module.exports = function(ffi) {
  setupFFI(ffi);
  return qengine;
};
