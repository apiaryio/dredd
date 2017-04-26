import os
import re
import json
import subprocess
import urllib.request
from docutils import nodes

from sphinx.util import console
from sphinx.errors import SphinxError
from recommonmark.parser import CommonMarkParser
from recommonmark.transform import AutoStructify


###########################################################################
#                                                                         #
#    Dredd documentation build configuration file                         #
#                                                                         #
###########################################################################


# -- Environment ----------------------------------------------------------

docs_dir = os.path.dirname(__file__)
project_dir = os.path.join(docs_dir, '..')
node_modules_bin_dir = os.path.join(project_dir, 'node_modules', '.bin')

if os.environ.get('READTHEDOCS') == 'True':
    installation_output = subprocess.getoutput('bash ' + os.path.join(docs_dir, 'install-node.sh'))
    node_bin = installation_output.splitlines()[-1].strip()
else:
    node_bin = 'node'

with open(os.path.join(project_dir, 'package.json')) as f:
    package_json = json.load(f)


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
def get_release():
    try:
        # Is internet available? this is to be able to generate docs
        # e.g. in train without internet connection
        urllib.request.urlopen('https://www.npmjs.com/package/dredd', timeout=3)
    except urllib.request.URLError:
        # Offline, use dummy release number
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
        if os.environ.get('READTHEDOCS') == 'True':
            npm_bin = node_bin.replace('/bin/node', '/bin/npm')
            command = '{} {} view dredd version'.format(node_bin, npm_bin)
        else:
            command = 'npm view dredd version'
        return subprocess.getoutput(command).strip()

# The full version, including alpha/beta/rc tags.
release = get_release()
assert re.match(r'\d+\.\d+\.\d+', release), "'{}' does not look like version number".format(release)

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

def setup(app):
    # Lets Hercule (https://www.npmjs.com/package/hercule) and Node.js scripts
    # from the 'docs/_extensions' directory to process each document before
    # it gets processed by Sphinx
    init_js_extensions(app)

    # Fixing how references (local links) work with Markdown
    app.connect('doctree-read', collect_ref_data)
    app.connect('doctree-resolved', process_refs)

    # Better support for Markdown (see https://recommonmark.readthedocs.io/en/latest/auto_structify.html)
    app.add_config_value('recommonmark_config', {
        'enable_eval_rst': True,
        'enable_auto_toc_tree': True,
        'auto_toc_tree_section': 'Contents',
    }, True)
    app.add_transform(AutoStructify)


# -- Markdown References --------------------------------------------------

def collect_ref_data(app, doctree):
    """
    Finds all anchors and references (local links) within documents,
    and saves them as meta data
    """
    filename = doctree.attributes['source'].replace(docs_dir, '').lstrip('/')
    docname = filename.replace('.md', '')

    anchors = []
    references = []

    for node in doctree.traverse(nodes.raw):
        if 'name=' in node.rawsource:
            match = re.search(r'name="([^\"]+)', node.rawsource)
            if match:
                anchors.append(match.group(1))
        elif 'id=' in node.rawsource:
            match = re.search(r'id="([^\"]+)', node.rawsource)
            if match:
                anchors.append(match.group(1))

    for node in doctree.traverse(nodes.section):
        for target in frozenset(node.attributes.get('ids', [])):
            anchors.append(target)

    for node in doctree.traverse(nodes.reference):
        uri = node.get('refuri')
        if uri and not uri.startswith(('http://', 'https://')):
            references.append(to_reference(uri, basedoc=docname))

    app.env.metadata[docname]['anchors'] = anchors
    app.env.metadata[docname]['references'] = references

def process_refs(app, doctree, docname):
    """
    Fixes all references (local links) within documents, breaks the build
    if it finds any links to non-existent documents or anchors.
    """
    for reference in app.env.metadata[docname]['references']:
        referenced_docname, anchor = parse_reference(reference)

        if referenced_docname not in app.env.metadata:
            message = "Document '{}' is referenced from '{}', but it could not be found"
            raise SphinxError(message.format(referenced_docname, docname))

        if anchor and anchor not in app.env.metadata[referenced_docname]['anchors']:
            message = "Section '{}#{}' is referenced from '{}', but it could not be found"
            raise SphinxError(message.format(referenced_docname, anchor, docname))

        for node in doctree.traverse(nodes.reference):
            uri = node.get('refuri')
            if to_reference(uri, basedoc=docname) == reference:
                fixed_uri = '/{}.html'.format(referenced_docname)
                if anchor:
                    fixed_uri += '#{}'.format(anchor)
                node['refuri'] = fixed_uri

