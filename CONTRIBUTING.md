# Contributing

We are grateful for any contributions made by the community. Even seemingly small contributions such as fixing a typo in the documentation or reporting a bug are very appreciated!

- 🐛 [Reporting bugs](#reporting-bugs)
- 💬 [Asking questions](#asking-questions)
- 📖 [Improving documentation](#improving-documentation)
- 🛠 [Proposing changes to code](#proposing-changes-to-code)


<a name="reporting-bugs"></a>

## 🐛 Reporting bugs

Before reporting a bug, please try to first [search existing GitHub issues](https://github.com/apiaryio/dredd/issues?utf8=%E2%9C%93&q=is%3Aissue) to see whether your problem wasn't already discussed.

To report a bug, [open a new GitHub issue](https://github.com/apiaryio/dredd/issues/new). To report privately, e.g. to alert the maintainers about a security problem, please [contact Apiary Support](https://apiary.io/support).


<a name="asking-questions"></a>

## 💬 Asking questions

Before asking a question, please try to first search [Dredd's documentation](https://dredd.org), [Apiary Help](https://help.apiary.io/).

You can always [contact Apiary Support](https://apiary.io/support), but we prefer if you ask publicly, because it allows to spread the knowledge across the community of all Dredd users:

- [Open a new GitHub issue](https://github.com/apiaryio/dredd/issues/new)
- [Ask on StackOverflow](https://stackoverflow.com/questions/ask) with the [dredd tag](https://stackoverflow.com/questions/tagged/dredd)

Also, we consider unclear or missing documentation to be a bug, so often your question can start a valuable improvement.


<a name="improving-documentation"></a>

## 📖 Improving documentation

The documentation is written [as code](http://www.writethedocs.org/guide/docs-as-code/) in the [reStructuredText](http://www.sphinx-doc.org/en/master/usage/restructuredtext/basics.html) format and its source files are located in the [docs](https://github.com/apiaryio/dredd/tree/master/docs) directory. It is published automatically by the [ReadTheDocs](https://readthedocs.org/) when the `master` branch is updated.

If you want to propose improvements to the documentation, you don't need to install the whole project. Usually it is just fine to use the [GitHub's editing features](https://github.com/apiaryio/dredd/edit/master/docs/installation.rst).

When committing your changes, please use the [prefix your commit message](https://dredd.org/en/latest/internals.html#sem-rel) with `docs`:

```
docs: add more OpenAPI examples
```

You can learn more about Dredd's codebase in the [Internals](https://dredd.org/en/latest/internals.html) section of the documentation.


<a name="proposing-changes-to-code"></a>

## 🛠 Proposing changes to code
### Before you start

- Have [Node.js](https://nodejs.org/) installed
- Be familiar with [Git](https://guides.github.com/introduction/git-handbook/), [Pull Request flow](https://guides.github.com/introduction/flow/) and [GitHub forks](https://guides.github.com/activities/forking/)
- [Read about Dredd's architecture](https://dredd.org/en/latest/internals.html)
- Look at [easy to fix issues](https://github.com/apiaryio/dredd/labels/easy%20to%20fix)

### Improving Dredd
1. [Fork and clone Dredd](https://guides.github.com/activities/forking/)
1. Run `npm install`
1. [Write your code and tests](https://dredd.org/en/latest/internals.html#programming-language)
1. Use the [Conventional Changelog](https://dredd.org/en/latest/internals.html#sem-rel) format for the commit message
1. Check your changes with `npm run lint`
