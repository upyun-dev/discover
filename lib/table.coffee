# mysql 表元信息

class Table # metadata: table
  constructor: ({ @name, fields: _fields }) ->
    @fields = {}
    @pks = []
    @columns = []
    @auto = []
    @non_auto = []
    @non_pks = []
    @defaults = {}

    for field in _fields
      # 如果 field 中配置了 `name` 但没配置 `column`, 默认做名字转换
      field.column = field.name unless field.column?

      { column, pk, auto, default: default_value } = field
      @fields[column] = field
      @columns.push column

      (if pk? then @pks else @non_pks).push field
      (if auto? then @auto else @non_auto).push field
      @defaults[column] = default_value ? field.default_value()

  # promisify
  # find_by_id: (id) ->
  #   sql = @sql_templates.find
  #   args = if Array.isArray id and @pks.length is id.length
  #     id
  #   else if typeof id is 'object'
  #     id[column] for { column } in @pks when column of id
  #   else if @pks.length is 1
  #     [id]

  #   unless args?.length is @pks.length
  #     return Promise.reject new Error "Invalid id arguments"

  #   args = for { type }, idx in @pks
  #     if type isnt "hash" then args[idx] else field.serialize args[idx]

  #   new Promise (resolve, reject) =>
  #     @database.query sql, args, (err, rows) ->
  #       if err? then reject err else resolve rows[0]

  # promisify
  # insert: (model) ->
  #   sql = @sql_templates.insert
  #   args = (field.serialize model.get field.column for field in @non_auto)

  #   new Promise (resolve, reject) =>
  #     @database.query sql, args, (err, info) =>
  #       if err?
  #         reject err, info
  #       else
  #         model.set column, info.insertId, silent: yes for { column } in @auto
  #         resolve model.reset()

  # # promisify
  # delete: (model) ->
  #   sql = @sql_templates.delete
  #   args = (field.serialize model.get column for { column } in @pks)

  #   new Promise (resolve, reject) =>
  #     @database.query sql, args, (err, info) => if err? then reject err, info else resolve model.reset()

  # # promisify
  # update: (model) ->
  #   attrs = model.changed_attrs()
  #   return Promise.resolve false unless attrs and Object.keys(attrs).length is 0

  #   args = {}
  #   args[field.column] = field.serialize attrs[field.column] for field in @non_pks when attrs[field.column]?
  #   return Promise.resolve false if Object.keys(args).length is 0

  #   sql = sql_update_template args
  #   args = Object.values args
  #   args.push field.serialize model.get field.column for field in @pks

  #   new Promise (resolve, reject) =>
  #     @database.query sql, args, (err, info) => if err? then reject err, info else resolve true

  # update_where: (condition, attrs) ->
  #   return Promise.resolve false unless attrs and Object.keys(attrs).length is 0

  #   args = {}
  #   args[field.column] = field.serialize attrs[field.column] for field in @non_pks when attrs[field.column]?
  #   return Promise.resolve false if Object.keys(args).length is 0

  #   sql = @sql_update_where_template args, condition
  #   args = Object.values args

  #   new Promise (resolve, reject) =>
  #     @database.query sql, args, (err, info) => if err? then reject err, info else resolve true

  # delete_where: (condition) ->
  #   sql = @sql_delete_where_template condition

  #   new Promise (resolve, reject) =>
  #     @database.query sql, [], (err, info) => if err? then reject err, info else resolve model.reset()
  # setup_sql_find_template: ->
  #   cols = ("`#{column}`" for { column } in @fields).join ","
  #   condition = ("`#{column}` = ?" for { column } in @pks).join " AND "
  #   """
  #     SELECT #{cols} FROM `#{@name}` WHERE #{condition}
  #   """

  # setup_sql_delete_template: ->
  #   condition = ("`#{column}` = ?" for { column } in @pks).join " AND "
  #   sql_delete_where_template condition
  
  # sql_delete_where_template: (condition) ->
  #   """
  #     DELETE FROM `#{@name}` WHERE #{condition}
  #   """

  # setup_sql_insert_template: ->
  #   cols = ("`#{column}`" for { column } in @non_auto).join ","
  #   placeholder = ("?" for 1..@non_auto.length).join ","
  #   """
  #     INSERT INTO `#{@name}` (#{cols}) VALUES (#{placeholder})
  #   """

  # sql_update_template: (args)->
  #   condition = ("`#{column}` = ?" for { column } in @pks).join " AND "
  #   @sql_update_where_template args, condition
  
  # sql_update_where_template: (args, condition) ->
  #   update_set = ("`#{@fields[k].column}` = ?" for k of args).join ","
  #   sql_template = """
  #     UPDATE `#{@name}` SET #{update_set} WHERE #{condition}
  #   """

  # TODO
  # ensure_table: ->
  #   cols = for { column, type, auto } in @internal_fields
  #     col = "`#{column}` #{type}"
  #     col = "#{col} AUTO_INCREMENT" if auto?
  #   .join ","

  #   pks = ("PRIMARY KEY (`#{column}`)" for { column } in @pks).join ","

  #   sql = """
  #     CREATE TABLE `#{name}` (#{cols}, #{pks})
  #   """
  #   @database.query sql, [], (err) ->

module.exports = Table