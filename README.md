
### Hooks
Discover support hook mechanism.

#### methodHooks
for method-based hooks, define like this:

##### Before Hook
```js
model.before('insert', function(model) {
  // ...
});
```

##### After Hook
```js
model.before('delete', function(model) {
  // ...
});
```

_note: before/after hooks can be invoked for times, all the callback will be called from internal event queue._

#### validations
to do validations, you need some **"validate"** prefix methods defined on model instance.

validations method will be invoked automaticly only if they had been predefined.
