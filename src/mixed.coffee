lo = require "lodash"
Table = require "./table"
Model = require "./model"
# Schema = require "./schema"

wash = (pattern) -> delete pattern[attr] for attr in ["fields", "indices", "name"]
create = (database, cache, pattern) ->
  { fields = [], indices = [], name } = pattern_copied = lo.cloneDeep pattern

  indices.push field for field in fields when field.index? or field.unique?
  wash pattern_copied

  # 每次返回一个新的混入模型
  # 继承 Model 的原型方法
  class Mixed extends Model
    @$cache: cache
    @$database: database

    @$table: new Table { name, fields }

    @_before_hooks: {}
    @_after_hooks: {}

    # # mixin Schema 的静态方法
    # lo.assign @, Schema
    # console.log @

    # mixin pattern 参数中定义的实例方法
    lo.assign @::, pattern_copied

    # 根据索引或独立键生成静态查询方法
    # 驼峰式命名变为蛇形命名
    indices.forEach ({ column, unique }) =>
      suffix = column.replace /[A-Z]/g, (c, i, str) -> "#{if i is 0 or str[i - 1] is '_' then '' else '_'}#{c.toLowerCase()}"
      @["find_by_#{suffix}"] ?= (args...) -> @["find_by_#{if unique? then "unique_key" else "index"}"] column, args...

    # 定义 model attrs 的 getter/setter 属性
    fields.forEach ({ column, name }) =>
      throw new Error "must have at least one `column` or `name` field" unless column? or name?
      column ?= name
      Object.defineProperty @::, column,
        get: -> @get column
        set: (value) -> @set column, value

module.exports = ({ database, cache }) -> (pattern) -> create database, cache, pattern
