
### Hooks
Discover support hook mechanism.

#### methodHooks
for method-based hooks, define like this:

##### Before Hook
```js
model.before('insert', function(model, callback) {
  console.log('before insert operation');
  if (has error)
    callback(err);
  else
    callback(null);
});
```

##### After Hook
```js
model.after('delete', function(model, callback) {
  console.log('after delete operation');
  if (has error)
    callback(err);
  else
    callback(null);
});
```

*note: we now only permit defining hooks on method `insert`, `update`, `delete`.*

#### validations
to do validations, you need some **"validate"** prefix methods defined on model instance.

validations method will be invoked automaticly only if they had been predefined.

for example:
```js
model.validateFields = function(attr, callback) {
  if (all check passed)
    callback(null);
  else
    callback(new Error('balabala'));
};
```

then, when invoking either '`insert`' or '`update`', `validateFields` will be executed.
