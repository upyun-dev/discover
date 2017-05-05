moment = require "moment"

# Breaking changes:
# toDB => serialize
# fromDB => extract

# Type:
# int => Int
# json => Json
# date => DateTime
# raw => Raw

class Raw
  constructor: (attrs) -> Object.assign @, attrs
  default_value: -> null
  # toDB
  serialize: (val) -> val
  # fromDB
  extract: (val) -> val

class Json extends Raw
  default_value: -> {}
  serialize: (val) -> if val? then JSON.stringify val else val
  extract: (val) ->
    if val?
      try
        JSON.parse val
      catch e
        null
    else
      val
  
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
  Int
  Json
  DateTime
  Raw