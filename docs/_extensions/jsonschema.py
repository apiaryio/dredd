import re
import unittest

from docutils import nodes


REFERENCE_RE = re.compile(r'^((.+)<)?(([\w\-]+)#([\w\-]+))?>?$')
URL_BASE = 'https://json-schema.org'
PATH_TEMPLATE = '/understanding-json-schema/reference/{document}.html#{anchor}'


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
        is_empty = match.group(3) is None

        if is_empty:
            return (link_text or 'JSON Schema', URL_BASE)
        url = URL_BASE + PATH_TEMPLATE.format(document=match.group(4),
                                              anchor=match.group(5))
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
