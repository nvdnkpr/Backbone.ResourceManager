/*!
* Backbone.ResourceManager - v0.1.0 - 2013-01-29
* https://github.com/HubSpot/Backbone.ResourceManager
* Copyright (c) 2013 HubSpot, Matthew Pirkowski;
* Licensed MIT 
*/

(function() {
  var $, Backbone, ManagedCollection, ManagedCollectionMixin, ManagedModel, ManagedModelMixin, ManagedView, ManagedViewMixin, ResourceManager, include, window, _, _ResourceManager,
    __slice = [].slice,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window = typeof global === "object" ? global : this;

  Backbone = window.Backbone;

  _ = window._;

  $ = window.$ || window.jQuery;

  ResourceManager = (function() {
    var _instance;

    function ResourceManager() {}

    _instance = void 0;

    ResourceManager.getInstance = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return _instance != null ? _instance : _instance = (function(func, args, ctor) {
        ctor.prototype = func.prototype;
        var child = new ctor, result = func.apply(child, args), t = typeof result;
        return t == "object" || t == "function" ? result || child : child;
      })(_ResourceManager, args, function(){});
    };

    return ResourceManager;

  })();

  _ResourceManager = (function() {
    var _this = this;

    _ResourceManager.prototype.managedViews = {};

    _ResourceManager.prototype.collectionIdMaps = {};

    _ResourceManager.prototype.out = {};

    _ResourceManager.prototype.errors = {};

    function _ResourceManager() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      this.addConfigs = __bind(this.addConfigs, this);

      this.init = __bind(this.init, this);

      this.sync = __bind(this.sync, this);

      this._resolveSubPromises = __bind(this._resolveSubPromises, this);

      this._generateSubPromises = __bind(this._generateSubPromises, this);

      this.gets = __bind(this.gets, this);

      this.get = __bind(this.get, this);

      return;
    }

    _ResourceManager.prototype.get = function(model, options) {
      var cached, d, deferredPromise, modelKey, p, rejector, resolver, subModels, subPromises, unresolvedPromise, updated,
        _this = this;
      d = $.Deferred();
      updated = {};
      modelKey = "" + model.name + ":" + model.id;
      unresolvedPromise = this.out[modelKey];
      cached = this.caching.get(modelKey);
      if (_.isFunction(model.bootstrapData) && !model.bootstrapped) {
        cached = model.bootstrapData();
        model.bootstrapped = true;
      }
      subModels = _.filter(model.attributes, function(val, key) {
        return ((val != null ? val.attributes : void 0) != null) || ((val != null ? val.models : void 0) != null);
      });
      subPromises = subModels.length ? this._generateSubPromises(subModels, options) : void 0;
      if (unresolvedPromise) {
        p = unresolvedPromise;
      } else {
        p = Backbone.sync('read', model, options).done(function(attrs) {
          delete _this.out[modelKey];
          return _this.caching.set(modelKey, attrs);
        });
      }
      this.out[modelKey] = p;
      if (typeof cached !== 'undefined') {
        _.each(cached, function(value, key) {
          if (model.get(key) !== value) {
            return updated[key] = value;
          }
        });
        if (subPromises != null ? subPromises.length : void 0) {
          resolver = function() {
            return d.resolve(updated);
          };
          this._resolveSubPromises(subPromises, resolver, d.reject, options);
        } else {
          d.resolve(updated);
        }
      } else {
        rejector = function(jqXHR) {
          return d.reject({
            resource: model,
            response: jqXHR,
            options: options,
            deferred: d
          });
        };
        if (subPromises != null ? subPromises.length : void 0) {
          p.name = model.name;
          subPromises.push(p);
          this._resolveSubPromises(subPromises, d.resolve, rejector, options);
        } else {
          p.done(d.resolve).fail(rejector);
        }
      }
      deferredPromise = d.promise();
      deferredPromise.name = model.name;
      return deferredPromise;
    };

    _ResourceManager.prototype.gets = function(collection, options) {
      var collectionKey, d, data, deferredPromise, idAttr, ids, p, rejector, unresolvedPromise,
        _this = this;
      d = $.Deferred();
      ids = this.collectionIdMaps[collection.name];
      idAttr = options.idAttr || 'id';
      collectionKey = "" + collection.name;
      d.key = collectionKey;
      unresolvedPromise = this.out[collectionKey];
      if (_.isFunction(collection.bootstrapFrom)) {
        data = collection.bootstrapFrom();
        this.collectionIdMaps[collection.name] = _.pluck(data, idAttr);
        d.resolve(data);
      }
      if (unresolvedPromise) {
        p = unresolvedPromise;
      } else {
        p = Backbone.sync('read', collection, options).done(function(models) {
          collection.each(function(model) {
            var modelKey;
            modelKey = "" + model.name + ":" + model.id;
            return _this.caching.set(modelKey, model.attributes);
          });
          _this.collectionIdMaps[collection.name] = collection.pluck(idAttr);
          if (!options.add) {
            return collection.reset(models);
          }
        });
      }
      this.out[collectionKey] = p;
      if (typeof ids !== "undefined" && ids.length) {
        d.resolve(_.map(ids, function(id) {
          var json, modelKey;
          modelKey = "" + collection.model.prototype.name + ":" + id;
          json = _this.caching.get(modelKey);
          json.instanceId = id;
          return json;
        }));
      } else {
        rejector = function(jqXHR) {
          return d.reject({
            resource: collection,
            response: jqXHR,
            options: options,
            deferred: d
          });
        };
        p.done(d.resolve).fail(rejector);
      }
      deferredPromise = d.promise();
      deferredPromise.name = collection.name;
      return deferredPromise;
    };

    _ResourceManager.prototype.create = function(model, options) {
      return Backbone.sync('read', model, options).done(function(model) {
        var modelKey,
          _this = this;
        modelKey = "" + model.name + ":" + model.id;
        this.caching.set(modelKey, model.attributes);
        if (model.collection) {
          collection.each(function(model) {
            modelKey = "" + model.name + ":" + model.id;
            return _this.caching.set(modelKey, model.attributes);
          });
          return this.collectionIdMaps[model.name] = model.collection.pluck(idAttr);
        }
      }).promise();
    };

    _ResourceManager.prototype.update = function(model, options) {
      var instance, modelKey, old,
        _this = this;
      modelKey = "" + model.name + ":" + model.id;
      instance = this.caching.get(modelKey);
      old = instance ? _.clone(instance) : null;
      instance = model.attributes;
      return Backbone.sync('update', model, options).done(function(attrs) {
        var cachedModel;
        modelKey = "" + attrs.name + ":" + attrs.id;
        cachedModel = _this.caching.get(modelKey);
        if (!cachedModel) {
          return _this.caching.set(modelKey, attrs);
        }
      }).fail(function(jqXHR) {
        if (old) {
          return instance = old;
        } else {
          return _this.caching.remove(modelKey);
        }
      }).promise();
    };

    _ResourceManager.prototype.destroy = function(model, options) {
      var instance, modelKey, old;
      modelKey = "" + model.name + ":" + model.id;
      instance = this.caching.get(modelKey);
      old = instance ? _.clone(instance) : null;
      instance = model.attributes;
      return Backbone.sync('delete', model, options).done(function(model) {
        var _this = this;
        modelKey = "" + model.name + ":" + model.id;
        this.caching.remove(modelKey);
        if (model.collection) {
          collection.each(function(model) {
            modelKey = "" + model.name + ":" + model.id;
            return _this.caching.remove(modelKey);
          });
          return delete this.collectionIdMaps[model.name];
        }
      }).fail(function(model) {
        if (old) {
          instance = old;
        }
      }).promise();
    };

    _ResourceManager.prototype._generateSubPromises = function(models, options) {
      var _this = this;
      return _.map(models, function(model) {
        return model.fetch();
      });
    };

    _ResourceManager.prototype._resolveSubPromises = function(promises, resolver, rejector, options) {
      var _this = this;
      return $.when.apply(this, promises).done(function() {
        return resolver();
      }).fail(function(rejectData) {
        promises = _(promises).reject(function(promise) {
          return promise.name === rejectData.resource.name;
        });
        return _this._resolveSubPromises(promises, resolver, rejector, options);
      });
    };

    _ResourceManager.prototype.sync = function(method, model, options) {
      var p;
      options = _.defaults(options, {});
      switch (method) {
        case 'read':
          p = typeof model.id !== 'undefined' ? this.get(model, options) : this.gets(model, options);
          break;
        case 'create':
          p = this.create(model, options);
          break;
        case 'update':
          p = this.update(model, options);
          break;
        case 'delete':
          p = this.destroy(model, options);
      }
      return p;
    };

    _ResourceManager.prototype.init = function(options) {
      var defaults, deferredViews;
      defaults = {
        configs: [],
        caching: {
          "interface": null,
          ttl: 'forever',
          purge_frequency: 'never',
          ns: 'instanceStore'
        }
      };
      options = _.extend({}, defaults, options);
      if (options.caching["interface"] != null) {
        this.prototype.caching = options.caching["interface"];
      }
      this.caching.init(options.caching.ns, options.caching.ttl, options.caching.purge_frequency);
      if (options.configs != null) {
        deferredViews = this.addConfigs(options.configs);
      }
      return this.renderDeferredViews(deferredViews);
    };

    _ResourceManager.prototype.addConfigs = function(configs) {
      var config, deferredViewList, namespace, ns;
      deferredViewList = [];
      for (namespace in configs) {
        config = configs[namespace];
        ns = this.managedViews[namespace] = {};
        ns.view = new config.view;
        ns.view.requires = config.deps;
        deferredViewList.push(ns.view.resolveDeps());
      }
      return deferredViewList;
    };

    _ResourceManager.prototype.renderDeferredViews = function(deferredViews) {
      var view, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = deferredViews.length; _i < _len; _i++) {
        view = deferredViews[_i];
        _results.push(view.deferredRender());
      }
      return _results;
    };

    _ResourceManager.prototype.caching = {
      init: function(ns, default_ttl, purge_frequency) {
        var that;
        if (default_ttl == null) {
          default_ttl = 'forever';
        }
        if (purge_frequency == null) {
          purge_frequency = 'never';
        }
        _ResourceManager.prototype.cachingNamespace = ns;
        _ResourceManager.prototype[ns] = {};
        if (default_ttl !== 'forever') {
          if (purge_frequency === 'never') {
            throw new Error('A purge_frequency (specified in seconds) must be provided when using a default_ttl');
          }
          that = _ResourceManager;
          return setInterval((function() {
            return that.prototype.caching.purge.call(that, default_ttl);
          }), purge_frequency);
        }
      },
      get: function(key) {
        return _ResourceManager.prototype[_ResourceManager.prototype.cachingNamespace][key];
      },
      set: function(key, data) {
        var ns, ts;
        ns = _ResourceManager.prototype.cachingNamespace;
        ts = (new Date).getTime() / 1000;
        data._rmCreatedAt = ts;
        _ResourceManager.prototype[ns][key] = data;
        return data;
      },
      remove: function(key) {
        return delete _ResourceManager.prototype[_ResourceManager.prototype.cachingNamespace][key];
      },
      purge: function(ttl) {
        var data, key, now, _ref, _results;
        now = (new Date).getTime() / 1000;
        _ref = _ResourceManager.prototype[_ResourceManager.prototype.cachingNamespace];
        _results = [];
        for (key in _ref) {
          data = _ref[key];
          if ((data._rmCreatedAt + ttl) < now) {
            _results.push(_ResourceManager.prototype.caching.remove(key));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      }
    };

    return _ResourceManager;

  }).call(this);

  /*
  Extend Backbone Model/View/Collection/Router with mixin capabilities, e.g: 
  
    class YourCustomClass extends Backbone.Model
      @rm._rmInclude Managed[Model|Collection|View]Mixin
  
  This function is used to create the base 'Managed' classes from which you may inherit
  while also providing an easy method with which to include ManagedModel/Collection/ViewMixin
  functionality w/o having to alter any pre-existing inheritance patterns
  */


  include = function() {
    var key, mixin, mixins, value, _i, _len, _ref;
    mixins = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (!(mixins && mixins.length > 0)) {
      throw new Error('include(mixins...) requires at least one mixin');
    }
    for (_i = 0, _len = mixins.length; _i < _len; _i++) {
      mixin = mixins[_i];
      for (key in mixin) {
        value = mixin[key];
        if (key !== 'included') {
          this.prototype[key] = value;
        }
      }
      if ((_ref = mixin.included) != null) {
        _ref.apply(this);
      }
    }
    return this;
  };

  Backbone.Model._rmInclude = Backbone.Collection._rmInclude = include;

  Backbone.View._rmInclude = Backbone.Router._rmInclude = include;

  ManagedModelMixin = {
    included: function() {
      return this.prototype.name = 'managedmodel';
    },
    sync: function(method, model, options) {
      return Backbone.rm.ResourceManager.sync(method, model, options);
    },
    toJSON: function(options) {
      var attrs, k, v, _ref;
      attrs = _.clone(this.attributes);
      _ref = this.attributes;
      for (k in _ref) {
        v = _ref[k];
        if (v != null ? v.attributes : void 0) {
          attrs[k] = v.toJSON();
        }
      }
      return attrs;
    }
  };

  ManagedCollectionMixin = {
    included: function() {
      return this.prototype.name = 'managedcollection';
    },
    sync: function(method, model, options) {
      return Backbone.rm.ResourceManager.sync(method, model, options);
    }
  };

  ManagedViewMixin = {
    included: function() {
      this.prototype.name = 'managedview-default';
      this.prototype.requires = [];
      return this.prototype.managedDeps = {};
    },
    rmDeferredInit: function() {},
    resolveDeps: function() {
      var d, promises, resolver,
        _this = this;
      d = $.Deferred();
      promises = this.mappedFetch();
      resolver = function() {
        _this.rmDeferredInit();
        d.resolve();
        return _this._setupPolling();
      };
      this._resolveRequiredPromises(promises, resolver, d.reject);
      this.depsDeferred = d;
      return this;
    },
    _setupPolling: function() {
      var k, v, _ref, _results,
        _this = this;
      _ref = this.requires;
      _results = [];
      for (k in _ref) {
        v = _ref[k];
        if (v.polling) {
          _results.push(setInterval((function() {
            return _this.managedDeps[v["class"].prototype.name].fetch();
          }), v.pollingInterval || 10000));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    },
    mappedFetch: function() {
      var _this = this;
      return _.map(this._getConfig(), function(config) {
        var instance, modelOrCollection;
        instance = _this.managedDeps[config["class"].prototype.name];
        if (!instance) {
          instance = config.id ? new config["class"]({
            id: config.id
          }) : new config["class"];
          if (_.isFunction(config.bootstrapData)) {
            instance.bootstrapData = config.bootstrapData;
            instance.bootstrapped = false;
          }
          _this.managedDeps[instance.name] = instance;
        }
        modelOrCollection = instance.models ? 'collection' : 'model';
        if (config.assign !== false) {
          _this[modelOrCollection] = instance;
        }
        return instance.fetch();
      });
    },
    _getConfig: function() {
      if (this.requires.length) {
        return this.requires;
      } else {
        throw "You must provide a dependency configuration for the " + this.name + " view";
      }
    },
    _resolveRequiredPromises: function(promises, resolver, rejector, options) {
      var _this = this;
      return $.when.apply(this, promises).done(function() {
        return resolver();
      }).fail(function(rejectData) {
        if (_.isFunction(rejectData.resource.error)) {
          rejectData.resource.error(rejectData.resource, rejectData.response, rejectData.options);
        }
        promises = _(promises).reject(function(promise) {
          return promise.name === rejectData.resource.name;
        });
        return _this._resolveRequiredPromises(promises, resolver, rejector, options);
      });
    },
    render: function(tmpl, ctx) {
      return this.$el.html(tmpl(ctx));
    },
    deferredRender: function(promise, tmpl, ctx) {
      var _this = this;
      if (promise == null) {
        promise = this.depsDeferred;
      }
      if (tmpl == null) {
        tmpl = this.template;
      }
      if (ctx == null) {
        ctx = {};
      }
      ctx = _.defaults({}, ctx);
      ctx.data = {};
      return promise.done(function() {
        var k, v, _ref;
        _ref = _this.managedDeps;
        for (k in _ref) {
          v = _ref[k];
          ctx.data[k] = v.toJSON();
        }
        return _this.render(tmpl, ctx);
      });
    }
  };

  ManagedModel = (function(_super) {

    __extends(ManagedModel, _super);

    function ManagedModel() {
      return ManagedModel.__super__.constructor.apply(this, arguments);
    }

    ManagedModel._rmInclude(ManagedModelMixin);

    return ManagedModel;

  })(Backbone.Model);

  ManagedCollection = (function(_super) {

    __extends(ManagedCollection, _super);

    function ManagedCollection() {
      return ManagedCollection.__super__.constructor.apply(this, arguments);
    }

    ManagedCollection._rmInclude(ManagedCollectionMixin);

    return ManagedCollection;

  })(Backbone.Collection);

  ManagedView = (function(_super) {

    __extends(ManagedView, _super);

    function ManagedView() {
      return ManagedView.__super__.constructor.apply(this, arguments);
    }

    ManagedView._rmInclude(ManagedViewMixin);

    return ManagedView;

  })(Backbone.View);

  Backbone.rm = {};

  Backbone.rm.ResourceManager = ResourceManager.getInstance();

  Backbone.rm.ManagedModelMixin = ManagedModelMixin;

  Backbone.rm.ManagedCollectionMixin = ManagedCollectionMixin;

  Backbone.rm.ManagedViewMixin = ManagedViewMixin;

  Backbone.rm.ManagedModel = ManagedModel;

  Backbone.rm.ManagedCollection = ManagedCollection;

  Backbone.rm.ManagedView = ManagedView;

}).call(this);
