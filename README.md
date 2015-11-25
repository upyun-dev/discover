
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

##### After Hook
```js
Model.after('delete', function(done) {
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

*note: to do validations automaticly, be sure they belong to the `prototype` of the Model*
