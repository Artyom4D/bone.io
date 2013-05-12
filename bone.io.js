var bone, _ref;

bone = {};

if ((typeof module !== "undefined" && module !== null ? module.exports : void 0) != null) {
  module.exports = bone;
} else {
  window.bone = bone;
}

bone.$ = window.$;

bone.$(function() {
  return bone.history = new bone.History();
});

if (((_ref = window.console) != null ? _ref.log : void 0) != null) {
  bone.log = function() {
    return console.log.apply(console, arguments);
  };
}

var only_once, _each;

bone.async = {};

_each = function(arr, iterator) {
  var i, _results;

  if (arr.forEach) {
    return arr.forEach(iterator);
  }
  i = 0;
  _results = [];
  while (i < arr.length) {
    iterator(arr[i], i, arr);
    _results.push(i += 1);
  }
  return _results;
};

only_once = function(fn) {
  var called;

  called = false;
  return function() {
    if (called) {
      throw new Error("Callback was already called.");
    }
    called = true;
    return fn.apply(root, arguments_);
  };
};

bone.async.each = function(arr, iterator, callback) {
  var completed;

  callback = callback || function() {};
  if (!arr.length) {
    return callback();
  }
  completed = 0;
  return _each(arr, function(x) {
    return iterator(x, only_once(function(err) {
      if (err) {
        callback(err);
        return callback = function() {};
      } else {
        completed += 1;
        if (completed >= arr.length) {
          return callback(null);
        }
      }
    }));
  });
};

var extend, isExplorer, rootStripper, routeStripper, trailingSlash;

extend = function(obj, source) {
  var prop;

  for (prop in source) {
    obj[prop] = source[prop];
  }
  return obj;
};

