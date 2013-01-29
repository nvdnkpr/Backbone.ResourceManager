window = if typeof global is "object" then global else this

Backbone = window.Backbone
_ = window._
$ = window.$ or window.jQuery

class ResourceManager
  _instance = undefined
  @getInstance: (args...) ->
    _instance ?= new _ResourceManager args...

class _ResourceManager 

  managedViews: {}
  collectionIdMaps: {}
  out: {}
  errors: {}

  constructor: (args...) ->
    return 

  get: (model, options) =>
    d = $.Deferred()
    updated = {}
    modelKey = "#{model.name}:#{model.id}"
    unresolvedPromise = @out[modelKey]

    cached = @caching.get modelKey
    if _.isFunction(model.bootstrapData) and not model.bootstrapped
      cached = model.bootstrapData()
      model.bootstrapped = true

    subModels = _.filter model.attributes, (val, key) ->
      val?.attributes? or val?.models?

    subPromises = if subModels.length
      @_generateSubPromises subModels, options

    if unresolvedPromise
      p = unresolvedPromise 
    else
      p = Backbone.sync('read', model, options)
        .done((attrs) =>
          delete @out[modelKey]
          @caching.set modelKey, attrs
        )

    @out[modelKey] = p

    if typeof cached isnt 'undefined'
      _.each cached, (value, key) =>
        if model.get(key) isnt value
          updated[key] = value

      if subPromises?.length
        resolver = -> d.resolve updated
        @_resolveSubPromises subPromises, resolver, d.reject, options
      else
        d.resolve(updated)

    else
      rejector = (jqXHR) ->
        d.reject
          resource: model
          response: jqXHR
          options: options
          deferred: d

      if subPromises?.length
        p.name = model.name
        subPromises.push p
        @_resolveSubPromises subPromises, d.resolve, rejector, options
      else
        p.done(d.resolve).fail(rejector)

    deferredPromise = d.promise()
    deferredPromise.name = model.name
    return deferredPromise

  gets: (collection, options) =>
    d = $.Deferred()
    ids = @collectionIdMaps[collection.name]
    idAttr = options.idAttr or 'id'

    collectionKey = "#{collection.name}"
    d.key = collectionKey
    unresolvedPromise = @out[collectionKey]

    if _.isFunction collection.bootstrapFrom
      data = collection.bootstrapFrom()
      @collectionIdMaps[collection.name] = _.pluck data, idAttr
      d.resolve data

    if unresolvedPromise
      p = unresolvedPromise 
    else
      p = Backbone.sync('read', collection, options)
        .done((models) =>
          collection.each (model) =>
            modelKey = "#{model.name}:#{model.id}"
            @caching.set modelKey, model.attributes

          @collectionIdMaps[collection.name] = collection.pluck idAttr

          if not options.add
            collection.reset models
        )

    @out[collectionKey] = p

    if typeof ids isnt "undefined" and ids.length
      d.resolve _.map(ids, (id) =>
        modelKey = "#{collection.model::name}:#{id}"
        json = @caching.get modelKey
        json.instanceId = id
        json
      )
    else
      rejector = (jqXHR) ->
        d.reject
          resource: collection
          response: jqXHR
          options: options
          deferred: d

      p.done(d.resolve).fail(rejector)

    deferredPromise = d.promise()
    deferredPromise.name = collection.name
    return deferredPromise

  create: (model, options) ->
    return Backbone.sync('read', model, options)
      .done((model) ->

        modelKey = "#{model.name}:#{model.id}"
        @caching.set modelKey, model.attributes

        if model.collection
          collection.each (model) =>
            modelKey = "#{model.name}:#{model.id}"
            @caching.set modelKey, model.attributes

          @collectionIdMaps[model.name] = model.collection.pluck idAttr

      ).promise()

  update: (model, options) ->
    modelKey = "#{model.name}:#{model.id}"
    instance = @caching.get modelKey
    old = if instance then _.clone(instance) else null
    instance = model.attributes

    return Backbone.sync('update', model, options)
      .done((attrs) =>
        modelKey = "#{attrs.name}:#{attrs.id}"
        cachedModel = @caching.get modelKey
        unless cachedModel
          @caching.set modelKey, attrs
      )
      .fail((jqXHR) =>
        if old
          instance = old
        else
          @caching.remove modelKey
      ).promise()

  destroy: (model, options) ->
    modelKey = "#{model.name}:#{model.id}"
    instance = @caching.get modelKey
    old = if instance then _.clone(instance) else null
    instance = model.attributes

    return Backbone.sync('delete', model, options)
      .done((model) ->
        modelKey = "#{model.name}:#{model.id}"
        @caching.remove modelKey

        if model.collection
          collection.each (model) =>
            modelKey = "#{model.name}:#{model.id}"
            @caching.remove modelKey

          delete @collectionIdMaps[model.name]

      ).fail((model) ->
        if old
          instance = old
        return
      ).promise()

  _generateSubPromises: (models, options) =>
    _.map models, (model) =>
      model.fetch()

  _resolveSubPromises: (promises, resolver, rejector, options) =>
    $.when.apply(@, promises)
      .done(=>
        resolver()
      )
      .fail((rejectData) => 

        promises = _(promises).reject (promise) =>
          promise.name is rejectData.resource.name

        @_resolveSubPromises promises, resolver, rejector, options
      )

  sync: (method, model, options) =>
    options = _.defaults options, {}

    switch method
      when 'read'
        p = if typeof model.id isnt 'undefined' then @get model, options else @gets model, options
      when 'create'
        p = @create model, options
      when 'update'
        p = @update model, options
      when 'delete'
        p = @destroy model, options

    return p

  init: (options) =>
    defaults =
      configs: []
      caching:
        interface: null
        ttl: 'forever'
        purge_frequency: 'never'
        ns: 'instanceStore'

    options = _.extend {}, defaults, options

    if options.caching.interface?
      @::caching = options.caching.interface

    @caching.init options.caching.ns, options.caching.ttl, options.caching.purge_frequency
    deferredViews = @addConfigs options.configs if options.configs?
    @renderDeferredViews deferredViews

  addConfigs: (configs) =>
    deferredViewList = []
    for namespace, config of configs
      ns = @managedViews[namespace] = {}
      ns.view = new config.view
      ns.view.requires = config.deps

      deferredViewList.push ns.view.resolveDeps()

    return deferredViewList

  renderDeferredViews: (deferredViews) ->
    for view in deferredViews
      view.deferredRender()

  # Simple in-memory cache
  caching:
    init: (ns, default_ttl='forever', purge_frequency='never') =>
      @::cachingNamespace = ns 
      @::[ns] = {}
      unless default_ttl is 'forever'
        throw new Error('A purge_frequency (specified in seconds) must be provided when using a default_ttl') if purge_frequency is 'never'
        that = @
        setInterval (-> 
          that::caching.purge.call(that, default_ttl)
        ), purge_frequency 

    get: (key) =>
      return @::[@::cachingNamespace][key]

    set: (key, data) =>
      ns = @::cachingNamespace
      ts = (new Date).getTime() / 1000
      data._rmCreatedAt = ts
      @::[ns][key] = data
      return data

    remove: (key) =>
      delete @::[@::cachingNamespace][key]

    purge: (ttl) =>
      now = (new Date).getTime() / 1000
      for key, data of @::[@::cachingNamespace]
        if (data._rmCreatedAt + ttl) < now
          @::caching.remove key


