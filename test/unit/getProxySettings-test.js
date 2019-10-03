import { assert } from 'chai';

import getProxySettings from '../../lib/getProxySettings';

describe('getProxySettings()', () => {
  it('detects HTTP_PROXY', () => {
    assert.deepEqual(
      getProxySettings({
        SHELL: '/bin/bash',
        USER: 'honza',
        HTTP_PROXY: 'http://proxy.example.com:8080',
      }),
      ['HTTP_PROXY=http://proxy.example.com:8080'],
    );
  });

  it('detects HTTPS_PROXY', () => {
    assert.deepEqual(
      getProxySettings({
        SHELL: '/bin/bash',
        USER: 'honza',
        HTTPS_PROXY: 'https://proxy.example.com:8080',
      }),
      ['HTTPS_PROXY=https://proxy.example.com:8080'],
    );
  });

  it('detects NO_PROXY', () => {
    assert.deepEqual(
      getProxySettings({
        SHELL: '/bin/bash',
        USER: 'honza',
        NO_PROXY: '*',
      }),
      ['NO_PROXY=*'],
    );
  });

  it('detects both lower and upper case', () => {
    assert.deepEqual(
      getProxySettings({
        SHELL: '/bin/bash',
        USER: 'honza',
        http_proxy: 'http://proxy.example.com:8080',
        NO_PROXY: '*',
      }),
      ['http_proxy=http://proxy.example.com:8080', 'NO_PROXY=*'],
    );
  });

  it('skips environment variables set to empty strings', () => {
    assert.deepEqual(
      getProxySettings({
        SHELL: '/bin/bash',
        USER: 'honza',
        http_proxy: 'http://proxy.example.com:8080',
        NO_PROXY: '',
      }),
      ['http_proxy=http://proxy.example.com:8080'],
    );
  });
});
