lo = require "lodash"
Table = require "./table"
Model = require "./model"
Schema = require "./schema"

wash = (pattern) -> delete pattern[attr] for attr in ["fields", "indices", "tablename"]
create = (database, cache, pattern) ->
  { fields = [], indices = [], tablename } = pattern_copied = lo.cloneDeep pattern

  indices.push field for field in fields when field.index? or field.unique?
  wash pattern_copied

  # 每次返回一个新的混入模型
  # 继承 Model 的原型方法
  class Mixed extends Model
    @$cache: cache
    @$database: database

    @$table: new Table { name: tablename, fields }

    @_before_hooks: {}
    @_after_hooks: {}

    # mixin Schema 的静态方法
    lo.assign @, Schema

    # mixin pattern 参数中定义的实例方法
    lo.assign @::, pattern_copied

    # 根据索引或独立键生成静态查询方法
    # 驼峰式命名变为蛇形命名
    for { column, unique } in indices
      suffix = column.replace /[A-Z]/g, (c, i, str) -> "#{if i is 0 or str[i - 1] is "_" then "" else "_"}#{c.toLowerCase()}"
      @["find_by_#{suffix}"] ?= (args...) -> @["find_by_#{if unique? then "unique_key" else "index"}"] column, args...

    # 定义 model attrs 的 getter/setter 属性
    for { column } in fields
      Object.defineProperty @::, column,
        get: -> @get column
        set: (value) -> @set column, value

module.exports = ({ database, cache }) -> (pattern) -> create database, cache, pattern
