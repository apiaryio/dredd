import re
import unittest

from docutils import nodes


REFERENCE_RE = re.compile(r'''
^(
    (?P<ref>[\w\-]+)
    |
    ((?P<link_text>(.+))\s*<(?P<ref_brackets>[\w\-]+)>)
)$
''', re.VERBOSE)

SPECS = {
    'apib': ('API Blueprint', 'https://apiblueprint.org/documentation/specification.html#{anchor}'),
    'mson': ('MSON', 'https://apiblueprint.org/documentation/mson/specification.html#{anchor}'),
    'openapi2': ('OpenAPI 2', 'https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#user-content-{anchor}'),
    'openapi3': ('OpenAPI 3', 'https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#user-content-{anchor}'),
}


# https://docutils.readthedocs.io/en/sphinx-docs/howto/rst-roles.html
def link(name, rawtext, text, lineno, inliner, options=None, content=None):
    title, url_template = SPECS[name]
    try:
        link_text, url = parse_text(text, url_template)
    except ValueError:
        message = "Could not parse {title} spec reference: '{text}'".format(
            title=title,
            text=text,
        )
        error = inliner.reporter.error(message, line=lineno)
        problematic = inliner.problematic(rawtext, rawtext, error)
        return [problematic], [error]

    node = nodes.reference(rawtext, link_text, refuri=url, **(options or {}))
    return [node], []


def parse_text(text, url_template):
    match = REFERENCE_RE.match(text)
    if match:
        link_text = (match.group('link_text') or '').strip()
        ref = match.group('ref') or match.group('ref_brackets')
        url = url_template.format(anchor=ref)
        return (link_text or 'spec', url)
    raise ValueError(text)


def setup(app):
    for name in SPECS.keys():
        app.add_role(name, link)
    return {'version': '1.0', 'parallel_read_safe': True}


class Tests(unittest.TestCase):
    def test_anchor(self):
        url_template = 'https://example.com#{anchor}'
        link_text, url = parse_text('foobar', url_template)
        self.assertEqual(link_text, 'spec')
        self.assertEqual(url, 'https://example.com#foobar')

    def test_custom_link_text(self):
        url_template = 'https://example.com#{anchor}'
        link_text, url = parse_text('my amazing link <foobar>', url_template)
        self.assertEqual(link_text, 'my amazing link')
        self.assertEqual(url, 'https://example.com#foobar')


if __name__ == '__main__':
    unittest.main()
