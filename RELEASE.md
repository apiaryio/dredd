# Release process

- [Release reference #1](https://github.com/apiaryio/dredd/pull/1626)
- [Release reference #2](https://github.com/apiaryio/dredd/pull/1862)

## 1. Create a release pull request

```bash
$ git checkout -b <user>/dredd-14.0.0
$ npx lerna version --no-push --no-git-tag-version
$ git add .
$ git push -u origin <user>/dredd-14.0.0
```

## 2. Post-merge process

**Once the release pull request is approved and merged**, proceed using the following instructions:

```bash
$ git checkout master
$ git pull

# Publish the packages respecting their versions from "package.json".
$ npx lerna publish from-package

# Tag the packages manually with the corresponding next versions.
$ git tag -a -m dredd@14.0.0 dredd@14.0.0
$ git tag -a -m dredd-transactions@10.0.0 dredd-transactions@10.0.0

# Push the new tags to master.
$ git push --tags
```
