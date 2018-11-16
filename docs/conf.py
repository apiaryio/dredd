import os
import sys
import re
import json
import subprocess
import urllib.request

from sphinx.errors import SphinxError


###########################################################################
#                                                                         #
#    Dredd documentation build configuration file                         #
#                                                                         #
###########################################################################


# -- Environment ----------------------------------------------------------

# Explicitly put the extensions directory to Python path
sys.path.append(os.path.abspath('extensions'))

# Detect whether the build happens on ReadTheDocs
IS_READTHEDOCS = os.environ.get('READTHEDOCS') == 'True'

# Specify paths
docs_dir = os.path.dirname(__file__)
project_dir = os.path.join(docs_dir, '..')
extensions_dir = os.path.join(docs_dir, 'extensions')
node_modules_bin_dir = os.path.join(project_dir, 'node_modules', '.bin')

# Install all npm dependencies if on ReadTheDocs. This requires the latest
# ReadTheDocs build image, which supports Node.js out of the box. This is
# specified in the readthedocs.yml in the root of the project.
if IS_READTHEDOCS:
    subprocess.check_call('npm install', cwd=project_dir, shell=True)

# Load package.json data
with open(os.path.join(project_dir, 'package.json')) as f:
    package_json = json.load(f)


# -- General configuration ------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = [
    'cli_options',
    'pygments_markdown_lexer',
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

# The version info for the project you're documenting, acts as replacement for
# |version| and |release|, also used in various other places throughout the
# built documents.
def get_release():
    try:
        # Is internet available? this is to be able to generate docs
        # e.g. in train without internet connection
        urllib.request.urlopen('https://www.npmjs.com/package/dredd', timeout=3)
    except urllib.request.URLError as e:
        if IS_READTHEDOCS:
            # ReadTheDocs have problem to connect to npm, fail fast
            raise SphinxError('Could not determine Dredd version: {}'.format(e))
        else:
            # Offline local development, use dummy release number
            return package_json['version']
    else:
        # Online, ask Semantic Release what would be the next version
        sem_rel_bin = os.path.join(node_modules_bin_dir, 'semantic-release')
        sem_rel_output = subprocess.getoutput('{} pre'.format(sem_rel_bin))
        match = re.search(r'determined version (\d+\.\d+\.\d+)', sem_rel_output, re.I)
        if match:
            # Semantic Release would use this version number
            return match.group(1)

        # Semantic Release wasn't able to determine a new version number,
        # either because of some error or because there are no changes which
        # would bump the version number. Stick to the latest released version.
        return subprocess.getoutput('npm view dredd version').strip()

# The full version, including alpha/beta/rc tags.
release = get_release()
if not re.match(r'\d+\.\d+\.\d+', release):
    raise SphinxError("'{}' does not look like version number".format(release))

# The short X.Y version.
version = release

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


# -- Options for HTML output ----------------------------------------------

# The theme to use for HTML and HTML Help pages. See the documentation for
# a list of builtin themes.
if IS_READTHEDOCS:
    # equals to the default RTD theme
    html_theme = 'default'
else:
    # emulates the default RTD theme for local development
    html_theme = 'sphinx_rtd_theme'

# The name of an image file (relative to this directory) to place at the top
# of the sidebar.
html_logo = '_images/dredd-logo.png'

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


# -- External links check -------------------------------------------------

linkcheck_ignore = [
    'https://crates.io/crates/dredd-hooks',  # https://github.com/sphinx-doc/sphinx/pull/5140
]
