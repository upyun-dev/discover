ooq = require "ooq"
lo = require "lodash"
operators_ffi = require "./operators"

class AGAIN extends Error
  constructor: (message) ->
    super message
    @name = @constructor.name
    # Error.captureStackTrace @, @constructor

# new Query User

# .select()
# .select().where(condition).limit(count, offset).orderby(column)
# .id().where(condition).limit(count, offset).orderby(column)
# .max().where(condition).limit(count, offset).orderby(column)
# .sum().where(condition).limit(count, offset).orderby(column)
# .count().where(condition).limit(count, offset).orderby(column)

# .update().set(model)
# .update().set(attrs).where(condition)

# .delete(model)
# .delete().where(condition)

class Query # Model 的 query 操作, 用于构建下层 SQL 查询语句
  max_retry_times: 3

  constructor: (@schema) ->

  to_sql: -> @["to_#{@_query_type}_sql"]()

  to_select_sql: ->
    [
      "
        #{@_select.to_sql()}
        #{@_where?.to_sql()}
        #{@_orderby?.to_sql() ? ''}
        #{@_limit?.to_sql() ? ''}
      ".trim()
      @getargs @_where?.getargs(), @_orderby?.getargs(), @_limit?.getargs()
    ]

  to_insert_sql: ->
    [
      "
        #{@_insert.to_sql()}
        #{@_values.to_sql()}
      ".trim()
      @getargs @_values.getargs()
    ]

  to_update_sql: ->
    [
      "
        #{@_update.to_sql()}
        #{@_set.to_sql()}
        #{@_where.to_sql()}
      ".trim()
      @getargs @_set.getargs(), @_where.getargs()
    ]

  to_delete_sql: ->
    [
      "
        #{@_delete.to_sql()}
        #{@_where.to_sql()}
      ".trim()
      @getargs @_where.getargs()
    ]

  getargs: (args...) -> lo(args).compact().flattenDeep().value()

  execute: (options) ->
    @schema.$database.query @to_sql()...
    .then (ret) => @["_#{@_query_type}"].convert_result ret

  _query: () ->
    @schema.$database.query @to_sql()...
    .then (rows) -> callback null, rows
    .catch (err) -> callback err

  limit: (limit, offset) ->
    @_limit = if limit? then new Limit limit, offset
    @

  orderby: (column) ->
    @_orderby = if column? then new Orderby column
    @

  select: ->
    @_select = new Select @schema
    @_query_type = "select"
    @

  where: (condition) ->
    @_where = new Where @schema, condition
    @

  update: ->
    @_update = new Update @schema#, attrs
    @_query_type = "update"
    @

  set: (entry) ->
    attrs = entry.changed_attributes?() ? entry
    @_set = new UpdateSet @schema, attrs
    if entry instanceof @schema
      # 如果传入 model, 则默认根据主键查询更新
      condition = {}
      for key, value of entry.attributes when key in @schema.$table.pks
        condition[key] = value
      @where condition
    @

  delete: (entry) ->
    @_delete = new Delete @schema
    @_query_type = "delete"

    if entry instanceof @schema
      # 如果传入 model, 则默认根据主键查询删除
      condition = {}
      condition[key] = value for key, value of entry.attributes when key in @schema.$table.pks
      @where condition
    @

  insert: ->
    @_insert = new Insert @schema
    @_query_type = "insert"
    @
  
  values: (model) ->
    @_values = new InsertValues model
    @

  id: ->
    @_select = new Select.Id @schema
    @_query_type = "select"
    @

  count: ->
    @_select = new Select.Count @schema
    @_query_type = "select"
    @

  max: (column) ->
    @_select = new Select.Max @schema, column
    @_query_type = "select"
    @

  sum: (columns) ->
    @_select = new Select.Sum @schema, columns
    @_query_type = "select"
    @

