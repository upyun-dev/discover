[![build status](http://gitlab.widget-inc.com/upyun-dev/discover/badges/develop/build.svg)](http://gitlab.widget-inc.com/upyun-dev/discover/commits/develop)

[![Dependency Status](https://gemnasium.com/badges/882de3f393ed94e9a2bf2fe374e04ff7.svg)](https://gemnasium.com/1cbdb8e638a7b76b88b6450dd36fcbc6)
### Dependencies Services

+ mysqld
+ memcached

### Getting start

```coffee
Discover = require "@upyun/discover"
discover = new Discover database_config, cache_config

# 创建两个 Schema
User = discover.create_schema tablename: "user", fields: [
  { column: "id", type: "Raw", pk: yes, auto: yes, secure: yes }
  { column: "name", type: "Raw" }
  { column: "age", type: "Int" }
]

Comment = discover.create_schema tablename: "comment", fields: [
  { column: "" }
]

# 根据 Schema 创建模型 Model
user_a = new User id: "1", name: "ran", location: "HangZhou", age: 23
comment_a = new Comment id: "1", from_user: "1", content: "hello world", date: new Date

# 持久化模型数据到对应表的行
user_a.insert (err) ->

# 对已有模型更新字段
user_a.name = "abbshr"
user_a.update (err) ->

# 删除已有模型
user_a.delete (err) ->

# 查询
User.find_by_id
User.find_one
User.find_by_xxx
...

# 条件更新
User.find_and_update condition, modified, [options], callback

# 条件删除
User.find_and_delete condition, [options], callback
```

## Internal

WIP

### ooq

WIP

## other mechanism

WIP

### Hooks
Discover now supports hook mechanism.

##### Before Hook
```js
var Model = require('discover').Model();

Model.before('insert', function(done) {
  // `this` => the Model instance
  console.info('before insert operation');
  // must be called when the current task done !
  done(err);
});
```

##### Three Different After Hooks
```js
// insert
Model.after('insert', function(new_model, done) {
  // `this` => the Model instance
  console.info('after delete operation');
  // must be called when the current task done !
  done(err);
});

// update
Model.after('update', function(old_model, new_model, done) {
  // `this` => the Model instance
  console.info('after delete operation');
  // must be called when the current task done !
  done(err);
});

// delete
Model.after('delete', function(old_model, done) {
  // `this` => the Model instance
  console.info('after delete operation');
  // must be called when the current task done !
  done(err);
});
```

*note 1: we now only permit defining hooks on method `insert`, `update`, `delete`.*

*note 2: hooks and the hooked method will suspend when the former failed.*

*note 3: all tasks execute in series in the order of how they defined before.*

#### validations
to do validations, you need some **"validate"** prefix methods defined on model instance.

validations method will be invoked before `insert` and `update` (in fact, after all hook-functions and before the real insert/update operation) automaticly only if they had been predefined.

for example:
```js
model.validateFields = function(callback) {
  if (valid)
    callback(null);
  else
    callback(new Error('balabala'));
};
```

then, `validateFields` will be executed automaticly when invoking either '`insert`' or '`update`'.

+ *note: to do validations automaticly, be sure they belong to the `prototype` of the Model*
+ *note: the validation methods will auto-execute **in the order of how they defined***
