lo = require "lodash"

class Operator
  constructor: (@column, @$name, @value) ->
  to_sql: -> "`#{@column}` #{@$name} ?"
  getargs: -> [@value]

class Operator.Null
  $name: "NULL"
  constructor: (@column) ->
  to_sql: -> "`#{@column}` IS #{@$name}"
  getargs: -> []

class Operator.NotNull extends Operator.Null
  $name: "NOT NULL"

class Operator.And
  $name: "AND"
  constructor: (args...) -> @filters = for f in lo.flattenDeep args when f? then f
  to_sql: ->
    sql = (f.to_sql() for f in @filters).join " #{@$name} "
    if @filters.length > 1 then "(#{sql})" else sql

  getargs: -> lo.flattenDeep (f.getargs() for f in @filters)

class Operator.Or extends Operator.And
  $name: "OR"

class Operator.Xor extends Operator.And
  $name: "XOR"

class Operator.Not extends Operator.And
  $name: "NOT"
  to_sql: -> "#{@$name} #{(f.to_sql() for f in @filters).join ' '}"

module.exports =
  and: (args...) -> new Operator.And args
  or: (args...) -> new Operator.Or args
  not: (args...) -> new Operator.Not args
  xor: (args...) -> new Operator.Xor args

  like: (column, value) -> new Operator column, "like", value
  eq: (column, value) -> new Operator column, "=", value
  neq: (column, value) -> new Operator column, "<>", value
  gt: (column, value) -> new Operator column, ">", value
  gte: (column, value) -> new Operator column, ">=", value
  lt: (column, value) -> new Operator column, "<", value
  lte: (column, value) -> new Operator column, "<=", value
  isNull: (column) -> new Operator.Null column
  isNotNull: (column) -> new Operator.NotNull column