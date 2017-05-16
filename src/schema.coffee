async = require "async"
Query = require "./query"

class Schema
  @all: (options, callback) ->
    new Query @
    .select()
    .execute options, callback
    .then (objects) => @wrap objects, options

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

  @find_by_id: (id, options, callback) ->
    @find_by_ids [id], options, (err, [object] = []) -> callback err, object

  @find_by_ids: (ids, options, callback) ->
    return callback new Error "First argument to find_by_ids must be an array of id" unless lo.isArray ids
    return callback null, [] if lo.isEmpty ids

    keys = for id in ids then [id, @cache_key id]

    # 先从缓存读
    @$cache.get keys, (err, rows = []) =>
      # 缓存失效从数据库中读
      missed_redo = for [id, key] in keys when key not of rows
        new Promise (resolve, reject) => @load id, key, options, (err, row) -> if err? then reject err else resolve rows[key] = row

      Promise.all missed_redo
      .then -> callback null, @wrap rows, options
      .catch callback

  @wrap: (rows, options) ->
    for key, row of rows
      object = @new_instance row
      if object and options?.json then object.to_json options.secure else object

  # TODO
  @load: (id, key, options, callback) ->
    { pks } = @$table
    args = if lo.isArray id and pks.length is id.length
      id
    else if typeof id is "object"
      id[column] for column in pks when column of id
    else if pks.length is 1
      [id]

    unless args?.length is pks.length
      return callback new Error "Invalid id arguments"

    # args = for field, idx in pks then args[idx]

    conditions = {}
    conditions[column] = args[idx] for column, idx in pks

    @find conditions, options, (err, [row] = []) =>
      if row?
        @$cache.set key, row, 0, (err) -> callback err, row
      else
        callback err, row

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
    unless model.$schema?
      callback? new Error "Can not insert non-model object"
      return this
    
    { insert: before_hooks } = @_before_hooks
    { insert: after_hooks } = @_after_hooks

    @walk model, "validate", (validation_tasks) =>
      tasks = for task in [before_hooks..., validationTasks..., @_insert.bind(model), after_hooks...] then task.bind model
      async.waterfall tasks, (err, result) -> callback? err, model.reset()
    @

  # bind for model
  @_insert: (done) ->
    new Query @$schema
    .insert()
    .values @
    .execute (err, info) =>
      if err?
        done err, info
      else
        @$schema.clean_cache model, =>
          @set @$schema.$table.auto, info.insertId, silent: yes if @$schema.$table.auto?
          done null, @

  @update: (model, callback) ->
    unless model.$schema?
      callback? new Error "Can not insert non-model object"
      return this

    { update: before_hooks } = @_before_hooks
    { update: after_hooks } = @_after_hooks

    @walk model, "validate", (validation_tasks) =>
      tasks = for task in [before_hooks..., validationTasks..., @_update.bind(model), after_hooks...] then task.bind model
      async.waterfall tasks, (err, result) -> callback? err, model.reset()
    @

  # bind for model
  @_update: (done) ->
    old_model = @_oldstates

    new Query @$schema
    .update()
    .set @
    .execute (err, info) =>
      if err?
        done err, no
      else
        @_oldstates = @to_json yes
        @$schema.clean_cache model, => done null, old_model, @

  @delete: (model, callback) ->
    unless model.$schema?
      callback? new Error "Can not insert non-model object"
      return this

    { delete: before_hooks } = @_before_hooks
    { delete: after_hooks } = @_after_hooks

    tasks = for task in [before_hooks..., @_delete.bind(model), after_hooks...] then task.bind model
    async.waterfall tasks, (err, result) -> callback? err, model.reset()
    @

  @_delete: (done) ->
    new Query @$schema
    .delete @
    .execute (err, info) => if err? then done err, info else done null, @

  @before: (method_name, exec) ->
    if @is_valid method_name
      @_before_hooks[method_name].push ([..., callback]...) -> exec.call @, callback
    @

  @after: (method_name, exec) ->
    if @is_valid method_name
      @_after_hooks[method_name].push (args...) -> exec.apply @, args
    @

  @clean_cache: (val, callback) -> @cache.del @cache_key(val), callback

  @walk: (model, prefix, callback) ->    
    setImmediate ->
      ret =
      for own method_name, method of model when lo.isFunction method and method_name.match /^validate.+/
        (done) -> model[method_name] (err) -> done err
      callback ret

  @is_valid: (method) -> ["insert", "update", "delete"].includes method

  # TODO
  @cache_key: (key) ->
    id =
    switch
      when key?.$schema?
        for column in @$table.pks
          { type } = @$table.fields[column]
          if type is "binary" then key.get(column).toString "hex" else "#{key.get column}"
      when lo.isArray key
        for val in key
          if lo.isBuffer val then val.toString "hex" else "#{v}"
      when lo.isObject key
        for column in @$table.pks
          { type } = @$table.fields[column]
          if type is "binary" then key[column].toString "hex" else "#{key[column]}"
      else [key]
    
    id = id.join "-"

    createHash "md5"
    .update "#{$table.name}:#{id}", "utf8"
    .digest "hex"

  @new_instance: (data) ->
    return null unless data?
    { fields, columns } = @$table
    row = {}

    for column, field of fields
      value = if data.hasOwnProperty column then data[column] else field.default ? field.default_value()
      row[column] = value

    row[k] = v for k, v of data when k not of fields and not columns.includes k

    new @ row

module.exports = Schema