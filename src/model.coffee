{ EventEmitter2: EventEmitter } = require "eventemitter2"
lo = require "lodash"

resolve_args = (args) ->
  switch
    when typeof args[0] is "object"
      [
        args[0].attributes ? args[0]
        args[1] ? {}
      ]
    when typeof args[0] is "string" and args.length > 1
      [
        "#{args[0]}": args[1]
        args[2] ? {}
      ]
    else 
      [{}, {}]

class Model extends EventEmitter
  constructor: (attributes = {}) ->
    super()
    @$schema = @constructor
    # attributes = attributes.attributes ? attributes
    { $table: { defaults } } = @$schema

    # 填充默认值
    attributes[column] = field for column, field of defaults when column not of attributes
    @attributes = attributes

    # 记录改变前的状态, 此为 attrs 初始值
    @_oldstates = @to_json yes
    @_changed = no
    @_previous_attributes = null

  to_json: (include_secure) ->
    { $table: { fields } } = @$schema
    json_object = lo.cloneDeep @attributes
    delete json_object[name] for name, { secure } of fields when secure unless include_secure
    json_object

  has: (attr) -> attr of @attributes
  get: (attr) -> @attributes[attr]
  set: (args...) ->
    return @ if lo.isEmpty args

    [attrs, options] = resolve_args args

    return @ if lo.isEmpty attrs

    current_attrs = @attributes

    # 检查修改是否合法
    return no unless options.silent or not @validate or @_perform_validate attrs, options

    changing = @_changing
    @_changing = yes

    @_update_attrs current_attrs, attrs, options

    unless changing or options.silent or @_changed
      @emit "change", @, options

  _update_attrs = (current_attrs, attrs, options) ->
    for key, value of attrs when current_attrs[key] isnt value
      unless options.silent
        @_previous_attributes ?= {}
        @_previous_attributes[key] = current_attrs[key]
        setImmediate => @emit "change:#{key}", @, value, options

      current_attrs[key] = value
      @_changed = yes

  # If a specific `error` callback has been passed, call that instead of firing the general `'error'` event.
  _perform_validate: (attrs, options) ->
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

  insert: (callback) -> @$schema.insert @, callback
  update: (callback) -> @$schema.update @, callback
  delete: (callback) -> @$schema.delete @, callback

module.exports = Model