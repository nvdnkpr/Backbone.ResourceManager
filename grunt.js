module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-coffee');
    // Project configuration.
    grunt.initConfig({
        pkg: '<json:package.json>',
        server: {
          port: 3000,
          base: '.'
        },
        meta: {
            banner: '/*!\n* <%= pkg.name %> - v<%= pkg.version %> - ' +
                '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                '<%= pkg.homepage ? "* " + pkg.homepage + "\n" : "" %>' +
                '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;\n' +
                '* Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> \n*/',

            coffee: '#! <%= pkg.name %> - v<%= pkg.version %> - ' +
                '# <%= grunt.template.today("yyyy-mm-dd") %>\n' +
                '# <%= pkg.homepage ? " " + pkg.homepage + "\n" : "" %>' +
                '# Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;\n' +
                '# Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %>'
        },
        concat: {
            dist: {
                src: [
                    '<banner:meta.banner>',
                    'lib/resourceManager.coffee.js'
                ],
                dest: 'dist/<%= pkg.name %>.js'
            },
            coffee: {
                src: [
                    '<banner:meta.coffee>',
                    'lib/resourceManager.coffee'
                ],
                dest: 'dist/<%= pkg.name %>.coffee'
            },
            test: {
              src: [
                  '<banner:meta.banner>',
                  'vendor/jquery.js',
                  'vendor/underscore.js',
                  'vendor/backbone.js',
                  'vendor/backbone.paginator.js',
                  'lib/resourceManager.coffee.js'
              ],
              dest: 'dist/<%= pkg.name %>.test.js'
            }
        },
        min: {
            dist: {
                src: ['<banner:meta.banner>', '<config:concat.dist.dest>'],
                dest: 'dist/<%= pkg.name %>.min.js'
            }
        },
        test: {
            files: ['test/**/*.js']
        },
        lint: {
          files: ['grunt.js', 'lib/**/*.js']
        },
        watch: {
          files: ['lib/**/*.coffee'],
          tasks: 'coffee concat'
        },
        coffee: {
            build: {
                src: ['lib/**/*.coffee'],
                extension: ".coffee.js",
                options: {
                    bare: false
                }
            }
        }
    });

    // Default task.
    grunt.registerTask('default', 'coffee concat min');

};
