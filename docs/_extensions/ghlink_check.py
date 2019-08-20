import unittest
from pathlib import Path
from urllib.parse import urlparse

import docutils
from sphinx.util import logging


def check_uri(uri):
    if 'github.com/apiaryio/dredd/blob/master' in uri:
        path = Path(urlparse(uri).path
                    .replace('apiaryio/dredd/blob/master', '.').lstrip('/'))
        return path.exists()
    return True


def ghlink_check(app, doctree, docname):
    uris = filter(None, (
        reference.get('refuri') for reference
        in doctree.traverse(docutils.nodes.reference)
    ))

    logger = logging.getLogger(__name__)
    for uri in uris:
        if not check_uri(uri):
            logger.error("Broken link in '%s': %s", docname, uri)


def setup(app):
    app.connect('doctree-resolved', ghlink_check)
    return {'version': '1.0', 'parallel_read_safe': True}


class Tests(unittest.TestCase):
    def test_local(self):
        self.assertTrue(check_uri('page.html#usage'))

    def test_external(self):
        self.assertTrue(check_uri('https://apiblueprint.org'))

    def test_github(self):
        self.assertTrue(check_uri('https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md'))

    def test_relevant_github_repo_but_irrelevant_path(self):
        self.assertTrue(check_uri('https://github.com/apiaryio/dredd/issues/820'))

    def test_local_github_project_root_without_slash(self):
        self.assertTrue(check_uri('https://github.com/apiaryio/dredd/blob/master'))

    def test_local_github_project_root_with_slash(self):
        self.assertTrue(check_uri('https://github.com/apiaryio/dredd/blob/master/'))

    def test_local_github_existing(self):
        self.assertTrue(check_uri('https://github.com/apiaryio/dredd/blob/master/README.md'))

    def test_local_github_missing(self):
        self.assertFalse(check_uri('https://github.com/apiaryio/dredd/blob/master/foo/bar/doesnt-exist'))


if __name__ == '__main__':
    unittest.main()
