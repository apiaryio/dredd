# Rest reporter

### Activation

Rest reporter is activated by exposing environment variables withs token and suite.

- APIARY_API_KEY ... Authentication token used for reporting
- APIARY_API_NAME ... API (AKA suite, subdomain, vanity ) reporting to
- APIARY_API_URL ... Upstream API base URL. Default to https://api.apiary.io
- DREDD_REST_DEBUG ... Turn on debugging messages

### Passing test run details with env varirables

> json_dot.notation ... ENV VAIRABLE || default value

- agent ... DREDD_AGENT || process.env['USER']
- hostname ... DREDD_HOSTNAME || os.hostname
- agentEnvironment.ci ... CI || undefined
- agentEnvironment.name ... CI_NAME || undefined
- agentEnvironment.bulidId ... CI_BUILD_ID || undefined
- agentEnvironment.buildNumber ... CI_BUILD_NUMBER || undefined
- agentEnvironment.jobId ... CI_JOB_ID || undefined
- agentEnvironment.jobNumber ... CI_JOB_NUMBER || undefined

See [Rest Reporting API documentation][doc] and it's [Apiary documentation](apiarydoc) for more information about reporting data strucutres and API.

[doc]: https://github.com/apiaryio/dredd/blob/netmilk/rest-reporter/RestReportingApiBlueprint.md
[apiarydoc]: http://docs.reportingmock.apiary.io/



