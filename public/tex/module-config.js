// Configure SwiftLaTeX Module to find files in /tex/ directory
var Module = {
  locateFile: function(path) {
    // Worker files and WASM files should be loaded from /tex/
    if (path.endsWith('.wasm') || path.endsWith('.js') || path.endsWith('.data')) {
      return '/tex/' + path;
    }
    return path;
  }
};
