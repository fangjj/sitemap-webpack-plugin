var zlib = require('zlib');
var GenerateDate = require('./date');

var GenerateSitemap = function(self) {
  // Validate configuration
  if(typeof(self.base) !== 'string') {
    throw new Error('Provided base URL is not a string');
  } else if(self.base.substr(-1) === '/') {
    self.base = self.base.replace(/\/$/, '');
  }
  if(!Array.isArray(self.paths)) {
    throw new Error('Provided paths are not an array');
  }

  // Create sitemap from paths
  var out = '<?xml version="1.0" encoding="UTF-8"?>';
  out += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

  var locs = self.paths.map(function(path) {
    if(typeof(path) === 'object') {
      if(typeof(path.path) !== 'string') {
        throw new Error('Path is not a string: ' + path);
      }
    } else if(typeof(path) === 'string') {
      path = { path: path };
    } else {
      throw new Error('Path is not a string: ' + path);
    }

    var loc = '<url>';

    var stringPath = path.path;
    if(stringPath.substr(0, 1) !== '/') {
      stringPath = '/' + path.path;
    }
    loc += '<loc>' + self.base + stringPath + '</loc>';

    // Add loc lastMod or default if set.
    if(path.lastMod) {
      loc += '<lastmod>' + path.lastMod + '</lastmod>';
    } else if(self.lastMod) {
      loc += '<lastmod>' + GenerateDate() + '</lastmod>';
    }

    // Add loc changeFreq or default if set.
    if(path.changeFreq) {
      loc += '<changefreq>' + path.changeFreq + '</changefreq>';
    } else if(self.changeFreq) {
      loc += '<changefreq>' + self.changeFreq + '</changefreq>';
    }

    // Add loc priority or default if set.
    if(path.priority) {
      loc += '<priority>' + path.priority + '</priority>';
    } else if(self.priority) {
      loc += '<priority>' + self.priority + '</priority>';
    }

    loc += '</url>';
    return loc;
  });

  out += locs.join('');
  out += '</urlset>';
  return out;
};

function SitemapWebpackPlugin(base, paths, options) {
  // Set mandatory values
  this.base = base;
  this.paths = paths;

  // Set options
  if(typeof(options) === 'undefined') {
    options = {};
  }
  this.fileName = options.fileName || 'sitemap.xml';
  this.lastMod = options.lastMod || false;
  this.changeFreq = options.changeFreq || null;
  this.priority = options.priority || null;
  this.skipGzip = options.skipGzip || false;
}

SitemapWebpackPlugin.prototype.apply = function(compiler) {
  var self = this;

  compiler.plugin('emit', function(compilation, callback) {
    var sitemap = null;

    try {
     sitemap = GenerateSitemap(self);

      compilation.fileDependencies.push(self.fileName);
      compilation.assets[self.fileName] = {
        source: function () {
          return sitemap;
        },
        size: function () {
          return Buffer.byteLength(sitemap, 'utf8');
        }
      };
    } catch (err) {
      compilation.errors.push(err.stack);
    }

    if(self.skipGzip !== true) {
      zlib.gzip(sitemap, function(err, compressed) {
        /* istanbul ignore if */
        if(err) {
          compilation.errors.push(err.stack);
        } else {
          compilation.assets[self.fileName + '.gz'] = {
            source: function () {
              return compressed;
            },
            size: function () {
              return Buffer.byteLength(compressed);
            }
          };
          callback();
        }
      });
    } else {
      callback();
    }
  });
};

module.exports = SitemapWebpackPlugin;
