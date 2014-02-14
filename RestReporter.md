# Rest reporter

### Activation

Rest reporter is activated by exposing environment variables withs token and suite.

- DREDD_REST_TOKEN ... Authentication token used for reporting
- DREDD_REST_SUITE ... API Suite reporting to 
- DREDD_REST_URL ... Upstream API base URL. Default to https://api.apiary.io
- DREDD_REST_DEBUG ... Turn on debugging messages

### Passing test run details with env varirables

> json_dot.notation ... ENV VARIABLE || default value

- agent ... DREDD_AGENT || process.env['USER']
- hostname ... DREDD_HOSTNAME || os.hostname
- ci ... CI || undefined
- ci.name ... CI_NAME || undefined
- ci.bulidId ... CI_BUILD_ID || undefined
- ci.buildNumber ... CI_BUILD_NUMBER || undefined
- ci.jobId ... CI_JOB_ID || undefined
- ci.jobNumber ... CI_JOB_NUMBER || undefined

See [Rest Reporting API documentation][doc] and it's [Apiary documentation](apiarydoc) for more information about reporting data structures and API.

[doc]: https://github.com/apiaryio/dredd/blob/netmilk/rest-reporter/RestReportingApiBlueprint.md
[apiarydoc]: http://docs.reportingmock.apiary.io/



