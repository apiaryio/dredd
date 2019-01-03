.. _hooks-rust:

Writing Dredd Hooks In Rust
===========================

|Crates.io|

`GitHub repository <https://github.com/hobofan/dredd-hooks-rust>`__

Rust hooks are using :ref:`Dredd’s hooks handler socket interface <hooks-new-language>`. For using Rust hooks in Dredd you have to have :ref:`Dredd already installed <quickstart>`. The Rust library is called ``dredd-hooks`` and the correspondig binary ``dredd-hooks-rust``.

Installation
------------

::

   $ cargo install dredd-hooks

Usage
-----

Using Dredd with Rust is slightly different to other languages, as a binary needs to be compiled for execution. The :option:`--hookfiles` options should point to compiled hook binaries. See below for an example hooks.rs file to get an idea of what the source file behind the Rust binary would look like.

::

   $ dredd apiary.apib http://127.0.0.1:3000 --server=./rust-web-server-to-test --language=rust --hookfiles=./hook-file-binary

.. note::
   If you're running :ref:`Dredd inside Docker <docker>`, read about :ref:`specifics of getting it working together with non-JavaScript hooks <hooks-docker>`.

API Reference
-------------

In order to get a general idea of how the Rust Hooks work, the main executable from the package ``dredd-hooks`` is an HTTP Server that Dredd communicates with and an RPC client. Each hookfile then acts as a corresponding RPC server. So when Dredd notifies the Hooks server what transaction event is occuring the hooks server will execute all registered hooks on each of the hookfiles RPC servers.

You’ll need to know a few things about the ``HooksServer`` type in the ``dredd-hooks`` package.

1. The ``HooksServer`` type is how you can define event callbacks such as ``beforeEach``, ``afterAll``, etc..

2. To get a ``HooksServer`` struct you must do the following;

.. code-block:: rust

   extern crate dredd_hooks;

   use dredd_hooks::{HooksServer};

   fn main() {
       let mut hooks = HooksServer::new();

       // Define all your event callbacks here

       // HooksServer::start_from_env will block and allow the RPC server
       // to receive messages from the main `dredd-hooks-rust` process.
       HooksServer::start_from_env(hooks);
   }

3. Callbacks receive a ``Transaction`` instance, or an array of them.

Runner Callback Events
~~~~~~~~~~~~~~~~~~~~~~

The ``HooksServer`` type has the following callback methods.

1. ``before_each``, ``before_each_validation``, ``after_each``

   -  accepts a function as a first argument passing a :ref:`Transaction object <transaction>` as a first argument

2. ``before``, ``before_validation``, ``after``

   -  accepts :ref:`transaction name <getting-transaction-names>` as a first argument
   -  accepts a function as a second argument passing a :ref:`Transaction object <transaction>` as a first argument of it

3. ``before_all``, ``after_all``

   -  accepts a function as a first argument passing a ``Vec`` of :ref:`Transaction objects <transaction>` as a first argument

Refer to :ref:`Dredd execution lifecycle <execution-life-cycle>` to find when each hook callback is executed.

Using the Rust API
~~~~~~~~~~~~~~~~~~

Example usage of all methods.

.. code-block:: rust

   extern crate dredd_hooks;

   use dredd_hooks::{HooksServer};

   fn main() {
       let mut hooks = HooksServer::new();
       hooks.before("/message > GET", Box::new(move |tr| {
           println!("before hook handled");
           tr
       }));
       hooks.after("/message > GET", Box::new(move |tr| {
           println!("after hook handled");
           tr
       }));
       hooks.before_validation("/message > GET", Box::new(move |tr| {
           println!("before validation hook handled");
           tr
       }));
       hooks.before_all(Box::new(move |tr| {
           println!("before all hook handled");
           tr
       }));
       hooks.after_all(Box::new(move |tr| {
           println!("after all hook handled");
           tr
       }));
       hooks.before_each(Box::new(move |tr| {
           println!("before each hook handled");
           tr
       }));
       hooks.before_each_validation(Box::new(move |tr| {
           println!("before each validation hook handled");
           tr
       }));
       hooks.after_each(Box::new(move |tr| {
           println!("after each hook handled");
           tr
       }));
       HooksServer::start_from_env(hooks);
   }

Examples
--------

How to Skip Tests
~~~~~~~~~~~~~~~~~

Any test step can be skipped by setting the value of the ``skip`` field of the ``Transaction`` instance to ``true``.

.. code-block:: rust

   extern crate dredd_hooks;

   use dredd_hooks::{HooksServer};

   fn main() {
       let mut hooks = HooksServer::new();

       // Runs only before the "/message > GET" test.
       hooks.before("/message > GET", Box::new(|mut tr| {
           // Set the skip flag on this test.
           tr.insert("skip".to_owned(), true.into());
           // Hooks must always return the (modified) Transaction(s) that were passed in.
           tr
       }));
       HooksServer::start_from_env(hooks);
   }

Failing Tests Programmatically
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You can fail any step by setting the value of the ``fail`` field of the ``Transaction`` instance to ``true`` or any string with a descriptive message.

.. code-block:: rust

   extern crate dredd_hooks;

   use dredd_hooks::{HooksServer};

   fn main() {
       let mut hooks = HooksServer::new();
       hooks.before("/message > GET", Box::new(|mut tr| {
           // .into() can be used as an easy way to convert
           // your value into the desired Json type.
           tr.insert("fail".to_owned(), "Yay! Failed!".into());
           tr
       }));
       HooksServer::start_from_env(hooks);
   }

Modifying the Request Body Prior to Execution
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: rust

   extern crate dredd_hooks;

   use dredd_hooks::{HooksServer};

   fn main() {
       let mut hooks = HooksServer::new();
       hooks.before("/message > GET", Box::new(|mut tr| {
           // Try to access the "request" key as an object.
           // (This will panic should the "request" key not be present.)
           tr["request"].as_object_mut().unwrap()
               .insert("body".to_owned(), "Hello World!".into());

           tr
       }));
       HooksServer::start_from_env(hooks);
   }

.. |Crates.io| image:: https://img.shields.io/crates/v/dredd-hooks.svg
   :target: https://crates.io/crates/dredd-hooks
