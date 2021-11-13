/* eslint no-console: ["error", { allow: ["log"] }] */
import fs from 'fs';
import makeDir from 'make-dir';
import path from 'path';
import inquirer from 'inquirer';
import yaml from 'js-yaml';

import logger from './logger';

import packageData from '../package.json';

const INSTALL_DREDD = `npm install dredd@${packageData.version} --global`;
const RUN_DREDD = 'dredd';

function init(config, save, callback) {
  if (!config) {
    config = {};
  }
  if (!config._) {
    config._ = [];
  }
  if (!config.custom) {
    config.custom = {};
  }

  const files = fs.readdirSync('.');
  const detected = detect(files);

  prompt(config, detected, (error, answers) => {
    if (error) {
      callback(error);
    }

    let updatedConfig;
    try {
      updatedConfig = applyAnswers(config, answers);
    } catch (err) {
      callback(err);
    }
    save(updatedConfig);
    printClosingMessage(updatedConfig);

    callback();
  });
}

function detect(files) {
  return {
    ci: detectCI(files),
    apiDescription: detectApiDescription(files),
    server: detectServer(files),
    language: detectLanguage(files),
  };
}

function prompt(config, detected, callback) {
  inquirer
    .prompt([
      {
        name: 'apiDescription',
        message: 'Location of the API description document',
        type: 'input',
        default: config.blueprint || detected.apiDescription,
      },
      {
        name: 'server',
        message: 'Command to start the API server under test',
        type: 'input',
        default: config.server || detected.server,
      },
      {
        name: 'apiHost',
        message: 'Host of the API under test',
        type: 'input',
        default: config.endpoint || 'http://127.0.0.1:3000',
      },
      {
        name: 'hooks',
        message: "Do you want to use hooks to customize Dredd's behavior?",
        type: 'confirm',
        default: true,
        when: () => config.language === 'nodejs',
      },
      {
        name: 'language',
        message: 'Programming language of the hooks',
        type: 'list',
        default: detected.language,
        choices: [
          { name: 'Go', value: 'go' },
          { name: 'JavaScript', value: 'nodejs' },
          { name: 'Perl', value: 'perl' },
          { name: 'PHP', value: 'php' },
          { name: 'Python', value: 'python' },
          { name: 'Ruby', value: 'ruby' },
          { name: 'Rust', value: 'rust' },
        ],
        when: (answers) => answers.hooks,
      },
      {
        name: 'apiary',
        message: 'Do you want to report your tests to the Apiary inspector?',
        type: 'confirm',
        default: true,
        when: () => config.reporter !== 'apiary',
      },
      {
        name: 'apiaryApiKey',
        message:
          'Enter Apiary API key (leave empty for anonymous, disposable test reports)',
        type: 'input',
        default: config.custom ? config.custom.apiaryApiKey : undefined,
        when: (answers) =>
          answers.apiary && (!config.custom || !config.custom.apiaryApiKey),
      },
      {
        name: 'apiaryApiName',
        message: 'Enter Apiary API name',
        type: 'input',
        default: config.custom ? config.custom.apiaryApiName : undefined,
        when: (answers) =>
          answers.apiary &&
          answers.apiaryApiKey &&
          (!config.custom || !config.custom.apiaryApiName),
      },
      {
        name: 'appveyor',
        message: 'Found AppVeyor configuration, do you want to add Dredd?',
        type: 'confirm',
        default: true,
        when: () => detected.ci.includes('appveyor'),
      },
      {
        name: 'circleci',
        message: 'Found CircleCI configuration, do you want to add Dredd?',
        type: 'confirm',
        default: true,
        when: () => detected.ci.includes('circleci'),
      },
      {
        name: 'travisci',
        message: 'Found Travis CI configuration, do you want to add Dredd?',
        type: 'confirm',
        default: true,
        when: () => detected.ci.includes('travisci'),
      },
      {
        name: 'wercker',
        message: 'Found Wercker configuration, do you want to add Dredd?',
        type: 'confirm',
        default: true,
        when: () => detected.ci.includes('wercker'),
      },
      {
        name: 'ci',
        message:
          'Dredd is best served with Continuous Integration. Do you want to create CI configuration?',
        type: 'confirm',
        default: true,
        when: () => !detected.ci.length,
      },
      {
        name: 'createCI',
        message: 'Which CI do you want to use?',
        type: 'list',
        default: 'travisci',
        choices: [
          { name: 'AppVeyor', value: 'appveyor' },
          { name: 'CircleCI', value: 'circleci' },
          { name: 'Travis CI', value: 'travisci' },
          { name: 'Wercker (Oracle Container Pipelines)', value: 'wercker' },
        ],
        when: (answers) => answers.ci,
      },
    ])
    .then((answers) => {
      callback(null, answers);
    });
}

export function applyAnswers(config, answers, options = {}) {
  const ci = options.ci || {
    appveyor: updateAppVeyor,
    circleci: updateCircleCI,
    travisci: updateTravisCI,
    wercker: updateWercker,
  };

  config._[0] = answers.apiDescription;
  config._[1] = answers.apiHost;

  config.server = answers.server || null;
  config.language = answers.language || 'nodejs';

  if (answers.apiary) {
    config.reporter = 'apiary';
  }
  if (answers.apiaryApiKey) {
    config.custom.apiaryApiKey = answers.apiaryApiKey;
  }
  if (answers.apiaryApiName) {
    config.custom.apiaryApiName = answers.apiaryApiName;
  }

  if (answers.createCI) {
    ci[answers.createCI]();
  } else {
    Object.keys(ci).forEach((name) => {
      if (answers[name]) {
        try {
          ci[name]();
        } catch (error) {
          logger.error(`Failed to update ${name}`);
          throw error;
        }
      }
    });
  }

  return config;
}

