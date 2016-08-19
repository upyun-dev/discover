0.1.7 / 2015-12-25
==================

* 使用 Debug 代替 ulogger
* 添加测试用例
* 移除一些不必要的逻辑
* 支持 Hooks
* 增加 validation
* 规范 coding style
* Model 增加 count, find, findOne, findWithCount 方法

0.1.8 / 2016-01-07
==================

* Change package name to @upyun-dev/discover
* 添加 validation 方法执行顺序说明文档
* 优化 insert 以及 update 性能

0.1.9 / 2016-01-08
==================

* Change package name back to discover

0.1.10 / 2016-07-05
==================

* 不再使用 Object.observe
* 在 after hooks 调用之后再对 model 进行 clear 操作

0.2.0 / 2016-08-19
==================

* Model 创建模型时不再修改传入的参数
* 支持同一进程内多数据库实例
* 添加注释和文件描述,  重构 criteria
* 修复使用 domain 做 model fields 导致测试结果未知异常的问题
* 弃用 eventemitter, 改用 eventemitter 2