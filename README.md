```
   ___                                  __  ___                           
  / _ \___ ___ ___  __ _____________   /  |/  /__ ____  ___ ____ ____ ____
 / , _/ -_|_-</ _ \/ // / __/ __/ -_) / /|_/ / _ `/ _ \/ _ `/ _ `/ -_) __/
/_/|_|\__/___/\___/\_,_/_/  \__/\__/ /_/  /_/\_,_/_//_/\_,_/\_, /\__/_/   
                                                           /___/          
 
Managed data dependencies for your Backbone Views

```

## What is ResourceManager?
ResourceManager is a set of [Backbone](http://backbonejs.org/) view, model, and collection mixins that leverage [Deferred Objects](http://api.jquery.com/category/deferred-object/) to simplify the coordination and rendering of Views that depend on Models/Collections bound to data from multiple endpoints.  

ResourceManager also provides a client-side caching interface that maintains a simple in-memory store by default, providing caching for Backbone's sync operations, but can be swapped out for a caching library of your choice.  For example, [Burry](https://github.com/ggozad/burry.js) would work nicely if you wanted to use localStorage.


## Getting Started

Download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/HubSpot/Backbone.ResourceManager/master/dist/backbone-resourcemanager.min.js
[max]: https://raw.github.com/HubSpot/Backbone.ResourceManager/master/dist/backbone-resourcemanager.js

## Documentation

### Backbone.rm
After including the ResourceManager, you will find all constructors, Mixins, and base classes within the Backbone.rm namespace.  Aside from this namespace, the only other footprint left by the ResourceManager is the addition of the _rmInclude function to the Backbone.[View|Model|Collection|Router] objects

## Usage

### Models/Collections

Define your Managed models/collections by inheriting from the rm.ManagedModel/rm.ManagedCollection classes

    define 'hubspot.forms.models.Form', ['jQuery', 'Backbone.rm.ManagedModel'], ($, Model) ->
      class Form extends ManagedModel
        name: 'form'  # All managed Models/Collections must have a name
        url: -> "/forms/#{@id}"  # Define a url statically or as a function, as per usual
        defaults: ->
          name: ''

Or if you don't want to alter a pre-existing inheritance schema, just use the mixins...

    define 'hubspot.forms.models.Form', ['jQuery', 'Backbone.Model', 'Backbone.rm.ManagedModelMixin'], ($, Model, Mixin) ->
      class Form extends Model
        @_rmInclude Mixin
        name: 'form'
        And so on...
        

### View

There's nothing too special about how to set up a View, but notice that you now have a deferred initilialization hook as well as a default render context that's auto-magically populated with a data object that contains your dependencies' data namespaced accordingly.


    define 'views.WorkspaceView'
    ,['jQuery'
      'Backbone.rm.ManagedView'
      'hubspot.forms.collections.Fields']
    ,($, ResourceManager, ManagedView) ->
      class WorkspaceView extends ManagedView
        el: '#workspace-view'

        template: Handlebars.templates.some_template

        initialize: =>
          # Normal initialization logic that does not depend on Model/Collection being avaialable goes here

        rmDeferredInit: =>
          # Initialization logic that depends on Model/Collection data goes here
          # @model and @collection now available for use w/ attribute data populated

          return @

        render: (tmpl, ctx) =>
          ###
            At time of deferred render, ctx looks like:
              ctx: {
                data: {
                  form: {
                    id: 'form-id'
                    name: 'example form'
                    attr2: 'example fetched attr 2'
                  },
                  properties: [
                    {
                      id: 'prop-id'
                      name: 'example prop'
                      attr2: 'example fetched attr 2'
                    }
                  ]
                }
              }
          ###
          @$el.html @template ctx
          return @


### Initialization

You can initialize all of your managed views during initialization, in which case the deferred dependency resolution and rendering function will be called automatically.

    require [
      'Backbone.rm.ResourceManager'
      'views.WorkspaceView'
      'hubspot.models.Form'
      'hubspot.collections.Properties'
    ],(View, ResourceManager, WorkspaceView, Form Properties) ->
      ResourceManager.init
        configs:
          workspace:
            view: WorkspaceView
            deps: [
              {class: hubspot.forms.models.Form, id:hubspot.forms.formId}
              {class: hubspot.forms.collections.Properties}
            ]

Or, you can add/render the views separately in case you don't want to render the view automatically upon deferred initialization:

    require [
      'Backbone.rm.ResourceManager'
      'views.WorkspaceView'
      'hubspot.models.Form'
      'hubspot.collections.Properties'
    ],(View, ResourceManager, WorkspaceView, Form, Properties) ->
      ResourceManager.init()

      # The addConfigs function will return a list of deferred objects associated w/ each view's dependency resolution promise
      viewDeferreds = ResourceManager.addConfigs
        workspace:
          view: WorkspaceView
          deps: [
            {class: hubspot.forms.models.Form, id:hubspot.forms.formId}
            {class: hubspot.forms.collections.Properties}
          ]

      # .
      # ..
      # ... Execute some other logic...
      # ..
      # .

      # Finally, render views
      for dfd of viewDeferreds
        dfd.deferredRender() 


## Contributing
In lieu of a formal style-guide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [grunt](http://gruntjs.com/).

_Also, please don't edit files in the "dist" subdirectory as they are generated via grunt. You'll find source code in the "lib" subdirectory!_

## TODOs
* Documentation
* Example Usage
* Testing

## Release History
* 0.1.0: Initial Release

## License
Copyright (c) 2013 HubSpot
Licensed under the MIT license.