class Where
  constructor: (@schema, @condition) ->
    ooq.setup_ffi operators_ffi

    { fields } = @schema.$table
    { tree } = new ooq.Parser @condition
    @node = (new ooq.SemanticAnalysis tree).query_code
  # transform: (where) ->
  #   unless lo.isArray where.filters
  #     # 关系运算符的 column 属性解析为 table field
  #     where.column = @schema.$table.fields[where.column]
  #   else
  #     for sub_where in where.filters
  #       # if lo.isArray filter
  #       #   @convert_filters filter
  #       @transform sub_where
  #       else if filter.filters?
  #         filter.filters = @convert_filters filter.filters
  #         filter
  #       else
  #         filter.column = @schema.$table.fields[filter.column].column
  #         filter
  getargs: -> @node.getargs?() ? []
  to_sql: ->
    return "" unless @condition? and not lo.isEmpty @condition
    # 只有逻辑运算符(AND,OR,NOT,XOR)包含 filters 属性
    # if where.filters?
    #   where.filters = @convert_filters where.filters
    # # 关系运算符的 column 属性解析为 table field
    # else
    #   where.column = fields[where.column]

    # @transform where

    "WHERE #{@node.to_sql()}"

class Select
  constructor: (@schema) ->

  to_sql: ->
    { name, pks, columns } = @schema.$table
    # TODO
    # cols = ("`#{column}`" for column in columns).join ","

    "SELECT * FROM `#{name}`"

  # TODO
  convert_result: (rows) ->
    { fields } = @schema.$table
    for row in rows ? []
      object = {}
      object[column] = fields[column].extract value for column, value of row
      object

class Select.Id extends Select
  to_sql: ->
    { name, pks, columns } = @schema.$table
    cols = ("`#{column}`" for column in pks).join ", "

    "SELECT #{cols} FROM `#{name}`"

class Select.Count extends Select
  to_sql: -> "SELECT COUNT(*) AS `count` FROM `#{@schema.$table.name}`"
  convert_result: (rows) -> +rows?[0]?.count

class Select.Max extends Select
  constructor: (schema, column) ->
    super schema
    @_column = column

  to_sql: -> "SELECT MAX(`#{@_column}`) AS `max` FROM `#{@schema.$table.name}`"

  convert_result: (rows) -> +rows?[0]?.max

class Select.Sum extends Select
  constructor: (schema, columns) ->
    super schema
    @_columns = columns

  to_sql: ->
    { fields } = @schema.$table
    sum = ("SUM(`#{fields[column].column}`) AS `#{column}`" for column in @_columns).join ", "
    "SELECT #{sum} FROM `#{@schema.$table.name}`"

  convert_result: (rows) -> rows?[0]

# class Column
#   constructor: (@schema) ->
#   to_sql: -> ("`#{column}`" for column in $table.columns).join ", "

class Limit
  constructor: (@limit, @offset = off) ->
  to_sql: -> "LIMIT #{if @offset or @offset is 0 then '?, ?' else '?'}"
  getargs: -> if @offset or @offset is 0 then [@offset, @limit] else [@limit]

class Orderby
  constructor: (@column) ->
    @order = "ASC"

    # TODO
    if lo.isObject @column
      { @order, @column } = @column
      # [column] = Object.keys @column
      @order = @order.toUpperCase()
      # @column = column

  to_sql: -> "ORDER BY `#{@column}` #{@order}"
  getargs: -> []

class Update
  constructor: (@schema) ->
  convert_result: ({ changedRows }, callback) -> updates: changedRows

  to_sql: ->
    { name } = @schema.$table

    """
      UPDATE `#{name}`
    """

class Delete extends Update
  convert_result: ({ affectedRows }) -> deletes: affectedRows
  to_sql: ->
    { name } = @schema.$table

    """
      DELETE FROM `#{name}`
    """

class Insert extends Update
  convert_result: ({ insertId }) -> id: insertId
  to_sql: ->
    { name, non_auto } = @schema.$table
    cols = ("`#{column}`" for column in non_auto).join ", "

    """
      INSERT INTO `#{name}` (#{cols})
    """

class InsertValues
  constructor: (@model) -> { @$schema } = @model
  to_sql: ->
    { non_auto } = @$schema.$table

    "VALUES (#{('?' for [1..non_auto.length]).join ', '})"

  getargs: ->
    { non_auto, fields } = @$schema.$table
    fields[column].serialize @model.get column for column in non_auto

class UpdateSet
  constructor: (@schema, @attrs) ->
  to_sql: ->
    { non_pks } = @schema.$table
    update_set = ("`#{column}` = ?" for column in non_pks when @attrs[column]?).join ", "

    "SET #{update_set}"

  getargs: ->
    { fields, non_pks } = @schema.$table
    fields[column].serialize @attrs[column] for column in non_pks when @attrs[column]?

module.exports = Query
