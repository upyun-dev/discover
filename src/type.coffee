moment = require "moment"

class Raw
  constructor: (attrs) -> Object.assign @, attrs
  default_value: -> null
  serialize: (val) -> val
  extract: (val) -> val

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

module.exports =
  raw: Raw
  int: Int
  json: Json
  double: Double
  date: DateTime