routeStripper = /^[#\/]|\s+$/g;

rootStripper = /^\/+|\/+$/g;

isExplorer = /msie [\w.]+/;

trailingSlash = /\/$/;

bone.History = (function() {
  function History() {
    if (typeof window !== "undefined") {
      this.location = window.location;
      this.history = window.history;
    }
  }

  History.prototype.interval = 50;

  History.prototype.getHash = function(window) {
    var match;

    match = (window || this).location.href.match(/#(.*)$/);
    if (match) {
      return match[1];
    } else {
      return "";
    }
  };

  History.prototype.getFragment = function(fragment, forcePushState) {
    var root;

    if (fragment == null) {
      if (this._hasPushState || !this._wantsHashChange || forcePushState) {
        fragment = this.location.pathname;
        root = this.root.replace(trailingSlash, "");
        if (!fragment.indexOf(root)) {
          fragment = fragment.substr(root.length);
        }
      } else {
        fragment = this.getHash();
      }
    }
    return fragment.replace(routeStripper, "");
  };

  History.prototype.start = function(options) {
    var atRoot, docMode, fragment, loc, oldIE,
      _this = this;

    this.options = extend({}, {
      root: "/"
    }, this.options, options);
    this.root = this.options.root;
    this._wantsHashChange = this.options.hashChange !== false;
    this._wantsPushState = !!this.options.pushState;
    this._hasPushState = !!(this.options.pushState && this.history && this.history.pushState);
    fragment = this.getFragment();
    docMode = document.documentMode;
    oldIE = isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7);
    this.root = ("/" + this.root + "/").replace(rootStripper, "/");
    if (oldIE && this._wantsHashChange) {
      this.iframe = bone.$("<iframe src=\"javascript:0\" tabindex=\"-1\" />").hide().appendTo("body")[0].contentWindow;
      this.navigate(fragment);
    }
    if (this._hasPushState) {
      bone.$(window).on("popstate", function() {
        return _this.checkUrl.apply(_this, arguments);
      });
    } else if (this._wantsHashChange && ("onhashchange" in window) && !oldIE) {
      bone.$(window).on("hashchange", function() {
        return _this.checkUrl.apply(_this, arguments);
      });
    } else {
      if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }
    }
    this.fragment = fragment;
    loc = this.location;
    atRoot = loc.pathname.replace(/[^\/]$/, "$&/") === this.root;
    if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
      this.fragment = this.getFragment(null, true);
      this.location.replace(this.root + this.location.search + "#" + this.fragment);
      return true;
    } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
      this.fragment = this.getHash().replace(routeStripper, "");
      this.history.replaceState({}, document.title, this.root + this.fragment + loc.search);
    }
    if (!this.options.silent) {
      return this.loadUrl();
    }
  };

  History.prototype.route = function(route, callback) {
    return this.handlers.unshift({
      route: route,
      callback: callback
    });
  };

  History.prototype.checkUrl = function(e) {
    var current;

    current = this.getFragment();
    if (current === this.fragment && this.iframe) {
      current = this.getFragment(this.getHash(this.iframe));
    }
    if (current === this.fragment) {
      return false;
    }
    if (this.iframe) {
      this.navigate(current);
    }
    return this.loadUrl() || this.loadUrl(this.getHash());
  };

  History.prototype.handlers = [];

  History.prototype.loadUrl = function(fragmentOverride) {
    var args, fragment, handler, _i, _len, _ref, _results;

    fragment = this.fragment = this.getFragment(fragmentOverride);
    _ref = this.handlers;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      handler = _ref[_i];
      if (handler.route.test(fragment)) {
        args = handler.route.exec(fragment).slice(1);
        if (bone.log) {
          console.log("Route: [" + handler.route + ":" + fragment + "]", args);
        }
        handler.callback.apply(handler.router, args);
        continue;
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  History.prototype.navigate = function(fragment, options) {
    var url;

    if (!options || options === true) {
      options = {
        trigger: options
      };
    }
    fragment = this.getFragment(fragment || "");
    if (this.fragment === fragment) {
      return;
    }
    this.fragment = fragment;
    url = this.root + fragment;
    if (this._hasPushState) {
      this.history[(options.replace ? "replaceState" : "pushState")]({}, document.title, url);
    } else if (this._wantsHashChange) {
      this._updateHash(this.location, fragment, options.replace);
      if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
        if (!options.replace) {
          this.iframe.document.open().close();
        }
        this._updateHash(this.iframe.location, fragment, options.replace);
      }
    } else {
      return this.location.assign(url);
    }
    if (options.trigger) {
      return this.loadUrl(fragment);
    }
  };

  History.prototype._updateHash = function(location, fragment, replace) {
    var href;

    if (replace) {
      href = location.href.replace(/(javascript:|#).*$/, "");
      return location.replace(href + "#" + fragment);
    } else {
      return location.hash = "#" + fragment;
    }
  };

  return History;

})();

var initView;

initView = function(root, view, options) {
  var $root, action, boneView, name, _fn;

  $root = $(root);
  boneView = {};
  boneView.data = function() {
    return $root.data.apply($root, arguments);
  };
  boneView.$ = function() {
    return $root.find.apply($root, arguments);
  };
  boneView.el = root;
  boneView.$el = $(root);
  _fn = function(name, action) {
    return boneView[name] = function(data) {
      var message;

      if (bone.log != null) {
        message = "View: [" + options.selector + ":" + name + "]";
        bone.log(message, boneView.el, data);
      }
      return action.call(boneView, data);
    };
  };
  for (name in options) {
    action = options[name];
    if (name === 'events') {
      continue;
    }
    if (Object.prototype.toString.call(action) !== '[object Function]') {
      boneView[name] = action;
      continue;
    }
    _fn(name, action);
  }
  return boneView;
};

bone.view = function(selector, options) {
  var action, eventSelector, events, functionName, name, view, _fn, _fn1;

  view = {};
  events = options.events;
  _fn = function(eventSelector, functionName) {
    var action, eventName, eventSplitter, fullSelector, match, subSelector;

    eventSplitter = /^(\S+)\s*(.*)$/;
    match = eventSelector.match(eventSplitter);
    eventName = match[1];
    subSelector = match[2];
    fullSelector = selector;
    if (subSelector != null) {
      fullSelector += " " + subSelector;
    }
    action = options[functionName];
    return $(function() {
      return $('body').on(eventName, fullSelector, function(event) {
        var boneView, message, root;

        root = $(event.currentTarget).parents(selector)[0];
        if (bone.log != null) {
          message = "Interface: [" + fullSelector + ":" + eventName + "]";
          bone.log(message, root);
        }
        boneView = $(root).data('bone-view');
        if (boneView == null) {
          boneView = initView(root, view, options);
          $(root).data('bone-view', boneView);
        }
        if ($.trim(selector) !== $.trim(fullSelector)) {
          root = $(fullSelector).parents(selector)[0];
        }
        return action.call(boneView, root, event);
      });
    });
  };
  for (eventSelector in events) {
    functionName = events[eventSelector];
    if (functionName === 'events') {
      continue;
    }
    _fn(eventSelector, functionName);
  }
  _fn1 = function(name, action) {
    return view[name] = function(data) {
      var element, _i, _len, _ref, _results;

      _ref = $(selector);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        element = _ref[_i];
        _results.push((function(element) {
          var boneView, message;

          boneView = $(element).data('bone-view');
          if (boneView == null) {
            boneView = initView(element, view, options);
            $(element).data('bone-view');
          }
          if (bone.log != null) {
            message = "View: [" + selector + ":" + name + "]";
            bone.log(message, element, data);
          }
          return action.call(boneView, data);
        })(element));
      }
      return _results;
    };
  };
  for (name in options) {
    action = options[name];
    if (name === 'events') {
      continue;
    }
    if (Object.prototype.toString.call(action) !== '[object Function]') {
      view[name] = action;
      continue;
    }
    _fn1(name, action);
  }
  return view;
};

