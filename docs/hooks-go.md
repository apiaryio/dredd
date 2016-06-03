# Writing Dredd Hooks In Go

[![Godoc Reference](http://img.shields.io/badge/godoc-reference-5272B4.svg?style=flat-square)](https://godoc.org/github.com/snikch/goodman)

[GitHub repository](https://github.com/snikch/goodman)

Go hooks are using [Dredd's hooks handler socket interface](hooks-new-language.md). For using Go hooks in Dredd you have to have [Dredd already installed](quickstart.md). The Go library is called `goodman`.

## Installation

```
$ go get github.com/snikch/goodman
$ cd $GOPATH/src/github.com/snikch/goodman
$ go build -o $GOPATH/bin/goodman github.com/snikch/goodman/cmd/goodman
```

## Usage

Using Dredd with Go is slightly different to other languages, as a binary needs to be compiled for execution. The --hookfiles flags should point to compiled hook binaries.  See below for an example hooks.go file to get an idea of what the source file behind the go binary would look like.

```
$ dredd apiary.apib http://localhost:3000 --server ./go-lang-web-server-to-test --language go --hookfiles ./hook-file-binary
```

## API Reference

In order to get a general idea of how the Go Hooks work, the main executable from the package $GOPATH/bin/goodman is an HTTP Server that Dredd communicates with and an RPC client.  Each hookfile then acts as a corresponding RPC server.  So when Dredd notifies the Hooks server what transaction event is occuring the hooks server will execute all registered hooks on each of the hookfiles RPC servers.

You’ll need to know a few things about the `Server` type in the hooks package.

1. The `hooks.Server` type is how you can define event callbacks such as `beforeEach`, `afterAll`, etc.

2. To get a `hooks.Server` struct you must do the following

```go
package main

import (
    "github.com/snikch/goodman/hooks"
    trans "github.com/snikch/goodman/transaction"
)

func main() {
    h := hooks.NewHooks()
    server := hooks.NewServer(h)

    // Define all your event callbacks here

    // server.Serve() will block and allow the goodman server to run your defined
    // event callbacks
    server.Serve()
    // You must close the listener at end of main()
    defer server.Listener.Close()
}
```

2. Callbacks receive a `Transaction` instance, or an array of them

3. A `Server` will run your `Runner` and handle receiving events on the dredd socket.

### Runner Callback Events

The `Runner` type has the following callback methods.

1. `BeforeEach`, `BeforeEachValidation`, `AfterEach`
  - accepts a function as a first argument passing a [Transaction object](hooks.md#transaction-object-structure) as a first argument

2. `Before`, `BeforeValidation`, `After`
  - accepts [transaction name](hooks.md#getting-transaction-names) as a first argument
  - accepts a function as a second argument passing a [Transaction object](hooks.md#transaction-object-structure) as a first argument of it

3. `BeforeAll`, `AfterAll`
  - accepts a function as a first argument passing a Slice of [Transaction objects](hooks.md#transaction-object-structure) as a first argument

Refer to [Dredd execution lifecycle](execution-lifecycle.md) to find when each hook callback is executed.

### Using the Go API

Example usage of all methods.

```go
package main

import (
    "fmt"

    "github.com/snikch/goodman/hooks"
    trans "github.com/snikch/goodman/transaction"
)

func main() {
    h := hooks.NewHooks()
    server := hooks.NewServer(h)
    h.BeforeAll(func(t []*trans.Transaction) {
        fmt.Println("before all modification")
    })
    h.BeforeEach(func(t *trans.Transaction) {
        fmt.Println("before each modification")
    })
    h.Before("/message > GET", func(t *trans.Transaction) {
        fmt.Println("before modification")
    })
    h.BeforeEachValidation(func(t *trans.Transaction) {
        fmt.Println("before each validation modification")
    })
    h.BeforeValidation("/message > GET", func(t *trans.Transaction) {
        fmt.Println("before validation modification")
    })
    h.After("/message > GET", func(t *trans.Transaction) {
        fmt.Println("after modification")
    })
    h.AfterEach(func(t *trans.Transaction) {
        fmt.Println("after each modification")
    })
    h.AfterAll(func(t []*trans.Transaction) {
        fmt.Println("after all modification")
    })
    server.Serve()
    defer server.Listener.Close()
}
```

## Examples

### How to Skip Tests

Any test step can be skipped by setting the `Skip` property of the `Transaction` instance to `true`.

```go
package main

import (
    "fmt"

    "github.com/snikch/goodman/hooks"
    trans "github.com/snikch/goodman/transaction"
)

func main() {
    h := hooks.NewHooks()
    server := hooks.NewServer(h)
    h.Before("Machines > Machines collection > Get Machines", func(t *trans.Transaction) {
        t.Skip = true
    })
    server.Serve()
    defer server.Listener.Close()
}
```

### Failing Tests Programmatically

You can fail any step by setting the `Fail` field of the `Transaction` instance to `true` or any string with a descriptive message.

```go
package main

import (
    "fmt"

    "github.com/snikch/goodman/hooks"
    trans "github.com/snikch/goodman/transaction"
)

func main() {
    h := hooks.NewHooks()
    server := hooks.NewServer(h)
    h.Before("Machines > Machines collection > Get Machines", func(t *trans.Transaction) {
        t.Fail = true
    })
    h.Before("Machines > Machines collection > Post  Machines", func(t *trans.Transaction) {
        t.Fail = "POST is broken"
    })
    server.Serve()
    defer server.Listener.Close()
}
```

### Modifying the Request Body Prior to Execution

```go
package main

import (
    "fmt"

    "github.com/snikch/goodman/hooks"
    trans "github.com/snikch/goodman/transaction"
)

func main() {
    h := hooks.NewHooks()
    server := hooks.NewServer(h)
    h.Before("Machines > Machines collection > Get Machines", func(t *trans.Transaction) {
        body := map[string]interface{}{}
        json.Unmarshal([]byte(t.Request.Body), &body)

        body["someKey"] = "new value"

        newBody, _ := json.Marshal(body)
        t.Request.body = string(newBody)
    })
    server.Serve()
    defer server.Listener.Close()
}
```
