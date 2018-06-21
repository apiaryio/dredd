# Command-line Interface

## Usage

```
$ dredd '<API Description Document>' '<API Location>' [OPTIONS]
```

Example:

```
$ dredd ./apiary.md http://127.0.0.1:3000
```

## Arguments

### API Description Document (string)

URL or path to the API description document (API Blueprint, Swagger).<br>
**Sample values:** `./api-blueprint.apib`, `./swagger.yml`, `./swagger.json`, `http://example.com/api-blueprint.apib`

### API Location (string)

URL, the root address of your API.<br>
**Sample values:** `http://127.0.0.1:3000`, `http://api.example.com`

## Configuration File

If you use Dredd repeatedly within a single project, the preferred way to run it is to first persist your configuration in a `dredd.yml` file. With the file in place you can then run Dredd every time simply just by:

```
$ dredd
```

Dredd offers interactive wizard to setup your `dredd.yml` file:

```
$ dredd init
```

See below how sample configuration file could look like. The structure is
the same as of the [Dredd Class configuration object](usage-js.md#configuration-object-for-dredd-class).

```yaml
reporter: apiary
custom:
  - "apiaryApiKey:yourSecretApiaryAPiKey"
  - "apiaryApiName:apiName"
dry-run: null
hookfiles: "dreddhooks.js"
sandbox: false
server: rails server
server-wait: 3
init: false
custom: {}
names: false
only: []
output: []
header: []
sorted: false
user: null
inline-errors: false
hide-errors: false
details: false
method: []
level: info
timestamp: false
silent: false
path: []
blueprint: api-description.apib
endpoint: "http://127.0.0.1:3000"
```

> **Note:** Do not get confused by Dredd using a keyword `blueprint` also for paths to Swagger documents. This is for historical reasons and will be changed in the future.

## CLI Options Reference

Remember you can always list all available arguments by `dredd --help`.

<% for option in @options: %>
<a name="-<%= option.name %><% if option.alias: %>-<%= option.alias %><% end %>"></a><!-- legacy MkDocs anchor -->

### \-\-<%= option.name %><% if option.alias: %>, -<%= option.alias %><% end %>

<%= option.description %><br>
<% if option.default: %>
**Default value:** `<%- JSON.stringify(option.default) %>`
<% end %>

<% end %>
