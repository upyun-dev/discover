lo = require "lodash"
Table = require "./table"
Model = require "./model"
Schema = require "./schema"
Type = require "./type"

boxed = (field) -> new (Type[field.type] ? Type.raw)
wash = (pattern) -> delete pattern[attr] for attr in ["fields", "indices", "tablename"]
create = (database, cache, pattern) ->
  { fields = [], indices = [], tablename } = pattern_copied = lo.cloneDeep pattern
  boxed_fields = []

  for field in fields
    { index, unique } = field
    boxed_fields.push boxed field
    indices.push field if index? or unique?

  wash pattern_copied

  # 每次返回一个新的混入模型
  # 继承 Model 的原型方法
  class Mixed extends Model
    @$cache: cache
    @$database: database

    @$table: new Table { name: tablename, fields: boxed_fields }

    @_before_hooks: {}
    @_after_hooks: {}

    # mixin Schema 的静态方法
    lo.assign @, Schema

    # mixin pattern 参数中定义的实例方法
    lo.assign @::, pattern_copied

    # 根据索引或独立键生成静态查询方法
    for { column, unique } in indices
      suffix = column.replace /\b[a-z]/g, (match) -> match.toLowerCase()
      method_name = "find_by_#{suffix}"
      continue if @[method_name]?

      @[method_name] = (args...) ->
        args.unshift column
        @[if unique? then "find_by_unique_key" else "find_by_index"] args...

    # 定义 model attrs 的 getter/setter 属性
    for { column } in boxed_fields
      Object.defineProperty @::, column,
        get: -> @get column
        set: (value) -> @set column, value

module.exports = ({ database, cache }) -> (pattern) -> create database, cache, pattern