###
Extend Backbone Model/View/Collection/Router with mixin capabilities, e.g: 

  class YourCustomClass extends Backbone.Model
    @rm._rmInclude Managed[Model|Collection|View]Mixin

This function is used to create the base 'Managed' classes from which you may inherit
while also providing an easy method with which to include ManagedModel/Collection/ViewMixin
functionality w/o having to alter any pre-existing inheritance patterns 
###
include = (mixins...) ->
  throw new Error('include(mixins...) requires at least one mixin') unless mixins and mixins.length > 0

  for mixin in mixins
    for key, value of mixin
      @::[key] = value unless key is 'included'

    mixin.included?.apply(this)
  this

Backbone.Model._rmInclude = Backbone.Collection._rmInclude = include
Backbone.View._rmInclude = Backbone.Router._rmInclude = include


ManagedModelMixin = 
  included: ->
    @::name = 'managedmodel'

  sync: (method, model, options) ->
    Backbone.rm.ResourceManager.sync method, model, options

  toJSON: (options) ->
    attrs = _.clone(@attributes)
    for k, v of @attributes
      if v?.attributes
        attrs[k] = v.toJSON()
    return attrs


ManagedCollectionMixin = 
  included: ->
    @::name = 'managedcollection'

  sync: (method, model, options) ->
    Backbone.rm.ResourceManager.sync method, model, options


