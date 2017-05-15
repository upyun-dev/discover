moment = require "moment"

class Raw
  constructor: (attrs) -> Object.assign @, attrs
  default_value: -> null
  serialize: (val) -> val
  extract: (val) -> val

class Str extends Raw
  default_value: -> ""
  serialize: (val) -> val ? @default_value()
  extract: (val) -> val ? @default_value()

class Json extends Raw
  default_value: -> {}
  serialize: (val) -> if val? then JSON.stringify val else val
  extract: (val) -> try JSON.parse val catch e then {}
  
class Int extends Raw
  default_value: -> 0 >> 0
  serialize: (val) -> if val? then Number.parseInt val else @default_value()
  extract: (val) -> if val? then Number.parseInt val else NaN

class Double extends Raw
  default_value: -> 0.0
  serialize: (val) -> if val? then Number.parseFloat val else @default_value()
  extract: (val) -> if val? then Number.parseFloat val else NaN

class DateTime extends Raw
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