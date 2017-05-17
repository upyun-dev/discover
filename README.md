### Dependencies Services

+ mysqld
+ memcached

# [WIP] Discover v0.5.x Documents

# 设计概要

# 类与模块

## DataBase
## Cache
## Query
## Operator
## Schema
## Model
## Table
## Type
## Mixed

# 基础用法

```coffee
discover = require("@upyun/discover") database_cfg, cache_cfg

# 创建 User Schema
User = discover.create_schema tablename: "user", fields: [...]

# 创建 User model
user_a = new User ...

# 持久化模型 (提交插入操作)
user_a.insert()

# 更新 (提交变更操作)
user_a.name = "new name"
user_a.update()
# or
User.find_and_update { name: "Cassandra" }, { name: "Kafka" }

# 删除 (提交删除操作)
user_a.delete()
# or
User.find_and_delete { name: "Kafka" }

# 查询
User.find { name: "Kafka" }
User.findone { name: "Kafka" }
User.find_by_xxx...
```

# schema API

`Schema` 类仅仅包含了一系列模型操作的**类方法**.

## 类方法

+ `all([options])`: {Promise}
+ `count(condition: Object, [options])`: {Promise}
+ `find(condition: Object, [options])`: {Promise}
+ `findone(condition: Object, [options])`: {Promise}
+ `find_with_count(condition: Object, [options])`: {Promise}
+ `find_by_index(index_name, value, [options])`: {Promise}
+ `find_by_unique_key(key, value, [options])`: {Promise}
+ `find_by_id(id: String, [options])`: {Promise}
+ `find_by_id(id: Array(String), [options])`: {Promise}
+ `find_by_id(id: Object, [options])`: {Promise}
+ `find_by_ids(ids: Array(String), [options])`: {Promise}
+ `find_by_ids(ids: Array(Array(String)), [options])`: {Promise}
+ `find_by_ids(ids: Array(Object), [options])`: {Promise}
+ `find_and_update(condition: Object, modified: Object, [options])`: {Promise}
+ `find_and_delete(condition: Object, [options])`: {Promise}
+ `insert(model: Model)`: {Promise}
+ `update(model: Model)`: {Promise}
+ `delete(model: Model)`: {Promise}
+ `before(method_name: String, exec: Function)`: {Mixed}
+ `after(method_name: String, exec: Function)`: {Mixed}

+ `wrap(objects: Object, [options])`: {Array(Model)}
+ `wrap(objects: Array(Object), [options])`: {Array(Model)}
+ `load(id: String, key: String, [options])`: {Promise}
+ `load(id: Array(String), key: String, [options])`: {Promise}
+ `load(id: Object, key: String, [options])`: {Promise}
+ `clean_cache(value: Model)`: {Promise}
+ `clean_cache(value: Array)`: {Promise}
+ `clean_cache(value: Object)`: {Promise}
+ `walk(model: Model, prefix: String)`: {Array(Function)}
+ `is_valid(method_name: String)`: {Boolean}
+ `cache_key(key: Model)`: {String}
+ `cache_key(value: Array)`: {String}
+ `cache_key(value: Object)`: {String}
+ `to_model(data: Object)`: {Model}

# model API

`Model` 继承了 `EventEmitter2`.

## 创建 Model (模型)

```
model = new Model(attributes)
```

`attributes` 为一个数据模型的 k-v 对象.

## 实例属性

+ `$schema`: {Schema} 关联的 `Schema` 类
+ `attributes`: {Object} 数据域
+ `_oldstates`: {Object} 记录 `update()` 方法调用之前的状态
+ `_previous_attributes`: {Object} 记录 `set()` 方法调用之前的状态
+ `_changed`: {Boolean} `set()` 方法调用之前数据域是否发生变更
+ `_changing`: {Boolean} 当前是否正在进行数据域修改

## 实例方法

### Public
+ `insert()`: {Promise}
+ `update()`: {Promise}
+ `delete()`: {Promise}
+ `to_json(include_secure_fields: Boolean)`:  {Object}
+ `has(column_name: String)`: {Boolean}
+ `get(column_name: String)`: {value}
+ `set(column_name: String, value, [options])`: {False | Model}
+ `set(attrs: Object)`: {False | Model}
+ `set(model: Model)`: {False | Model}
+ `reset()`: {Model}
+ `is_changed([attr: String])`: {Boolean}
+ `changed_attributes([current_attrs: Object])`: {Object}
+ `previous([attr: String])`: {value}

### Private

+ `_update_attrs(new_attrs: Object)`: {null}
+ `_perform_validate(attrs: Object, [options])`: {Boolean}

# Mixed (混合模型) API

## 混合模型是什么?
混合模型是由调用 `(new Discover db, cache).create_schema(params)` 方法返回得来的, 它就是我们一般所讲的 Data Model (数据模型).

为何称做混合模型? 因为 `Mixed` 类本身并不具备什么数据操作能力, 它是通过扩展完善的自身: 继承了 `Model` 类, 混入了 `Schema` 类. 因此它具备了 `Schema` 的静态方法以及 `Model` 的实例方法.

## 实例化

```
mixed_model = new Mixed(attributes)
```

## 属性

### 类属性

+ `$cache`: `Cache` 类的实例
+ `$database`: `DataBase` 类的实例
+ `$table`: `Table` 类的实例
+ `_before_hooks`: 维护 before hook 的对象
+ `_after_hooks`: 维护 after hook 的对象

### 实例属性

+ `(new Model).attributes [getter/setter]`: 直接通过 `Mixed` 实例读写模型数据域.

其余同 `Model` 类.

## 方法

### 类方法

+ `find_by_${suffix}`: `suffix` 是 `column name` 的蛇形下滑线命名方式. (注意: 这些方法只有在创建 Schema 时配置了 `indices` 时可用)

其余同 `Schema` 类

### 实例方法

同 `Model` 类

# 其他 API
除了上述三类 API, 还有一些不太常用, 但可以用于编写 discover 扩展的内部 API, 它们是通过 `Discover` 类方法暴露给开发者的.

其实 `Schema` 类和 `Model` 类都属于内部类, 这里只是为了阐述 `Mixed` 模型才将它们单独提出来讲. 它们两个的 API 已经是经过 Mix 的, 因此在 `Mixed` 类及其实例中均可直接使用.

内部类和方法的 API 使用方法参见源码, 相关文档正在编写.

# 查询语法

discover 自从 v0.3 起支持了 `ooq` 查询语法, 类似 mongodb 的 JSON 查询 DSL. 可以通过 `Schema` 类的 `find_*` 方法传入.

# Breaking changes to be reminded when upgrading to v0.5.x

+ 异步 API 全部使用 Promise 接口.
+ Schema 上添加 `find_and_update`以及`find_and_delete`方法.

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

