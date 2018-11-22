import re
import unittest

from docutils import nodes


REFERENCE_RE = re.compile(r'((.+)<)?(\d)(#([\w\-]+))?>?$')
URL_TEMPLATE = 'https://github.com/OAI/OpenAPI-Specification/blob/master/versions/{version}.md'
FRAGMENT_TEMPLATE = '#user-content-{anchor}'

VERSION_MAPPING = {'2': '2.0', '3': '3.0.0'}


# https://docutils.readthedocs.io/en/sphinx-docs/howto/rst-roles.html
def openapi_link(name, rawtext, text, lineno, inliner, options={}, content=[]):
    try:
        link_text, url = parse_text(text)
    except:
        message = "Could not parse a reference to OpenAPI specs: '{}'".format(text)
        error = inliner.reporter.error(message, line=lineno)
        problematic = inliner.problematic(rawtext, rawtext, error)
        return [problematic], [error]

    node = nodes.reference(rawtext, link_text, refuri=url, **options)
    return [node], []


def parse_text(text):
    match = REFERENCE_RE.match(text)
    if match:
        link_text = (match.group(2) or '').strip()
        major_version = match.group(3)
        version = VERSION_MAPPING.get(major_version)
        anchor = match.group(5) or None

        if version:
            url = URL_TEMPLATE.format(version=version)
            if anchor:
                url += FRAGMENT_TEMPLATE.format(anchor=anchor)
                if not link_text:
                    link_text = 'spec'
            elif not link_text:
                link_text = 'OpenAPI {}'.format(major_version)
            return link_text, url

    raise ValueError("Could not parse '{}' as an OpenAPI specs reference".format(text))


def setup(app):
    app.add_role('openapi', openapi_link)
    return {'version': '1.0', 'parallel_read_safe': True}


class Tests(unittest.TestCase):
    def test_openapi2(self):
        link_text, url = parse_text('2')
        self.assertEqual(link_text, 'OpenAPI 2')
        self.assertEqual(url, (
            'https://github.com/OAI/OpenAPI-Specification/blob/master/'
            'versions/2.0.md'
        ))

    def test_openapi3(self):
        link_text, url = parse_text('3')
        self.assertEqual(link_text, 'OpenAPI 3')
        self.assertEqual(url, (
            'https://github.com/OAI/OpenAPI-Specification/blob/master/'
            'versions/3.0.0.md'
        ))

    def test_fragment(self):
        link_text, url = parse_text('2#vendorextensions')
        self.assertEqual(link_text, 'spec')
        self.assertEqual(url, (
            'https://github.com/OAI/OpenAPI-Specification/blob/master/'
            'versions/2.0.md#user-content-vendorextensions'
        ))

    def test_custom_text(self):
        link_text, url = parse_text(
            'vendor extension property <2#vendorextensions>'
        )
        self.assertEqual(link_text, 'vendor extension property')
        self.assertEqual(url, (
            'https://github.com/OAI/OpenAPI-Specification/blob/master/'
            'versions/2.0.md#user-content-vendorextensions'
        ))

    def test_version_error(self):
        with self.assertRaises(ValueError):
            parse_text('7')

    def test_syntax_error(self):
        with self.assertRaises(ValueError):
            parse_text('7!')


if __name__ == '__main__':
    unittest.main()
