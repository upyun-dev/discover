Table = require "./table"
field_types = require "./type"
{ class_methods, instance_methods } = require "./model"
{ EventEmitter2: EventEmitter } = require "eventemitter2"

setup = ({ database, cache }) -> (params) -> create_model database, cache, params

create_field: (define) ->
  Type = field_types[define.type] ? field_types.Raw
  new Type define

create_model = (database, cache, params) ->
  { fields = [], indices = [], tablename } = params = Object.assign {}, params
  _fields = []

  for field in fields
    { index, unique } = field
    _fields.push create_field field
    indices.push field if index? or unique?

  table = new Table { name: tablename, database, fields: _fields }

  delete params.fields
  delete params.indices
  delete params.tablename

  class Model extends EventEmitter
    @$table: table
    @$constructor: Schema
    @_beforehooks: {}
    @_afterhooks: {}

    $constructor: @

    Object.assign @, class_methods
    Object.assign @::, instance_methods
    Object.assign @::, params

    for { column, unique } in indices
      suffix = column.replace /\b[a-z]/g, (match) -> match.toLowerCase()
      method_name = "find_by_#{suffix}"
      continue if @[method_name]?

      @[method_name] = (args...) ->
        args.unshift column
        @[if unique? then "find_by_unique_key" else "find_by_index"] args...

    for { column } in _fields
      Object.defineProperty @::, column, 
        get: -> @get column
        set: (val) -> @set column, val

    constructor: (attributes = {}) ->
      super()
      @$model = Model
      attributes = attributes.attributes if attributes.$model?
      { $table: { defaults } } = @$model

      attributes[k] = v for k, v of defaults when k not of attributes
      @attributes = attributes
      @_oldstates = @to_json yes
      @_changed = no
      @_previous_attributes = null

module.exports = setup