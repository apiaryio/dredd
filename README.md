# Dredd — HTTP API Validation Tool

[![Build Status](https://travis-ci.org/apiaryio/dredd.png?branch=master)](https://travis-ci.org/apiaryio/dredd)
[![Dependency Status](https://david-dm.org/apiaryio/dredd.png)](https://david-dm.org/apiaryio/dredd)
[![devDependency Status](https://david-dm.org/apiaryio/dredd/dev-status.png)](https://david-dm.org/apiaryio/dredd#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/apiaryio/dredd/badge.png?branch=master)](https://coveralls.io/r/apiaryio/dredd?branch=master)
[![Join the chat at https://gitter.im/apiaryio/dredd](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/apiaryio/dredd?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![NPM](https://nodei.co/npm/dredd.png)](https://nodei.co/npm/dredd/)

Dredd is a command-line tool for validating API documentation written in [API Blueprint][]
format against its backend implementation. With Dredd you can easily plug your
API documentation into the Continous Integration system like [Travis CI][]
or [Jenkins][] and have API documentation up-to-date, all the time.
Dredd uses the [Gavel][] for judging if a particular API response is valid
or if it isn't. If you are curious about how decisions are made, please refer
to Gavel's [behavior specification][].

![Dredd API Blueprint testing tool](https://raw.github.com/apiaryio/dredd/master/img/Dredd.png)

## Get Started Testing API Documentation and backend

1. If you don't have [Node.js](https://nodejs.org/) installed, you may want to use [NVM](https://github.com/creationix/nvm)
1. Create an API blueprint in `blueprint.md`
1. Install Dredd

    ```
    $ npm install -g dredd
    ```

1. Run interactive configuration:

    ```
    $ dredd init
    ```

1. Run dredd

    ```
    $ dredd
    ```

## Documentation

**View the [full documentation](http://dredd.readthedocs.org/en/latest/) for how to use all of Dredd's features.**



## Contribution

Any contribution is more than welcome!
Let's start with creating your own [virtual development environment][vde],
then fork, write tests, write clean, readable code which communicate, use `scripts/bdd`, keep the [test coverage][] and create a pull request. :)

Make sure to follow Dredd [issues page][issues].

To learn more about the future of API Blueprint & Testing visit [apiaryio/api-blueprint#21](https://github.com/apiaryio/api-blueprint/issues/21).

[API Blueprint]: http://apiblueprint.org/
[test coverage]: https://coveralls.io/r/apiaryio/dredd?branch=master
[Travis CI]: https://travis-ci.org/
[Jenkins]: http://jenkins-ci.org/
[Gavel]: http://blog.apiary.io/2013/07/24/Bam-this-is-Gavel/
[behavior specification]: https://www.relishapp.com/apiary/gavel/docs
[vde]: https://github.com/apiaryio/dredd/blob/master/VirtualDevelopmentEnvironment.md
[issues]: https://github.com/apiaryio/dredd/issues?state=open
[Express.js]: http://expressjs.com/starter/hello-world.html
[CoffeeScript]: http://coffeescript.org
