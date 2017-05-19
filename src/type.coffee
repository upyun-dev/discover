moment = require "moment"

class Raw
  constructor: (attrs) -> Object.assign @, attrs
  data_type: "BLOB"
  default_value: -> null
  serialize: (val) -> val
  extract: (val) -> val

class Str extends Raw
  data_type: "TEXT"
  default_value: -> ""
  serialize: (val) -> val ? @default_value()
  extract: (val) -> val ? @default_value()

class Json extends Raw
  data_type: "JSON"
  default_value: -> {}
  serialize: (val) -> if val? then JSON.stringify val else val
  extract: (val) -> try JSON.parse val catch e then {}
  
class Int extends Raw
  data_type: "INT"
  default_value: -> 0 >> 0
  serialize: (val) -> if val? then Number.parseInt val else @default_value()
  extract: (val) -> if val? then Number.parseInt val else NaN

class Double extends Raw
  data_type: "DOUBLE"
  default_value: -> 0.0
  serialize: (val) -> if val? then Number.parseFloat val else @default_value()
  extract: (val) -> if val? then Number.parseFloat val else NaN

class DateTime extends Raw
  data_type: "DATETIME"
  default_value: -> new Date()
  serialize: (val) ->
    if val? then moment(val).format "YYYY-MM-DD HH:mm:ss" else @default_value()
  extract: (val) ->
    if val? then moment(val).toDate() else @default_value()

# class StrSet extends Str

# class StrEnum extends Str

# class StrBlob extends Str

module.exports =
  raw: Raw
  int: Int
  str: Str
  string: Str
  json: Json
  double: Double
  float: Double
  date: DateTime
  datetime: DateTime