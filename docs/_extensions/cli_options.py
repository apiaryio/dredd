import os
import json
from textwrap import dedent

from docutils import nodes
from docutils.statemachine import ViewList
from docutils.parsers.rst import Directive
from jinja2 import Template
from sphinx.util.nodes import nested_parse_with_titles


# https://docutils.readthedocs.io/en/sphinx-docs/howto/rst-directives.html
class CLIOptionsDirective(Directive):
    required_arguments = 1

    def run(self):
        # Load options from given JSON file
        options_path = os.path.join(
            os.path.dirname(self.state.document['source']),
            self.arguments[0],
        )
        with open(options_path) as f:
            options = json.load(f)

        # Generate reStructuredText markup
        rst = ''
        for name, attrs in sorted(options.items()):
            data = {
                'name': name,
                'alias': attrs.get('alias'),
                'default': json.dumps(attrs['default']) if 'default' in attrs else None,
                'description': attrs['description'],
            }
            template = Template(dedent('''
                .. _{{ name }}{% if alias %}-{{ alias }}{% endif %}:

                .. option:: --{{ name }}{% if alias %}, -{{ alias }}{% endif %}

                    {{ description }}
                    {% if default %}**Default value:** ``{{ default }}``{% endif %}

            '''))
            rst += template.render(**data)

        # Generate docutils nodes
        result = ViewList()
        for line in rst.splitlines():
            result.append(line, f'<cli-options-directive>')
        node = nodes.section(document=self.state.document)
        nested_parse_with_titles(self.state, result, node)
        return node.children


def setup(app):
    app.add_directive('cli-options', CLIOptionsDirective)
    return {'version': '1.0', 'parallel_read_safe': True}
