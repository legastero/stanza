"use strict";

module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        browserify: {
            dist: {
                files: {
                    'build/stanzaio.bundle.js': ['<%= pkg.main %>']
                },
                options: {
                    bundleOptions: {
                        standalone: 'XMPP'
                    }
                }
            }
        },
        uglify: {
            options: {
                banner: '/*! stanzaio <%= grunt.template.today("yyyy-mm-dd") %>'
            },
            dist: {
                files: {
                    'build/stanzaio.bundle.min.js': ['build/stanzaio.bundle.js']
                }
            }
        },
        jshint: {
            files: ['Gruntfile.js', 'index.js', 'lib/**.js', 'lib/stanza/**.js', 'lib/plugins/**.js', 'test/**.js'],
            options: grunt.file.readJSON('.jshintrc')
        },
        tape: {
            options: {
                pretty: true
            },
            files: ['test/index.js']
        }
    });

    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-tape');
    grunt.loadNpmTasks('grunt-nsp-package');

    grunt.registerTask('default', ['jshint', 'browserify', 'uglify', 'tape', 'validate-package']);
};
