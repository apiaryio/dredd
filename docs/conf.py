import os
import subprocess

from sphinx.util import console
from sphinx.errors import SphinxError
from recommonmark.parser import CommonMarkParser
from recommonmark.transform import AutoStructify


###########################################################################
#                                                                         #
#    Dredd documentation build configuration file                         #
#                                                                         #
###########################################################################


# -- General configuration ------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = [
    'pygments_markdown_lexer',
]

# The suffix(es) of source filenames.
# You can specify multiple suffix as a list of string:
source_suffix = '.md'
source_parsers = {'.md': CommonMarkParser}

# The master document.
master_doc = 'index'

# General information about the project.
project = 'Dredd'
copyright = 'Apiary Czech Republic, s.r.o.'
author = 'Apiary'

# The version info for the project you're documenting, acts as replacement for
# |version| and |release|, also used in various other places throughout the
# built documents.
#
# The full version, including alpha/beta/rc tags.
release = subprocess.getoutput('npm view dredd version')
# The short X.Y version.
version = release

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
# This patterns also effect to html_static_path and html_extra_path
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']

# The name of the Pygments (syntax highlighting) style to use.
pygments_style = 'sphinx'

# Suppressed warnings
suppress_warnings = [
    'image.nonlocal_uri',
]


# -- Options for HTML output ----------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.
if os.environ.get('READTHEDOCS') == 'True':
    # equals to default RTD theme
    html_theme = 'default'
else:
    # emulates the default RTD theme for local development
    html_theme = 'sphinx_rtd_theme'

# The name of an image file (relative to this directory) to place at the top
# of the sidebar.
html_logo = '../img/dredd-logo.png'

# The name of an image file (relative to this directory) to use as a favicon of
# the docs.  This file should be a Windows icon file (.ico) being 16x16 or 32x32
# pixels large.
#
# html_favicon = None

# Add any paths that contain custom static files (such as style sheets) here,
# relative to this directory. They are copied after the builtin static files,
# so a file named "default.css" will overwrite the builtin "default.css".
# html_static_path = ['_static']

# Add any extra paths that contain custom files (such as robots.txt or
# .htaccess) here, relative to this directory. These files are copied
# directly to the root of the documentation.
#
# html_extra_path = []

# Additional templates that should be rendered to pages, maps page names to
# template names.
#
# html_additional_pages = {}

# If true, "(C) Copyright ..." is shown in the HTML footer. Default is True.
html_show_copyright = False

# If true, an OpenSearch description file will be output, and all pages will
# contain a <link> tag referring to it.  The value of this option must be the
# base URL from which the finished HTML is served.
#
# html_use_opensearch = ''


# -- Custom Extensions ----------------------------------------------------

docs_dir = os.path.dirname(__file__)
node_modules_bin_dir = os.path.join(docs_dir, '..', 'node_modules', '.bin')

if os.environ.get('READTHEDOCS') == 'True':
    installation_output = subprocess.getoutput('bash ' + os.path.join(docs_dir, 'install_node.sh'))
    node_bin = installation_output.splitlines()[-1].strip()
else:
    node_bin = 'node'

js_extensions = {
    'hercule': [node_bin, os.path.join(node_modules_bin_dir, 'hercule'), '--relative=' + docs_dir, '--stdin'],
}
js_extensions_dir = os.path.join(docs_dir, '_extensions')
js_interpreters = {
    '.js': [node_bin],
    '.coffee': [node_bin, os.path.join(node_modules_bin_dir, 'coffee')]
}


def init_js_extensions(app):
    app.info(console.bold('initializing Node.js extensions... '), nonl=True)
    for basename in os.listdir(js_extensions_dir):
        _, ext = os.path.splitext(basename)

        if ext in js_interpreters.keys():
            filename = os.path.join(js_extensions_dir, basename)
            command = js_interpreters[ext] + [filename]
            js_extensions[basename] = command

    if js_extensions:
        app.connect('source-read', run_js_extensions)

    app.info('{} found'.format(len(js_extensions)))
    app.verbose('JavaScript extensions: ' + ', '.join(js_extensions.keys()))


def run_js_extensions(app, docname, source_list):
    for name, command in js_extensions.items():
        app.verbose(console.bold("runnning JavaScript extension '{}'... ".format(name)) + console.blue(docname))

        proc = subprocess.Popen(command, stdout=subprocess.PIPE, stdin=subprocess.PIPE)
        proc.stdin.write(source_list[0].encode('utf-8'))
        proc.stdin.close()
        source_list[0] = proc.stdout.read().decode('utf-8')
        exitStatus = proc.wait()

        if exitStatus:
            message = "JavaScript extension '{}' finished with non-zero exit status: {}"
            raise SphinxError(message.format(name, exitStatus))


def setup(app):
    init_js_extensions(app)

    app.add_config_value('recommonmark_config', {
        'enable_eval_rst': True,
        'enable_auto_toc_tree': True,
        'auto_toc_tree_section': 'Contents',
    }, True)
    app.add_transform(AutoStructify)


# -- Hacks ----------------------------------------------------------------

import sphinx.application

# Hacking around the pygments-markdown-lexer issue:
# https://github.com/jhermann/pygments-markdown-lexer/issues/6
_original_warn = sphinx.application.Sphinx.warn

def _warn(self, message, *args, **kwargs):
    if not message.startswith('extension \'pygments_markdown_lexer\' has no setup() function'):
        _original_warn(self, message, *args, **kwargs)

sphinx.application.Sphinx.warn = _warn
