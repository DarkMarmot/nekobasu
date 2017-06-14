(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Catbus = factory());
}(this, (function () { 'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};











var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();



























var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();











var toArray = function (arr) {
  return Array.isArray(arr) ? arr : Array.from(arr);
};

var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

var Packet = function () {
    function Packet(msg, topic, source) {
        classCallCheck(this, Packet);

        this._msg = msg;
        this._topic = topic;
        this._source = source;
        this._timestamp = Date.now();
    }

    createClass(Packet, [{
        key: "msg",
        get: function get$$1() {
            return this._msg;
        }
    }, {
        key: "topic",
        get: function get$$1() {
            return this._topic;
        }
    }, {
        key: "source",
        get: function get$$1() {
            return this._source;
        }
    }, {
        key: "timestamp",
        get: function get$$1() {
            return this._timestamp;
        }
    }]);
    return Packet;
}();

var DATA_TYPES = {

    ACTION: 'action',
    MIRROR: 'mirror',
    STATE: 'state',
    COMPUTED: 'computed',
    NONE: 'none',
    ANY: 'any'

};

var reverseLookup = {};

for (var p in DATA_TYPES) {
    var v = DATA_TYPES[p];
    reverseLookup[v] = p;
}

function isValid(type) {
    return reverseLookup.hasOwnProperty(type);
}

function ALWAYS_TRUE() {
    return true;
}

function ALWAYS_FALSE() {
    return false;
}

function TO_SOURCE(msg, source) {
    return source;
}

function TO_TOPIC(msg, source, topic) {
    return topic;
}

function TO_MSG(msg) {
    return msg;
}

function NOOP() {}

function FUNCTOR(val) {
    return typeof val === 'function' ? val : function () {
        return val;
    };
}

var Func = {

    ASSERT_NEED_ONE_ARGUMENT: function ASSERT_NEED_ONE_ARGUMENT(args) {
        if (args.length < 1) throw new Error('Method requires at least one argument.');
    },

    ASSERT_IS_FUNCTION: function ASSERT_IS_FUNCTION(func) {
        if (typeof func !== 'function') throw new Error('Argument [func] is not of type function.');
    },

    getAlwaysTrue: function getAlwaysTrue() {
        return function () {
            return true;
        };
    },

    getBatchTimer: function getBatchTimer(pool) {

        Catbus$1.enqueue(pool);
    },

    getSyncTimer: function getSyncTimer() {
        return function (pool) {
            pool.release(pool);
        };
    },

    getDeferTimer: function getDeferTimer() {
        return function (pool) {
            setTimeout(pool.release, 0, pool);
        };
    },

    getThrottleTimer: function getThrottleTimer(fNum) {

        var pool = this;
        fNum = FUNCTOR(fNum);
        var wasEmpty = false;
        var timeoutId = null;
        var msgDuringTimer = false;
        var auto = pool.keep.auto;

        function timedRelease(fromTimeout) {

            if (pool.stream.dead) return;

            var nowEmpty = pool.keep.isEmpty;

            if (!fromTimeout) {
                if (!timeoutId) {
                    pool.release(pool);
                    wasEmpty = false;
                    timeoutId = setTimeout(timedRelease, fNum.call(pool), true);
                } else {
                    msgDuringTimer = true;
                }
                return;
            }

            if (nowEmpty) {
                if (wasEmpty) {
                    // throttle becomes inactive
                } else {
                    // try one more time period to maintain throttle
                    wasEmpty = true;
                    msgDuringTimer = false;
                    timeoutId = setTimeout(timedRelease, fNum.call(pool), true);
                }
            } else {
                pool.release(pool);
                wasEmpty = false;
                timeoutId = setTimeout(timedRelease, fNum.call(pool), true);
            }
        }

        return timedRelease;
    },

    getQueue: function getQueue(n) {

        n = n || Infinity;

        var buffer = [];

        var f = function f(msg, source) {
            if (buffer.length < n) buffer.push(msg);
            return buffer;
        };

        f.isBuffer = ALWAYS_TRUE;

        f.next = function () {
            return buffer.shift();
        };

        f.isEmpty = function () {
            return buffer.length === 0;
        };

        f.content = function () {
            return buffer;
        };

        return f;
    },

    getScan: function getScan(func, seed) {

        var hasSeed = arguments.length === 2;
        var acc = void 0;
        var initMsg = true;

        var f = function f(msg, source) {

            if (initMsg) {
                initMsg = false;
                if (hasSeed) {
                    acc = func(seed, msg, source);
                } else {
                    acc = msg;
                }
            } else {
                acc = func(acc, msg, source);
            }

            return acc;
        };

        f.reset = NOOP;

        f.next = f.content = function () {
            return acc;
        };

        return f;
    },

    // getScan: function(func, seed){
    //
    //     let acc = seed;
    //
    //     const f = function(msg, source){
    //
    //         return acc = func(acc, msg, source);
    //     };
    //
    //     f.reset = NOOP;
    //
    //     f.next = f.content = function(){
    //         return acc;
    //     };
    //
    //
    //     return f;
    // },

    getGroup: function getGroup(groupBy) {

        groupBy = groupBy || TO_SOURCE;
        var hash = {};

        var f = function f(msg, source) {

            var g = groupBy(msg, source);
            if (g) {
                hash[g] = msg;
            } else {
                // no source, copy message props into hash to merge nameless streams of key data
                for (var k in msg) {
                    hash[k] = msg[k];
                }
            }

            return hash;
        };

        f.reset = function () {
            for (var k in hash) {
                delete hash[k];
            }
            f.isEmpty = true;
        };

        f.next = f.content = function () {
            return hash;
        };

        return f;
    },

    getHash: function getHash(groupBy) {

        groupBy = groupBy || TO_SOURCE;
        var hash = {};

        var f = function f(msg, source) {

            var g = groupBy(msg, source);
            hash[g] = msg;
            return hash;
        };

        f.reset = function () {
            for (var k in hash) {
                delete hash[k];
            }
            f.isEmpty = true;
        };

        f.next = f.content = function () {
            return hash;
        };

        return f;
    },

    getKeepLast: function getKeepLast(n) {

        if (!n || n < 0) {

            var last = void 0;

            var _f = function _f(msg, source) {
                return last = msg;
            };

            _f.reset = function () {
                _f.isEmpty = true;
            };

            _f.next = _f.content = function () {
                return last;
            };

            return _f;
        }

        var buffer = [];

        var f = function f(msg, source) {
            buffer.push(msg);
            if (buffer.length > n) buffer.shift();
            return buffer;
        };

        f.reset = function () {
            while (buffer.length) {
                buffer.shift();
            }
            f.isEmpty = true;
        };

        f.next = f.content = function () {
            return buffer;
        };

        return f;
    },

    getKeepFirst: function getKeepFirst(n) {

        if (!n || n < 0) {

            var firstMsg = void 0;
            var hasFirst = false;
            var _f2 = function _f2(msg, source) {
                return hasFirst ? firstMsg : firstMsg = msg;
            };

            _f2.reset = function () {
                firstMsg = false;
                _f2.isEmpty = true;
            };

            _f2.next = _f2.content = function () {
                return firstMsg;
            };

            return _f2;
        }

        var buffer = [];

        var f = function f(msg, source) {

            if (buffer.length < n) buffer.push(msg);
            return buffer;
        };

        f.reset = function () {
            while (buffer.length) {
                buffer.shift();
            }
            f.isEmpty = true;
        };

        f.next = f.content = function () {
            return buffer;
        };

        return f;
    },

    getKeepAll: function getKeepAll() {

        var buffer = [];

        var f = function f(msg, source) {
            buffer.push(msg);
            return buffer;
        };

        f.reset = function () {
            while (buffer.length) {
                buffer.shift();
            }
            f.isEmpty = true;
        };

        f.next = f.content = function () {
            return buffer;
        };

        return f;
    },

    getWhenCount: function getWhenCount(n) {

        var latched = false;

        var f = function f(messages) {
            latched = latched || messages.length >= n;
            return latched;
        };

        f.reset = function () {
            latched = false;
        };

        return f;
    },

    getWhenKeys: function getWhenKeys(keys) {

        var keyHash = {};
        var len = keys.length;

        for (var i = 0; i < len; i++) {
            var k = keys[i];
            keyHash[k] = true;
        }

        var latched = false;

        var f = function f(messagesByKey) {

            if (latched) return true;

            for (var _i = 0; _i < len; _i++) {
                var _k = keys[_i];
                if (!messagesByKey.hasOwnProperty(_k)) return false;
            }

            return latched = true;
        };

        f.reset = function () {
            latched = false;
            for (var _k2 in keyHash) {
                delete keyHash[_k2];
            }
        };

        return f;
    },

    getHasKeys: function getHasKeys(keys, noLatch) {

        var latched = false;
        var len = keys.length;

        return function (msg) {

            if (latched || !len) return true;

            for (var i = 0; i < len; i++) {

                var k = keys[i];
                if (!msg.hasOwnProperty(k)) return false;
            }

            if (!noLatch) latched = true;

            return true;
        };
    },

    getSkipDupes: function getSkipDupes() {

        var hadMsg = false;
        var lastMsg = void 0;

        return function (msg) {

            var diff = !hadMsg || msg !== lastMsg;
            lastMsg = msg;
            hadMsg = true;
            return diff;
        };
    },

    ASSERT_NOT_HOLDING: function ASSERT_NOT_HOLDING(bus) {
        if (bus.holding) throw new Error('Method cannot be invoked while holding messages in the frame.');
    },

    ASSERT_IS_HOLDING: function ASSERT_IS_HOLDING(bus) {
        if (!bus.holding) throw new Error('Method cannot be invoked unless holding messages in the frame.');
    }

};

Func.TO_SOURCE = TO_SOURCE;
Func.TO_TOPIC = TO_TOPIC;
Func.To_MSG = TO_MSG;
Func.FUNCTOR = FUNCTOR;
Func.ALWAYS_TRUE = ALWAYS_TRUE;
Func.ALWAYS_FALSE = ALWAYS_FALSE;
Func.NOOP = NOOP;

function callMany(list, msg, source, topic) {

    var len = list.length;
    for (var i = 0; i < len; i++) {
        var s = list[i];
        s.call(s, msg, source, topic);
    }
}

function callNoOne(list, msg, source, topic) {}

function callOne(list, msg, source, topic) {
    var s = list[0];
    s.call(s, msg, source, topic);
}

var SubscriberList = function () {
    function SubscriberList(topic, data) {
        classCallCheck(this, SubscriberList);


        this._topic = topic;
        this._subscribers = [];
        this._callback = callNoOne;
        this._used = false; // true after first msg
        this._lastMsg = null;
        this._lastTopic = null;
        this._data = data;
        this._name = data._name;
        this._dead = false;

        if (data.type === DATA_TYPES.ACTION) {
            this.handle = this.handleAction;
        }
    }

    createClass(SubscriberList, [{
        key: 'handle',
        value: function handle(msg, topic, silently) {

            // if(this.dead)
            //     return;

            this._used = true;
            topic = topic || this.topic;
            var source = this.name;

            this._lastMsg = msg;
            this._lastTopic = topic;

            //let subscribers = [].concat(this._subscribers); // call original sensors in case subscriptions change mid loop

            if (!silently) {
                this._callback(this._subscribers, msg, source, topic);
            }
        }
    }, {
        key: 'handleAction',
        value: function handleAction(msg, topic) {

            topic = topic || this.topic;
            var source = this.name;

            //let subscribers = [].concat(this._subscribers); // call original sensors in case subscriptions change mid loop
            this._callback(this._subscribers, msg, source, topic);
        }
    }, {
        key: 'destroy',
        value: function destroy() {

            // if(this.dead)
            //     return;

            this._subscribers = null;
            this._lastMsg = null;
            this._dead = true;
        }
    }, {
        key: 'add',
        value: function add(watcher) {

            var s = typeof watcher === 'function' ? watcher : function (msg, source, topic) {
                watcher.handle(msg, source, topic);
            };
            this._subscribers.push(s);
            this.determineCaller();
            return this;
        }
    }, {
        key: 'remove',
        value: function remove(watcher) {

            var i = this._subscribers.indexOf(watcher);

            if (i !== -1) this._subscribers.splice(i, 1);

            this.determineCaller();

            return this;
        }
    }, {
        key: 'determineCaller',
        value: function determineCaller() {
            var len = this._subscribers.length;
            if (len === 0) {
                this._callback = callNoOne;
            } else if (len == 1) {
                this._callback = callOne;
            } else {
                this._callback = callMany;
            }
        }
    }, {
        key: 'used',
        get: function get$$1() {
            return this._used;
        }
    }, {
        key: 'lastMsg',
        get: function get$$1() {
            return this._lastMsg;
        }
    }, {
        key: 'lastTopic',
        get: function get$$1() {
            return this._lastTopic;
        }
    }, {
        key: 'data',
        get: function get$$1() {
            return this._data;
        }
    }, {
        key: 'name',
        get: function get$$1() {
            return this._name;
        }
    }, {
        key: 'dead',
        get: function get$$1() {
            return this._dead;
        }
    }, {
        key: 'topic',
        get: function get$$1() {
            return this._topic;
        }
    }]);
    return SubscriberList;
}();

var Data = function () {
    function Data(scope, name, type) {
        classCallCheck(this, Data);


        type = type || DATA_TYPES.NONE;

        if (!isValid(type)) throw new Error('Invalid Data of type: ' + type);

        this._scope = scope;
        this._name = name;
        this._type = type;
        this._dead = false;

        this._noTopicList = new SubscriberList(null, this);
        this._wildcardSubscriberList = new SubscriberList(null, this);
        this._subscriberListsByTopic = {};
    }

    createClass(Data, [{
        key: 'destroy',
        value: function destroy() {

            // if(this.dead)
            //     this._throwDead();

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = this._subscriberListsByTopic.values()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var list = _step.value;

                    list.destroy();
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            this._dead = true;
        }
    }, {
        key: '_demandSubscriberList',
        value: function _demandSubscriberList(topic) {

            topic = topic || null;
            var list = topic ? this._subscriberListsByTopic[topic] : this._noTopicList;

            if (list) return list;

            list = new SubscriberList(topic, this);
            this._subscriberListsByTopic[topic] = list;

            return list;
        }
    }, {
        key: 'verify',
        value: function verify(expectedType) {

            if (this.type === expectedType) return this;

            throw new Error('Data ' + this.name + ' requested as type ' + expectedType + ' exists as ' + this.type);
        }
    }, {
        key: 'follow',
        value: function follow(watcher, topic) {

            // if(this.dead)
            //     this._throwDead();

            var list = this.subscribe(watcher, topic);

            if (list.used) typeof watcher === 'function' ? watcher.call(watcher, list.lastMsg, list.source, list.lastTopic) : watcher.handle(list.lastMsg, list.source, list.lastTopic);

            return this;
        }
    }, {
        key: 'subscribe',
        value: function subscribe(watcher, topic) {

            // if(this.dead)
            //     this._throwDead();

            return this._demandSubscriberList(topic).add(watcher);
        }
    }, {
        key: 'monitor',
        value: function monitor(watcher) {

            // if(this.dead)
            //     this._throwDead();

            this._wildcardSubscriberList.add(watcher);

            return this;
        }
    }, {
        key: 'unsubscribe',
        value: function unsubscribe(watcher, topic) {

            // if(this.dead)
            //     this._throwDead();

            topic = topic || null;
            this._demandSubscriberList(topic).remove(watcher);
            this._wildcardSubscriberList.remove(watcher);

            return this;
        }
    }, {
        key: 'survey',


        // topics(){
        //
        //     return this._subscriberListsByTopic.keys();
        //
        // };

        value: function survey() {
            // get entire key/value store by topic:lastPacket
            throw new Error('not imp');

            // const entries = this._subscriberListsByTopic.entries();
            // const m = new Map();
            // for (const [key, value] of entries) {
            //     m.set(key, value.lastPacket);
            // }
            //
            // return m;
        }
    }, {
        key: 'present',
        value: function present(topic) {

            // if(this.dead)
            //     this._throwDead();

            var subscriberList = this._demandSubscriberList(topic);
            return subscriberList.used;
        }
    }, {
        key: 'read',
        value: function read(topic) {

            // if(this.dead)
            //     this._throwDead();

            var list = this._demandSubscriberList(topic);
            return list.used ? list.lastMsg : undefined;
        }
    }, {
        key: 'silentWrite',
        value: function silentWrite(msg, topic) {

            // if(this.dead)
            //     this._throwDead();

            this.write(msg, topic, true);
        }
    }, {
        key: 'write',
        value: function write(msg, topic, silently) {

            // todo change methods to imply if statements for perf?

            // if(this.dead)
            //     this._throwDead();

            if (this.type === DATA_TYPES.MIRROR) throw new Error('Mirror Data: ' + this.name + ' is read-only');

            var list = this._demandSubscriberList(topic);
            list.handle(msg, topic, silently);
            this._wildcardSubscriberList.handle(msg, topic, silently);
        }
    }, {
        key: 'refresh',
        value: function refresh(topic) {

            // if(this.dead)
            //     this._throwDead();

            var list = this._demandSubscriberList(topic);

            if (list.used) this.write(list.lastMsg, list.lastTopic);

            return this;
        }
    }, {
        key: 'toggle',
        value: function toggle(topic) {

            // if(this.dead)
            //     this._throwDead();

            this.write(!this.read(topic), topic);

            return this;
        }
    }, {
        key: '_throwDead',
        value: function _throwDead() {

            throw new Error('Data: ' + this.name + ' is already dead.');
        }
    }, {
        key: 'scope',
        get: function get$$1() {
            return this._scope;
        }
    }, {
        key: 'name',
        get: function get$$1() {
            return this._name;
        }
    }, {
        key: 'type',
        get: function get$$1() {
            return this._type;
        }
    }, {
        key: 'dead',
        get: function get$$1() {
            return this._dead;
        }
    }]);
    return Data;
}();

function pass(frame, wire, msg, source, topic) {

    frame.emit(wire, msg, source, topic);
}

var Wave = function () {
    function Wave(def) {
        classCallCheck(this, Wave);


        this.process = def && def.process ? this[def.process] : pass;
        this.action = def ? def.stateful ? def.action.apply(def, toConsumableArray(def.args)) : def.action : null;
    }

    createClass(Wave, [{
        key: "handle",
        value: function handle(frame, wire, msg, source, topic) {
            this.process(frame, wire, msg, source, topic);
        }
    }, {
        key: "run",
        value: function run(frame, wire, msg, source, topic) {

            this.action(msg, source, topic);
            frame.emit(wire, msg, source, topic);
        }
    }, {
        key: "msg",
        value: function msg(frame, wire, _msg, source, topic) {

            _msg = this.action(_msg, source, topic);
            frame.emit(wire, _msg, source, topic);
        }
    }, {
        key: "source",
        value: function source(frame, wire, msg, _source, topic) {

            _source = this.action(msg, _source, topic);
            frame.emit(wire, msg, _source, topic);
        }
    }, {
        key: "filter",
        value: function filter(frame, wire, msg, source, topic) {

            if (!this.action(msg, source, topic)) return;
            frame.emit(wire, msg, source, topic);
        }
    }, {
        key: "split",
        value: function split(frame, wire, msg, source, topic) {

            var len = msg.length || 0;
            for (var i = 0; i < len; i++) {
                var chunk = msg[i];
                frame.emit(wire, chunk, source, topic);
            }
        }
    }, {
        key: "delay",
        value: function delay(frame, wire, msg, source, topic) {

            function callback() {
                frame.emit(wire, msg, source, topic);
            }

            setTimeout(callback, this.action(msg, source, topic) || 0, msg, source, topic);
        }
    }]);
    return Wave;
}();

var Pool = function () {
    function Pool(frame, wire, def) {
        classCallCheck(this, Pool);


        this.frame = frame;
        this.wire = wire;

        function fromDef(name) {

            if (!def[name]) return null;

            var _def$name = toArray(def[name]),
                factory = _def$name[0],
                stateful = _def$name[1],
                args = _def$name.slice(2);

            return stateful ? factory.call.apply(factory, [this].concat(toConsumableArray(args))) : factory;
        }

        this.keep = fromDef('keep') || Func.getKeepLast();
        this.when = fromDef('when') || Func.ALWAYS_TRUE;
        this.until = fromDef('until') || Func.ALWAYS_TRUE;
        this.timer = fromDef('timer'); // throttle, debounce, defer, batch, sync
        this.clear = fromDef('clear') || Func.ALWAYS_FALSE;

        this.isPrimed = false;
    }

    createClass(Pool, [{
        key: 'handle',
        value: function handle(frame, wire, msg, source, topic) {

            this.keep(msg, source, topic);
            if (!this.isPrimed) {
                var content = this.keep.content();
                if (this.when(content)) {
                    this.isPrimed = true;
                    this.timer(this);
                }
            }
        }
    }, {
        key: 'build',
        value: function build(prop, factory) {
            for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
                args[_key - 2] = arguments[_key];
            }

            this[prop] = factory.call.apply(factory, [this].concat(args));
        }
    }, {
        key: 'release',
        value: function release(pool) {

            pool = pool || this;
            var hasContent = !pool.keep.isEmpty;
            var msg = hasContent && pool.keep.next();

            if (pool.clear()) {
                pool.keep.reset();
                pool.when.reset();
            }

            pool.isPrimed = false;

            if (hasContent) pool.frame.emit(pool.wire, msg, pool.wire.name);
        }
    }]);
    return Pool;
}();

var Tap = function () {
    function Tap(def, frame) {
        classCallCheck(this, Tap);


        this.action = def.action;
        this.value = null;
        this.stateful = false;
        this.frame = frame;
    }

    createClass(Tap, [{
        key: "handle",
        value: function handle(frame, wire, msg, source, topic) {

            this.action(msg, source, topic);
            frame.emit(wire, msg, source, topic);
        }
    }]);
    return Tap;
}();

var Msg = function () {
    function Msg(def) {
        classCallCheck(this, Msg);


        this.action = def.action;
        this.value = null;
        this.stateful = false;
    }

    createClass(Msg, [{
        key: "handle",
        value: function handle(frame, wire, msg, source, topic) {

            var nextMsg = this.action(msg, source, topic);
            frame.emit(wire, nextMsg, source, topic);
        }
    }]);
    return Msg;
}();

var Source = function () {
    function Source(def) {
        classCallCheck(this, Source);


        this.action = def.action;
        this.value = null;
        this.stateful = false;
    }

    createClass(Source, [{
        key: "handle",
        value: function handle(frame, wire, msg, source, topic) {

            var nextSource = this.action(msg, source, topic);
            frame.emit(wire, msg, nextSource, topic);
        }
    }]);
    return Source;
}();

var Filter = function () {
    function Filter(def) {
        classCallCheck(this, Filter);


        this.action = def.action;
        this.value = null;
        this.stateful = false;
    }

    createClass(Filter, [{
        key: "handle",
        value: function handle(frame, wire, msg, source, topic) {

            var f = this.action;
            f(msg, source, topic) && frame.emit(wire, msg, source, topic);
        }
    }]);
    return Filter;
}();

function callback(frame, wire, msg, source, topic) {

    frame.emit(wire, msg, source, topic);
}

var Delay = function () {
    function Delay(def) {
        classCallCheck(this, Delay);


        this.action = def.action;
        this.value = null;
    }

    createClass(Delay, [{
        key: "handle",
        value: function handle(frame, wire, msg, source, topic) {

            setTimeout(callback, this.action(msg, source, topic) || 0, frame, wire, msg, source, topic);
        }
    }]);
    return Delay;
}();

function Scan(def) {

    this.action = def.action;
    this.value = 0;
    this.stateful = true;
}

Scan.prototype.handle = function (frame, wire, msg, source, topic) {

    this.value = this.action(this.value, msg, source, topic);
    frame.emit(wire, this.value, source, topic);
};



// export default Scan;
//
//
// class Scan {
//
//     constructor(def){
//
//         this.action = def.action;
//         this.value = 0;
//         this.stateful = true;
//
//     }
//
//     handle(frame, wire, msg, source, topic){
//
//         const v = this.value = this.action.call(null, this.value, msg);
//         frame.emit(wire, v, source, topic);
//
//     }
//
// }

// export default Scan;


//
// class Scan {
//
//     constructor(func){
//
//         this.hadFirstMsg = false;
//         this.func = func;
//         this.value = null;
//
//     }
//
//     handle(msg, source, topic){
//
//         if(!this.hadFirstMsg){
//             this.hadFirstMsg = true;
//             this.value = msg;
//             return;
//         }
//
//         this.value = this.func(this.value, msg, source, topic);
//
//     }
//
//     next(){
//         return this.value;
//     }
//
//     content(){
//         return this.value;
//     }
//
//     reset(){
//
//     }
// }
//
//
// export default Scan;

var SkipDupes = function () {
    function SkipDupes() {
        classCallCheck(this, SkipDupes);


        this.value = null;
        this.hadValue = false;
    }

    createClass(SkipDupes, [{
        key: "handle",
        value: function handle(frame, wire, msg, source, topic) {

            if (!this.hadValue || this.value !== msg) {
                frame.emit(wire, msg, source, topic);
                this.hadValue = true;
                this.value = msg;
            }
        }
    }]);
    return SkipDupes;
}();

var LastN = function () {
    function LastN(n) {
        classCallCheck(this, LastN);


        this.value = [];
        this.max = n;
    }

    createClass(LastN, [{
        key: "handle",
        value: function handle(frame, wire, msg, source, topic) {

            var list = this.value;
            list.push(msg);
            if (list.length > this.max) list.shift();

            frame.emit(wire, list, source, topic);
        }
    }, {
        key: "reset",
        value: function reset() {
            this.value = [];
        }
    }, {
        key: "next",
        value: function next() {
            return this.value;
        }
    }, {
        key: "content",
        value: function content() {
            return this.value;
        }
    }]);
    return LastN;
}();

var FirstN = function () {
    function FirstN(n) {
        classCallCheck(this, FirstN);


        this.value = [];
        this.max = n;
    }

    createClass(FirstN, [{
        key: "handle",
        value: function handle(frame, wire, msg, source, topic) {

            var list = this.value;
            if (list.length < this.max) list.push(msg);

            frame.emit(wire, list, source, topic);
        }
    }, {
        key: "reset",
        value: function reset() {
            this.value = [];
        }
    }, {
        key: "next",
        value: function next() {
            return this.value;
        }
    }, {
        key: "content",
        value: function content() {
            return this.value;
        }
    }]);
    return FirstN;
}();

var All = function () {
    function All() {
        classCallCheck(this, All);


        this.value = [];
        this.hasValue = false;
    }

    createClass(All, [{
        key: "handle",
        value: function handle(frame, wire, msg, source, topic) {

            var list = this.value;
            list.push(msg);
            frame.emit(wire, list, source, topic);
        }
    }, {
        key: "reset",
        value: function reset() {
            this.value = [];
        }
    }, {
        key: "next",
        value: function next() {
            return this.value;
        }
    }, {
        key: "content",
        value: function content() {
            return this.value;
        }
    }]);
    return All;
}();

function TO_SOURCE$1(msg, source, topic) {
    return source;
}

var Group = function () {
    function Group(def) {
        classCallCheck(this, Group);


        this.action = def.action || TO_SOURCE$1;
        this.value = {};
    }

    createClass(Group, [{
        key: "handle",
        value: function handle(frame, wire, msg, source, topic) {

            var g = this.action(msg, source);
            var hash = this.value;

            if (g) {
                hash[g] = msg;
            } else {
                // no source, copy message props into hash to merge nameless streams of key data
                for (var k in msg) {
                    hash[k] = msg[k];
                }
            }

            frame.emit(wire, hash, source, topic);
        }
    }, {
        key: "reset",
        value: function reset() {
            this.value = {};
        }
    }, {
        key: "next",
        value: function next() {
            return this.value;
        }
    }, {
        key: "content",
        value: function content() {
            return this.value;
        }
    }]);
    return Group;
}();

function Pass() {}

Pass.prototype.handle = function (frame, wire, msg, source, topic) {

    frame.emit(wire, msg, source, topic);
};

// const PASS = {
//
//     handle: function(frame, wire, msg, source, topic) {
//         frame.emit(wire, msg, source, topic);
//     }
//
// };

var PASS = new Pass();

var SPLIT = {

    handle: function handle(frame, wire, msg, source, topic) {

        var len = msg.length || 0;
        for (var i = 0; i < len; i++) {
            var chunk = msg[i];
            frame.emit(wire, chunk, source, topic);
        }
    }

};

var Handler = function () {
    function Handler(def) {
        classCallCheck(this, Handler);


        this.process = def && def.process ? this[def.process](def) : PASS;
    }

    createClass(Handler, [{
        key: 'handle',
        value: function handle(frame, wire, msg, source, topic) {
            this.process.handle(frame, wire, msg, source, topic);
        }
    }, {
        key: 'pass',
        value: function pass(def) {
            return new Pass(def);
        }
    }, {
        key: 'tap',
        value: function tap(def) {
            return new Tap(def);
        }
    }, {
        key: 'msg',
        value: function msg(def) {
            return new Msg(def);
        }
    }, {
        key: 'source',
        value: function source(def) {
            return new Source(def);
        }
    }, {
        key: 'filter',
        value: function filter(def) {
            return new Filter(def);
        }
    }, {
        key: 'skipDupes',
        value: function skipDupes(def) {
            return new SkipDupes(def);
        }
    }, {
        key: 'delay',
        value: function delay(def) {
            return new Delay(def);
        }
    }, {
        key: 'scan',
        value: function scan(def) {
            return new Scan(def);
        }
    }, {
        key: 'group',
        value: function group(def) {
            return new Group(def);
        }
    }, {
        key: 'lastN',
        value: function lastN(def) {
            return new LastN(def.args[0]);
        }
    }, {
        key: 'firstN',
        value: function firstN(def) {
            return new FirstN(def.args[0]);
        }
    }, {
        key: 'all',
        value: function all() {
            return new All();
        }
    }, {
        key: 'split',
        value: function split() {
            return SPLIT;
        }
    }]);
    return Handler;
}();

var Frame = function () {
    function Frame(bus, def) {
        classCallCheck(this, Frame);


        this._bus = bus;
        this._nextFrame = null; // frames to join or fork into
        this._index = bus._frames.length;
        this._wireMap = {}; //new WeakMap(); // wires as keys, handlers/pools as values
        this._holding = false; // begins pools allowing multiple method calls -- must close with a time operation
        this._processDef = def; // wave or pool definition
    }

    createClass(Frame, [{
        key: 'handle',
        value: function handle(wire, msg, source, topic) {

            var wireId = wire._id;
            var hasWire = this._wireMap.hasOwnProperty(wireId); //this._wireMap.has(wire); //this._wireMap.hasOwnProperty(wireId); //
            if (!hasWire) this._wireMap[wireId] = this._createHandler(wire);
            // this._wireMap.set(wire, this._createHandler(wire));

            var handler = this._wireMap[wireId]; // this._wireMap.get(wire);
            handler.handle(this, wire, msg, source, topic);
            // handler.handle(this, wire, msg, source || wire.name , topic); //todo safe to use just source?
        }
    }, {
        key: 'emit',
        value: function emit(wire, msg, source, topic) {

            if (this._nextFrame) this._nextFrame.handle(wire, msg, source, topic);
        }
    }, {
        key: '_createHandler',
        value: function _createHandler(wire) {

            var def = this._processDef;
            return def && def.name === 'pool' ? new Pool(this, wire, def) : new Handler(def);
        }
    }, {
        key: 'target',
        value: function target(frame) {

            this._nextFrame = frame;
        }
    }, {
        key: 'destroy',
        value: function destroy() {}
    }, {
        key: 'bus',
        get: function get$$1() {
            return this._bus;
        }
    }, {
        key: 'index',
        get: function get$$1() {
            return this._index;
        }
    }, {
        key: 'holding',
        get: function get$$1() {
            return this._holding;
        }
    }]);
    return Frame;
}();

var _id = 0;

// const FRAME_CAP = {
//     handle: function(wire, msg, source, topic){}
// };

var Wire = function () {
    function Wire(name) {
        classCallCheck(this, Wire);


        this._id = ++_id + '';
        this.target = null; // a frame in a bus
        this.dead = false;
        this.name = name;
        this.cleanupMethod = Func.NOOP; // to cleanup subscriptions
        this.pull = Func.NOOP; // to retrieve and emit stored values from a source
    }

    createClass(Wire, [{
        key: 'handle',
        value: function handle(msg, source, topic) {

            // if(this.target)
            this.target.handle(this, msg, this.name, topic);
        }
    }, {
        key: 'destroy',
        value: function destroy() {

            if (!this.dead && this.target) {
                this.dead = true;
                this.cleanupMethod();
            }
        }
    }]);
    return Wire;
}();

Wire.fromInterval = function (delay, name) {

    var wire = new Wire(name);

    var toWire = function toWire(msg) {
        wire.handle(msg);
    };

    var id = setInterval(toWire, delay);

    wire.cleanupMethod = function () {
        clearInterval(id);
    };

    return wire;
};

Wire.fromMonitor = function (data, name) {

    var wire = new Wire(name);

    var toWire = function toWire(msg, source, topic) {
        wire.handle(msg, source, topic);
    };

    wire.cleanupMethod = function () {
        data.unsubscribe(toWire);
    };

    data.monitor(toWire);

    return wire;
};

Wire.fromSubscribe = function (data, topic, name, canPull) {

    var wire = new Wire(name || topic || data.name);

    // const toWire = function(msg, source, topic){
    //     wire.handle(msg, source, topic);
    // };

    wire.cleanupMethod = function () {
        data.unsubscribe(wire, topic);
    };

    if (canPull) {
        wire.pull = function () {
            var present = data.present(topic);
            if (present) {
                var msg = data.read(topic);
                var source = wire.name;
                wire.handle(msg, source, topic);
            }
        };
    }

    // data.subscribe(toWire, topic);
    data.subscribe(wire, topic);

    return wire;
};

Wire.fromEvent = function (target, eventName, useCapture) {

    useCapture = !!useCapture;

    var wire = new Wire(eventName);

    var on = target.addEventListener || target.addListener || target.on;
    var off = target.removeEventListener || target.removeListener || target.off;

    var toWire = function toWire(msg) {
        wire.handle(msg, eventName);
    };

    wire.cleanupMethod = function () {
        off.call(target, eventName, toWire, useCapture);
    };

    on.call(target, eventName, toWire, useCapture);

    return wire;
};

var FrameMerger = function () {
    function FrameMerger(bus) {
        classCallCheck(this, FrameMerger);


        this._bus = bus;
        this._nextFrame = null;
        this._index = bus._frames.length;
        this._mergingWire = new Wire();
    }

    createClass(FrameMerger, [{
        key: 'handle',
        value: function handle(wire, msg, source, topic) {

            this.emit(this._mergingWire, msg, source, topic);
        }
    }, {
        key: 'emit',
        value: function emit(wire, msg, source, topic) {

            if (this._nextFrame) this._nextFrame.handle(wire, msg, source, topic);
        }
    }, {
        key: 'target',
        value: function target(frame) {

            this._nextFrame = frame;
        }
    }, {
        key: 'destroy',
        value: function destroy() {}
    }, {
        key: 'bus',
        get: function get$$1() {
            return this._bus;
        }
    }, {
        key: 'index',
        get: function get$$1() {
            return this._index;
        }
    }, {
        key: 'holding',
        get: function get$$1() {
            return false;
        }
    }]);
    return FrameMerger;
}();

var FrameStateless = function () {
    function FrameStateless(bus, def) {
        classCallCheck(this, FrameStateless);


        this._bus = bus;
        this._nextFrame = null;
        this._index = bus._frames.length;
        this._process = new Handler(def);
    }

    createClass(FrameStateless, [{
        key: 'handle',
        value: function handle(wire, msg, source, topic) {

            this._process.handle(this, wire, msg, source, topic);
        }
    }, {
        key: 'emit',
        value: function emit(wire, msg, source, topic) {

            if (this._nextFrame) this._nextFrame.handle(wire, msg, source, topic);
        }
    }, {
        key: 'target',
        value: function target(frame) {

            this._nextFrame = frame;
        }
    }, {
        key: 'destroy',
        value: function destroy() {}
    }, {
        key: 'bus',
        get: function get$$1() {
            return this._bus;
        }
    }, {
        key: 'index',
        get: function get$$1() {
            return this._index;
        }
    }, {
        key: 'holding',
        get: function get$$1() {
            return false;
        }
    }]);
    return FrameStateless;
}();

var PoolDef = function PoolDef() {
    classCallCheck(this, PoolDef);


    this.name = 'pool';
    this.keep = null;
    this.when = null;
    this.until = null;
    this.timer = null;
    this.clear = null;
};

var FrameHold = function () {
    function FrameHold(bus) {
        classCallCheck(this, FrameHold);


        this._bus = bus;
        this._nextFrame = null;
        this._index = bus._frames.length;
        this._wireMap = new WeakMap(); // wires as keys, handlers/pools as values
        this._processDef = new PoolDef(); // pool definition
        this._holding = true;
    }

    createClass(FrameHold, [{
        key: 'handle',
        value: function handle(wire, msg, source, topic) {

            //const wireId = wire._id;
            var hasWire = this._wireMap.has(wire); //this._wireMap.hasOwnProperty(wireId); //
            if (!hasWire)
                // this._wireMap[wireId] = this._createHandler(wire);
                this._wireMap.set(wire, this._createHandler(wire));

            var handler = this._wireMap.get(wire);
            handler.handle(this, wire, msg, source || wire.name, topic);
        }
    }, {
        key: 'emit',
        value: function emit(wire, msg, source, topic) {

            if (this._nextFrame) this._nextFrame.handle(wire, msg, source, topic);
        }
    }, {
        key: '_createHandler',
        value: function _createHandler(wire) {

            var def = this._processDef;
            return new Pool(this, wire, def);
        }
    }, {
        key: 'target',
        value: function target(frame) {

            this._nextFrame = frame;
        }
    }, {
        key: 'destroy',
        value: function destroy() {}
    }, {
        key: 'bus',
        get: function get$$1() {
            return this._bus;
        }
    }, {
        key: 'index',
        get: function get$$1() {
            return this._index;
        }
    }, {
        key: 'holding',
        get: function get$$1() {
            return this._holding;
        }
    }]);
    return FrameHold;
}();

var FrameForker = function () {
    function FrameForker(bus) {
        classCallCheck(this, FrameForker);


        this._bus = bus;
        this._targets = []; // frames to join or fork into
        this._index = bus._frames.length;
    }

    createClass(FrameForker, [{
        key: "handle",


        // handle is a multi-emit

        value: function handle(wire, msg, source, topic) {

            var len = this._targets.length;
            for (var i = 0; i < len; i++) {
                var frame = this._targets[i];
                frame.handle(wire, msg, source, topic);
            }
        }
    }, {
        key: "target",
        value: function target(frame) {

            this._targets.push(frame);
        }
    }, {
        key: "destroy",
        value: function destroy() {}
    }, {
        key: "bus",
        get: function get$$1() {
            return this._bus;
        }
    }, {
        key: "index",
        get: function get$$1() {
            return this._index;
        }
    }, {
        key: "holding",
        get: function get$$1() {
            return false;
        }
    }]);
    return FrameForker;
}();

var WaveDef = function WaveDef(process, action, stateful) {
    classCallCheck(this, WaveDef);


    this.name = 'wave';
    this.process = process;
    this.action = action;
    this.stateful = stateful;

    for (var _len = arguments.length, args = Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
        args[_key - 3] = arguments[_key];
    }

    this.args = args;
};

var Nyan = {};

// then = applies to all words in a phrase
// watch: ^ = action, need, event, watch | read, must
// then:  run, read, attr, and, style, write, blast, filter

var operationDefs = [{ name: 'ACTION', sym: '^', react: true, subscribe: true, need: true, solo: true }, { name: 'WIRE', sym: '~', react: true, follow: true }, // INTERCEPT
{ name: 'WATCH', sym: null, react: true, follow: true }, { name: 'EVENT', sym: '@', react: true, event: true }, { name: 'ALIAS', sym: '(', then: true, solo: true }, { name: 'METHOD', sym: '`', then: true, solo: true }, { name: 'READ', sym: null, then: true, read: true }, { name: 'ATTR', sym: '#', then: true, solo: true, output: true }, { name: 'AND', sym: '&', then: true }, { name: 'STYLE', sym: '$', then: true, solo: true, output: true }, { name: 'WRITE', sym: '=', then: true, solo: true }, { name: 'SPRAY', sym: '<', then: true }, { name: 'RUN', sym: '*', then: true, output: true }, { name: 'FILTER', sym: '>', then: true }];

// cat, dog | & meow, kitten {*log} | =puppy


// todo make ! a trailing thingie, must goes away
// trailing defs -- ! = needs message in data to continue, ? = data must exist or throw error
// {name: 'BEGIN',  sym: '{'}, -- fork
// {name: 'END',    sym: '}'}, -- back
// {name: 'PIPE',   sym: '|'}, -- phrase delimiter
// read = SPACE
// - is data maybe (data point might not be present)
// ? is object maybe (object might not be there)
// () is rename

var operationsBySymbol = {};
var operationsByName = {};
var symbolsByName = {};
var namesBySymbol = {};
var reactionsByName = {};
var withReactionsByName = {};
var thenByName = {};

for (var i = 0; i < operationDefs.length; i++) {

    var op = operationDefs[i];
    var name = op.name;
    var sym = op.sym;

    if (sym) {
        operationsBySymbol[sym] = op;
        namesBySymbol[sym] = name;
    }

    operationsByName[name] = op;
    symbolsByName[name] = sym;

    if (op.then) {
        thenByName[name] = true;
    }

    if (op.react) {
        reactionsByName[name] = true;
        withReactionsByName[name] = true;
    }
}

var NyanWord = function NyanWord(name, operation, maybe, need, topic, alias, monitor, extracts) {
    classCallCheck(this, NyanWord);


    this.name = name;
    this.operation = operation;
    this.maybe = maybe || false;
    this.need = need || false;
    this.topic = topic || null;
    this.alias = alias || null;
    this.monitor = monitor || false;
    this.extracts = extracts && extracts.length ? extracts : null; // possible list of message property pulls
    // this.useCapture =
};

var tickStack = [];

function toTickStackString(str) {

    tickStack = [];
    var chunks = str.split(/([`])/);
    var strStack = [];

    var ticking = false;
    while (chunks.length) {
        var c = chunks.shift();
        if (c === '`') {
            ticking = !ticking;
            strStack.push(c);
        } else {
            if (ticking) {
                tickStack.push(c);
            } else {
                strStack.push(c);
            }
        }
    }

    var result = strStack.join('');
    //console.log('stack res', result, tickStack);
    return result;
}

function parse(str, isProcess) {

    str = toTickStackString(str);

    var sentences = [];

    // split on curlies and remove empty chunks (todo optimize for parsing speed, batch loop operations?)
    var chunks = str.split(/([{}]|-})/).map(function (d) {
        return d.trim();
    }).filter(function (d) {
        return d;
    });

    for (var _i = 0; _i < chunks.length; _i++) {

        var chunk = chunks[_i];
        var sentence = chunk === '}' || chunk === '{' || chunk === '-}' ? chunk : parseSentence(chunk);

        if (typeof sentence === 'string' || sentence.length > 0) sentences.push(sentence);
    }

    return validate(sentences, isProcess);
}

function validate(sentences, isProcess) {

    var cmdList = [];
    var firstPhrase = true;

    for (var _i2 = 0; _i2 < sentences.length; _i2++) {
        var s = sentences[_i2];
        if (typeof s !== 'string') {

            for (var j = 0; j < s.length; j++) {
                var phrase = s[j];
                if (firstPhrase && !isProcess) {
                    validateReactPhrase(phrase);
                    firstPhrase = false;
                    cmdList.push({ name: 'REACT', phrase: phrase });
                } else {
                    validateProcessPhrase(phrase);
                    cmdList.push({ name: 'PROCESS', phrase: phrase });
                }
            }
        } else if (s === '{') {
            cmdList.push({ name: 'FORK' });
        } else if (s === '}') {
            cmdList.push({ name: 'BACK' });
        } else if (s === '-}') {
            cmdList.push({ name: 'JOIN' });
        }
    }

    return cmdList;
}

function validateReactPhrase(phrase) {

    var hasReaction = false;
    for (var _i3 = 0; _i3 < phrase.length; _i3++) {

        var nw = phrase[_i3];
        var operation = nw.operation = nw.operation || 'WATCH';
        hasReaction = hasReaction || reactionsByName[operation];
        if (!withReactionsByName[operation]) throw new Error('This Nyan command cannot be in a reaction!');
    }

    if (!hasReaction) throw new Error('Nyan commands must begin with an observation!');
}

function validateProcessPhrase(phrase) {

    var firstPhrase = phrase[0];
    var firstOperation = firstPhrase.operation || 'READ';

    if (!thenByName[firstOperation]) throw new Error('Illegal operation in phrase!'); // unknown or reactive

    for (var _i4 = 0; _i4 < phrase.length; _i4++) {

        var nw = phrase[_i4];
        nw.operation = nw.operation || firstOperation;
        if (nw.operation !== firstOperation) {

            // console.log('mult', nw.operation, firstOperation);
            throw new Error('Multiple operation types in phrase (only one allowed)!');
        }
    }
}

function parseSentence(str) {

    var result = [];
    var chunks = str.split('|').map(function (d) {
        return d.trim();
    }).filter(function (d) {
        return d;
    });

    for (var _i5 = 0; _i5 < chunks.length; _i5++) {

        var chunk = chunks[_i5];
        var phrase = parsePhrase(chunk);
        result.push(phrase);
    }

    return result;
}

function parsePhrase(str) {

    var words = [];
    var rawWords = str.split(',').map(function (d) {
        return d.trim();
    }).filter(function (d) {
        return d;
    });

    var len = rawWords.length;

    for (var _i6 = 0; _i6 < len; _i6++) {

        var rawWord = rawWords[_i6];
        //console.log('word=', rawWord);
        var rawChunks = rawWord.split(/([(?!:.`)])/);
        var chunks = [];
        var inMethod = false;

        // white space is only allowed between e.g. `throttle 200`, `string meow in the hat`

        while (rawChunks.length) {
            var next = rawChunks.shift();
            if (next === '`') {
                inMethod = !inMethod;
                chunks.push(next);
            } else {
                if (!inMethod) {
                    var trimmed = next.trim();
                    if (trimmed) chunks.push(trimmed);
                } else {
                    chunks.push(next);
                }
            }
        }

        //console.log('to:', chunks);
        var nameAndOperation = chunks.shift();
        var firstChar = rawWord[0];
        var operation = namesBySymbol[firstChar];
        var start = operation ? 1 : 0;
        var _name = nameAndOperation.slice(start).trim();
        var extracts = [];

        // todo hack (rename)

        var maybe = false;
        var monitor = false;
        var topic = null;
        var alias = null;
        var need = false;

        if (operation === 'ALIAS') {
            alias = chunks.shift();
            chunks.shift(); // todo verify ')'
        } else if (operation === 'METHOD') {
            chunks.shift();
            // const next = chunks.shift();
            var _next = tickStack.shift();
            var _i7 = _next.indexOf(' ');
            if (_i7 === -1) {
                extracts.push(_next);
            } else {
                extracts.push(_next.slice(0, _i7));
                if (_next.length > _i7) {
                    extracts.push(_next.slice(_i7 + 1));
                }
            }

            while (chunks.length) {
                chunks.shift();
            }
        }

        while (chunks.length) {

            var c = chunks.shift();

            switch (c) {

                case '.':

                    var prop = chunks.length && chunks[0]; // todo assert not operation
                    var silentFail = chunks.length > 1 && chunks[1] === '?';

                    if (prop) {
                        extracts.push({ name: prop, silentFail: silentFail });
                        chunks.shift(); // remove word from queue
                        if (silentFail) chunks.shift(); // remove ? from queue
                    }

                    break;

                case '?':

                    maybe = true;
                    break;

                case '!':

                    need = true;
                    break;

                case ':':

                    if (chunks.length) {
                        var _next2 = chunks[0];
                        if (_next2 === '(') {
                            monitor = true;
                        } else {
                            topic = _next2;
                            chunks.shift(); // remove topic from queue
                        }
                    } else {
                        monitor = true;
                    }

                    break;

                case '(':

                    if (chunks.length) {
                        alias = chunks.shift(); // todo assert not operation
                    }

                    break;

            }
        }

        alias = alias || topic || _name;
        var nw = new NyanWord(_name, operation, maybe, need, topic, alias, monitor, extracts);
        words.push(nw);
    }

    return words;
}

Nyan.parse = parse;

function getSurveyFromDataWord(scope, word) {

    var data = scope.find(word.name, !word.maybe);
    return data && data.survey();
}

function throwError(msg) {
    console.log('throwing ', msg);
    var e = new Error(msg);
    console.log(this, e);
    throw e;
}

function getDoSkipNamedDupes(names) {

    var lastMsg = {};
    var len = names.length;

    return function doSkipNamedDupes(msg) {

        var diff = false;
        for (var i = 0; i < len; i++) {
            var name = names[i];
            if (!lastMsg.hasOwnProperty(name) || lastMsg[name] !== msg[name]) diff = true;
            lastMsg[name] = msg[name];
        }

        return diff;
    };
}

function getDoWrite(scope, word) {

    var data = scope.find(word.name, !word.maybe);

    return function doWrite(msg) {
        data.write(msg, word.topic);
    };
}

function getDoSpray(scope, phrase) {

    var wordByAlias = {};
    var dataByAlias = {};

    var len = phrase.length;

    for (var i = 0; i < len; i++) {
        // todo, validate no dupe alias in word validator for spray

        var word = phrase[i];
        var data = scope.find(word.name, !word.maybe);
        if (data) {
            // might not exist if optional
            wordByAlias[word.alias] = word;
            dataByAlias[word.alias] = data;
        }
    }

    return function doWrite(msg) {

        for (var alias in msg) {

            var _data = dataByAlias[alias];
            if (_data) {
                var _word = wordByAlias[alias];
                var msgPart = msg[alias];
                _data.silentWrite(msgPart, _word.topic);
            }
        }

        for (var _alias in msg) {

            var _data2 = dataByAlias[_alias];
            if (_data2) {
                var _word2 = wordByAlias[_alias];
                _data2.refresh(_word2.topic);
            }
        }
    };
}

function getDoRead(scope, phrase) {

    var len = phrase.length;
    var firstWord = phrase[0];

    if (len > 1 || firstWord.monitor) {
        // if only reading word is a wildcard subscription then hash as well
        return getDoReadMultiple(scope, phrase);
    } else {
        return getDoReadSingle(scope, firstWord);
    }
}

function getDoAnd(scope, phrase) {

    return getDoReadMultiple(scope, phrase, true);
}

function getDoReadSingle(scope, word) {

    var data = scope.find(word.name, !word.maybe);
    var topic = word.topic;

    return function doReadSingle() {

        return data.read(topic);
    };
}

function getDoReadMultiple(scope, phrase, isAndOperation) {

    var len = phrase.length;

    return function doReadMultiple(msg, source) {

        var result = {};

        if (isAndOperation) {

            if (source) {
                result[source] = msg;
            } else {
                for (var p in msg) {
                    result[p] = msg[p];
                }
            }
        }

        for (var i = 0; i < len; i++) {
            var word = phrase[i];

            if (word.monitor) {

                var survey = getSurveyFromDataWord(scope, word);
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = survey[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var _step$value = slicedToArray(_step.value, 2),
                            key = _step$value[0],
                            value = _step$value[1];

                        result[key] = value;
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return) {
                            _iterator.return();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }
            } else {

                var data = scope.find(word.name, !word.maybe);
                var prop = word.monitor ? word.alias || word.topic : word.alias || word.name;
                if (data.present(word.topic)) result[prop] = data.read(word.topic);
            }
        }

        return result;
    };
}

// get data stream -- store data in bus, emit into stream on pull()


function getDataWire(scope, word, canPull) {

    var data = scope.find(word.name, !word.maybe);
    if (word.monitor) {
        return Wire.fromMonitor(data, word.alias, canPull);
    } else {
        return Wire.fromSubscribe(data, word.topic, word.alias, canPull);
    }
}

function isObject(v) {
    if (v === null) return false;
    return typeof v === 'function' || (typeof v === 'undefined' ? 'undefined' : _typeof(v)) === 'object';
}

function getEventWire(word, target) {

    return Wire.fromEvent(target, word.topic, word.useCapture, word.alias);
}

function doExtracts(value, extracts) {

    var result = value;
    var len = extracts.length;

    for (var i = 0; i < len; i++) {
        var extract = extracts[i];
        if (!isObject(result)) {
            if (extract.silentFail) return undefined;

            throwError('Cannot access property \'' + extract.name + '\' of ' + result);
        }
        result = result[extract.name];
    }

    return result;
}

function getNeedsArray(phrase) {
    return phrase.filter(function (word) {
        return word.operation.need;
    }).map(function (word) {
        return word.alias;
    });
}

function getDoMsgHashExtract(words) {

    var len = words.length;
    var extractsByAlias = {};

    for (var i = 0; i < len; i++) {

        var word = words[i];
        extractsByAlias[word.alias] = word.extracts;
    }

    return function (msg) {

        var result = {};
        for (var alias in extractsByAlias) {
            var hasProp = msg.hasOwnProperty(alias);
            if (hasProp) {
                result[alias] = doExtracts(msg[alias], extractsByAlias[alias]);
            }
        }

        return result;
    };
}

function getDoMsgExtract(word) {

    var extracts = word.extracts;

    return function (msg) {
        return doExtracts(msg, extracts);
    };
}

function applyReaction(scope, bus, phrase, target) {
    // target is some event emitter

    var need = [];
    var skipDupes = [];
    var extracts = [];

    if (phrase.length === 1 && phrase[0].operation === 'ACTION') {
        var word = phrase[0];
        bus.wire(getDataWire(scope, word, false));
        return;
    }

    for (var i = 0; i < phrase.length; i++) {

        var _word3 = phrase[i];
        var operation = _word3.operation;

        if (operation === 'WATCH') {
            bus.wire(getDataWire(scope, _word3, true));
            skipDupes.push(_word3.alias);
        } else if (operation === 'WIRE') {
            bus.wire(getDataWire(scope, _word3, true));
        } else if (operation === 'EVENT') {
            bus.wire(getEventWire(_word3, target));
        }

        if (_word3.extracts) extracts.push(_word3);

        if (_word3.need) need.push(_word3.alias);
    }

    // transformations are applied via named hashes for performance

    if (bus._wires.length > 1) {

        bus.merge().group().batch();

        if (extracts.length) bus.msg(getDoMsgHashExtract(extracts));

        if (need.length) bus.hasKeys(need);

        if (skipDupes.length) {
            bus.filter(getDoSkipNamedDupes(skipDupes));
        }
    } else {

        if (extracts.length) bus.msg(getDoMsgExtract(extracts[0]));

        if (skipDupes.length) bus.skipDupes();
    }
}

function isTruthy(msg) {
    return !!msg;
}

function isFalsey(msg) {
    return !msg;
}

function applyMethod(bus, word) {

    var method = word.extracts[0];

    switch (method) {

        case 'true':
            bus.msg(true);
            break;

        case 'false':
            bus.msg(false);
            break;

        case 'null':
            bus.msg(null);
            break;

        case 'undefined':
            bus.msg(undefined);
            break;

        case 'array':
            bus.msg([]);
            break;

        case 'object':
            bus.msg({});
            break;

        case 'truthy':
            bus.filter(isTruthy);
            break;

        case 'falsey':
            bus.filter(isFalsey);
            break;

        case 'string':
            bus.msg(function () {
                return word.extracts[1];
            });
            break;

        // throttle x, debounce x, delay x, last x, first x, all

    }
}

function applyProcess(scope, bus, phrase, context, node) {

    var operation = phrase[0].operation; // same for all words in a process phrase

    if (operation === 'READ') {
        bus.msg(getDoRead(scope, phrase));
        var needs = getNeedsArray(phrase);
        if (needs.length) bus.whenKeys(needs);
    } else if (operation === 'AND') {
        bus.msg(getDoAnd(scope, phrase));
        var _needs = getNeedsArray(phrase);
        if (_needs.length) bus.whenKeys(_needs);
    } else if (operation === 'METHOD') {
        applyMethod(bus, phrase[0]);
    } else if (operation === 'FILTER') {
        applyFilterProcess(bus, phrase, context);
    } else if (operation === 'RUN') {
        applyMsgProcess(bus, phrase, context);
    } else if (operation === 'ALIAS') {
        applySourceProcess(bus, phrase[0]);
    } else if (operation === 'WRITE') {
        bus.run(getDoWrite(scope, phrase[0]));
    } else if (operation === 'SPRAY') {
        bus.run(getDoSpray(scope, phrase)); // todo validate that writes do not contain words in reacts
    }
}

function applyMsgProcess(bus, phrase, context) {

    var len = phrase.length;

    var _loop = function _loop(i) {

        var word = phrase[i];
        var name = word.name;
        var method = context[name];

        var f = function f(msg, source, topic) {
            return method.call(context, msg, source, topic);
        };

        bus.msg(f);
    };

    for (var i = 0; i < len; i++) {
        _loop(i);
    }
}

function applySourceProcess(bus, word) {

    bus.source(word.alias);
}

function applyFilterProcess(bus, phrase, context) {

    var len = phrase.length;

    var _loop3 = function _loop3(i) {

        var word = phrase[i];
        var name = word.name;
        var method = context[name];

        var f = function f(msg, source, topic) {
            return method.call(context, msg, source, topic);
        };

        bus.filter(f);
    };

    for (var i = 0; i < len; i++) {
        _loop3(i);
    }
}

function createBus(nyan, scope, context, target) {

    var bus = new Bus(scope);
    return applyNyan(nyan, bus, context, target);
}

function applyNyan(nyan, bus, context, target) {

    var len = nyan.length;
    var scope = bus.scope;
    for (var i = 0; i < len; i++) {

        var cmd = nyan[i];
        var name = cmd.name;
        var phrase = cmd.phrase;

        if (name === 'JOIN') {

            bus = bus.join();
            bus.merge();
            bus.group();
        } else if (name === 'FORK') {
            bus = bus.fork();
        } else if (name === 'BACK') {
            bus = bus.back();
        } else {

            if (name === 'PROCESS') applyProcess(scope, bus, phrase, context, target);else // name === 'REACT'
                applyReaction(scope, bus, phrase, target);
        }
    }

    return bus;
}

var NyanRunner = {
    applyNyan: applyNyan,
    createBus: createBus
};

var Bus = function () {
    function Bus(scope) {
        classCallCheck(this, Bus);


        this._frames = [];
        this._wires = [];
        this._dead = false;
        this._scope = scope;
        this._children = []; // from forks
        this._parent = null;

        if (scope) scope._busList.push(this);

        var f = new FrameStateless(this);
        this._frames.push(f);
        this._currentFrame = f;
    }

    createClass(Bus, [{
        key: 'addFrame',


        // NOTE: unlike most bus methods, this one returns a new current frame (not the bus!)

        value: function addFrame(def) {

            var lastFrame = this._currentFrame;
            var nextFrame = this._currentFrame = def && def.stateful ? new Frame(this, def) : new FrameStateless(this, def);
            this._frames.push(nextFrame);
            lastFrame.target(nextFrame);
            return nextFrame;
        }
    }, {
        key: 'addFrameHold',
        value: function addFrameHold() {

            var lastFrame = this._currentFrame;
            var nextFrame = this._currentFrame = new FrameHold(this);
            this._frames.push(nextFrame);
            lastFrame.target(nextFrame);
            return nextFrame;
        }
    }, {
        key: 'addFrameMerger',
        value: function addFrameMerger() {

            var lastFrame = this._currentFrame;
            var nextFrame = this._currentFrame = new FrameMerger(this);
            this._frames.push(nextFrame);
            lastFrame.target(nextFrame);
            return nextFrame;
        }
    }, {
        key: 'addFrameForker',
        value: function addFrameForker() {

            var lastFrame = this._currentFrame;
            var nextFrame = this._currentFrame = new FrameForker(this);
            this._frames.push(nextFrame);
            lastFrame.target(nextFrame);
            return nextFrame;
        }
    }, {
        key: 'process',
        value: function process(nyan, context, target) {

            if (typeof nyan === 'string') nyan = Nyan.parse(nyan, true);

            NyanRunner.applyNyan(nyan, this, context, target);
            return this;
        }

        // create stream

    }, {
        key: 'spawn',
        value: function spawn() {}
    }, {
        key: 'fork',
        value: function fork() {

            Func.ASSERT_NOT_HOLDING(this);
            var fork = new Bus(this.scope);
            fork.parent = this;
            this.addFrameForker();
            this._currentFrame.target(fork._currentFrame);

            return fork;
        }
    }, {
        key: 'back',
        value: function back() {

            if (!this._parent) throw new Error('Cannot exit fork, parent does not exist!');

            return this.parent;
        }
    }, {
        key: 'join',
        value: function join() {

            var parent = this.back();
            parent.add(this);
            return parent;
        }
    }, {
        key: 'add',
        value: function add(bus) {

            var frame = this.addFrame(); // wire from current bus
            bus._currentFrame.target(frame); // wire from outside bus
            return this;
        }
    }, {
        key: 'defer',
        value: function defer() {
            return this.timer(Func.getDeferTimer);
        }
    }, {
        key: 'batch',
        value: function batch() {
            return this.timer(Func.getBatchTimer);
        }
    }, {
        key: 'sync',
        value: function sync() {
            return this.timer(Func.getSyncTimer);
        }
    }, {
        key: 'throttle',
        value: function throttle(fNum) {
            return this.timer(Func.getThrottleTimer, fNum);
        }
    }, {
        key: 'hold',
        value: function hold() {

            Func.ASSERT_NOT_HOLDING(this);
            this.addFrameHold();
            return this;
        }
    }, {
        key: 'pull',
        value: function pull() {

            var len = this._wires.length;

            for (var i = 0; i < len; i++) {
                var wire = this._wires[i];
                wire.pull();
            }

            return this;
        }
    }, {
        key: 'event',
        value: function event(target, eventName, useCapture) {

            var wire = Wire.fromEvent(target, eventName, useCapture);
            return this.wire(wire);
        }
    }, {
        key: 'subscribe',
        value: function subscribe(data, topic, name, canPull) {

            var wire = Wire.fromSubscribe(data, topic, name, canPull);
            return this.wire(wire);
        }
    }, {
        key: 'interval',
        value: function interval(delay, name) {

            var wire = Wire.fromInterval(delay, name);
            return this.wire(wire);
        }
    }, {
        key: 'wire',
        value: function wire(_wire, targetFrame) {

            _wire.target = targetFrame || this._frames[0];
            this._wires.push(_wire);
            return this;
        }
    }, {
        key: 'monitor',
        value: function monitor(data, name) {

            var wire = Wire.fromMonitor(data, name);
            wire.target = this._frames[0];
            this._wires.push(wire);

            return this;
        }
    }, {
        key: 'scan',
        value: function scan(func, seed) {

            if (!this.holding) {
                this.addFrame(new WaveDef('scan', func, true, 0));
                return this;
            }

            return this.reduce(Func.getScan, func, seed);
        }
    }, {
        key: 'scan2',
        value: function scan2(func, seed) {

            if (!this.holding) {
                this.addFrame(new WaveDef('scan', func, false, 0));
                return this;
            }

            return this.reduce(Func.getScan, func, seed);
        }
    }, {
        key: 'delay',
        value: function delay(fNum) {

            Func.ASSERT_NEED_ONE_ARGUMENT(arguments);
            Func.ASSERT_NOT_HOLDING(this);

            this.addFrame(new WaveDef('delay', Func.FUNCTOR(fNum)));
            return this;
        }
    }, {
        key: 'willReset',
        value: function willReset() {

            Func.ASSERT_IS_HOLDING(this);
            return this.clear(Func.getAlwaysTrue);
        }
    }, {
        key: 'whenKeys',
        value: function whenKeys(keys) {

            return this.when(Func.getWhenKeys, true, keys);
        }
    }, {
        key: 'group',
        value: function group(by) {

            if (!this.holding) {
                this.addFrame(new WaveDef('group', null, true));
                return this;
            }
            this.reduce(Func.getGroup, by);
            return this;
        }
    }, {
        key: 'groupByTopic',
        value: function groupByTopic() {

            Func.ASSERT_NOT_HOLDING(this);
            this.hold().reduce(Func.getGroup, Func.TO_TOPIC);
            return this;
        }
    }, {
        key: 'all',
        value: function all() {
            if (!this.holding) {
                this.addFrame(new WaveDef('all', null, true));
                return this;
            }
            return this.reduce(Func.getKeepAll);
        }
    }, {
        key: 'first',
        value: function first(n) {
            if (!this.holding) {
                this.addFrame(new WaveDef('firstN', null, true, n));
                return this;
            }
            return this.reduce(Func.getKeepFirst, n);
        }
    }, {
        key: 'last',
        value: function last(n) {
            if (!this.holding) {
                this.addFrame(new WaveDef('lastN', null, true, n));
                return this;
            }
            return this.reduce(Func.getKeepLast, n);
        }
    }, {
        key: 'clear',
        value: function clear(factory) {
            var _currentFrame;

            for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
            }

            return (_currentFrame = this._currentFrame).clear.apply(_currentFrame, [factory].concat(args));
        }
    }, {
        key: 'reduce',
        value: function reduce(factory) {

            var holding = this.holding;

            for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
            }

            if (!holding) {

                this.addFrame(new (Function.prototype.bind.apply(WaveDef, [null].concat(['msg', factory, true], args)))());
            } else {

                var frame = this._currentFrame;
                var def = frame._processDef;
                def.keep = [factory, true].concat(args);
            }

            return this;
        }
    }, {
        key: 'timer',
        value: function timer(factory, stateful) {

            var holding = this.holding;
            var frame = holding ? this._currentFrame : this.addFrameHold();
            var def = frame._processDef;

            for (var _len3 = arguments.length, args = Array(_len3 > 2 ? _len3 - 2 : 0), _key3 = 2; _key3 < _len3; _key3++) {
                args[_key3 - 2] = arguments[_key3];
            }

            def.timer = [factory, stateful].concat(args);
            this._currentFrame._holding = false; // timer ends hold

            return this;
        }
    }, {
        key: 'until',
        value: function until(factory) {
            var _currentFrame2, _addFrameHold$reduce;

            for (var _len4 = arguments.length, args = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
                args[_key4 - 1] = arguments[_key4];
            }

            this.holding ? (_currentFrame2 = this._currentFrame).until.apply(_currentFrame2, [factory].concat(args)) : (_addFrameHold$reduce = this.addFrameHold().reduce(Func.getKeepLast)).until.apply(_addFrameHold$reduce, [factory].concat(args)).timer(Func.getSyncTimer);
            return this;
        }
    }, {
        key: 'when',
        value: function when(factory, stateful) {

            var holding = this.holding;

            for (var _len5 = arguments.length, args = Array(_len5 > 2 ? _len5 - 2 : 0), _key5 = 2; _key5 < _len5; _key5++) {
                args[_key5 - 2] = arguments[_key5];
            }

            if (!holding) {

                this.addFrame(new (Function.prototype.bind.apply(WaveDef, [null].concat(['filter', factory, stateful], args)))());
            } else {

                var frame = this._currentFrame;
                var def = frame._processDef;
                def.when = [factory, stateful].concat(args);
            }

            return this;
        }
    }, {
        key: 'run',
        value: function run(func) {

            Func.ASSERT_IS_FUNCTION(func);
            Func.ASSERT_NOT_HOLDING(this);

            this.addFrame(new WaveDef('tap', func));
            return this;
        }
    }, {
        key: 'merge',
        value: function merge() {

            Func.ASSERT_NOT_HOLDING(this);

            this.addFrameMerger();
            return this;
        }
    }, {
        key: 'msg',
        value: function msg(fAny) {

            Func.ASSERT_NEED_ONE_ARGUMENT(arguments);
            Func.ASSERT_NOT_HOLDING(this);

            this.addFrame(new WaveDef('msg', Func.FUNCTOR(fAny)));
            return this;
        }
    }, {
        key: 'source',
        value: function source(fStr) {

            Func.ASSERT_NEED_ONE_ARGUMENT(arguments);
            Func.ASSERT_NOT_HOLDING(this);

            this.addFrame(new WaveDef('source', Func.FUNCTOR(fStr)));
            return this;
        }
    }, {
        key: 'filter',
        value: function filter(func) {

            Func.ASSERT_NEED_ONE_ARGUMENT(arguments);
            Func.ASSERT_IS_FUNCTION(func);
            Func.ASSERT_NOT_HOLDING(this);

            this.addFrame(new WaveDef('filter', func));
            return this;
        }
    }, {
        key: 'split',
        value: function split() {

            Func.ASSERT_NOT_HOLDING(this);

            this.addFrame(new WaveDef('split'));
            return this;
        }
    }, {
        key: 'hasKeys',
        value: function hasKeys(keys) {

            Func.ASSERT_NOT_HOLDING(this);
            this.addFrame(new WaveDef('filter', Func.getHasKeys(keys)));
            return this;
        }
    }, {
        key: 'skipDupes',
        value: function skipDupes() {

            Func.ASSERT_NOT_HOLDING(this);

            this.addFrame(new WaveDef('skipDupes', null, true));
            return this;
        }
    }, {
        key: 'toStream',
        value: function toStream() {
            // merge, fork -> immutable stream?
        }
    }, {
        key: 'destroy',
        value: function destroy() {

            if (this.dead) return this;

            this._dead = true;

            var wires = this._wires;
            var len = wires.length;
            for (var i = 0; i < len; i++) {
                var wire = wires[i];
                wire.destroy();
            }

            this._wires = null;
            return this;
        }
    }, {
        key: 'children',
        get: function get$$1() {

            return this._children.map(function (d) {
                return d;
            });
        }
    }, {
        key: 'parent',
        get: function get$$1() {
            return this._parent;
        },
        set: function set$$1(newParent) {

            var oldParent = this.parent;

            if (oldParent === newParent) return;

            if (oldParent) {
                var i = oldParent._children.indexOf(this);
                oldParent._children.splice(i, 1);
            }

            this._parent = newParent;

            if (newParent) {
                newParent._children.push(this);
            }

            return this;
        }
    }, {
        key: 'dead',
        get: function get$$1() {
            return this._dead;
        }
    }, {
        key: 'holding',
        get: function get$$1() {
            return this._currentFrame._holding;
        }
    }, {
        key: 'scope',
        get: function get$$1() {
            return this._scope;
        }
    }]);
    return Bus;
}();

var idCounter = 0;

function _destroyEach(arr) {

    var len = arr.length;
    for (var i = 0; i < len; i++) {
        var item = arr[i];
        item.destroy();
    }
}

var Scope = function () {
    function Scope(name) {
        classCallCheck(this, Scope);


        this._id = ++idCounter;
        this._name = name;
        this._parent = null;
        this._children = [];
        this._busList = [];
        this._dataList = new Map();
        this._valves = new Map();
        this._mirrors = new Map();
        this._dead = false;
    }

    createClass(Scope, [{
        key: 'bus',
        value: function bus(strOrNyan, context, node) {

            if (!strOrNyan) return new Bus(this);

            var nyan = typeof strOrNyan === 'string' ? Nyan.parse(strOrNyan) : strOrNyan;
            console.log(nyan);
            return NyanRunner.createBus(nyan, this, context, node);
        }
    }, {
        key: 'clear',
        value: function clear() {

            if (this._dead) return;

            _destroyEach(this.children); // iterates over copy to avoid losing position as children leaves their parent
            _destroyEach(this._busList);
            _destroyEach(this._dataList.values());

            this._children = [];
            this._busList = [];
            this._dataList.clear();
            this._valves.clear();
            this._mirrors.clear();
        }
    }, {
        key: 'destroy',
        value: function destroy() {

            this.clear();
            this.parent = null;
            this._dead = true;
        }
    }, {
        key: 'createChild',
        value: function createChild(name) {

            var child = new Scope(name);
            child.parent = this;
            return child;
        }
    }, {
        key: 'insertParent',
        value: function insertParent(newParent) {

            newParent.parent = this.parent;
            this.parent = newParent;
            return this;
        }
    }, {
        key: '_createMirror',
        value: function _createMirror(data) {

            var mirror = Object.create(data);
            mirror._type = DATA_TYPES.MIRROR;
            this._mirrors.set(data.name, mirror);
            return mirror;
        }
    }, {
        key: '_createData',
        value: function _createData(name, type) {

            var d = new Data(this, name, type);
            this._dataList.set(name, d);
            return d;
        }
    }, {
        key: 'data',
        value: function data(name) {

            return this.grab(name) || this._createData(name, DATA_TYPES.NONE);
        }
    }, {
        key: 'action',
        value: function action(name) {

            var d = this.grab(name);

            if (d) return d.verify(DATA_TYPES.ACTION);

            return this._createData(name, DATA_TYPES.ACTION);
        }
    }, {
        key: 'state',
        value: function state(name) {

            var d = this.grab(name);

            if (d) return d.verify(DATA_TYPES.STATE);

            var state = this._createData(name, DATA_TYPES.STATE);
            this._createMirror(state);
            return state;
        }
    }, {
        key: 'findDataSet',
        value: function findDataSet(names, required) {

            var result = {};
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = names[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var name = _step.value;

                    result[name] = this.find(name, required);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            return result;
        }
    }, {
        key: 'readDataSet',
        value: function readDataSet(names, required) {

            var dataSet = this.findDataSet(names, required);
            var result = {};

            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = dataSet[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var d = _step2.value;

                    if (d) {

                        if (d.present()) result[d.name] = d.read();
                    }
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }

            return result;
        }
    }, {
        key: 'flatten',


        // created a flattened view of all data at and above this scope

        value: function flatten() {

            var scope = this;

            var result = new Map();
            var appliedValves = new Map();

            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                for (var _iterator3 = scope._dataList[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var _step3$value = slicedToArray(_step3.value, 2),
                        _key3 = _step3$value[0],
                        value = _step3$value[1];

                    result.set(_key3, value);
                }
            } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                        _iterator3.return();
                    }
                } finally {
                    if (_didIteratorError3) {
                        throw _iteratorError3;
                    }
                }
            }

            while (scope = scope._parent) {

                var dataList = scope._dataList;
                var valves = scope._valves;
                var mirrors = scope._mirrors;

                if (!dataList.size) continue;

                // further restrict valves with each new scope

                if (valves.size) {
                    if (appliedValves.size) {
                        var _iteratorNormalCompletion4 = true;
                        var _didIteratorError4 = false;
                        var _iteratorError4 = undefined;

                        try {
                            for (var _iterator4 = appliedValves.keys()[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                                var key = _step4.value;

                                if (!valves.has(key)) appliedValves.delete(key);
                            }
                        } catch (err) {
                            _didIteratorError4 = true;
                            _iteratorError4 = err;
                        } finally {
                            try {
                                if (!_iteratorNormalCompletion4 && _iterator4.return) {
                                    _iterator4.return();
                                }
                            } finally {
                                if (_didIteratorError4) {
                                    throw _iteratorError4;
                                }
                            }
                        }
                    } else {
                        var _iteratorNormalCompletion5 = true;
                        var _didIteratorError5 = false;
                        var _iteratorError5 = undefined;

                        try {
                            for (var _iterator5 = valves.entries()[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                                var _step5$value = slicedToArray(_step5.value, 2),
                                    _key = _step5$value[0],
                                    value = _step5$value[1];

                                appliedValves.set(_key, value);
                            }
                        } catch (err) {
                            _didIteratorError5 = true;
                            _iteratorError5 = err;
                        } finally {
                            try {
                                if (!_iteratorNormalCompletion5 && _iterator5.return) {
                                    _iterator5.return();
                                }
                            } finally {
                                if (_didIteratorError5) {
                                    throw _iteratorError5;
                                }
                            }
                        }
                    }
                }

                var possibles = appliedValves.size ? appliedValves : dataList;

                var _iteratorNormalCompletion6 = true;
                var _didIteratorError6 = false;
                var _iteratorError6 = undefined;

                try {
                    for (var _iterator6 = possibles.keys()[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                        var _key2 = _step6.value;

                        if (!result.has(_key2)) {

                            var data = mirrors.get(_key2) || dataList.get(_key2);
                            if (data) result.set(_key2, data);
                        }
                    }
                } catch (err) {
                    _didIteratorError6 = true;
                    _iteratorError6 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion6 && _iterator6.return) {
                            _iterator6.return();
                        }
                    } finally {
                        if (_didIteratorError6) {
                            throw _iteratorError6;
                        }
                    }
                }
            }

            return result;
        }
    }, {
        key: 'find',
        value: function find(name, required) {

            var localData = this.grab(name);
            if (localData) return localData;

            var scope = this;

            while (scope = scope._parent) {

                var valves = scope._valves;

                // if valves exist and the name is not present, stop looking
                if (valves.size && !valves.has(name)) {
                    break;
                }

                var mirror = scope._mirrors.get(name);

                if (mirror) return mirror;

                var d = scope.grab(name);

                if (d) return d;
            }

            if (required) throw new Error('Required data: ' + name + ' not found!');

            return null;
        }
    }, {
        key: 'findOuter',
        value: function findOuter(name, required) {

            var foundInner = false;
            var localData = this.grab(name);
            if (localData) foundInner = true;

            var scope = this;

            while (scope = scope._parent) {

                var valves = scope._valves;

                // if valves exist and the name is not present, stop looking
                if (valves.size && !valves.has(name)) {
                    break;
                }

                var mirror = scope._mirrors.get(name);

                if (mirror) {

                    if (foundInner) return mirror;

                    foundInner = true;
                    continue;
                }

                var d = scope.grab(name);

                if (d) {

                    if (foundInner) return d;

                    foundInner = true;
                }
            }

            if (required) throw new Error('Required data: ' + name + ' not found!');

            return null;
        }
    }, {
        key: 'grab',
        value: function grab(name, required) {

            var data = this._dataList.get(name);

            if (!data && required) throw new Error('Required Data: ' + name + ' not found!');

            return data || null;
        }
    }, {
        key: 'transaction',
        value: function transaction(writes) {

            if (Array.isArray(writes)) return this._multiWriteArray(writes);else if ((typeof writes === 'undefined' ? 'undefined' : _typeof(writes)) === 'object') return this._multiWriteHash(writes);

            throw new Error('Write values must be in an array of object hash.');
        }
    }, {
        key: '_multiWriteArray',


        // write {name, topic, value} objects as a transaction
        value: function _multiWriteArray(writeArray) {

            var list = [];

            var _iteratorNormalCompletion7 = true;
            var _didIteratorError7 = false;
            var _iteratorError7 = undefined;

            try {
                for (var _iterator7 = writeArray[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                    var w = _step7.value;

                    var d = this.find(w.name);
                    d.silentWrite(w.value, w.topic);
                    list.push(d);
                }
            } catch (err) {
                _didIteratorError7 = true;
                _iteratorError7 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion7 && _iterator7.return) {
                        _iterator7.return();
                    }
                } finally {
                    if (_didIteratorError7) {
                        throw _iteratorError7;
                    }
                }
            }

            var i = 0;
            var _iteratorNormalCompletion8 = true;
            var _didIteratorError8 = false;
            var _iteratorError8 = undefined;

            try {
                for (var _iterator8 = list[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                    var _d = _step8.value;

                    var _w = writeArray[i];
                    _d.refresh(_w.topic);
                }
            } catch (err) {
                _didIteratorError8 = true;
                _iteratorError8 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion8 && _iterator8.return) {
                        _iterator8.return();
                    }
                } finally {
                    if (_didIteratorError8) {
                        throw _iteratorError8;
                    }
                }
            }

            return this;
        }
    }, {
        key: '_multiWriteHash',


        // write key-values as a transaction
        value: function _multiWriteHash(writeHash) {

            var list = [];

            for (var k in writeHash) {
                var v = writeHash[k];
                var d = this.find(k);
                d.silentWrite(v);
                list.push(d);
            }

            var _iteratorNormalCompletion9 = true;
            var _didIteratorError9 = false;
            var _iteratorError9 = undefined;

            try {
                for (var _iterator9 = list[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
                    var _d2 = _step9.value;

                    _d2.refresh();
                }
            } catch (err) {
                _didIteratorError9 = true;
                _iteratorError9 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion9 && _iterator9.return) {
                        _iterator9.return();
                    }
                } finally {
                    if (_didIteratorError9) {
                        throw _iteratorError9;
                    }
                }
            }

            return this;
        }
    }, {
        key: 'name',
        get: function get$$1() {
            return this._name;
        }
    }, {
        key: 'dead',
        get: function get$$1() {
            return this._dead;
        }
    }, {
        key: 'children',
        get: function get$$1() {

            return this._children.map(function (d) {
                return d;
            });
        }
    }, {
        key: 'parent',
        get: function get$$1() {
            return this._parent;
        },
        set: function set$$1(newParent) {

            var oldParent = this.parent;

            if (oldParent === newParent) return;

            if (oldParent) {
                var i = oldParent._children.indexOf(this);
                oldParent._children.splice(i, 1);
            }

            this._parent = newParent;

            if (newParent) {
                newParent._children.push(this);
            }

            return this;
        }
    }, {
        key: 'valves',
        set: function set$$1(list) {
            var _iteratorNormalCompletion10 = true;
            var _didIteratorError10 = false;
            var _iteratorError10 = undefined;

            try {

                for (var _iterator10 = list[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
                    var name = _step10.value;

                    this._valves.set(name, true);
                }
            } catch (err) {
                _didIteratorError10 = true;
                _iteratorError10 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion10 && _iterator10.return) {
                        _iterator10.return();
                    }
                } finally {
                    if (_didIteratorError10) {
                        throw _iteratorError10;
                    }
                }
            }
        },
        get: function get$$1() {
            return Array.from(this._valves.keys());
        }
    }]);
    return Scope;
}();

