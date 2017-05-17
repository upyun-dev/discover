lo = require "lodash"
async = require "async"
Query = require "./query"
{ createHash } = require "crypto"

class Schema
  @all: (options, callback) -> @find {}, options

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

    { orderby, json, limit, page } = options = lo.assign
      orderby: if @$table.fields.id? then column: "id", order: "desc"
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
    .then (objects) => @wrap objects, options

  @findone: (condition, options, callback) ->
    if typeof options is "function"
      callback = options
      options = {}

    options = lo.assign json: no, options, limit: 1

    @find condition, options
    .then ([model]) -> model

  @find_with_count: (condition, options, callback) ->
    if typeof options is "function"
      callback = options
      options = null

    Promise.all [
      @find condition, options
      @count condition, options
    ]
    .then ([models, total]) -> { models, total }
    # .catch callback

  @find_by_index: (index, value, options, callback) ->
    new Query @
    .select()
    .where "#{index}": value
    .execute options, callback
    .then (objects) => @wrap objects, options

  @find_by_unique_key: (key, value, options, callback) ->
    @find_by_index key, value, options, (err, entities) -> callback err, entities?[0]
    .then ([model]) -> model

  @find_by_id: (id, options, callback) ->
    @find_by_ids [id], options
    .then ([model]) -> model

  @find_by_ids: (ids, options, callback) ->
    return Promise.reject new Error "First argument to find_by_ids must be an garray of id" unless lo.isArray ids
    return Promise.resolve [] if lo.isEmpty ids

    keys = new Map
    keys.set id, @cache_key id for id in ids#then [id, @cache_key id]
    # 先从缓存读
    @$cache.get Array.from keys.values()
    .then (objects = {}) =>
      # 缓存失效从数据库中读
      missed_redo = for [id, key] from keys when key not of objects then do (id, key) => @load id, key, options

      Promise.all missed_redo
      .then (models) -> model for model in models when model?
      .then (models) => [models..., (@wrap objects, options)...]

  @wrap: (objects, options) ->
    for key, object of objects
      model = @to_model object
      if model and options?.json then model.to_json options.secure else model

  # TODO: id type
  @load: (id, key, options) ->
    { pks } = @$table
    condition = {}

    switch
      when lo.isArray id and pks.length is id.length
        condition[column] = id[idx] for column, idx in pks
      when typeof id is "object" and pks.length is lo.size id
        condition[column] = id[column] for column in pks when column of id
      when pks.length is 1
        condition[pks[0]] = id
      else
        return Promise.reject new Error "Invalid id arguments"

    @findone condition, options
    .then (model) =>
      # 缓存 raw object
      model and @$cache.set key, model.to_json(yes), 0
      # 返回 model
      model

  @find_and_update: (condition, modified, options, callback) ->
    new Query @
    .update()
    .set modified
    .where condition
    .execute options, callback

  @find_and_delete: (condition, options, callback) ->
    new Query @
    .delete()
    .where condition
    .execute options, callback

  @insert: (model, callback) ->
    unless model.$schema?
      return Promise.reject new Error "Can not insert non-model object"
      # return this

    { insert: before_hooks = [] } = @_before_hooks
    { insert: after_hooks = [] } = @_after_hooks

    validation_tasks = @walk model, "validate"
    tasks = for task in [before_hooks..., validation_tasks..., @_insert.bind(model), after_hooks...] then task.bind model

    new Promise (resolve, reject) ->
      async.waterfall tasks, (err) ->
        err and throw err
        resolve model.reset()

  # bind for model
  @_insert: (done) ->
    new Query @$schema
    .insert()
    .values @
    .execute()
    .then ({ id }) =>
      @set @$schema.$table.auto, id, silent: yes if @$schema.$table.auto?
      @$schema.clean_cache @
    .then =>
      done null, @
    .catch (err) -> done err

  @update: (model, callback) ->
    unless model.$schema?
      return Promise.reject new Error "Can not insert non-model object"

    { update: before_hooks = [] } = @_before_hooks
    { update: after_hooks = [] } = @_after_hooks

    validation_tasks = @walk model, "validate"
    tasks = for task in [before_hooks..., validation_tasks..., @_update.bind(model), after_hooks...] then task.bind model

    new Promise (resolve, reject) ->
      async.waterfall tasks, (err, oldstates) ->
        err and throw err
        resolve [oldstates, model.reset()]

  # bind for model
  @_update: (done) ->
    oldstates = @_oldstates

    console.log (new Query @$schema).update().set(@).to_sql()
    new Query @$schema
    .update()
    .set @
    .execute()
    .then ({ updates }) =>
      @_oldstates = @to_json yes
      @$schema.clean_cache @
    .then => 
      done null, oldstates, @
    .catch (err) -> done err

  @delete: (model, callback) ->
    unless model.$schema?
      return Promise.reject new Error "Can not insert non-model object"

    { delete: before_hooks = [] } = @_before_hooks
    { delete: after_hooks = [] } = @_after_hooks

    tasks = for task in [before_hooks..., @_delete.bind(model), after_hooks...] then task.bind model

    new Promise (resolve, reject) ->
      async.waterfall tasks, (err) ->
        err and throw err
        resolve model.reset()

  # bind for model
  @_delete: (done) ->
    new Query @$schema
    .delete @
    .execute()
    .then ({ deletes }) => done null, @
    .catch (err) -> done err

  @before: (method_name, exec) ->
    if @is_valid method_name
      @_before_hooks[method_name].push ([..., callback]...) -> exec.call @, callback
    @

  @after: (method_name, exec) ->
    if @is_valid method_name
      @_after_hooks[method_name].push (args...) -> exec.apply @, args
    @

  @clean_cache: (val) -> @$cache.del @cache_key val

  # 返回 validation 任务队列
  @walk: (model, prefix) ->
    for own method_name, method of model when lo.isFunction method and method_name.match /^validate.+/
      do (method_name) -> (done) -> model[method_name] (err) -> done err

  # 检查方法是否允许被添加 hook
  @is_valid: (method) -> ["insert", "update", "delete"].includes method

  # TODO: id type
  # 多个 key 按照字典顺序排序
  @cache_key: (key) ->
    id =
    switch
      when key?.$schema?
        for column in @$table.pks.sort()
          { type } = @$table.fields[column]
          if type is "binary" then key.get(column).toString "hex" else key.get column
      when lo.isArray key
        for val in key
          if lo.isBuffer val then val.toString "hex" else val
      when lo.isObject key
        for column in @$table.pks.sort()
          { type } = @$table.fields[column]
          if type is "binary" then key[column].toString "hex" else key[column]
      else [if lo.isBuffer key then key.toString "hex" else key]
    
    id = id.join "-"

    createHash "md5"
    .update "#{@$table.name}:#{id}", "utf8"
    .digest "hex"

  @to_model: (data) ->
    return null unless data?
    { fields, columns } = @$table
    attrs = {}

    for column, field of fields
      value = if data.hasOwnProperty column then data[column] else field.default ? field.default_value()
      attrs[column] = value

    attrs[k] = v for k, v of data when k not of fields and not columns.includes k

    new @ attrs

module.exports = Schema