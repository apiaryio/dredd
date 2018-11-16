import re

from docutils import nodes
from sphinx.errors import SphinxError


REFERENCE_RE = re.compile(r'^((([^\/]+)/)?([^#]+))?#(\d+)$')
URL_TEMPLATE = 'https://github.com/{owner}/{repo}/issues/{issueno}'


def github_issue(name, rawtext, text, lineno, inliner, options={}, content=[]):
    refuri = parse_text(text)
    node = nodes.reference(rawtext, text, refuri=refuri, **options)
    return [node], []


def parse_text(text):
    match = REFERENCE_RE.match(text)
    if match:
        owner = match.group(3) or 'apiaryio'
        repo = match.group(4) or 'dredd'
        issueno = match.group(5) or None
        if issueno:
            return URL_TEMPLATE.format(owner=owner, repo=repo, issueno=issueno)
    raise SphinxError("Could not parse '{}' as a GitHub issue reference".format(text))


def setup(app):
    app.add_role('ghissue', github_issue)
    return {'version': '1.0', 'parallel_read_safe': True}


# Primitive tests. Run this as follows and watch out for assertion errors:
#
#    $ python docs/extensions/ghissue.py
#
if __name__ == '__main__':
    assert parse_text('refractproject/minim#83') == 'https://github.com/refractproject/minim/issues/83'
    assert parse_text('dredd-transactions#163') == 'https://github.com/apiaryio/dredd-transactions/issues/163'
    assert parse_text('#1119') == 'https://github.com/apiaryio/dredd/issues/1119'
