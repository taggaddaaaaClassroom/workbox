const clearRequire = require('clear-require');
const expect = require('chai').expect;
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const errors = require('../../src/lib/errors');
const workboxBuild = require('../../build/index.js');

describe(`Test Injection Manifest`, function() {
  let tmpDirectory;

  before(function() {
    tmpDirectory = fs.mkdtempSync(
      path.join(__dirname, 'tmp-')
    );
  });

  after(function() {
    fsExtra.removeSync(tmpDirectory);
  });

  const VALID_INJECTION_DOCS = [
    'ok-1.js',
    'ok-2.js',
    'ok-3.js',
    'ok-4.js',
    'ok-5.js',
  ];
  const expectedString = `workboxSW.precache([
  {
    "url": "index.css",
    "revision": "d41d8cd98f00b204e9800998ecf8427e"
  },
  {
    "url": "index.html",
    "revision": "d41d8cd98f00b204e9800998ecf8427e"
  }
])`;
  VALID_INJECTION_DOCS.forEach((docName, index) => {
    it(`should be able to read and inject in doc ${docName}`, function() {
      const swDest = path.join(tmpDirectory, `different-output-name-${index}.js`);
      return workboxBuild.injectManifest({
        globDirectory: path.join(__dirname, '..', 'static', 'injection-samples'),
        globPatterns: ['**/*.{html,css}'],
        swSrc: path.join(__dirname, '..', 'static', 'injection-samples', docName),
        swDest,
      })
      .then(() => {
        const fileOutput = fs.readFileSync(swDest).toString();
        if (fileOutput.indexOf(expectedString) === -1) {
          console.log('DocName: ' + docName);
          console.log('fileOutput: ' + fileOutput);
          throw new Error('Could not find the expected output from injection of manifest.');
        }
      });
    });
  });

  it(`should throw due to no injection point in bad-no-injection.js`, function() {
    return workboxBuild.injectManifest({
      globDirectory: path.join(__dirname, '..', 'static', 'injection-samples'),
      globPatterns: ['**/*.{html,css}'],
      swSrc: path.join(__dirname, '..', 'static', 'injection-samples', 'bad-no-injection.js'),
      swDest: path.join(tmpDirectory, 'different-output-name.js'),
    })
    .then(() => {
      throw new Error('Expected promise to reject.');
    })
    .catch((err) => {
      if (err.message !== errors['injection-point-not-found']) {
        console.log(err);
        throw new Error('Unexpected error thrown.');
      }
    });
  });

  it(`should throw due to no injection point in bad-multiple-injection.js`, function() {
    return workboxBuild.injectManifest({
      globDirectory: path.join(__dirname, '..', 'static', 'injection-samples'),
      globPatterns: ['**/*.{html,css}'],
      swSrc: path.join(__dirname, '..', 'static', 'injection-samples', 'bad-multiple-injection.js'),
      swDest: path.join(tmpDirectory, 'different-output-name.js'),
    })
    .then(() => {
      throw new Error('Expected promise to reject.');
    })
    .catch((err) => {
      if (err.message !== errors['multiple-injection-points-found']) {
        console.log(err);
        throw new Error('Unexpected error thrown.');
      }
    });
  });

  it(`should log a warning when a blacklisted option is used`, function() {
    const warnSpy = sinon.spy();
    // Clear out the previously cached require()
    clearRequire('../../build/index.js');
    const proxiedWorkboxBuild = proxyquire('../../build/index.js', {
      '../log-helper': {
        'warn': warnSpy,
        '@global': true,
      },
    });

    return proxiedWorkboxBuild.injectManifest({
      globDirectory: path.join(__dirname, '..', 'static', 'injection-samples'),
      globPatterns: ['**/*.{html,css}'],
      swSrc: path.join(__dirname, '..', 'static', 'injection-samples', 'ok-1.js'),
      swDest: path.join(tmpDirectory, 'different-output-name.js'),
      runtimeCaching: [],
    }).then(() => expect(warnSpy.called).to.be.true);
  });

  it(`should not log a warning when a blacklisted option is not used`, function() {
    const warnSpy = sinon.spy();
    // Clear out the previously cached require()
    clearRequire('../../build/index.js');
    const proxiedWorkboxBuild = proxyquire('../../build/index.js', {
      '../log-helper': {
        'warn': warnSpy,
        '@global': true,
      },
    });

    return proxiedWorkboxBuild.injectManifest({
      globDirectory: path.join(__dirname, '..', 'static', 'injection-samples'),
      globPatterns: ['**/*.{html,css}'],
      swSrc: path.join(__dirname, '..', 'static', 'injection-samples', 'ok-1.js'),
      swDest: path.join(tmpDirectory, 'different-output-name.js'),
    }).then(() => expect(warnSpy.called).to.be.false);
  });
});
