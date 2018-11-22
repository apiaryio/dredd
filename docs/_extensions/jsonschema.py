import re
import unittest

from docutils import nodes


REFERENCE_RE = re.compile(r'^((.+)<)?(draft(\d)|([\w\-]+)(#([\w\-]+))?)?>?$')
URL_BASE = 'https://json-schema.org'
PATH_TEMPLATE = '/understanding-json-schema/reference/{document}.html'
DRAFT_URL_MAPPING = {
    3: 'https://tools.ietf.org/html/draft-zyp-json-schema-03',
    4: 'https://tools.ietf.org/html/draft-zyp-json-schema-04',
    5: 'https://tools.ietf.org/html/draft-wright-json-schema-00',
    6: 'https://tools.ietf.org/html/draft-wright-json-schema-01',
    7: 'https://tools.ietf.org/html/draft-handrews-json-schema-01',
}


# https://docutils.readthedocs.io/en/sphinx-docs/howto/rst-roles.html
def jsonschema_link(name, rawtext, text, lineno, inliner, options={}, content=[]):
    try:
        link_text, url = parse_text(text)
    except (ValueError, KeyError):
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
        content = match.group(3)

        if content is None:
            return (link_text or 'JSON Schema', URL_BASE)
        elif content.startswith('draft'):
            version = int(match.group(4))
            link_text = link_text or 'JSON Schema Draft {}'.format(version)
            return (link_text, DRAFT_URL_MAPPING[version])

        url = URL_BASE + PATH_TEMPLATE.format(document=match.group(5))
        anchor = match.group(7)
        if anchor:
            url += '#' + anchor
        return (link_text or 'spec', url)

    raise ValueError(text)


def setup(app):
    app.add_role('jsonschema', jsonschema_link)
    return {'version': '1.0', 'parallel_read_safe': True}


class Tests(unittest.TestCase):
    def test_spec_homepage(self):
        link_text, url = parse_text('')
        self.assertEqual(link_text, 'JSON Schema')
        self.assertEqual(url, 'https://json-schema.org')

    def test_draft(self):
        link_text, url = parse_text('draft7')
        self.assertEqual(link_text, 'JSON Schema Draft 7')
        self.assertEqual(url, 'https://tools.ietf.org/html/draft-handrews-json-schema-01')

    def test_spec(self):
        link_text, url = parse_text('array')
        self.assertEqual(link_text, 'spec')
        self.assertEqual(url, (
            'https://json-schema.org/understanding-json-schema/reference/'
            'array.html'
        ))

    def test_spec_fragment(self):
        link_text, url = parse_text('object#properties')
        self.assertEqual(link_text, 'spec')
        self.assertEqual(url, (
            'https://json-schema.org/understanding-json-schema/reference/'
            'object.html#properties'
        ))

    def test_custom_text(self):
        link_text, url = parse_text('additionalProperties <object#properties>')
        self.assertEqual(link_text, 'additionalProperties')
        self.assertEqual(url, (
            'https://json-schema.org/understanding-json-schema/reference/'
            'object.html#properties'
        ))


if __name__ == '__main__':
    unittest.main()