var Catbus$1 = {};

var _batchQueue = [];
var _primed = false;

Catbus$1.bus = function () {
    return new Bus();
};

Catbus$1.fromEvent = function (target, eventName, useCapture) {

    var bus = new Bus();
    bus.event(target, eventName, useCapture);
    return bus;
};

// todo stable output queue -- output pools go in a queue that runs after the batch q is cleared, thus run once only

Catbus$1.enqueue = function (pool) {

    _batchQueue.push(pool);

    if (!_primed) {
        // register to flush the queue
        _primed = true;
        if (typeof window !== 'undefined' && window.requestAnimationFrame) requestAnimationFrame(Catbus$1.flush);else process.nextTick(Catbus$1.flush);
    }
};

Catbus$1.createChild = Catbus$1.scope = function (name) {

    return new Scope(name);
};

Catbus$1.flush = function () {

    _primed = false;

    var cycles = 0;
    var q = _batchQueue;
    _batchQueue = [];

    while (q.length) {

        while (q.length) {
            var pool = q.shift();
            pool.release();
        }

        q = _batchQueue;
        _batchQueue = [];

        cycles++;
        if (cycles > 10) throw new Error('Flush batch cycling loop > 10.', q);
    }
};

// export default () => {
//     let s = new Scope('cow');
//     return s;
// }

return Catbus$1;

})));
//# sourceMappingURL=catbus.umd.js.map
