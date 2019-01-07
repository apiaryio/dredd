import os
import sys
import re
import json
import urllib.request

from sphinx.errors import SphinxError
from pygments.lexers.data import YamlLexer


###########################################################################
#                                                                         #
#    Dredd documentation build configuration file                         #
#                                                                         #
###########################################################################


# -- Environment ----------------------------------------------------------

# Explicitly put the extensions directory to Python path
sys.path.append(os.path.abspath('_extensions'))


# -- General configuration ------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = [
    'sphinx.ext.todo',
    'sphinx_tabs.tabs',
    'pygments_markdown_lexer',
    'cli_options',
    'ghissue',
    'specs',
]

# The suffix(es) of source filenames.
# You can specify multiple suffix as a list of string:
source_suffix = '.rst'

# The master document.
master_doc = 'index'

# General information about the project.
project = 'Dredd'
copyright = 'Apiary Czech Republic, s.r.o.'
author = 'Apiary'

# The project version (2.6) and release (2.6.0rc1) numbers. Figuring this
# out for Dredd is tricky (because of Semantic Release), so it's hardcoded.
version = 'latest'
release = 'latest'

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
# This patterns also effect to html_static_path and html_extra_path
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']

# The name of the Pygments (syntax highlighting) style to use.
pygments_style = 'monokai'

# Suppressed warnings
suppress_warnings = [
    'image.nonlocal_uri',
]

# ToDos
todo_include_todos = True


# -- Options for HTML output ----------------------------------------------

# The theme to use for HTML and HTML Help pages. See the documentation for
# a list of builtin themes.
html_theme = 'sphinx_rtd_theme'

# The name of an image file (relative to this directory) to place at the top
# of the sidebar.
html_logo = '_static/images/dredd-logo.png'

# The name of an image file (relative to this directory) to use as a favicon of
# the docs.  This file should be a Windows icon file (.ico) being 16x16 or 32x32
# pixels large.
#
# html_favicon = None

# Add any paths that contain custom static files (such as style sheets) here,
# relative to this directory. They are copied after the builtin static files,
# so a file named "default.css" will overwrite the builtin "default.css".
html_static_path = ['_static']

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


# -- External links check -------------------------------------------------

linkcheck_ignore = [
    'https://crates.io/crates/dredd-hooks',  # https://github.com/sphinx-doc/sphinx/pull/5140
]

sphinx_tabs_valid_builders = ['linkcheck']


# -- Theme customization --------------------------------------------------

# Directory with individual templates overriding the ones from the theme
templates_path = ['_templates']


# -- Custom Pygments lexers for OpenAPI -----------------------------------

class OpenAPI2Lexer(YamlLexer):
    name = 'OpenAPI 2'
    aliases = ['openapi2', 'swagger']
    mimetypes = ['application/swagger+yaml']

class OpenAPI3Lexer(YamlLexer):
    name = 'OpenAPI 3'
    aliases = ['openapi3']
    mimetypes = ['application/vnd.oai.openapi']


# -- Setting up extensions ------------------------------------------------

def setup(app):
    # An extension adding the '_static/css/dredd.css' stylesheet
    app.add_css_file('css/dredd.css')

    # Adding
    app.add_lexer('openapi2', OpenAPI2Lexer())
    app.add_lexer('openapi3', OpenAPI3Lexer())
