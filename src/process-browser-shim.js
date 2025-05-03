// This is a simplified shim for process/browser
// It provides the basic functionality needed by canvg and other modules

const processShim = {
  env: {},
  browser: true,
  version: '',
  nextTick: function(fn) {
    setTimeout(fn, 0);
  },
  title: 'browser',
  argv: [],
  on: function() {},
  once: function() {},
  off: function() {},
  removeListener: function() {},
  removeAllListeners: function() {},
  emit: function() {},
  binding: function() {
    throw new Error('process.binding is not supported');
  },
  cwd: function() { return '/' },
  chdir: function() {
    throw new Error('process.chdir is not supported');
  },
  umask: function() { return 0; }
};

module.exports = processShim; 