export function printClosingMessage(config, print = console.log) {
  print('\nConfiguration saved to dredd.yml\n');
  if (config.language === 'nodejs') {
    print('You can run tests now, with:\n');
  } else {
    print('Install hooks and run Dredd test with:\n');
  }
  switch (config.language) {
    case 'ruby':
      print('  $ gem install dredd_hooks');
      break;
    case 'python':
      print('  $ pip install dredd_hooks');
      break;
    case 'php':
      print('  $ composer require ddelnano/dredd-hooks-php --dev');
      break;
    case 'perl':
      print('  $ cpanm Dredd::Hooks');
      break;
    case 'go':
      print('  $ go get github.com/snikch/goodman/cmd/goodman');
      break;
    case 'rust':
      print('  $ cargo install dredd-hooks');
      break;
    default:
      break;
  }
  print('  $ dredd\n');
}

export function editYaml(file, update) {
  const contents = fs.existsSync(file)
    ? yaml.safeLoad(fs.readFileSync(file))
    : {};

  update(contents);

  makeDir.sync(path.dirname(file));
  fs.writeFileSync(file, yaml.safeDump(contents));
}

export function updateAppVeyor(options = {}) {
  const edit = options.editYaml || editYaml;

  edit('appveyor.yml', (contents) => {
    if (!contents.install) {
      contents.install = [];
    }

    contents.install.push({ ps: 'Install-Product node' });
    contents.install.push('set PATH=%APPDATA%\\npm;%PATH%');
    contents.install.push(INSTALL_DREDD);

    if (!contents.build) {
      contents.build = false;
    }

    if (!contents.test_script) {
      contents.test_script = [];
    }
    contents.test_script.push(RUN_DREDD);
  });
}

export function updateCircleCI(options = {}) {
  const edit = options.editYaml || editYaml;

  edit('.circleci/config.yml', (contents) => {
    if (!contents.version) {
      contents.version = 2;
    }

    if (!contents.jobs) {
      contents.jobs = {};
    }
    contents.jobs.dredd = {
      docker: [{ image: 'circleci/node:latest' }],
      steps: ['checkout', { run: INSTALL_DREDD }, { run: RUN_DREDD }],
    };
  });
}

export function updateTravisCI(options = {}) {
  const edit = options.editYaml || editYaml;

  edit('.travis.yml', (contents) => {
    if (!contents.language) {
      contents.language = 'node_js';
    }

    if (!contents.before_install) {
      contents.before_install = [];
    }
    contents.before_install.push(INSTALL_DREDD);

    if (!contents.before_script) {
      contents.before_script = [];
    }
    contents.before_script.push(RUN_DREDD);
  });
}

export function updateWercker(options = {}) {
  const edit = options.editYaml || editYaml;

  edit('wercker.yml', (contents) => {
    if (!contents.box) {
      contents.box = 'node';
    }

    if (!contents.build) {
      contents.build = {};
    }
    contents.build.steps = [].concat(
      [{ script: { name: 'install-dredd', code: INSTALL_DREDD } }],
      contents.build.steps || [],
      [{ script: { name: 'dredd', code: RUN_DREDD } }],
    );
  });
}

export function detectLanguage(files) {
  const lcFiles = files.map((f) => f.toLowerCase());

  if (lcFiles.includes('cargo.toml')) {
    return 'rust';
  }
  if (lcFiles.filter((f) => f.match(/\.go$/)).length) {
    return 'go';
  }
  if (lcFiles.includes('composer.json')) {
    return 'php';
  }
  if (
    lcFiles.includes('minil.toml') ||
    lcFiles.includes('cpanfile') ||
    lcFiles.includes('meta.json') ||
    lcFiles.includes('build.pl')
  ) {
    return 'perl';
  }
  if (
    lcFiles.includes('setup.py') ||
    lcFiles.includes('requirements.txt') ||
    lcFiles.includes('pipfile') ||
    lcFiles.includes('pyproject.toml') ||
    lcFiles.includes('setup.cfg') ||
    lcFiles.includes('manifest.in')
  ) {
    return 'python';
  }
  if (
    lcFiles.includes('gemfile') ||
    lcFiles.includes('gemfile.lock') ||
    lcFiles.filter((f) => f.match(/\.gemspec$/)).length
  ) {
    return 'ruby';
  }
  return 'nodejs';
}

export function detectServer(files) {
  const commands = {
    nodejs: 'npm start',
    ruby: 'bundle exec rails server',
    python: 'python manage.py runserver',
  };
  const language = detectLanguage(files);
  return commands[language] || commands.nodejs;
}

export function detectApiDescription(files) {
  const apib = files.filter((f) => f.match(/\.apib$/i));
  if (apib.length) {
    return apib[0];
  }

  const openapi2 = files.filter(
    (f) => f.match(/\.ya?ml$/i) && f.match(/swagger/),
  );
  if (openapi2.length) {
    return openapi2[0];
  }

  const openapi = files.filter((f) => f.match(/\.ya?ml$/i) && f.match(/api/));
  if (openapi.length) {
    return openapi[0];
  }

  return 'apiary.apib';
}

export function detectCI(files) {
  const ci = {
    'wercker.yml': 'wercker',
    'appveyor.yml': 'appveyor',
    '.travis.yml': 'travisci',
    '.circleci': 'circleci',
  };
  return files.map((f) => ci[f]).filter((f) => !!f);
}

export default init;
