import { assert } from 'chai';

import { runDreddWithServer, createServer } from '../helpers';
import Dredd from '../../../lib/Dredd';

describe(`Sending and receiving "application/hal+json" according to produces/consumes in OpenAPI 2.0`, () => {
  let runtimeInfo;

  before((done) => {
    const app = createServer();
    app.get('/articles', (req, res) =>
      res
        .set({
          'content-type': 'application/hal+json',
        })
        .json([
          {
            id: 1,
            title: 'Creamy',
            text: 'Arbitrary',
            _links: {
              self: {
                href: '/articles/1',
              },
            },
          },
        ]),
    );
    app.post('/articles', (req, res) => {
      res.status(201).json({
        id: 2,
        title: 'Crispy schnitzel',
        text: 'Prepare eggs...',
      });
    });

    const dredd = new Dredd({
      options: {
        path: './test/fixtures/531-produces-consumes.yaml',
      },
    });

    runDreddWithServer(dredd, app, (err, info) => {
      runtimeInfo = info;
      done(err);
    });
  });

  it('results in one passed request test', () => {
    assert.equal(runtimeInfo.dredd.stats.passes, 1);
    assert.include(runtimeInfo.dredd.logging, 'pass: GET (200) /articles');
  });

  it('results in one failed response test', () => {
    assert.equal(runtimeInfo.dredd.stats.failures, 1);
    assert.include(runtimeInfo.dredd.logging, 'fail: POST (201) /articles');
    assert.include(
      runtimeInfo.dredd.logging,
      `fail: headers: At '/content-type' No enum match for: "application/json; charset=utf-8"`,
    );
  });
});
