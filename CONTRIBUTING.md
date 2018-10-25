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

Before asking a question, please try to first search [Dredd's documentation](https://dredd.rtfd.io), [Apiary Help](https://help.apiary.io/).

You can always [contact Apiary Support](https://apiary.io/support), but we prefer if you ask publicly, because it allows to spread the knowledge across the community of all Dredd users:

- [Open a new GitHub issue](https://github.com/apiaryio/dredd/issues/new)
- [Ask on StackOverflow](https://stackoverflow.com/questions/ask) with the [dredd tag](https://stackoverflow.com/questions/tagged/dredd)

Also, we consider unclear or missing documentation to be a bug, so often your question can start a valuable improvement.


<a name="improving-documentation"></a>

## 📖 Improving documentation

The documentation is written [as code](http://www.writethedocs.org/guide/docs-as-code/) in the [reStructuredText](http://www.sphinx-doc.org/en/master/usage/restructuredtext/basics.html) format and its source files are located in the [docs](https://github.com/apiaryio/dredd/tree/master/docs) directory. It is published automatically by the [ReadTheDocs](https://readthedocs.org/) when the `master` branch is updated.

If you want to propose improvements to the documentation, you don't need to install the whole project. Usually it is just fine to use the [GitHub's editing features](https://github.com/apiaryio/dredd/edit/master/docs/installation.rst).

When committing your changes, please use the [prefix your commit message](https://dredd.readthedocs.io/en/latest/internals.html#sem-rel) with `docs`:

```
docs: add more OpenAPI examples
```

You can learn more about Dredd's codebase in the [Internals](https://dredd.readthedocs.io/en/latest/internals.html) section of the documentation.


<a name="proposing-changes-to-code"></a>

## 🛠 Proposing changes to code

Dredd is written in ES2015+ JavaScript and runs in [Node.js](https://nodejs.org/). We label good first issues as [easy to fix & important](https://github.com/apiaryio/dredd/labels/easy%20to%20fix%20%26%20important) or [easy to fix](https://github.com/apiaryio/dredd/labels/easy%20to%20fix). We recommend the following workflow for proposing changes to Dredd's code:

1.  [Fork Dredd](https://guides.github.com/activities/forking/)
2.  Clone your fork on your computer
3.  [Install Dredd](https://dredd.readthedocs.io/en/latest/installation.html)
4.  Create a feature branch
5.  Write tests
6.  Write code
7.  When committing your changes, use the [Conventional Changelog](https://dredd.readthedocs.io/en/latest/internals.html#sem-rel) format for the commit message:

    ```
    fix: handle corner case situation
    ```

    Note the `fix` prefix, which categorizes the type of your change. Other possible prefixes are `feat`, `refactor`, `test`, `chore`, `perf`, `docs`. We need this to be able to get a new version of Dredd automatically released when your changes are accepted.

8.  Check whether your changes meet the standards of the Dredd codebase: `npm run lint`
9.  [Send a Pull Request](https://guides.github.com/introduction/flow/)
10. Make sure the [test coverage](https://coveralls.io/github/apiaryio/dredd) didn’t drop and all CI builds are passing

You can learn more about Dredd's codebase in the [Internals](https://dredd.readthedocs.io/en/latest/internals.html) section of the documentation.
