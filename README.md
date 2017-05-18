### Dependencies Services

+ mysqld
+ memcached

# [WIP] Discover v0.5.x Documents

Discover 是一个 Node.js 平台上的 Mysql ORM.

需要 CoffeeScript v0.12.x 编译源码, 依赖 Node.js ≥ v6.x 版本.

# 设计概要

discover 内部代码复杂凌乱, 结构高度耦合, 许多概念和函数调用杂糅在一起, 公有 API 用起来也比较复杂, 时常懵逼. 此外, Discover 缺乏完善的文档, 准确说是一点文档没有, 使用上完全要参照其他项目的用法, 并且配置参数也不知道有哪些.

这对其他开发者造成很大的阅读/理解压力, 甚至连维护者也难以弄清楚哪些接口该怎么用, 后续也不易持续维护.

第一次重构并没有什么本质的改善, 仅仅是朝着模块化方向走了几步. 基于以上, 有了这次重写的目的: 清晰的代码层次与架构, 松耦合, 更多的功能, 更语义化更便捷的接口调用, 清理冗余逻辑, 修复历史遗留问题, 重新定义内部概念...

# 类与模块

在新版本的 Discover 中, 所有的类和模块已经通过入口暴露出来, 允许基于其上二次开发.

## Discover
`Discover` 类是整个库的入口, 暴露了一系列内部类以及一个实例方法.

```coffee
Discover = require "discover"
discover = new Discover(database_config, [cache_config])
```

最常规的用法就是像上面这样通过实例化一个 `Discover`, 绑定底层资源到这个 discover 实例上.

```coffee
User = discover.create_schema(schema_pattern)
```

随后调用`create_schema` 方法创建一个**新的** `Mixed` 类, 它就是一个 schema, 我们将用它来创建数据模型. 如上所示, 创建了一个 `User` schema.

```coffee
user_james = new User(attributes)
```

上面的示例创建了一个 `Model` 类实例, 也就是数据模型. 我们可以在它上面做 CURD 操作.

其它内部类作为 `Discover` 的子类, 挂载到 Discover 上:

```coffee
{ Query, DataBase, Cache, Table, Type, Operator, Schema, Model } = require "discover" 
```

### 参数

#### database_config

#### cache_config

#### schema_pattern

#### attributes

## DataBase
`DataBase` 类里直接操作 mysql driver, 通过它实现资源的池化, 连接的创建, 销毁; 以及执行 SQL 语句.

```coffee
{ DataBase } = require "discover"

cfg =
  host: "127.0.0.1"
  user: "root"
  password: ""
  database: "test"

database = new Database cfg

database.query "SELECT * FROM test"
.then ([row]) -> console.log row
.catch (err) -> console.error err

database.next_sequence "name"
.then (id) -> console.log id
.catch (err) -> console.error err
```

## Cache
`Cache` 类里直接操作 memcached driver, 提供了添加/删除/读取的三个接口.

```coffee
{ Cache } = require "discover"

cfg = servers: "127.0.0.1:11211"
cache = new Cache cfg

cache.set "m", {a: b: 3}, 0
.then (r) ->
  console.log r
  cache.set "n", {a: 5}, 0
.catch (err) -> console.error "set_err:", err
.then -> cache.get ["m", "n"]
.then (r) -> console.log r
.catch (err) -> console.error "get_err:", err
.then -> cache.del "m"
.then (r) -> console.log r
.catch (err) -> console.error "del_err:", err
```

## Query
`Query` 类是 Discover 的 SQL 语法的对象表示, 允许以 JavaScript 链式调用构建 SQL 查询语句, 是 Discover 逻辑的核心.

```coffee
{ Query } = require "discover"

console.log (new Query Schema).select().where({}).to_sql()
console.log (new Query Schema).select().where({ id: 1, col: { op: "like", value: "sss" } }).orderby("id").limit(5, 10).to_sql()
console.log (new Query Schema).select().where({ id: 1, col: { op: "like", value: "sss" } }).orderby({ column: "id", order: 'desc'}).limit(10).to_sql()
console.log (new Query Schema).id().where({ id: 1, col: { op: "like", value: "sss" } }).orderby({ column: "id", order: 'desc'}).limit(10).to_sql()
console.log (new Query Schema).count().where({ id: 1, col: { op: "like", value: "sss" } }).orderby({ column: "id", order: 'desc'}).limit(10).to_sql()
console.log (new Query Schema).max("id").where({ id: 1, col: { op: "like", value: "sss" } }).orderby({ column: "id", order: 'desc'}).limit(10).to_sql()
console.log (new Query Schema).sum(["id", "name"]).where({ id: 1, col: { op: "like", value: "sss" } }).orderby({ column: "id", order: 'desc'}).limit(10).to_sql()

(new Query Schema).update().set({ name: "ooq" }).where({ name: { op: "like", value: "elasticsearch" } }).execute()
```