var adapters;

bone.io = function(source, options) {
  return adapters[options.adapter](source, options);
};

adapters = bone.io.adapters = {};

adapters['socket.io'] = function(source, options) {
  var io, name, route, _base, _base1, _fn, _fn1, _i, _len, _ref, _ref1, _ref2, _ref3;

  io = {};
  io.error = options.error;
  io.source = source;
  io.options = options;
  io.socket = options.options.socket;
  io.inbound = options.inbound;
  io.outbound = options.outbound;
  if ((_ref = (_base = io.inbound).middleware) == null) {
    _base.middleware = [];
  }
  if ((_ref1 = (_base1 = io.outbound).middleware) == null) {
    _base1.middleware = [];
  }
  _ref2 = io.outbound;
  _fn = function(route) {
    return io[route] = function(data, context) {
      if (bone.log != null) {
        bone.log("Outbound: [" + source + ":" + route + "]", data);
      }
      return io.socket.emit("" + source + ":" + route, data);
    };
  };
  for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
    route = _ref2[_i];
    _fn(route);
  }
  _ref3 = io.inbound;
  _fn1 = function(name, route) {
    return io.socket.on("" + source + ":" + name, function(data) {
      var context;

      if (bone.log != null) {
        bone.log("Inbound: [" + source + ":" + name + "]", data);
      }
      context = {};
      return bone.async.each(io.inbound.middleware, function(callback, next) {
        return callback(data, context, next);
      }, function(error) {
        if ((error != null) && (io.error != null)) {
          return io.error(error);
        }
        return route.apply(io, [data, context]);
      });
    });
  };
  for (name in _ref3) {
    route = _ref3[name];
    if (name === 'middleware') {
      continue;
    }
    _fn1(name, route);
  }
  return io;
};

var routeToRegex;

routeToRegex = function(route) {
  var escapeRegExp, namedParam, optionalParam, splatParam;

  optionalParam = /\((.*?)\)/g;
  namedParam = /(\(\?)?:\w+/g;
  splatParam = /\*\w+/g;
  escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;
  route = route.replace(escapeRegExp, "\\$&").replace(optionalParam, "(?:$1)?").replace(namedParam, function(match, optional) {
    if (optional) {
      return match;
    } else {
      return "([^/]+)";
    }
  }).replace(splatParam, "(.*?)");
  return new RegExp("^" + route + "$");
};

bone.router = function(options) {
  return $(function() {
    var action, route, _ref;

    _ref = options.routes;
    for (route in _ref) {
      action = _ref[route];
      if (route === 'routes') {
        continue;
      }
      route = routeToRegex(route);
      bone.history.handlers.push({
        route: route,
        callback: options[action],
        router: options
      });
    }
    return options.initialize();
  });
};

var $;

$ = bone.$;

bone.mount = function(selector, templateName, data, options) {
  var $current, template, templateString;

  $current = $(selector);
  template = bone.templates[templateName];
  templateString = template(data);
  if ($current.children().length !== 0) {
    if (options.refresh) {
      return;
    }
    $current.children().remove();
  }
  return $current.html(templateString);
};
