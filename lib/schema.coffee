Table = require "./table"
field_types = require "./type"
Model = require "./model"
Query = require "./query"

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

  # 每次返回一个新的混入模型
  class MixedModel extends Model
    @$table: table
    @$constructor: Schema
    @_beforehooks: {}
    @_afterhooks: {}

    $constructor: @

    # mixin 静态方法
    Object.assign @, Model
    Object.assign @::, params

    @$query: new Query @
    @$database: database
    @$cache: cache

    # 根据索引生成静态查询方法
    for { column, unique } in indices
      suffix = column.replace /\b[a-z]/g, (match) -> match.toLowerCase()
      method_name = "find_by_#{suffix}"
      continue if @[method_name]?

      @[method_name] = (args...) ->
        args.unshift column
        @[if unique? then "find_by_unique_key" else "find_by_index"] args...

    # 定义 model attrs 的 getter/setter 属性
    for { column } in _fields
      Object.defineProperty @::, column, 
        get: -> @get column
        set: (val) -> @set column, val

module.exports = setup