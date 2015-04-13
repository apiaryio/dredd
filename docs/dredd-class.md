# Dredd Class

You can also use Dredd from your JavaScript environment directly,
not only via [CLI](http://en.wikipedia.org/wiki/Command-line_interface).

> However it is __not recommended__ to use Dredd JS interface at the moment,
> because Dredd __lacks complete separation__ from it's previous instance call.

```javascript
var Dredd = require('dredd');

var dredd = new Dredd(configuration);
```

Then you need to run the Dredd Testing. So do it.

```javascript
dredd.run(function(err, stats){
  // err is present if anything went wrong
  // otherwise stats is an object with useful statistics
});
```

As you can see, `dredd.run` is a function receiving another function as a callback.
Received arguments are `err` (error if any) and `stats` (testing statistics) with
numbers accumulated throughout the Dredd run.


## Configuration object for Dredd Class

Let's have a look at an example configuration first. (Please also see [options source](src/options.coffee) to read detailed information about the `options` attributes).

```javascript
{
  server: 'http://localhost:3000/api', // your URL to API endpoint the tests will run against
  options: {

    'path': [],       // Required Array if Strings; filepaths to API Blueprint files, can use glob wildcards

    'dry-run': false, // Boolean, do not run any real HTTP transaction
    'names': false,   // Boolean, Print Transaction names and finish, similar to dry-run

    'level': 'info', // String, log-level (info, silly, debug, verbose, ...)
    'silent': false, // Boolean, Silences all logging output

    'only': [],      // Array of Strings, run only transaction that match these names

    'header': [],    // Array of Strings, these strings are then added as headers (key:value) to every transaction
    'user': null,    // String, Basic Auth credentials in the form username:password

    'hookfiles': [], // Array of Strings, filepaths to files containing hooks (can use glob wildcards)

    'reporter': ['dot', 'html'], // Array of possible reporters, see folder src/reporters

    'output': [],     // Array of Strings, filepaths to files used for output of file-based reporters

    'inline-errors': false, // Boolean, If failures/errors are display immediately in Dredd run

    'color': true,
    'timestamp': false
  },

  'emitter': EventEmitterInstance, // optional - listen to test progress, your own instance of EventEmitter

  'hooksData': {
    'pathToHook' : '...'
  }

  'data': {
    'path/to/file': '...'
  }
}
```

### server (String)

Your choice of the API endpoint to test the API Blueprint against.
It must be a valid URL (you can specify `port`, `path` and http or https `protocol`).

### options (Object)

Because `options.path` array is required, you must specify options. You'll end
with errors otherwise.

#### options.path (Array)

__Required__ Array of filepaths to API Blueprint files. Or it can also be an URL to download the API Blueprint from internet via http(s) protocol.

#### data (Object)

__Optional__ Object with keys as `filename` and value as `blueprint`-code.

Useful when you don't want to operate on top of filesystem and want to pass
code of your API Blueprints as a string. You get the point.

#### hooksData (Object)

__Optional__ Object with keys as `filename` and strings with JavaScript hooks code.

Load hooks file code from string. Must be used together with sandboxed mode.

```javascript
{
  'data': {
    './file/path/blueprint.apib': 'FORMAT: 1A\n\n# My String API\n\nGET /url\n+ Response 200\n\n        Some content',
    './another/file.apib': '# Another API\n\n## Group Machines\n\n### Machine [/machine]\n\n#### Read machine [GET]\n\n...'
  }
}
```
