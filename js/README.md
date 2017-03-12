## `stencila/js` : Stencila for Javascript

[![NPM](http://img.shields.io/npm/v/stencila-js.svg?style=flat)](https://www.npmjs.com/package/stencila-js)
[![Build status](https://travis-ci.org/stencila/js.svg?branch=master)](https://travis-ci.org/stencila/js)
[![Code coverage](https://codecov.io/gh/stencila/js/branch/master/graph/badge.svg)](https://codecov.io/gh/stencila/js)
[![Dependency status](https://david-dm.org/stencila/js.svg)](https://david-dm.org/stencila/js)
[![Chat](https://badges.gitter.im/stencila/stencila.svg)](https://gitter.im/stencila/stencila)

This package contains code that is shared amongst other Stencila Javascript-based packages: [`node`](https://github.com/stencila/node) (the package for Node.js) and [`ui`](https://github.com/stencila/ui) (the package for browser-based use interfaces).

### Install

```
npm install stencila-js --save
```

### Use

Documentation is available at https://stencila.github.io/js.


### Discuss

We love feedback. Create a [new issue](https://github.com/stencila/js/issues/new), add to [existing issues](https://github.com/stencila/js/issues) or [chat](https://gitter.im/stencila/stencila) with members of the community.


### Develop

Want to help out with development? Great, there's a lot to do! To get started, read our contributor [code of conduct](CONDUCT.md), then [get in touch](https://gitter.im/stencila/stencila) or checkout the [platform-wide, cross-repository kanban board](https://github.com/orgs/stencila/projects/1).

Most development tasks can be run directly from `npm` or via `make` wrapper recipes.

Task                                                    |`npm`                  | `make`          |
------------------------------------------------------- |-----------------------|-----------------|    
Install and setup dependencies                          | `npm install`         | `make setup`
Check code for lint                                     | `npm run lint`        | `make lint`
Run tests                                               | `npm test`            | `make test`
Run tests in the browser                                | `npm run test-bundle` | `make test-bundle`
Run tests with coverage                                 | `npm run cover`       | `make cover`
Build browser bundle                                    | `npm run build`       | `make build`
Build documentation                                     | `npm run docs`        | `make docs`
Serve and watch docs for updates                        | `npm run docs-serve`  | `make docs-serve`
Clean                                                   |                       | `make clean`

Tests live in the `tests` folder and are written using the [`tape`](https://github.com/substack/tape) test harness.

And, in further breathtaking displays of naming logic, documentation lives in the `docs` folder and uses [documentation.js](http://documentation.js.org). Docs are published using Github Pages, so to update them after making changes run `make docs`, commit the updated docs and do a `git push`.