# Spawns dependent integration builds of hook handlers for every PR on Dredd
#
# Purpose:
#   Thanks to this we can be sure we did not break hook handler implementations.
#
# Usage:
#   The script is automatically ran by Travis CI in one of the jobs in
#   the build matrix every time the tested commit is part of a PR.
#
# How it works:
#   1. Every time commit is pushed to GitHub as part of a PR, Travis CI
#      automatically starts a new 'PR build' (as well as 'push build').
#   2. The job follows contents of `.travis.yml`. It runs regular tests
#      and then runs this script, `npm run test:hook-handlers`.
#   3. This script...
#       1. Makes sure it is ran for just one job within the build matrix.
#       2. Checks whether hook handler integration tests should be triggered
#          or not. **If the tested commit is part of PR, it continues.**
#          Otherwise it skips the tests (ends immediately with 0 exit code).
#       3. Creates special dependent integration branches for each hook handler
#          implementation. In these branches, it takes whatever is in master
#          branch of the hook handler repository with the only difference that
#          instead of `npm i -g dredd` it links the Dredd from currently tested
#          commit.
#       4. Pushes these dependent branches to GitHub, which triggers dependent
#          Travis CI builds. If dependent build would run in a build matrix,
#          selects only one language version (with the highest number).
#       5. Every dependent build informs the PR about the result and if it
#          passes with success, it deletes its special branch.
#
# Known issues:
#   * If the `master` branch of hook handler repository becomes red, this whole
#     build will fail. Instead, we should integrate with commit
#     corresponding to the latest release of the hook handler implementation.
#   * If repository of the hook handler project has something in the `master`
#     branch which would print the GH_TOKEN environment variable during
#     the Travis CI build, the token gets disclosed in the corresponding
#     dependent build output. Preventing this is impossible if we want
#     to work with GitHub in the dependent build, so as of now we rely
#     on carefulness and honesty of maintainers of the hook handler repos.


async = require('async')
execSync = require('sync-exec')
request = require('request')
yaml = require('js-yaml')

{exec} = require('child_process')
fs = require('fs')


unless process.env.CI
  console.error('''\
    Aborting!

    This script is meant to be ran on Travis CI. It is not optimized for local
    usage. It could mess up your Git repository.
  ''')
  process.exit(1)


################################################################################
##                                  SETTINGS                                  ##
################################################################################

JOBS = [
    name: 'ruby-hooks-handler'
    repo: 'https://github.com/apiaryio/dredd-hooks-ruby.git'
    matrixName: 'rvm'
  ,
    name: 'python-hooks-handler'
    repo: 'https://github.com/apiaryio/dredd-hooks-python.git'
    matrixName: 'python'
  ,
    name: 'php-hooks-handler'
    repo: 'https://github.com/ddelnano/dredd-hooks-php.git'
    matrixName: 'php'
  ,
    name: 'perl-hooks-handler'
    repo: 'https://github.com/ungrim97/Dredd-Hooks.git'
    matrixName: 'perl'
  ,
    name: 'go-hooks-handler'
    repo: 'https://github.com/snikch/goodman.git'
    matrixName: 'go'
]

TRAVIS_CONFIG_FILE = '.travis.yml'
LINKED_DREDD_DIR = './__dredd__'
RE_DREDD_INSTALL_CMD = /npm ([ \-=\w]+ )?i(nstall)? ([ \-=\w]+ )?dredd(@\w+)?/
DREDD_LINK_CMD = "npm link --python=python2 #{LINKED_DREDD_DIR}"


################################################################################
##                                   HELPERS                                  ##
################################################################################

# Redirects both stderr and strout to /dev/null. Should be added to all commands
# dealing with GitHub token so the token won't be disclosed in build output
# in case of errors.
DROP_OUTPUT = '> /dev/null 2>&1'


# Returns trimmed stdout for given execSync result.
getTrimmedStdout = (execSyncResult) ->
  execSyncResult?.stdout?.trim?() or ''


# Moves contents of the root directory to given directory. Ignores given
# excluded paths.
moveAllFilesTo = (directory, excludedPaths = []) ->
  excludedPaths.push(directory)

  # Make sure directory exists and is empty.
  execSync('rm -rf ' + directory)
  execSync('mkdir ' + directory)

  excludes = buildFindExcludes(excludedPaths)
  execSync("find . #{excludes} -exec mv -t '#{directory}' '{}' + #{DROP_OUTPUT}")


# Takes ['./a', './b'] and produces "-not -path './a' -and -not -path './b'"
buildFindExcludes = (excludedPaths) ->
  expressions = excludedPaths.map((path) -> "-not -path '#{path}'")
  return expressions.join(' -and ')


# Replaces command installing Dredd from npm with one installing Dredd from
# local folder with source code of the tested version. Returns boolean whether
# any changes were made.
replaceDreddInstallation = ->
  contents = fs.readFileSync(TRAVIS_CONFIG_FILE, 'utf-8')
  unless contents.match(RE_DREDD_INSTALL_CMD)
    return false
  contents = contents.replace(RE_DREDD_INSTALL_CMD, DREDD_LINK_CMD)
  fs.writeFileSync(TRAVIS_CONFIG_FILE, contents, 'utf-8')
  return true


