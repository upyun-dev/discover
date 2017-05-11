Query = require "./query"

class Schema
  @all: (callback, options) ->
    new Query @
    .select()
    .execute options, callback

  @count: (condition, options, callback) ->
    if typeof options is "function"
      callback = options
      options = {}

    new Query @
    .count()
    .where condition
    .execute options, callback

  @find: (condition, options, callback) ->
    if typeof options is "function"
      callback = options
      options = {}

    { orderby, json, limit, page } = options = Object.assign
      orderby: if @$table.fields.id? then id: "desc"
      json: no
      limit: 20
      page: 1
    , options

    offset = (page - 1) * limit

    new Query @
    .select()
    .where condition
    .orderby orderby
    .limit limit, offset
    .execute { json }, callback

  @findone: (condition, options, callback) ->
    if typeof options is "function"
      callback = options
      options = {}

    options = Object.assign json: no, options, limit: 1
    @find condition, options, (err, rows = []) ->
      return callback err if err?
      callback null, rows[0]

  @find_with_count: (condition, options, callback) ->
    if typeof options is "function"
      callback = options
      options = null

    Promise.all [
      new Promise (resolve, reject) => @find condition, options, (err, rows) -> if err? then reject err else resolve rows
      new Promise (resolve, reject) => @count condition, options, (err, total) -> if err? then reject err else resolve total
    ]
    .then (rows, total) -> callback null, { rows, total }
    .catch callback

  @find_by_index: (index, value, options, callback) ->
    new Query @
    .select()
    .where "#{index}": value
    .execute options, callback

  @find_by_unique_key: (key, value, options, callback) ->
    @find_by_index key, value, options, (err, entities) -> callback err, entities?[0]

  # TODO
  @find_by_id: (id, options, callback) ->
    { pks, database } = @$table
    args = if Array.isArray id and pks.length is id.length
      id
    else if typeof id is "object"
      id[column] for { column } in pks when column of id
    else if pks.length is 1
      [id]

    unless args?.length is pks.length
      return Promise.reject new Error "Invalid id arguments"

    args = for { type }, idx in pks
      if type isnt "hash" then args[idx] else field.serialize args[idx]

    # new Promise (resolve, reject) =>
    #   @database.query sql, args, (err, rows) -> if err? then reject err else resolve rows[0]

    conditions = {}
    conditions[column] = args[idx] for { column }, idx in pks

    # @$query.select @
    # .where conditions
    # .execute options, callback
    @find conditions, options, callback

  @find_and_update: (conditions, options, modified, callback) ->
    new Query @
    .update()
    .set modified
    .where condition
    .execute options, callback

  @find_and_delete: (conditions, options, callback) ->
    new Query @
    .delete()
    .where condition
    .execute options, callback

  @insert: (model, callback) ->
  @update: (model, callback) ->
  @delete: (model, callback) ->

  @before: (method_name, exec) ->
  @after: (method_name, exec) ->

  @clean_cache: (val, callback) -> @cache.del @cache_key(val), callback

  @load:
  @walk:
  @is_valid: (method) -> ["insert", "update", "delete"].includes method
  @cache_key: (value) ->
    id =
    switch
      when value?.$schema?
        for { column, type } in @$table.pks
          if type is "binary" then value.get(name).toString "hex" else "#{value.get name}"
      when lo.isArray value
        for val in value
          if lo.isBuffer val then val.toString "hex" else "#{v}"
      when lo.isObject value
        for { type, name } in @$table.pks
          if type is "binary" then value[name].toString "hex" else "#{value[name]}"
      else [value]
    .join "-"

    createHash "md5"
    .update "#{$table.name}:#{id}", "utf8"
    .digest "hex"

  @new_instance:

module.exports = Schema