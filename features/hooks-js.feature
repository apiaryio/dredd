Feature: Hooks in JavaScript
  As a Dredd user
  In order to supplement or alter Dredd's default behavior
  I want to be able to run arbitrary code in JavaScript before and after HTTP transactions

  Background:
    Given I have an API description with transactions "GET /articles" and "POST /articles"
    And I have an implementation, which requires auth on "POST /articles"

  Scenario: Testing without hooks fails
    When I run Dredd
    Then the "GET /articles" test passes
    And the "POST /articles" test fails

  Scenario: Testing with hooks passes
    Given I have hooks adding auth to "POST /articles"
    When I run Dredd
    Then the "GET /articles" test passes
    And the "POST /articles" test passes
