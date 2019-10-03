.. _hooks-ruby:

Writing Dredd Hooks In Ruby
===========================

|Build Status|

`GitHub repository <https://github.com/apiaryio/dredd-hooks-ruby>`__

Ruby hooks are using :ref:`Dredd’s hooks handler socket interface <hooks-new-language>`. For using Ruby hooks in Dredd you have to have :ref:`Dredd already installed <quickstart>`

Installation
------------

::

   $ gem install dredd_hooks

Usage
-----

::

   $ dredd apiary.apib http://127.0.0.1:3000 --language=ruby --hookfiles=./hooks*.rb

.. note::
   If you're running :ref:`Dredd inside Docker <docker>`, read about :ref:`specifics of getting it working together with non-JavaScript hooks <hooks-docker>`.

API Reference
-------------

Including module ``Dredd::Hooks:Methods`` expands current scope with methods

1. ``@before_each``, ``before_each_validation``, ``after_each``

   -  accepts a block as a first argument passing a :ref:`Transaction object <transaction>` as a first argument

2. ``before``, ``before_validation``, ``after``

   -  accepts :ref:`transaction name <getting-transaction-names>` as a first argument
   -  accepts a block as a second argument passing a :ref:`Transaction object <transaction>` as a first argument of it

3. ``before_all``, ``after_all``

   -  accepts a block as a first argument passing an Array of :ref:`Transaction objects <transaction>` as a first argument

Refer to :ref:`Dredd execution lifecycle <execution-life-cycle>` to find when is each hook function executed.

Using Ruby API
~~~~~~~~~~~~~~

Example usage of all methods in

.. code-block:: ruby

   include DreddHooks::Methods

   before_all do |transactions|
     puts 'before all'
   end

   before_each do |transaction|
     puts 'before each'
   end

   before "Machines > Machines collection > Get Machines" do |transaction|
     puts 'before'
   end

   before_each_validation do |transaction|
     puts 'before each validation'
   end

   before_validation "Machines > Machines collection > Get Machines" do |transaction|
     puts 'before validations'
   end

   after "Machines > Machines collection > Get Machines" do |transaction|
     puts 'after'
   end

   after_each do |transaction|
     puts 'after_each'
   end

   after_all do |transactions|
     puts 'after_all'
   end

Examples
--------

How to Skip Tests
~~~~~~~~~~~~~~~~~

Any test step can be skipped by setting ``skip`` property of the ``transaction`` object to ``true``.

.. code-block:: ruby

   include DreddHooks::Methods

   before "Machines > Machines collection > Get Machines" do |transaction|
     transaction['skip'] = true
   end

Sharing Data Between Steps in Request Stash
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If you want to test some API workflow, you may pass data between test steps using the response stash.

.. code-block:: ruby

   require 'json'
   include DreddHooks::Methods

   response_stash = {}

   after "Machines > Machines collection > Create Machine" do |transaction|
     # saving HTTP response to the stash
     response_stash[transaction['name']] = transaction['real']
   do

   before "Machines > Machine > Delete a machine" do |transaction|
     #reusing data from previous response here
     parsed_body = JSON.parse response_stash['Machines > Machines collection > Create Machine']
     machine_id = parsed_body['id']

     #replacing id in URL with stashed id from previous response
     transaction['fullPath'].gsub! '42', machine_id
   end

Failing Tests Programmatically
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You can fail any step by setting ``fail`` property on ``transaction`` object to ``true`` or any string with descriptive message.

.. code-block:: ruby

   include DreddHooks::Methods

   before "Machines > Machines collection > Get Machines" do |transaction|
     transaction['fail'] = "Some failing message"
   end

Modifying Transaction Request Body Prior to Execution
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: ruby

   require 'json'
   include DreddHooks::Methods

   before "Machines > Machines collection > Get Machines" do |transaction|
     # parse request body from API description
     request_body = JSON.parse transaction['request']['body']

     # modify request body here
     request_body['someKey'] = 'some new value'

     # stringify the new body to request
     transaction['request']['body'] = request_body.to_json
   end

Adding or Changing URI Query Parameters to All Requests
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: ruby

   include DreddHooks::Methods

   hooks.before_each do |transaction|

     # add query parameter to each transaction here
     param_to_add = "api-key=23456"

     if transaction['fullPath'].include('?')
       transaction['fullPath'] += "&" + param_to_add
     else
       transaction['fullPath'] += "?" + param_to_add
     end
   end

Handling sessions
~~~~~~~~~~~~~~~~~

.. code-block:: ruby

   require 'json'
   include DreddHooks::Methods

   stash = {}

   # hook to retrieve session on a login
   hooks.after 'Auth > /remoteauth/userpass > POST' do |transaction|
     parsed_body = JSON.parse transaction['real']['body']
     stash['token'] = parsed_body['sessionId']
   end

   # hook to set the session cookie in all following requests
   hooks.beforeEach do |transaction|
     unless stash['token'].nil?
       transaction['request']['headers']['Cookie'] = "id=" + stash['token']
     end
   end

Remove trailing newline character for in expected plain text bodies
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: ruby

   include DreddHooks::Methods

   before_each do |transaction|
     if transaction['expected']['headers']['Content-Type'] == 'text/plain'
       transaction['expected']['body'] = transaction['expected']['body'].gsub(/^\s+|\s+$/g, "")
     end
   end

.. |Build Status| image:: https://travis-ci.org/apiaryio/dredd-hooks-ruby.svg?branch=master
   :target: https://travis-ci.org/apiaryio/dredd-hooks-ruby
