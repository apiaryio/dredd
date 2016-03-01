# Contributing Guidelines

## Ideas, bugs...

- File an [issue][issues].
- [API Blueprint][] prepares direct support for testing and scenarios. Interested?
  Check out [apiaryio/api-blueprint#21](https://github.com/apiaryio/api-blueprint/issues/21)!

## Coding

- Dredd is written in [CoffeeScript][].
- There's [ready-made virtual machine][vde] to get you started very quickly.

Recommended workflow:

1. Fork Dredd, create a feature branch.
2. Write tests, use `npm run tests:bdd`.
3. Write code.
4. Make sure [test coverage][] didn't drop.
5. Send a Pull Request.


[API Blueprint]: http://apiblueprint.org/
[CoffeeScript]: http://coffeescript.org

[test coverage]: https://coveralls.io/r/apiaryio/dredd?branch=master
[issues]: https://github.com/apiaryio/dredd/issues
[vde]: VirtualDevelopmentEnvironment.md
