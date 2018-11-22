import re
import unittest

from docutils import nodes


REFERENCE_RE = re.compile(r'^((.+)<)?(mson)?(#([\w\-]+))?>?$')
URL_BASE = 'https://apiblueprint.org'
PATH_MAPPING = {
    ('', False): '',
    ('', True): '/documentation/specification.html',
    ('mson', False): '/documentation/mson/tutorial.html',
    ('mson', True): '/documentation/mson/specification.html',
}
FRAGMENT_PREFIX_MAPPING = {
    '': '#def-',
    'mson': '#',
}
LINK_TEXT_MAPPING = {
    '': 'API Blueprint',
    'mson': 'MSON',
}


# https://docutils.readthedocs.io/en/sphinx-docs/howto/rst-roles.html
def apib_link(name, rawtext, text, lineno, inliner, options={}, content=[]):
    try:
        link_text, url = parse_text(text)
    except ValueError:
        message = "Could not parse a reference to API Blueprint specs: '{}'".format(text)
        error = inliner.reporter.error(message, line=lineno)
        problematic = inliner.problematic(rawtext, rawtext, error)
        return [problematic], [error]

    node = nodes.reference(rawtext, link_text, refuri=url, **options)
    return [node], []


def parse_text(text):
    match = REFERENCE_RE.match(text)
    if match:
        link_text = (match.group(2) or '').strip()
        target = match.group(3) or ''
        anchor = match.group(5)
        has_anchor = bool(anchor)

        url = URL_BASE + PATH_MAPPING[(target, has_anchor)]
        if has_anchor:
            link_text = link_text or 'spec'
            url += FRAGMENT_PREFIX_MAPPING[target] + anchor
        else:
            link_text = link_text or LINK_TEXT_MAPPING[target]
        return link_text, url

    raise ValueError(text)


def setup(app):
    app.add_role('apib', apib_link)
    return {'version': '1.0', 'parallel_read_safe': True}


class Tests(unittest.TestCase):
    def test_homepage(self):
        link_text, url = parse_text('')
        self.assertEqual(link_text, 'API Blueprint')
        self.assertEqual(url, 'https://apiblueprint.org')

    def test_spec_fragment(self):
        link_text, url = parse_text('#attributes-section')
        self.assertEqual(link_text, 'spec')
        self.assertEqual(url, (
            'https://apiblueprint.org'
            '/documentation/specification.html#def-attributes-section'
        ))

    def test_mson_tutorial(self):
        link_text, url = parse_text('mson')
        self.assertEqual(link_text, 'MSON')
        self.assertEqual(url, (
            'https://apiblueprint.org'
            '/documentation/mson/tutorial.html'
        ))

    def test_mson_fragment(self):
        link_text, url = parse_text('mson#353-type-attribute')
        self.assertEqual(link_text, 'spec')
        self.assertEqual(url, (
            'https://apiblueprint.org'
            '/documentation/mson/specification.html#353-type-attribute'
        ))

    def test_custom_text(self):
        link_text, url = parse_text(
            'Attributes section <#attributes-section>'
        )
        self.assertEqual(link_text, 'Attributes section')
        self.assertEqual(url, (
            'https://apiblueprint.org'
            '/documentation/specification.html#def-attributes-section'
        ))


if __name__ == '__main__':
    unittest.main()
