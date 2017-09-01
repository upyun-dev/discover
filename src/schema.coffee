lo = require "lodash"
async = require "async"
Query = require "./query"
{ createHash } = require "crypto"

class Schema
  @persist: ->
    new Query @
    .create()
    .execute()

  @all: (options = {}) ->
    await @find {}, options

  @count: (condition, options = {}) ->
    await new Query @
          .count()
          .where condition, options
          .execute()

  @_create_query: (condition, options = {}) ->
    @_prune condition if condition?

    new Query @
    .select()
    .where condition

  @every: (condition, iterator, done, options = {}) ->
    q = new Query @
        .select()
        .where condition, options

    q.limit limit if options.limit?
    q.iterate iterator, done

  @find: (condition, options = {}) ->
    { order_by, json, limit, page } = options = lo.assign
      order_by: if @$table.fields.id? then id: "desc"
      json: no
      limit: 20
      page: 1
    , options

    offset = (page - 1) * limit

    objects =
      await new Query @
            .select()
            .where condition, options
            .order_by order_by
            .limit limit, offset
            .execute()
    @wrap objects, options

  @find_one: (condition, options = {}) ->
    options = lo.assign options, limit: 1
    [model] = await @find condition, options

    model

  @find_with_count: (condition, options = {}) ->
    [models, total] = await Promise.all [
      @find condition, options
      @count condition, options
    ]

    { models, total }

  @find_by_index: (index, value, options = {}) ->
    objects =
      await new Query @
            .select()
            .where condition, options
            .execute()
    @wrap objects, options

  @find_by_unique_key: (key, value, options = {}) ->
    [model] = await @find_by_index key, value, options
    model

  @find_by_id: (id, options = {}) ->
    [model] = await @find_by_ids [id], options
    model

  @find_by_ids: (ids, options = {}) ->
    return Promise.reject new Error "First argument to find_by_ids must be an array of id" unless lo.isArray ids
    return Promise.resolve [] if lo.isEmpty ids

    keys = new Map
    keys.set id, @cache_key id for id in ids

    # 先从缓存读
    objects = await @$cache.get Array.from keys.values() or {}
    # 缓存失效从数据库中读
    missed_redo = for [id, key] from keys when key not of objects then @load id, key, options
    models = for model in await Promise.all missed_redo when model? then model
    [models..., (@wrap objects, options)...]

  @wrap: (objects, options = {}) ->
    for key, object of objects
      model = @to_model object
      if model and options?.json then model.to_json options.secure else model

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

    model = await @find_one condition, options
    # 缓存 raw object
    model and @$cache.set key, model.to_json(yes), 0
    # 返回 model
    model

  @find_and_update: (condition, modified, options = {}) ->
    await new Query @
          .update()
          .set modified
          .where condition, options
          .execute()

  @find_and_delete: (condition, options = {}) ->
    await new Query @
          .delete()
          .where condition, options
          .execute()

  @insert: (model) ->
    throw new Error "Can not insert non-model object" unless model.$schema?

    { insert: before_hooks = [] } = @_before_hooks
    { insert: after_hooks = [] } = @_after_hooks

    validation_tasks = @walk model, "validate"
    insert = @_insert.bind model

    await task.bind(model)() for task in [before_hooks..., validation_tasks..., insert, after_hooks...]
    model.reset()

  # bind for model
  @_insert: ->
    { id } =
      await new Query @$schema
            .insert()
            .values @
            .execute()
    @set @$schema.$table.auto, id, silent: yes if @$schema.$table.auto?
    await @$schema.clean_cache @

  @update: (model) ->
    throw new Error "Can not insert non-model object" unless model.$schema?

    { update: before_hooks = [] } = @_before_hooks
    { update: after_hooks = [] } = @_after_hooks

    validation_tasks = @walk model, "validate"
    update = @_update.bind model
    oldstates = model._oldstates

    await task.bind(model)() for task in [before_hooks..., validation_tasks..., @_update]
    await after_task.bind(model) oldstates for after_task in after_hooks
    model.reset()
    oldstates

  # bind for model
  @_update: ->
    await new Query @$schema
          .update()
          .set @
          .execute()
    @_oldstates = @to_json yes
    await @$schema.clean_cache @

  @delete: (model) ->
    throw new Error "Can not insert non-model object" unless model.$schema?

    { delete: before_hooks = [] } = @_before_hooks
    { delete: after_hooks = [] } = @_after_hooks

    await task.bind(model)() for task in [before_hooks..., @_delete, after_hooks...]
    model.reset()

  # bind for model
  @_delete: (done) ->
    await new Query @$schema
          .delete @
          .execute()

  @before: (method_name, task) ->
    if @is_valid method_name
      @_before_hooks[method_name].push task
    @

  @after: (method_name, task) ->
    if @is_valid method_name
      @_after_hooks[method_name].push task
    @

  @clean_cache: (val) -> @$cache.del @cache_key val

  # 返回 validation 任务队列
  @walk: (model, prefix) ->
    model[method_name] for own method_name, method of model when lo.isFunction method and method_name.match /^validate.+/

  # 检查方法是否允许被添加 hook
  @is_valid: (method) -> ["insert", "update", "delete"].includes method

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