# Exits the script in case Travis CI CLI isn't installed.
requireTravisCli = ->
  unless getTrimmedStdout(execSync('which travis'))
    console.error('The travis command could not be found. Run \'gem install travis\'.')
    process.exit(1)


# If Git author is empty, sets the commiter of the last commit as an author.
ensureGitAuthor = (testedCommit) ->
  name = getTrimmedStdout(execSync('git show --format="%cN" -s ' + testedCommit))
  console.log("Setting Git user name to '#{name}'")
  execSync("git config user.name '#{name}'")

  email = getTrimmedStdout(execSync('git show --format="%cE" -s ' + testedCommit))
  console.log("Setting Git e-mail to '#{email}'")
  execSync("git config user.email '#{email}'")


# Adds remote origin URL with GitHub token so the script could push to the Dredd
# repository. GitHub token is encrypted in Dredd's .travis.yml.
ensureGitOrigin = ->
  if process.env.GH_TOKEN
    console.log('Applying GitHub token')
    repo = "https://#{process.env.GH_TOKEN}@github.com/apiaryio/dredd.git"
    execSync("git remote set-url origin #{repo} #{DROP_OUTPUT}")


# Ensures that Git repository is set to given branch and it's clean.
cleanGit = (branch) ->
  execSync('git checkout ' + branch)
  execSync('git reset HEAD --hard')


# Returns the latest tested Node.js version defined in the .travis.yml
# config file.
getLatestTestedNodeVersion = ->
  contents = fs.readFileSync(TRAVIS_CONFIG_FILE)
  config = yaml.safeLoad(contents)

  versions = config.node_js
  versions.sort((v1, v2) -> v2 - v1)
  return versions[0]


# Takes Travis config property and prepends its existing value with given value.
# Takes care of various cases, such as the existing property being already an
# array, being single value, etc.
prependToTravisConfigProperty = (config, property, value) ->
  currentValue = config[property]
  if currentValue
    currentValue = [currentValue] unless Array.isArray(currentValue)
    config[property] = [value].concat(currentValue)
  else
    config[property] = [value]


# Adjusts dependent build configuration
#
# *  Takes language version matrix in the .travis.yml config file and reduces
#    it to just one language version. It chooses the one which represents
#    the highest floating point number. If there is no version like that, it
#    selects the first specified version.
# *  Removes 'deploy'
# *  Adds status reporting
adjustTravisBuildConfig = (pullRequestId, testedCommit, jobName, matrixName) ->
  # We will want to report under the Pull Request, so we will need GitHub
  # token present in the configuration.
  execSync("""\
    travis encrypt GH_TOKEN=#{process.env.GH_TOKEN} \
      --add --append --no-interactive --repo=apiaryio/dredd #{DROP_OUTPUT}
  """)

  # Read contents of the '.travis.yml' file
  contents = fs.readFileSync(TRAVIS_CONFIG_FILE)
  config = yaml.safeLoad(contents)

  # Reduce number of tested versions to just the latest one
  reduced = config[matrixName].map((version) -> parseFloat(version))
  reduced.sort((v1, v2) -> v2 - v1)
  config[matrixName] = "#{reduced[0] or config[matrixName][0]}"

  # Remove any deploy configuration, just to be sure
  delete config.deploy

  # Make sure the latest npm gets installed
  prependToTravisConfigProperty(config, 'before_install', 'npm install -g npm@latest')

  # Enhance the build configuration so it reports results back to PR and deletes
  # the branch afterwards.
  command = createStatusCommand(testedCommit,
    state: 'pending'
    description: 'Dependent build created'
    context: "continuous-integration/travis-ci/#{jobName}"
    target_url: "https://travis-ci.org/apiaryio/dredd/builds/$TRAVIS_BUILD_ID"
  )
  prependToTravisConfigProperty(config, 'before_install', command)

  command = createStatusCommand(testedCommit,
    state: 'error'
    description: 'Dependent build finished'
    context: "continuous-integration/travis-ci/#{jobName}"
    target_url: "https://travis-ci.org/apiaryio/dredd/builds/$TRAVIS_BUILD_ID"
  )
  prependToTravisConfigProperty(config, 'after_failure', command)

  command = createStatusCommand(testedCommit,
    state: 'success'
    description: 'Dependent build finished'
    context: "continuous-integration/travis-ci/#{jobName}"
    target_url: "https://travis-ci.org/apiaryio/dredd/builds/$TRAVIS_BUILD_ID"
  )
  prependToTravisConfigProperty(config, 'after_success', command)

  config.after_success.push('if [[ $TRAVIS_BRANCH = master ]]; then echo "Deleting aborted (master)" && exit 1; fi')
  config.after_success.push('git branch -D $TRAVIS_BRANCH')
  config.after_success.push("git remote set-url origin \"https://$GH_TOKEN@github.com/apiaryio/dredd.git\" #{DROP_OUTPUT}")
  config.after_success.push("git push origin -f --delete $TRAVIS_BRANCH #{DROP_OUTPUT}")

  # Save all changes
  fs.writeFileSync(TRAVIS_CONFIG_FILE, yaml.dump(config), 'utf-8')


