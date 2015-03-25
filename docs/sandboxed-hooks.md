# Sandboxed Hooks
Sandboxed hooks are used for running untrusted hook code. In each hook file you can use following functions:

`before(name, function)`
`after(name, function)`
`beforeAll(function)`
`afterAll(function)`
`beforeEach(function)`
`afterEach(function)`

[Transasction]() object is passed as a first argument to the hook function. Sandboxed hooks doesn't have asynchronous API. Loading of hooks and each hook is run in it's own isolated, sandboxed context. Hook maximum execution time is 500ms. Inside each hook you can access `stash` object for passing data between hooks.
