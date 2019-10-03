.. _hooks-perl:

Writing Dredd Hooks In Perl
===========================

|Build Status|

`GitHub repository <https://github.com/ungrim97/Dredd-Hooks>`__

Perl hooks are using :ref:`Dredd’s hooks handler socket interface <hooks-new-language>`. For using Perl hooks in Dredd you have to have :ref:`Dredd already installed <quickstart>`

Installation
------------

::

   $ cpanm Dredd::Hooks

Usage
-----

::

   $ dredd apiary.apib http://127.0.0.1:3000 --language=dredd-hooks-perl --hookfiles=./hooks*.pl


.. note::
   If you're running :ref:`Dredd inside Docker <docker>`, read about :ref:`specifics of getting it working together with non-JavaScript hooks <hooks-docker>`.

API Reference
-------------

Module ``Dredd::Hooks::Methods`` imports following decorators:

1. ``beforeEach``, ``beforeEachValidation``, ``afterEach``

   -  wraps a function and passes :ref:`Transaction object <transaction>` as a first argument to it

2. ``before``, ``beforeValidation``, ``after``

   -  accepts :ref:`transaction name <getting-transaction-names>` as a first argument
   -  wraps a function and sends a :ref:`Transaction object <transaction>` as a first argument to it

3. ``beforeAll``, ``afterAll``

   -  wraps a function and passes an Array of :ref:`Transaction objects <transaction>` as a first argument to it

Refer to :ref:`Dredd execution life-cycle <execution-life-cycle>` to find when is each hook function executed.

Using Perl API
~~~~~~~~~~~~~~

Example usage of all methods in

.. code-block:: perl

   use Dredd::Hooks::Methods;

   beforeAll( sub {
       print 'before all'
   });

   beforeEach( sub {
       print 'before each'
   })

   before( "Machines > Machines collection > Get Machines" => sub {
       print 'before'
   });

   beforeEachValidation(sub {
       print 'before each validation'
   });

   beforeValidation( "Machines > Machines collection > Get Machines" => sub {
       print 'before validations'
   });

   after( "Machines > Machines collection > Get Machines" => sub {
       print 'after'
   });

   afterEach( sub {
       print 'after_each'
   });

   afterAll( sub {
     print 'after_all'
   });

Examples
--------

How to Skip Tests
~~~~~~~~~~~~~~~~~

Any test step can be skipped by setting ``skip`` property of the ``transaction`` object to ``true``.

.. code-block:: perl

   use Dredd::Hooks::Methods;
   use Types::Serialiser;

   before("Machines > Machines collection > Get Machines" => sub {
       my ($transaction) = @_;

       $transaction->{skip} = Types::Serialiser::true;
   });

Sharing Data Between Steps in Request Stash
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If you want to test some API workflow, you may pass data between test steps using the response stash.

.. code-block:: perl

   use JSON;
   use Dredd::Hooks::Methods;

   my $response_stash = {};

   after("Machines > Machines collection > Create Machine" => sub {
       my ($transaction) = @_;

       # saving HTTP response to the stash
       $response_stash->{$transaction->{name}} = $transaction->{real}
   });

   before("Machines > Machine > Delete a machine" => sub {
       my ($transaction) = @_;
       #reusing data from previous response here
       my $parsed_body = JSON->decode_json(
           $response_stash->{'Machines > Machines collection > Create Machine'}
       );
       my $machine_id = $parsed_body->{id};
       #replacing id in URL with stashed id from previous response
       $transaction->{fullPath} =~ s/42/$machine_id/;
   });

Failing Tests Programmatically
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You can fail any step by setting ``fail`` property on ``transaction`` object to ``true`` or any string with descriptive message.

.. code-block:: perl

   use Dredd::Hooks::Methods;

   before("Machines > Machines collection > Get Machines" => sub {
       my ($transaction) = @_;
       $transaction->{fail} = "Some failing message";
   });

Modifying Transaction Request Body Prior to Execution
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: perl

   use JSON;
   use Dredd::Hooks::Methods;

   before("Machines > Machines collection > Get Machines" => sub {
       my ($transaction) = @_;

       # parse request body from API description
       my $request_body = JSON->decode_json($transaction->{request}{body});

       # modify request body here
       $request_body->{someKey} = 'some new value';

       # stringify the new body to request
       $transaction->{request}{body} = JSON->encode_json($request_body);
   });

Adding or Changing URI Query Parameters to All Requests
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: perl

   use Dredd::Hooks::Methods;

   beforeEach( sub {
       my ($transaction) = @_;
       # add query parameter to each transaction here
       my $param_to_add = "api-key=23456";

       if ($transaction->{fullPath} =~ m/?/){
           $transaction->{fullPath} .= "&$param_to_add";
       } else {
           $transaction->{fullPath} .= "?$param_to_add";
       }
   });

Handling sessions
~~~~~~~~~~~~~~~~~

.. code-block:: perl

   use JSON;
   use Dredd::Hooks::Methods;

   my $stash = {}

   # hook to retrieve session on a login
   after('Auth > /remoteauth/userpass > POST' => sub {
       my ($transaction) = @_;

       my $parsed_body = JSON->decode_json($transaction->{real}{body});
       my $stash->{token} = $parsed_body->{sessionId};
   )};

   # hook to set the session cookie in all following requests
   beforeEach( sub {
       my ($transaction) = @_;

       if (exists $stash->{token}){
           $transaction->{request}{headers}{Cookie} = "id=".$stash{token};
       }
   });

Remove trailing newline character in expected *plain text* bodies
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: perl

   use Dredd::Hooks::Methods;

   beforeEach(
       my ($transaction) = @_;

       if( $transaction->{expected}{headers}{Content-Type} eq 'text/plain'){
           $transaction->{expected}{body} = chomp($transaction->{expected}{body});
       }
   });

.. |Build Status| image:: https://api.travis-ci.org/ungrim97/Dredd-Hooks.svg?branch=master
   :target: https://api.travis-ci.org/ungrim97/Dredd-Hooks.svg?branch=master