# Creates cURL command which pushes status information to GitHub. Allows
# interpolation for environment variables in data (just use $ENV_NAME in the
# data).
createStatusCommand = (testedCommit, data) ->
  command = 'curl -X POST'
  command += ' -H "Content-Type: application/json"'
  command += ' -H "Authorization: token $GH_TOKEN"'

  escapedJson = JSON.stringify(data).replace(/"/g, '\\"')
  command += " -d \"#{escapedJson}\""

  command += " 'https://api.github.com/repos/apiaryio/dredd/statuses/#{testedCommit}'"
  return command


# Retrieves full commit message.
getGitCommitMessage = (commitHash) ->
  getTrimmedStdout(execSync('git log --format=%B -n 1 ' + commitHash))


# Aborts this script in case it finds out that conditions to run this script
# are not satisfied. The script should run only if it was triggered by the
# tested commit being part of a PR.
abortIfNotTriggered = (testedNodeVersion, testedCommit, pullRequestId) ->
  reason = null

  # We do not want to run integration tests of hook handlers for every node
  # version in the matrix. One node version is perfectly enough as
  # the dependent builds will be performed on the default version Travis CI
  # provides anyway (`.travis.yml` of dependent repositories usually do not
  # specify node version, they care about Ruby, Python, ... versions).
  latestTestedNodeVersion = getLatestTestedNodeVersion()
  if testedNodeVersion isnt latestTestedNodeVersion
    reason = "They run only in builds with Node #{latestTestedNodeVersion}."
  else
    # Integration tests are triggered only if the tested commit is in PR or
    # it's message contains trigger keyword. If this is not the case, abort
    # the script.
    message = getGitCommitMessage(testedCommit)

    if pullRequestId
      console.log("Tested commit (#{testedCommit}) is part of the '##{pullRequestId}' PR")
    else
      reason = "Tested commit (#{testedCommit}) isn't part of PR"

  # There is a reason to abort the script, so let's do it.
  if reason
    console.error('Skipping integration tests of hook handlers. ' + reason)
    process.exit(0)


################################################################################
##                                   MAIN                                     ##
################################################################################


integrationBranches = []
testedNodeVersion = process.env.TRAVIS_NODE_VERSION
testedBranch = process.env.TRAVIS_BRANCH
testedCommit = process.env.TRAVIS_COMMIT_RANGE.split('...')[1]
buildId = process.env.TRAVIS_BUILD_ID
pullRequestId = if process.env.TRAVIS_PULL_REQUEST isnt 'false' then process.env.TRAVIS_PULL_REQUEST else null


abortIfNotTriggered(testedNodeVersion, testedCommit, pullRequestId)
requireTravisCli()


ensureGitAuthor(testedCommit)
ensureGitOrigin()


JOBS.forEach(({name, repo, matrixName}) ->
  integrationBranch = "dependent-build/pr#{pullRequestId}/#{buildId}/#{name}"
  integrationBranches.push(integrationBranch)
  console.log("Preparing branch #{integrationBranch}")

  # Prepare a special integration branch
  cleanGit(testedBranch)
  execSync('git checkout -B ' + integrationBranch)

  # Move contents of the root directory to the directory for linked Dredd and
  # commit this change.
  execSync('rm -rf ./node_modules')
  moveAllFilesTo(LINKED_DREDD_DIR, ['./.git', './.git/*'])

  # We need to keep this script. Node sometimes fails to run certain operations
  # (especially modifications to other files or building stack straces) when
  # executing code which doesn't exist on disk anymore.
  execSync('mkdir ./scripts')
  execSync("cp #{LINKED_DREDD_DIR}/scripts/test-hooks-handlers.coffee ./scripts/test-hooks-handlers.coffee")

  # Commit changes so we can perform merge later...
  execSync('git add -A')
  execSync('git commit -m "chore: Moving Dredd to directory"')

  # Add Git remote with the repository being integrated. Merge its master
  # branch with what's in current branch. After this, we have contents of the
  # remote repo plus one extra directory, which contains current Dredd.
  execSync("git remote add #{name} #{repo} --fetch")
  execSync("git merge #{name}/master --no-edit")

  # Replace installation of Dredd in .travis.yml with a command which links
  # Dredd from the directory we created. Commit the change.
  unless replaceDreddInstallation()
    console.error('Could not find Dredd installation command in .travis.yml.', contents)
    process.exit(1)

  # Adjust build configuration and commit the changes.
  adjustTravisBuildConfig(pullRequestId, testedCommit, name, matrixName)
  execSync('git commit -am "chore: Adjust build configuration"')

  # Remove this script.
  execSync('rm ./scripts/test-hooks-handlers.coffee')
  execSync('git add -A')
  execSync('git commit -m "chore: Remove build preparation script"')

  # Push the integration branch to GitHub and clean the repository.
  console.log("Pushing #{integrationBranch} to GitHub")
  execSync("git push origin #{integrationBranch} -f #{DROP_OUTPUT}")
  cleanGit(testedBranch)
)
