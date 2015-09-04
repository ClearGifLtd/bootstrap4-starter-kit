'use strict';
/* exported dotenv */

// Install: you must install gulp both globally *and* locally.
// Make sure you `$ npm install -g gulp`

/**
 * Dependencies
 */

var $           = require('gulp-load-plugins')({ lazy: true });
var psi         = require('psi');
var del         = require('del');
var gulp        = require('gulp');
var exec        = require('child_process').exec;
var dotenv      = require('dotenv').load({ silent: true });
var terminus    = require('terminus');
// var stripLine   = require('gulp-strip-line');
var runSequence = require('run-sequence');

/**
 * Banner
 */

var pkg = require('./package.json');

var banner = [
  '/**',
  ' * <%= pkg.name %> - <%= pkg.description %>',
  ' * @version v<%= pkg.version %>',
  ' */',
  ''
].join('\n');

var jqueryCheck = [
  'if (typeof jQuery === \'undefined\') {',
  '  throw new Error(\'Bootstrap\\\'s JavaScript requires jQuery\')',
  '}',
  ''
].join('\n');

var jqueryVersionCheck = [
  '+function ($) {',
  '  var version = $.fn.jquery.split(\' \')[0].split(\'.\')',
  '  if ((version[0] < 2 && version[1] < 9) || (version[0] == 1 && version[1] == 9 && version[2] < 1)) {',
  '    throw new Error(\'Bootstrap\\\'s JavaScript requires jQuery version 1.9.1 or higher\')',
  '  }',
  '}(jQuery);',
  '',
  '+function ($) {',
  ''
].join('\n');

var footer = '\n\n}(jQuery);';

/**
 * Paths
 */

var paths = {
  clean: [
    'public/js/**/*.js',
    'public/js/**/*.map',
    'public/js/**/*.min.js',
    'public/lib/bootstrap/js/dist/**/*.js',
    'public/css/**/*.css',
    'public/css/**/*.min.css',
  ],
  es6: [
    // ============= Bootstrap  ================
    // Enable/disable as needed but only turn on
    // .js that is needed on *every* page. No bloat!
    // =========================================
    'public/lib/bootstrap/js/src/alert.js',
    'public/lib/bootstrap/js/src/button.js',
    'public/lib/bootstrap/js/src/carousel.js',
    'public/lib/bootstrap/js/src/collapse.js',
    'public/lib/bootstrap/js/src/dropdown.js',
    'public/lib/bootstrap/js/src/modal.js',
    'public/lib/bootstrap/js/src/popover.js',
    'public/lib/bootstrap/js/src/scrollspy.js',
    'public/lib/bootstrap/js/src/tab.js',
    'public/lib/bootstrap/js/src/tooltip.js',
    'public/lib/bootstrap/js/src/util.js'
  ],
  js: [
    'public/lib/bootstrap/js/dist/util.js',
    'public/lib/bootstrap/js/dist/alert.js',
    'public/lib/bootstrap/js/dist/button.js',
    'public/lib/bootstrap/js/dist/carousel.js',
    'public/lib/bootstrap/js/dist/collapse.js',
    'public/lib/bootstrap/js/dist/dropdown.js',
    'public/lib/bootstrap/js/dist/modal.js',
    'public/lib/bootstrap/js/dist/scrollspy.js',
    'public/lib/bootstrap/js/dist/tab.js',
    'public/lib/bootstrap/js/dist/tooltip.js',
    'public/lib/bootstrap/js/dist/popover.js'
    // 'public/lib/fastclick/lib/fastclick.js'
  ],
  lint: [
    'server/bin/**/*.js',
    'test/**/*.js',
    'server/routes/**/*.js',
    'server/models/**/*.js',
    'server/app.js',
    'server/config.js',
    'gulpfile.js'
  ],
  less: [
    'less/main.less',
    'less/landing.less',
    'less/page-enrollment.less'
  ],
  scss: [
    'server/scss/main.scss'
  ]
};

/**
 * Clean
 */

gulp.task('clean', function (cb) {
  del(paths.clean, cb);
});

/**
 * Process CSS
 */

gulp.task('styles', function () {
  return gulp.src(paths.scss)               // Read in scss files
    .pipe($.sass().on('error', $.sass.logError)) // Compile scss files
    .pipe($.autoprefixer({                  // Autoprefix for target browsers
      browsers: ['last 2 versions'],
      cascade: true
    }))
    .pipe($.csscomb())                      // Coding style formatter for CSS
    .pipe($.csslint('.csslintrc'))          // Lint CSS
    .pipe($.csslint.reporter())             // Report issues
    .pipe(gulp.dest('./public/css'))        // Save CSS
    .pipe($.rename({ suffix: '.min' }))     // Add .min suffix
    .pipe($.csso())                         // Minify CSS
    .pipe($.header(banner, { pkg : pkg }))  // Add banner
    .pipe($.size({ title: 'CSS:' }))        // What size are we at?
    .pipe(gulp.dest('./public/css'))        // Save minified CSS
    .pipe($.livereload());                  // Initiate a reload
});

