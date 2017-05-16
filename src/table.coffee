Type = require "./type"
# mysql 表元信息

class Table # metadata: table
  constructor: ({ @name, fields: _fields }) ->
    @fields = {}
    @pks = []
    @columns = []
    # 只能有一个自增字段: https://github.com/mysqljs/mysql#getting-the-id-of-an-inserted-row
    @auto = null
    @non_auto = []
    @non_pks = []
    @defaults = {}

    for field in _fields
      field = @box field
      # 如果 field 中配置了 `name` 但没配置 `column`, 默认做名字转换
      field.column = field.name unless field.column?
      { column, pk, auto, default: default_value } = field

      @fields[column] = field
      @columns.push column

      (if pk? then @pks else @non_pks).push column
      if auto? then @auto = column else @non_auto.push column
      @defaults[column] = default_value ? field.default_value?()

  box: (field) -> new (Type[field.type] ? Type.raw) field
  # ensure: (database) ->
  #   cols = ("`#{column}` #{type} #{if auto? then 'AUTO_INCREMENT' else ''}" for column, { type, auto } of @fields).join ","
  #   pks = ("PRIMARY KEY (`#{column}`)" for { column } in @pks).join ","

  #   sql = """
  #     CREATE TABLE `#{@name}` (#{cols}, #{pks})
  #   """
  #   console.log sql
  #   database.query sql, []

module.exports = Table