# Promisify API
  - more semantic
  - ES6, co
  - ES7(await)
  - util.promisify
  - lib: axios, request

```coffee
fs = require "fs"
{promisify} = require "util"

readFile = promisify fs.readFile

do ->
  file =
  try
    await readFile "outline.md", "utf-8"
  catch e
    e
  console.log file
```

# 层级

orm:
  object -> low level ops
    |             |
  model  ->   SQL query

define Schema -> associate to db table
create model via Schema -> create row in table

schema -> table
model  -> row

## mixed-in model

Schema class | Model class => Mixed class

`define_schema()` factory method => new Mixed class

## hooks

## curd

## model instance members

+ `$schema`: {Schema} 关联的 `Schema` 类
+ `attributes`: {Object} 数据域
+ `_oldstates`: {Object} 记录 `update()` 方法调用之前的状态
+ `_previous_attributes`: {Object} 记录 `set()` 方法调用之前的状态
+ `_changed`: {Boolean} `set()` 方法调用之前数据域是否发生变更
+ `_changing`: {Boolean} 当前是否正在进行数据域修改

## static members

重要的属性都用$前缀标识.

+ `$cache`: `Cache` 类的实例
+ `$database`: `DataBase` 类的实例
+ `$table`: `Table` 类的实例

## query & operators

原 Criteria class. 负责最终 SQL 语句的构建, 序列化, 执行. 主要包含树构建到翻译过程. 并且提供了链式调用的 API.
每个 sql 指令构建为一个类. 根据 sql 语法规则可以很容易的添加翻译规则, 扩展更多的功能.

## table

维护schema对应表的元数据. 不包含任何 sql 语句.

## type

数据类型的对应关系, 对每个支持的类型提供了序列化和反序列化接口, 方便扩展更多的类型

## news & breaking changes