/**
 * transpile es6
 */

gulp.task('transpile', function () {
  return gulp.src(paths.es6)                // Get es6 src files
    // .pipe(stripLine([/^(import|export)/g]))
    .pipe($.babel({
      sourceMap: true,
      modules: 'ignore'
    }))                                     // transpile to es5
    .pipe(gulp.dest('./public/lib/bootstrap/js/dist'));
});

/**
 * Process Scripts
 */

gulp.task('scripts', ['transpile'], function () {
  return gulp.src(paths.js)                 // Read .js files
    .pipe($.concat('main.js'))              // Concatenate .js files
    .pipe($.header(jqueryVersionCheck))     // Add banner
    .pipe($.header(jqueryCheck))            // Add banner
    .pipe($.footer(footer))                 // Add banner
    .pipe(gulp.dest('./public/js'))         // Save main.js here
    .pipe($.rename({ suffix: '.min' }))     // Add .min suffix
    .pipe($.uglify({ outSourceMap: true })) // Minify the .js
    .pipe($.header(banner, { pkg : pkg }))  // Add banner
    .pipe($.size({ title: 'JS:' }))         // What size are we at?
    .pipe(gulp.dest('./public/js'))         // Save minified .js
    .pipe($.livereload());                  // Initiate a reload
});

/**
 * JSHint Files
 */

gulp.task('lint', function () {
  return gulp.src(paths.lint)               // Read .js files
    .pipe($.jshint())                       // lint .js files
    .pipe($.jshint.reporter('jshint-stylish'));
});

/**
 * JSCS Files
 */

gulp.task('jscs', function () {
  return gulp.src(paths.lint)               // Read .js files
    .pipe($.jscs())                         // jscs .js files
    .on('error', function (e) {
      $.util.log(e.message);
      $.jscs().end();
    })
    .pipe(terminus.devnull({ objectMode: true }));
});

/**
 * Test Task
 */

gulp.task('mocha', function () {
  return gulp.src('./test/*.js', { read: false })
    .pipe($.mocha())
    .once('error', function () {
      process.exit(1);
    })
    .once('end', function () {
      process.exit(0);
    });
});

/**
 * Instanbul Code Coverage
 */

gulp.task('test', function (cb) {
  exec('istanbul cover _mocha -- -R spec', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);  // finished task
  });
});

/**
 * Build Task
 *   - Build all the things...
 */

gulp.task('build', function (cb) {
  runSequence(
    'clean',                     // first clean
    ['lint', 'jscs'],            // then lint and jscs
    ['styles', 'scripts'],       // Then styles and scripts
    // ['test'],
    cb);
});

/**
 * Nodemon Task
 */

gulp.task('nodemon', ['build'], function (cb) {
  $.livereload.listen();
  var called = false;
  $.nodemon({
    script: './server/bin/www',
    verbose: false,
    env: { 'DEBUG': pkg.name + ':*' },
    ext: 'js',
    ignore: [
      'gulpfile.js',
      'public/',
      'views/',
      'less/',
      'node_modules/'
    ]
  })
  .on('start', function () {
    setTimeout(function () {
      if (!called) {
        called = true;
        cb();
      }
    }, 3000);  // wait for start
  })
  .on('restart', function () {
    setTimeout(function () {
      $.livereload.changed('/');
    }, 3000);  // wait for restart
  });
});

/**
 * Open the browser
 */

gulp.task('open', ['nodemon'], function () {
  gulp.src('')
  .pipe($.open({ app: 'google chrome', uri: 'http://localhost:3000' }));
});


/**
 * Default Task
 */

gulp.task('default', ['open'], function () {
  gulp.watch('server/scss/**/*.scss', ['styles']);
  gulp.watch(paths.es6, ['scripts']);
  gulp.watch(paths.lint, ['lint', 'jscs']);
  gulp.watch('server/views/**/*.jade').on('change', $.livereload.changed);
});

/**
 * Run PageSpeed Insights
 */

// When using this module for a production-level build process,
// registering for an API key from the Google Developer Console
// is recommended.

var site = 'turbotaxpayments.com';

gulp.task('mobile', function (cb) {
  // output a formatted report to the terminal
  psi.output(site, {
    strategy: 'mobile',
    locale: 'en_US',
    threshold: 70
  }, cb);
});

gulp.task('desktop', ['mobile'], function (cb) {
  // output a formatted report to the terminal
  psi.output(site, {
    strategy: 'desktop',
    locale: 'en_US',
    threshold: 80
  }, cb);
});

gulp.task('pagespeed', ['desktop']);
