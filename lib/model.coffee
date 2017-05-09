{ EventEmitter2: EventEmitter } = require "eventemitter2"
{ createHash } = require "crypto"

class Model extends EventEmitter
  constructor: (attributes = {}) ->
    super()
    @$model = Model
    attributes = attributes.attributes ? attributes
    { $table: { defaults } } = @$model

    attributes[k] = v for k, v of defaults when k not of attributes
    @attributes = attributes
    @_oldstates = @to_json yes
    @_changed = no
    @_previous_attributes = null

  to_json: (include_secure) ->
    { $table: { fields } } = @$model
    json_object = Object.assign {}, @attributes
    delete json_object[name] for name, { secure } of fields when secure unless include_secure
    json_object

  has: (attr) -> attr of @attributes
  get: (attr) -> @attributes[attr]
  set: (args...) ->
    return @ if args.length is 0

    attrs = {}
    options = {}

    switch
      when typeof args[0] is "object"
        attrs = args[0].attributes ? args[0]
        options = args[1] ? {}
      when typeof args[0] is "string" and args.length > 1
        attrs[args[0]] = args[1]
        options = args[2] ? {}

    return @ if Object.keys(attrs).length is 0

    current_attrs = @attributes

    # validation
    return no unless options.silent or not @validate or validate attrs, options

    changing = @_changing
    @_changing = yes

    @update_attrs current_attrs, attrs, options

    unless changing or options.silent or @_changed
      @emit "change", @, options

  update_attrs = (current_attrs, attrs, options) ->
    for key, value of attrs when current_attrs[key] isnt value
      unless options.silent
        @_previous_attributes ?= {}
        @_previous_attributes[key] = current_attrs[key]
        setImmediate => @emit "change:#{key}", @, value, options

      current_attrs[key] = value
      @_changed = yes

  # If a specific `error` callback has been passed, call that instead of firing the general `'error'` event.
  validate: (attrs, options) ->
    error = @validate attrs
    return yes unless error

    if typeof options.error is "function"
      options.error @, error, options
    else @emit "error", @, error, options
    no

  reset: (options) ->
    @_previous_attributes = null
    @_changed = no
    this

  clone: -> new @constructor @

  is_changed: (attr) ->
    unless @_previous_attributes? then no
    else if attr?
      @_previous_attributes[attr] isnt @attributes[attr]
    else
      @_changed

  changed_attributes: (current_attrs) ->
    return no unless @_previous_attributes?
    current_attrs ?= @attributes
    old = @_previous_attributes
    changed = no

    for key of current_attrs when old[key] isnt current_attrs[key]
      changed or= {}
      changed[key] = current_attrs[key]

    changed

  previous: (attr) ->
    unless @_previous_attributes? then no
    else if attr? then @_previous_attributes[attr]
    else Object.assign {}, @_previous_attributes

  insert: (callback) -> @$model.insert @, callback
  update: (callback) -> @$model.update @, callback
  delete: (callback) -> @$model.delete @, callback

  @all: (callback, options) ->
    @$query.select @
    .execute options, callback

  @count: (conditions, options, callback) ->
    if typeof options is "function"
      callback = options
      options = {}

    @$query.count @
    .where if conditions? then ooq conditions
    .execute options, callback

  @find: (conditions, options, callback) ->
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
    @$query.select @
    .where conditions
    .orderby orderby
    .limit limit, offset
    .execute { json }, callback

  @findone:
  @find_by_id: (id, options, callback) ->
    { pks, database } = @$table
    # sql = @sql_templates.find
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

  @find_by_index:
  @find_with_count:
  @find_by_unique_key:
  @find_and_update: (conditions, options, modified, callback) ->
    @$table.update_where @$query.where(conditions)._where

  @find_and_delete: (conditions, options, callback) ->

  @insert:
  @update:
  @delete:

  @before:
  @after:

  @clean_cache: (val, callback) -> @cache.del cache_key(val), callback

  @load:
  @walk:
  @is_valid:
  @cache_key:
  @new_instance:

module.exports = Model