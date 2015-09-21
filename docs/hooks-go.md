# Writing Dredd Hooks In Go

[![Godoc Reference](http://img.shields.io/badge/godoc-reference-5272B4.svg?style=flat-square)](https://godoc.org/github.com/snikch/goodman)

[GitHub repository](https://github.com/snikch/goodman)

Go hooks are using [Dredd's hooks handler socket interface](hooks-new-language.md). For using Go hooks in Dredd you have to have [Dredd already installed](quickstart.md). The Go library is called `goodman`.

## Installation

```
$ go get github.com/snikch/goodman
```

## Usage

Using Dredd with Go is slightly different to other languages, as a binary needs to be compiled for execution. Instead of providing a variety of hookfiles to run, your own binary is built using the Go hooks library `goodman` to run your specific hooks. The path to this binary is passed to dredd via the `--language` flag. You may also need to supply a `--hookfiles` flag to get the tests to run, but the value of this is of no matter (the dredd runner requires it).

```
$ dredd apiary.apib http://localhost:3000 --language ./my-dredd-hook-server --hookfiles *.go
```

## API Reference

You’ll need to know about three things to get your own hook handler up and running.

1. A `Runner` is a type that you can define event callbacks on, such as `beforeEach`, `afterAll` etc.

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

Refer to [Dredd execution lifecycle](usage.md#dredd-execution-lifecycle) to find when each hook callback is executed.

### Using the Go API

Example usage of all methods.

```go
package main

import (
    "fmt"
    "log"

    "github.com/snikch/goodman"
)

func main() {
    server := goodman.NewServer(NewRunner())
    log.Fatal(server.Run())
}

func NewRunner() *goodman.Runner {
    runner := goodman.NewRunner()
    runner.BeforeAll(func(t []*goodman.Transaction) {
        fmt.Println("before all")
    })
    runner.BeforeEach(func(t *goodman.Transaction) {
        fmt.Println("before each")
    })
    runner.Before("/message > GET", func(t *goodman.Transaction) {
        fmt.Println("before /message > GET")
    })
    runner.BeforeEachValidation(func(t *goodman.Transaction) {
        fmt.Println("before each validation")
    })
    runner.BeforeValidation("/message > GET", func(t *goodman.Transaction) {
        fmt.Println("before validation of /message > GET")
    })
    runner.After("/message > GET", func(t *goodman.Transaction) {
        fmt.Println("after")
    })
    runner.AfterEach(func(t *goodman.Transaction) {
        fmt.Println("after each")
    })
    runner.AfterAll(func(t []*goodman.Transaction) {
        fmt.Println("after all")
    })
    return runner
}
```

## Examples

### How to Skip Tests

Any test step can be skipped by setting the `Skip` property of the `Transaction` instance to `true`.

```go
package main

import (
    "fmt"
    "log"

    "github.com/snikch/goodman"
)

func main() {
    runner := goodman.NewRunner()
    runner.Before("Machines > Machines collection > Get Machines", func(t *goodman.Transaction) {
      t.Skip = true
    })
    server := goodman.NewServer(runner)
    log.Fatal(server.Run())
}
```

### Failing Tests Programmatically

You can fail any step by setting the `Fail` field of the `Transaction` instance to `true` or any string with a descriptive message.

```go
package main

import (
    "fmt"
    "log"

    "github.com/snikch/goodman"
)

func main() {
    runner := goodman.NewRunner()
    runner.Before("Machines > Machines collection > Get Machines", func(t *goodman.Transaction) {
      t.Fail = true
    })
    runner.Before("Machines > Machines collection > Post Machines", func(t *goodman.Transaction) {
      t.Fail = "POST is broken"
    })
    server := goodman.NewServer(runner)
    log.Fatal(server.Run())
}
```

### Modifying the Request Body Prior to Execution

```go
package main

import (
    "fmt"
    "log"

    "github.com/snikch/goodman"
)

func main() {
    runner := goodman.NewRunner()
    runner.Before("Machines > Machines collection > Get Machines", func(t *goodman.Transaction) {
      body := map[string]interface{}{}
      json.Unmarshal([]byte(t.Request.Body), &body)

      body["someKey"] = "new value"

      newBody, _ := json.Marshal(body)
      t.Request.body = string(newBody)
    })
    server := goodman.NewServer(runner)
    log.Fatal(server.Run())
}
```

### Adding or Changing URI Query Parameters for All Requests

```go
package main

import (
    "fmt"
    "log"

    "github.com/snikch/goodman"
)

func main() {
    runner := goodman.NewRunner()
    runner.BeforeEach(func(t *goodman.Transaction) {
      paramToAdd = "some=param";

      if strings.Contains(t.FullPath, "?") {
          t.FullPath += "&" + paramToAdd
      } else {
          t.FullPath += "?" + paramToAdd
      }
    })
    server := goodman.NewServer(runner)
    log.Fatal(server.Run())
}
```