## Operator
`Operator` 类作为 `ooq` 模块的 FFI 而存在. qengine 在语义分析时会调用相应 `Operator`, 并翻译生成 SQL 的 `WHERE` 从句.

`Operator` 类暴露了如下 FFI:

```coffee
and: (args...) -> new Operator.And args
or: (args...) -> new Operator.Or args
not: (args...) -> new Operator.Not args
xor: (args...) -> new Operator.Xor args

like: (column, value) -> new Operator column, "like", value
eq: (column, value) -> new Operator column, "=", value
neq: (column, value) -> new Operator column, "<>", value
gt: (column, value) -> new Operator column, ">", value
gte: (column, value) -> new Operator column, ">=", value
lt: (column, value) -> new Operator column, "<", value
lte: (column, value) -> new Operator column, "<=", value
isNull: (column) -> new Operator.Null column
isNotNull: (column) -> new Operator.NotNull column
```

## Schema
(见后文)

## Model
(见后文)

## Table
`Table` 类用于维护映射到 mysql 中对应表的元信息, 包括列名, 列属性, 值类型, 主键, 默认值等等.

## Type
`Type` 类被 `Table` 类所使用, 表示一个列的类型. 当实例化一个 table 时, 每个列都会被 **装箱** 成一个 `Type` 的实例, 提供了值的序列化和提取的方法.

目前支持的类型包括:

+ `"raw"`
+ `"int"`
+ `"str"` (alias to "string")
+ `"string"`
+ `"json"`
+ `"double"`
+ `"float"` (alias to "double")
+ `"date"` (alias to "datetime")
+ `"datetime"`

## Mixed
(见后文)

# 基础用法

```coffee
Discover = require "discover"
discover = new Discover database_cfg, cache_cfg

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

### 参数

#### options

#### id

#### condition

### hooks

#### Before Hook
```js
Model.before('insert', function(done) {
  // `this` => the Model instance
  console.info('before insert operation');
  // must be called when the current task done !
  done(err);
});
```

#### Three Different After Hooks
```js
// insert
Model.after('insert', function(new_model, done) {
  // `this` => the Model instance
  console.info('after delete operation');
  // must be called when the current task done !
  done(err);
});

// update
Model.after('update', function(oldstates, new_model, done) {
  // `this` => the Model instance
  console.info('after delete operation');
  // must be called when the current task done !
  done(err);
});

// delete
Model.after('delete', function(oldstates, done) {
  // `this` => the Model instance
  console.info('after delete operation');
  // must be called when the current task done !
  done(err);
});
```

*note 1: we now only permit defining hooks on method `insert`, `update`, `delete`.*

*note 2: hooks and the hooked method will suspend when the former failed.*

*note 3: all tasks execute in series in the order of how they defined before.*


### validation

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

#### 参数

##### attrs

### Private

+ `_update_attrs(new_attrs: Object)`: {null}
+ `_perform_validate(attrs: Object, [options])`: {Boolean}

# Mixed (混合模型) API

## 混合模型是什么?
混合模型是由调用 `(new Discover db, cache).create_schema(schema_pattern)` 方法返回得来的, 它就是我们一般所讲的 Data Model (数据模型).

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

+ `find_by_${suffix}(column: String, args...)`: `suffix` 是 `column name` 的蛇形下滑线命名方式. (注意: 这些方法只有在创建 Schema 时配置了 `indices` 时可用)

其余同 `Schema` 类

### 实例方法

同 `Model` 类

# 其他 API
除了上述三类 API, 还有一些不太常用, 但可以用于编写 discover 扩展的内部 API, 它们是通过 `Discover` 类方法暴露给开发者的.

其实 `Schema` 类和 `Model` 类都属于内部类, 这里只是为了阐述 `Mixed` 模型才将它们单独提出来讲. 它们两个的 API 已经是经过 Mix 的, 因此在 `Mixed` 类及其实例中均可直接使用.

# 查询语法

discover 自从 v0.3 起支持了 `ooq` 查询语法, 类似 mongodb 的 JSON 查询 DSL. 可以通过 `Schema` 类的 `find_*` 方法传入.

# Breaking changes to be reminded when upgrading to v0.5.x

+ 异步 API 全部返回 Promise, 不再支持 callback (除了 hook  functions 之外).
+ Schema 上添加 `find_and_update`以及`find_and_delete`方法.
+ 创建模型 schema 的方法变为 `create_schema`
+ tableName -> table_name
+ name 作为 column 的符号链接
+ 驼峰命名 -> 蛇形命名
+ orderBy -> order_by({column, order})
+  Schema.update 和 Schema.delete 返回的 Promise 的 resolve 函数参数为**一个**二元数组, 包含旧模型的 attributes, 以及新的模型, 而不是之前包含**两个**参数.
+ 引用内部类的方法也有所差异, 参看 **类与模块** 一章的第一节.

## Internal

WIP

### ooq

WIP

## other mechanism

WIP
