# My API

# My Group

# My Resource [/resource/{id}]
+ Parameters
  + id: 1 (number)  ... Unique identifier of the respource

# My normal action [POST]

+ Response 200 (text/plain)

        Woof

# My Arbitrary action [GET /resource-cool-url/{otherparam}]

+ Parameters
  + otherparam: othervalue (string) ... Parameter not present under resource

+ Response 200 (text/plain)

        Booboo
