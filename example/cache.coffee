Cache = require "../src/cache"

cfg = servers: "127.0.0.1:11211"
cache = new Cache cfg

do ->
  r = await cache.set "m", {a: b: 3}, 0
  console.log r
  await cache.set "n", {a: 5}, 0
  r = await cache.get ["m", "n"]
  console.log r
  cache.del "m"

#.then (r) ->.
#  console.log r
#  cache.set "n", {a: 5}, 0
#.catch (err) -> console.error "set_err:", err
#.then -> cache.get ["m", "n"]
#.then (r) -> console.log r
#.catch (err) -> console.error "get_err:", err
#.then -> cache.del "m"
#.then (r) -> console.log r
#.catch (err) -> console.error "del_err:", err

module.exports = cache
