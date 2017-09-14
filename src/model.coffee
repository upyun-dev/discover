Schema = require "./schema"
lo = require "lodash"

resolve_args = ([column = {}, value = {}, options = {}] = []) ->
  switch
    when lo.isObject column
      [
        column.attributes ? column
        value
      ]
    when lo.isString column
      [
        "#{column}": value
        options
      ]
    else 
      [{}, {}]

class Model extends Schema
  constructor: (attributes = {}) ->
    super()
    @$schema = @constructor
    # attributes = attributes.attributes ? attributes
    { $table: { defaults } } = @$schema

    # 填充默认值
    attributes[column] = field for column, field of defaults when column not of attributes
    @attributes = attributes

    # 记录改变前的状态, 此为 attrs 初始值
    # update() 方法后更新 (实现持久化后)
    @_oldstates = @to_json yes
    # set() 方法后更新
    @_previous_attributes = {}
    @_changed = no
    @_changing = no

  to_json: (include_secure) ->
    { $table: { fields } } = @$schema
    json_object = lo.cloneDeep @attributes
    delete json_object[name] for name, { secure } of fields when secure unless include_secure
    json_object

  has: (attr) -> attr of @attributes
  get: (attr) -> @attributes[attr]
  set: (args...) ->
    return @ if lo.isEmpty args

    [new_attrs, options] = resolve_args args

    return @ if lo.isEmpty new_attrs

    # 检查修改是否合法
    # return no unless options.silent or @_perform_validate new_attrs, options

    changing = @_changing
    @_changing = yes

    @_update_attrs new_attrs, options

    unless changing or options.silent or @_changed
      setImmediate => @emit "change", @, options

    @

  # 更新 _previous_attributes
  _update_attrs: (new_attrs, options) ->
    for key, value of new_attrs when @attributes[key] isnt value
      @_previous_attributes[key] = @attributes[key]
      @attributes[key] = value
      @_changed = yes

  # If a specific `error` callback has been passed, call that instead of firing the general `'error'` event.
  _perform_validate: (attrs, options = {}) ->
    error = @validate? attrs
    return yes unless error

    if lo.isFunction options.error
      options.error @, error, options
    else setImmediate => @emit "error", @, error, options
    no

  reset: (options) ->
    @_previous_attributes = {}
    @_changing = no
    @_changed = no
    this

  # 以下断言方法仅在数据提交前(update 方法执行成功前)对内存中缓存的模型有效
  # 如果在提交后需要获取变更, 可以访问 _oldstates 属性或者 update().then([oldstates]) -> oldstates
  is_changed: (attr) ->
    if lo.isEmpty @_previous_attributes then no
    else if attr?
      @_previous_attributes[attr] isnt @attributes[attr]
    else
      @_changed

  changed_attributes: (current_attrs) ->
    return {} if lo.isEmpty @_previous_attributes
    current_attrs ?= @attributes
    old = @_previous_attributes
    changed = {}
    changed[key] = current_attrs[key] for key of current_attrs when old[key] and old[key] isnt current_attrs[key]
    changed

  previous: (attr) ->
    if lo.isEmpty @_previous_attributes then null
    else if attr? then @_previous_attributes[attr]
    else lo.assign {}, @_previous_attributes

  insert: -> @$schema.insert @
  update: -> @$schema.update @
  delete: -> @$schema.delete @

module.exports = Model