ooq = require "./ooq"

class Query # Model 的 Read only 操作, 用于构建复杂的 SQL 查询语句
  constructor: (@schema) -> #{ @database, @cache, select, filter, orderby, limit }) ->
    # @_select = select
    # @_filter = filter
    # @_orderby = orderby
    # @_limit = limit
    @qengine = ooq @

  clone: -> new @constructor @

  where: (where) ->
    @_where = @qengine where
    @

  limit: (offset, limit) ->
    @_limit = if offset? then new Limit offset, limit
    @

  orderby: (column) ->
    @_orderby = if column? new Orderby column
    @

  to_sql: ->
    { fields } = @schema.$table

    if @_where?
      if @_where.filters?
        @_where.filters = @convert @_where.filters
      else
        @_where.column = fields[@_where.column]
    
    @_orderby.column = fields[@_orderby.column].column if @_orderby?

    "
      #{@_select.to_sql() ? ''}
      WHERE #{@_where?.to_sql() ? ''}
      #{@_orderby?.to_sql() ? ''}
      #{@_limit?.to_sql() ? ''}
    "
  
  getargs: ->

  select: ->
    @_select = new Select @schema
    @
  id: ->
    @_select = new Select.Id @schema
    @
  count: ->
    @_select = new Select.Count @schema
    @
  max: (column) ->
    @_select = new Select.Max @schema, column
    @
  sum: (columns) ->
    @_select = new Select.Sum @schema, columns
    @

  and: (args...) -> new Where.And args
  or: (args...) -> new Where.Or args
  xor: (args...) -> new Where.Xor args
  not: (args...) -> new Where.Not args

  like: (column, value) -> new Where column, "like", value
  eq: (column, value) -> new Where column, "=", value
  neq: (column, value) -> new Where column, "<>", value
  gt: (column, value) -> new Where column, ">", value
  gte: (column, value) -> new Where column, ">=", value
  lt: (column, value) -> new Where column, "<", value
  lte: (column, value) -> new Where column, "<=", value
  isNull: (column) -> new Where.Null column
  isNotNull: (column) -> new Where.NotNull column

class Select
  constructor: (@schema) ->

  to_sql: ->
    { name, pks } = @schema.$table
    cols = ("`#{column}`" for { column } in pks).join ","
    "SELECT #{cols} FROM `#{name}`"
  
  convert: (rows, options, callback) ->

class Select.Id extends Select
  convert: (rows, options, callback) -> setImmediate callback, null, rows

class Select.Count extends Select
  to_sql: -> "SELECT COUNT(*) AS `count` FROM `#{@schema.$table.name}`"
  convert: (rows, options, callback) ->

class Select.Max extends Select
  constructor: (schema, column) ->
    super schema
    @_column = column

  to_sql: -> "SELECT MAX(`#{@_column}`) AS `max` FROM `#{@schema.$table.name}`"

  convert: (rows, options, callback) ->

class Select.Sum extends Select
  constructor: (schema, columns) ->
    super schema
    @_columns = columns

  to_sql: ->
    { fields } = @schema.$table
    sum = ("SUM(`#{fields[column].column}`) AS `#{column}`" for column in @_columns).join ","
    "SELECT #{sum} FROM `#{@schema.$table.name}`"

  convert: (rows, options, callback) ->

class Where
  constructor: (@column, @operator, @value) ->
  to_sql: -> "`#{@column}` #{@operator} ?"
  getargs: -> [@value]

class Where.Null extends Where
  to_sql: -> "`#{column}` IS NULL"
  getargs: -> []

class Where.NotNull extends Where
  to_sql: -> "`#{column}` IS NOT NULL"
  getargs: -> []

class Where.And
  $operator: "AND"
  constructor: (args...) ->
    @filters = 
  to_sql: ->
  getargs: ->

class Where.Or extends Where.And
  $operator: "OR"

class Where.Xor extends Where.And
  $operator: "XOR"

class Where.Not extends Where.And
  $operator: "NOT"
  to_sql: ->

class Limit
  constructor: (@limit, @offset = off) ->
  to_sql: ->
    if @offset? or @offset is 0
      "LIMIT #{sql} ?, ?"
    else
      "LIMIT #{sql} ?"

  getargs: ->

class Orderby
  constructor: (@column) ->
    @order = "ASC"
    if typeof @column is "object"
      [column] = Object.keys @column
      @order = @column[column].toLowerCase()
      @column = column
  to_sql: ->
    sql = "ORDER BY `#{@column}` #{@order}"
  getargs: -> []

module.exports = Query
