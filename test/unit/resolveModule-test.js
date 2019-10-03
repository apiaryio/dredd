import path from 'path';
import { assert } from 'chai';

import resolveModule from '../../lib/resolveModule';

describe('resolveModule()', () => {
  const workingDirectory = path.join(__dirname, '..', 'fixtures');

  it('resolves a local module name', () => {
    assert.equal(
      resolveModule(workingDirectory, 'requiredModule'),
      path.join(workingDirectory, 'requiredModule'),
    );
  });

  it('resolves a local module name with .js extension', () => {
    assert.equal(
      resolveModule(workingDirectory, 'requiredModule.js'),
      path.join(workingDirectory, 'requiredModule.js'),
    );
  });

  it('resolves an installed module name', () => {
    assert.equal(
      resolveModule(workingDirectory, 'coffeescript/register'),
      'coffeescript/register',
    );
  });
});
