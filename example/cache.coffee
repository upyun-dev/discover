Cache = require "../src/cache"

cfg = servers: "127.0.0.1:11211"
cache = new Cache cfg

# cache.set "m", "n", 0
# .then (r) -> console.log r
# .catch (err) -> console.error "set_err:", err
# .then -> cache.get "m"
# .then (r) -> console.log r
# .catch (err) -> console.error "get_err:", err
# .then -> cache.del "m"
# .then (r) -> console.log r
# .catch (err) -> console.error "del_err:", err

module.exports = cache