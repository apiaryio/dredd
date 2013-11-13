# Rest reporter

## Environment variables and their defaults

s### Config

Rest reporter is activated by specifying token and suite.

DREDD_REST_TOKEN ... Authentication token used for reporting
DREDD_REST_SUITE ... API Suite reporting to 
DREDD_REST_URL ... Upstream API base URL. Default to https://api.apiary.io


### Test run derail 

json_dot.notation ... ENV VAIRABLE || default value


agent ... DREDD_AGENT || process.env['USER']
hostname ... DREDD_HOSTNAME || os.hostname

ci ... CI || undefined
ci.name ... CI_NAME || undefined
ci.bulidId ... CI_BUILD_ID || undefined
ci.buildNumber ... CI_BUILD_NUMBER || undefined
ci.jobId ... CI_JOB_ID || undefined
ci.jobNumber ... CI_JOB_NUMBER || undefined


