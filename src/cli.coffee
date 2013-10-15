cli = require 'cli'

cli.enable('version', 'status');
cli.setApp('./package.json');
cli.setUsage("dredd <path to blueprint> <api_endpoint> [OPTIONS]"
     + "\n\nExample: \n  " + "dredd ./apiary.md http://localhost:3000 --dry-run");

# these get parsed into the options object, everything else is stored sequentially in args
cli.parse({
    'dry-run': ['d', 'Run without performing tests.'],
    silent: ['s', 'Suppress all command line output'],
    #verbose: ['v', 'Log additional debug information.'],
    reporter: ['r', 'Output additional report format. Options: junit', 'string'],
    output: ['o', 'Specifies output file when using additional reporter', 'file']
});