ManagedViewMixin =
  included: ->
    @::name = 'managedview-default'
    @::requires = []
    @::managedDeps = {}

  rmDeferredInit: ->
    return

  resolveDeps: ->
    d = $.Deferred()
    promises = @mappedFetch() 

    resolver = =>
      @rmDeferredInit()
      d.resolve()
      @_setupPolling()

    @_resolveRequiredPromises promises, resolver, d.reject 

    @depsDeferred = d

    return @

  _setupPolling: ->
    for k,v of @requires    
      if v.polling
        setInterval (=> @managedDeps[v.class::name].fetch()), v.pollingInterval or 10000

  mappedFetch: ->
    _.map @_getConfig(), (config) =>
      instance = @managedDeps[config.class::name]
      unless instance
        instance = if config.id then new config.class(id:config.id) else new config.class
        if _.isFunction config.bootstrapData
          instance.bootstrapData = config.bootstrapData
          instance.bootstrapped = false

        @managedDeps[instance.name] = instance

      modelOrCollection = if instance.models then 'collection' else 'model'
      @[modelOrCollection] = instance unless config.assign is false

      return instance.fetch()

  _getConfig: ->
    if @requires.length
      return @requires
    else
      throw "You must provide a dependency configuration for the #{@name} view"

  _resolveRequiredPromises: (promises, resolver, rejector, options) ->
    $.when.apply(@, promises)
      .done(=>
        resolver()
      )
      .fail((rejectData) => 
        if _.isFunction rejectData.resource.error 
          rejectData.resource.error(rejectData.resource, rejectData.response ,rejectData.options)

        promises = _(promises).reject (promise) =>
          promise.name is rejectData.resource.name

        @_resolveRequiredPromises promises, resolver, rejector, options
      )

  render: (tmpl, ctx) ->
    @$el.html tmpl(ctx)

  deferredRender: (promise=@depsDeferred, tmpl=@template, ctx={}) ->
    ctx = _.defaults {}, ctx
    ctx.data = {}
    promise.done(=>
      for k, v of @managedDeps
        ctx.data[k] = v.toJSON()
      @render tmpl, ctx
    )


# Create base classes via mixins for those who wish to directly
# inherit from ResourceManager base classes
class ManagedModel extends Backbone.Model
  @_rmInclude ManagedModelMixin

class ManagedCollection extends Backbone.Collection
  @_rmInclude ManagedCollectionMixin

class ManagedView extends Backbone.View
  @_rmInclude ManagedViewMixin


# Create namespace for ResourceManager
Backbone.rm = {}

# Initialize ResourceManager singleton in the Backbone namespace 
Backbone.rm.ResourceManager = ResourceManager.getInstance()

# Attach mixins/classes to namespace
Backbone.rm.ManagedModelMixin = ManagedModelMixin
Backbone.rm.ManagedCollectionMixin = ManagedCollectionMixin
Backbone.rm.ManagedViewMixin = ManagedViewMixin
Backbone.rm.ManagedModel = ManagedModel
Backbone.rm.ManagedCollection = ManagedCollection
Backbone.rm.ManagedView = ManagedView