def to_reference(uri, basedoc=None):
    """
    Helper function, compiles a 'reference' from given URI and base
    document name
    """
    if '#' in uri:
        filename, anchor = uri.split('#', 1)
        filename = filename or basedoc
    else:
        filename = uri or basedoc
        anchor = None

    if not filename:
        message = "For self references like '{}' you need to provide the 'basedoc' argument".format(uri)
        raise ValueError(message)

    reference = os.path.splitext(filename.lstrip('/'))[0]
    if anchor:
        reference += '#' + anchor
    return reference

def parse_reference(reference):
    """
    Helper function, parses a 'reference' to document name and anchor
    """
    if '#' in reference:
        docname, anchor = reference.split('#', 1)
    else:
        docname = reference
        anchor = None
    return docname, anchor


# -- JavaScript Extensions ------------------------------------------------

js_extensions_dir = os.path.join(docs_dir, '_extensions')
js_extensions = []
js_interpreters = {
    '.js': [node_bin],
    '.coffee': [node_bin, os.path.join(node_modules_bin_dir, 'coffee')]
}

def init_js_extensions(app):
    """
    Looks up and registers the Node.js extensions

    Loads Node.js scripts from the 'docs/_extensions' directory, assigns
    interpreters to them (node vs. coffee) and registers the 'run_js_extensions'
    function.
    """
    app.info(console.bold('initializing Node.js extensions... '), nonl=True)
    for basename in sorted(os.listdir(js_extensions_dir)):
        _, ext = os.path.splitext(basename)

        if ext in js_interpreters.keys():
            filename = os.path.join(js_extensions_dir, basename)
            command = js_interpreters[ext] + [filename]
            js_extensions.append((basename, command))

    app.connect('source-read', run_js_extensions)
    app.info('{} found'.format(len(js_extensions)))
    app.verbose('JavaScript extensions: ' + ', '.join(dict(js_extensions).keys()))

def run_js_extensions(app, docname, source_list):
    """
    Lets all registered Node.js extensions to process given document source

    Executed for each document after the source gets read. Sequentially feeds
    stdin of each registered Node.js with the source and continues with whatever
    the extension sends to stdout. The extensions are provided with the document
    name as the first CLI argument.

    Hercule (https://www.npmjs.com/package/hercule) is built-in as if it was
    the first Node.js extension in the pipeline.
    """
    source = source_list[0]

    app.verbose(console.bold("runnning JavaScript extension 'hercule'... ") + console.blue(docname))
    command = [node_bin, os.path.join(node_modules_bin_dir, 'hercule'), '--relative=' + docs_dir, '--stdin']
    source = run_extension('hercule', command, source)

    for basename, command in js_extensions:
        app.verbose(console.bold("runnning JavaScript extension '{}'... ".format(basename)) + console.blue(docname))
        source = run_extension(basename, command + [docname], source)

    source_list[0] = source

def run_extension(extension_name, command, source):
    """
    Runs given command as a subprocess and lets it to modify given source
    """
    proc = subprocess.Popen(command, stdout=subprocess.PIPE, stdin=subprocess.PIPE)
    proc.stdin.write(source.encode('utf-8'))
    proc.stdin.close()

    source = proc.stdout.read().decode('utf-8')
    exit_status = proc.wait()
    if exit_status:
        message = "JavaScript extension '{}' finished with non-zero exit status: {}"
        raise SphinxError(message.format(extension_name, exit_status))
    return source


# -- Hacks ----------------------------------------------------------------

import sphinx.application

# Hacking around the pygments-markdown-lexer issue:
# https://github.com/jhermann/pygments-markdown-lexer/issues/6
_original_warn = sphinx.application.Sphinx.warn

def _warn(self, message, *args, **kwargs):
    if not message.startswith('extension \'pygments_markdown_lexer\' has no setup() function'):
        _original_warn(self, message, *args, **kwargs)

sphinx.application.Sphinx.warn = _warn
