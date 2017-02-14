[![build status](http://gitlab.widget-inc.com/upyun-dev/discover/badges/develop/build.svg)](http://gitlab.widget-inc.com/upyun-dev/discover/commits/develop)

[![Dependency Status](https://gemnasium.com/badges/882de3f393ed94e9a2bf2fe374e04ff7.svg)](https://gemnasium.com/1cbdb8e638a7b76b88b6450dd36fcbc6)
### Dependencies Services

+ mysqld
+ memcached

### Getting start

```coffee
{ Model, Criteria, getPool } = require '@upyun/discover'

# Model: function, 模型工厂
# Criteria: function, 低层次 SQL 逻辑操作封装
# getPool: function, mysql driver 接口

# 创建数据模型
Cat = Model options, params
Dog = Model options, params

cat_a = new Cat()
dog_a = new Dog()
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
