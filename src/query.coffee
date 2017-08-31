ooq = require "ooq"
lo = require "lodash"
operators_ffi = require "./operator"

# new Query User

# .select()
# .select().where(condition).limit(count, offset).order_by(column, [order])
# .id().where(condition).limit(count, offset).order_by(column, [order])
# .max().where(condition).limit(count, offset).order_by(column, [order])
# .sum().where(condition).limit(count, offset).order_by(column, [order])
# .count().where(condition).limit(count, offset).order_by(column, [order])

# .update().set(model)
# .update().set(attrs).where(condition)

# .delete(model)
# .delete().where(condition)

class Query # Model 的 query 操作, 用于构建下层 SQL 查询语句
  max_retry_times: 3

  constructor: (@schema) ->

  to_sql: -> @["to_#{@_query_type}_sql"]()

  to_create_sql: ->
    [
      "#{@_create.to_sql()}".trim()
      @getargs()
    ]

  to_select_sql: ->
    [
      "
        #{@_select.to_sql()}
        #{@_where?.to_sql()}
        #{@_order_by?.to_sql() ? ''}
        #{@_limit?.to_sql() ? ''}
      ".trim()
      @getargs @_where?.getargs(), @_order_by?.getargs(), @_limit?.getargs()
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

  execute: ->
    @schema.$database.query @to_sql()...
    .then (ret) => @["_#{@_query_type}"].convert_result ret

  _query: () ->
    @schema.$database.query @to_sql()...
    .then (rows) -> callback null, rows
    .catch (err) -> callback err

  limit: (limit, offset) ->
    @_limit = if limit? then new Limit limit, offset
    @

  order_by: (columns) ->
    @_order_by = if columns? then new OrderBy columns
    @

  create: ->
    @_create = new Create @schema
    @_query_type = "create"
    @

  select: ->
    @_select = new Select @schema
    @_query_type = "select"
    @

  where: (condition) ->
    @_where = new Where @schema, condition
    @

  update: ->
    @_update = new Update @schema
    @_query_type = "update"
    @

  set: (entity) ->
    attrs = entity.changed_attributes?() ? entity
    @_set = new UpdateSet @schema, attrs
    if entity instanceof @schema
      # 如果传入 model, 则默认根据主键查询更新
      condition = {}
      for key, value of entity.attributes when key in @schema.$table.pks
        condition[key] = value
      @where condition
    @

  delete: (entity) ->
    @_delete = new Delete @schema
    @_query_type = "delete"

    if entity instanceof @schema
      # 如果传入 model, 则默认根据主键查询删除
      condition = {}
      condition[key] = value for key, value of entity.attributes when key in @schema.$table.pks
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

  getargs: -> @node.getargs?() ? []

  to_sql: ->
    return "" unless @condition? and not lo.isEmpty @condition
    "WHERE #{@node.to_sql()}"

class Create
  constructor: (@schema) ->
  convert_result: -> yes
  to_sql: ->
    { fields, name } = @schema.$table

    cols = for column, { data_type, auto, unique, pk } of fields
      desc = [column, data_type]
      desc.push "AUTO_INCREMENT" if auto
      desc.push "UNIQUE" if unique
      desc.push "PRIMARY KEY" if pk
      desc.join " "

    """
      CREATE TABLE IF NOT EXISTS `#{name}` (#{cols.join ', '})
    """

class Select
  constructor: (@schema) ->

  to_sql: ->
    { name, pks, columns } = @schema.$table
    # TODO
    # cols = ("`#{column}`" for column in columns).join ","

    "SELECT * FROM `#{name}`"

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

class OrderBy
  constructor: (columns) ->
    @default_order = "DESC"

    @columns = if lo.isArray columns
      for item in columns
        if lo.isObject item
          ({ column, order: order } for column, order of item)[0]
        else
          column: item, order: @default_order
    else if lo.isObject columns
      { column, order: order } for column, order of columns
    else
      [
        column: columns, order: @default_order
      ]

  to_sql: ->
    "ORDER BY #{flatten().join ', '}"

  flatten: ->
    "#{column} #{order.toUpperCase()}" for { column, order } in @columns

  getargs: -> []

class Update
  constructor: (@schema) ->
  convert_result: ({ changedRows }) -> updates: changedRows

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
