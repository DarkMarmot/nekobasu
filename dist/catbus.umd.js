(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Catbus = factory());
}(this, (function () { 'use strict';

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

    getBatchTimer: function getBatchTimer() {
        var pool = this;
        return function () {
            Catbus$1.enqueue(pool);
        };
    },

    getSyncTimer: function getSyncTimer() {
        var pool = this;
        return function () {
            pool.release(pool);
        };
    },

    getDeferTimer: function getDeferTimer() {
        var pool = this;
        return function () {
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

var SubscriberList = function () {
    function SubscriberList(topic, data) {
        classCallCheck(this, SubscriberList);


        this._topic = topic;
        this._subscribers = [];
        this._lastPacket = null;
        this._data = data;
        this._name = data._name;
        this._dead = false;
    }

    createClass(SubscriberList, [{
        key: 'handle',
        value: function handle(msg, topic, silently) {

            if (this.dead) return;

            topic = topic || this.topic;
            var source = this.name;
            var currentPacket = new Packet(msg, topic, source);

            if (this.data.type !== DATA_TYPES.ACTION) // actions do not store data (ephemeral and immediate)
                this._lastPacket = currentPacket;

            var subscribers = [].concat(this._subscribers); // call original sensors in case subscriptions change mid loop
            var len = subscribers.length;

            if (!silently) {
                for (var i = 0; i < len; i++) {
                    var s = subscribers[i];
                    typeof s === 'function' ? s.call(s, msg, currentPacket) : s.handle(msg, currentPacket);
                }
            }
        }
    }, {
        key: 'destroy',
        value: function destroy() {

            if (this.dead) return;

            this._subscribers = null;
            this._lastPacket = null;
            this._dead = true;
        }
    }, {
        key: 'add',
        value: function add(watcher) {

            this._subscribers.push(watcher);
        }
    }, {
        key: 'remove',
        value: function remove(watcher) {

            var i = this._subscribers.indexOf(watcher);

            if (i !== -1) this._subscribers.splice(i, 1);
        }
    }, {
        key: 'lastPacket',
        get: function get$$1() {
            return this._lastPacket;
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

        this._wildcardSubscriberList = new SubscriberList(null, this);
        this._subscriberListsByTopic = new Map();
    }

    createClass(Data, [{
        key: 'destroy',
        value: function destroy() {

            if (this.dead) this._throwDead();

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

            topic = topic || undefined;
            var list = this._subscriberListsByTopic.get(topic);

            if (list) return list;

            list = new SubscriberList(topic, this);
            this._subscriberListsByTopic.set(topic, list);

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

            if (this.dead) this._throwDead();

            topic = topic || undefined;
            this.subscribe(watcher, topic);
            var packet = this.peek();

            if (packet) typeof watcher === 'function' ? watcher.call(watcher, packet.msg, packet) : watcher.handle(packet.msg, packet);

            return this;
        }
    }, {
        key: 'subscribe',
        value: function subscribe(watcher, topic) {

            if (this.dead) this._throwDead();

            topic = topic || undefined;
            this._demandSubscriberList(topic).add(watcher);

            return this;
        }
    }, {
        key: 'monitor',
        value: function monitor(watcher) {

            if (this.dead) this._throwDead();

            this._wildcardSubscriberList.add(watcher);

            return this;
        }
    }, {
        key: 'unsubscribe',
        value: function unsubscribe(watcher, topic) {

            if (this.dead) this._throwDead();

            topic = topic || undefined;
            this._demandSubscriberList(topic).remove(watcher);
            this._wildcardSubscriberList.remove(watcher);

            return this;
        }
    }, {
        key: 'topics',
        value: function topics() {

            return this._subscriberListsByTopic.keys();
        }
    }, {
        key: 'survey',
        value: function survey() {
            // get entire key/value store by topic:lastPacket

            var entries = this._subscriberListsByTopic.entries();
            var m = new Map();
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = entries[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var _step2$value = slicedToArray(_step2.value, 2),
                        key = _step2$value[0],
                        value = _step2$value[1];

                    m.set(key, value.lastPacket);
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

            return m;
        }
    }, {
        key: 'peek',
        value: function peek(topic) {

            if (this.dead) this._throwDead();

            topic = topic || undefined;
            var subscriberList = this._subscriberListsByTopic.get(topic);
            return subscriberList ? subscriberList.lastPacket : null;
        }
    }, {
        key: 'read',
        value: function read(topic) {

            if (this.dead) this._throwDead();

            topic = topic || undefined;
            var packet = this.peek(topic);
            return packet ? packet.msg : undefined;
        }
    }, {
        key: 'silentWrite',
        value: function silentWrite(msg, topic) {

            if (this.dead) this._throwDead();

            topic = topic || undefined;
            this.write(msg, topic, true);
        }
    }, {
        key: 'write',
        value: function write(msg, topic, silently) {

            if (this.dead) this._throwDead();

            if (this.type === DATA_TYPES.MIRROR) throw new Error('Mirror Data: ' + this.name + ' is read-only');

            topic = topic || undefined;
            var list = this._demandSubscriberList(topic);
            list.handle(msg, topic, silently);
            this._wildcardSubscriberList.handle(msg, topic, silently);
        }
    }, {
        key: 'refresh',
        value: function refresh(topic) {

            if (this.dead) this._throwDead();

            topic = topic || undefined;
            var lastPacket = this.peek(topic);

            if (lastPacket) this.write(lastPacket._msg, topic);

            return this;
        }
    }, {
        key: 'toggle',
        value: function toggle(topic) {

            if (this.dead) this._throwDead();

            topic = topic || undefined;
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

var PoolAspects = function PoolAspects() {
    classCallCheck(this, PoolAspects);


    this.until = null;
    this.reduce = null;
    this.when = null;
    this.clear = null;
    this.timer = null;
    this.keep = null;
};

//
// this._keep = null; // pool storage
// this._until = null; // stream end lifecycle -- todo switch until to when in current setup
// this._timer = null; // release from pool timer
// this._clear = false; // condition to clear storage on release
// this._when = false; // invokes timer for release

var Frame = function () {
    function Frame(bus, streams) {
        classCallCheck(this, Frame);


        streams = streams || [];
        this._bus = bus;
        this._index = bus._frames.length;
        this._holding = false; //begins group, keep, schedule frames
        this._streams = streams;

        this._process = null; // name of sync process method in streams
        this._action = null; // function defining sync stream action
        this._isFactory = false; // whether sync action is a stateful factory function

        this._poolAspects = null;

        var len = streams.length;
        for (var i = 0; i < len; i++) {
            streams[i].debugFrame = this;
        }
    }

    createClass(Frame, [{
        key: 'applySyncProcess',
        value: function applySyncProcess(name, action, isFactory) {
            // generate means action function must be called to generate stateful action

            this._process = name;
            this._action = action;
            this._isFactory = isFactory;

            var streams = this._streams;
            var len = streams.length;

            if (isFactory) {
                for (var _len = arguments.length, args = Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
                    args[_key - 3] = arguments[_key];
                }

                for (var i = 0; i < len; i++) {
                    var s = streams[i];
                    s.actionMethod = action.apply(undefined, args);
                    s.processMethod = s[name];
                }
            } else {
                for (var _i = 0; _i < len; _i++) {
                    var _s = streams[_i];
                    _s.actionMethod = action;
                    _s.processMethod = _s[name];
                }
            }

            return this;
        }
    }, {
        key: 'hold',
        value: function hold() {

            this._holding = true;
            this._poolAspects = new PoolAspects();

            var streams = this._streams;
            var len = streams.length;

            for (var i = 0; i < len; i++) {
                var s = streams[i];
                s.createPool();
                s.processMethod = s.doPool;
            }

            return this;
        }
    }, {
        key: 'pull',
        value: function pull() {

            var streams = this._streams;
            var len = streams.length;

            for (var i = 0; i < len; i++) {
                var s = streams[i];
                s.pull();
            }
        }
    }, {
        key: 'source',
        value: function source(name) {

            var streams = this._streams;
            var len = streams.length;

            for (var i = 0; i < len; i++) {
                var s = streams[i];
                s.name = name;
            }
            return this;
        }
    }, {
        key: 'run',
        value: function run(func, stateful) {
            return this.applySyncProcess('doRun', func, stateful);
        }
    }, {
        key: 'msg',
        value: function msg(fAny, stateful) {
            return this.applySyncProcess('doMsg', Func.FUNCTOR(fAny), stateful);
        }
    }, {
        key: 'transform',
        value: function transform(fAny, stateful) {
            return this.applySyncProcess('doTransform', Func.FUNCTOR(fAny), stateful);
        }
    }, {
        key: 'delay',
        value: function delay(fNum, stateful) {
            return this.applySyncProcess('doDelay', Func.FUNCTOR(fNum), stateful);
        }
    }, {
        key: 'filter',
        value: function filter(func, stateful) {
            return this.applySyncProcess('doFilter', func, stateful);
        }
    }, {
        key: 'skipDupes',
        value: function skipDupes() {
            return this.applySyncProcess('doFilter', Func.getSkipDupes, true);
        }
    }, {
        key: 'hasKeys',
        value: function hasKeys(keys) {
            return this.applySyncProcess('doFilter', Func.getHasKeys, true, keys);
        }
    }, {
        key: 'clear',
        value: function clear(factory) {
            for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
            }

            return this.buildPoolAspect.apply(this, ['clear', factory].concat(args));
        }
    }, {
        key: 'reduce',


        // factory should define content and reset methods have signature f(msg, source) return f.content()

        value: function reduce(factory) {
            for (var _len3 = arguments.length, args = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
                args[_key3 - 1] = arguments[_key3];
            }

            return this.buildPoolAspect.apply(this, ['keep', factory].concat(args));
        }
    }, {
        key: 'timer',
        value: function timer(factory) {
            for (var _len4 = arguments.length, args = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
                args[_key4 - 1] = arguments[_key4];
            }

            return this.buildPoolAspect.apply(this, ['timer', factory].concat(args));
        }
    }, {
        key: 'when',
        value: function when(factory) {
            for (var _len5 = arguments.length, args = Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
                args[_key5 - 1] = arguments[_key5];
            }

            return this.buildPoolAspect.apply(this, ['when', factory].concat(args));
        }
    }, {
        key: 'until',
        value: function until(factory) {
            for (var _len6 = arguments.length, args = Array(_len6 > 1 ? _len6 - 1 : 0), _key6 = 1; _key6 < _len6; _key6++) {
                args[_key6 - 1] = arguments[_key6];
            }

            return this.buildPoolAspect.apply(this, ['until', factory].concat(args));
        }
    }, {
        key: 'buildPoolAspect',
        value: function buildPoolAspect(aspect, factory) {

            if (aspect === 'timer') this._holding = false;

            for (var _len7 = arguments.length, args = Array(_len7 > 2 ? _len7 - 2 : 0), _key7 = 2; _key7 < _len7; _key7++) {
                args[_key7 - 2] = arguments[_key7];
            }

            this._poolAspects[aspect] = [factory].concat(args);

            var streams = this._streams;
            var len = streams.length;

            for (var i = 0; i < len; i++) {

                var s = streams[i];
                var pool = s.pool;
                pool.build.apply(pool, [aspect, factory].concat(args));
            }

            return this;
        }
    }, {
        key: 'destroy',
        value: function destroy() {

            var streams = this._streams;
            var len = streams.length;
            for (var i = 0; i < len; i++) {
                streams[i].cleanupMethod();
            }
            this._streams = null;
        }
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
    }, {
        key: 'streams',
        get: function get$$1() {
            return [].concat(this._streams);
        }
    }]);
    return Frame;
}();

var Pool = function () {
    function Pool(stream) {
        classCallCheck(this, Pool);


        this.stream = stream;

        this.keep = null;
        this.when = Func.ALWAYS_TRUE;
        this.until = Func.ALWAYS_TRUE;
        this.timer = null; // throttle, debounce, defer, batch, sync
        this.clear = Func.ALWAYS_FALSE;
        this.isPrimed = false;
        this.source = stream.name;
    }

    createClass(Pool, [{
        key: 'handle',
        value: function handle(msg, source) {

            this.keep(msg, source);
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

            if (hasContent) pool.stream.emit(msg, pool.stream.name);
        }
    }]);
    return Pool;
}();

var Stream = function () {
    function Stream() {
        classCallCheck(this, Stream);


        this.debugFrame = null;
        this.dead = false;
        this.children = [];
        this.name = null;
        this.pool = null;
        this.cleanupMethod = Func.NOOP; // to cleanup subscriptions
        this.pull = Func.NOOP; // to retrieve and emit stored values from a source
        this.processMethod = this.emit;
        this.actionMethod = null; // for run, transform, filter, name, delay
    }

    createClass(Stream, [{
        key: 'handle',
        value: function handle(msg, source) {

            if (this.dead) // true if canceled or disposed midstream
                return this;

            this.processMethod(msg, this.name || source); // handle method = doDelay, doGroup, doHold, , doFilter

            return this;
        }
    }, {
        key: 'drop',
        value: function drop(stream) {

            var children = this.children;
            var i = children.indexOf(stream);

            if (i !== -1) children.splice(i, 1);
        }
    }, {
        key: 'addTarget',
        value: function addTarget(stream) {
            this.children.push(stream);
        }
    }, {
        key: 'emit',
        value: function emit(msg, source, topic, thisStream) {

            thisStream = thisStream || this; // allow callbacks with context instead of bind (massively faster)
            source = thisStream.name || source;

            var children = thisStream.children;
            var len = children.length;

            for (var i = 0; i < len; i++) {
                var c = children[i];
                c.handle(msg, source, topic);
            }
        }
    }, {
        key: 'doFilter',
        value: function doFilter(msg, source, topic) {

            if (!this.actionMethod(msg, source, topic)) return;
            this.emit(msg, source, topic);
        }
    }, {
        key: 'doMsg',
        value: function doMsg(msg, source, topic) {

            msg = this.actionMethod(msg, source, topic);
            this.emit(msg, source, topic);
        }
    }, {
        key: 'doTransform',
        value: function doTransform(msg, source, topic) {

            msg = this.actionMethod.msg ? this.actionMethod.msg(msg, source, topic) : msg;
            source = this.actionMethod.source ? this.actionMethod.source(msg, source, topic) : source;
            topic = this.actionMethod.topic ? this.actionMethod.topic(msg, source, topic) : topic;
            this.emit(msg, source, topic);
        }
    }, {
        key: 'doDelay',
        value: function doDelay(msg, source, topic) {

            // todo add destroy -> kills timeout
            // passes 'this' to avoid bind slowdown
            setTimeout(this.emit, this.actionMethod(msg, source, topic) || 0, msg, source, topic, this);
        }
    }, {
        key: 'doSource',
        value: function doSource(msg, source, topic) {

            this.name = this.actionMethod(); // todo shoehorned -- this needs it's own setup
            //source = this.actionMethod(msg, source, topic);
            // this.name = function(){ return }
            this.emit(msg, this.name || source, topic);
        }
    }, {
        key: 'doRun',
        value: function doRun(msg, source, topic) {

            this.actionMethod(msg, source, topic);
            this.emit(msg, source, topic);
        }
    }, {
        key: 'createPool',
        value: function createPool() {

            this.pool = new Pool(this);
        }
    }, {
        key: 'doPool',
        value: function doPool(msg, source, topic) {

            this.pool.handle(msg, this.name || source, topic);
        }
    }, {
        key: 'destroy',
        value: function destroy() {

            if (this.dead) return;

            this.cleanupMethod(); // should remove an eventListener if present
        }
    }]);
    return Stream;
}();

Stream.fromMonitor = function (data, name, canPull) {

    var stream = new Stream();
    var streamName = name || data.name;

    stream.name = streamName;

    var toStream = function toStream(msg, source, topic) {
        stream.emit(msg, streamName, topic);
    };

    stream.cleanupMethod = function () {
        data.unsubscribe(toStream);
    };

    if (canPull) {
        stream.pull = function () {
            var packet = data.survey();
            if (packet) {
                var msg = packet._msg;
                var source = streamName || packet._source;
                var topic = packet._topic;
                stream.emit(msg, source, topic, stream);
            }
        };
    }

    data.monitor(toStream);

    return stream;
};

Stream.fromSubscribe = function (data, topic, name, canPull) {

    var stream = new Stream();
    var streamName = name || topic || data.name;

    //stream.name = streamName;

    var toStream = function toStream(msg, source, topic) {
        stream.emit(msg, streamName, topic);
    };

    stream.cleanupMethod = function () {
        data.unsubscribe(toStream, topic);
    };

    if (canPull) {
        stream.pull = function () {
            var packet = data.peek();
            if (packet) {
                var msg = packet._msg;
                var source = streamName || packet._source;
                var _topic = packet._topic;
                stream.emit(msg, source, _topic, stream);
            }
        };
    }

    data.subscribe(toStream, topic);

    return stream;
};

Stream.fromEvent = function (target, eventName, useCapture) {

    useCapture = !!useCapture;

    var stream = new Stream();
    stream.name = eventName;

    var on = target.addEventListener || target.addListener || target.on;
    var off = target.removeEventListener || target.removeListener || target.off;

    var toStream = function toStream(msg) {
        stream.handle(msg, eventName);
    };

    stream.cleanupMethod = function () {
        off.call(target, eventName, toStream, useCapture);
    };

    on.call(target, eventName, toStream, useCapture);

    return stream;
};

var Bus = function () {
    function Bus(scope, streams) {
        classCallCheck(this, Bus);


        this._frames = [];
        this._dead = false;
        this._scope = scope; // data scope
        this._children = []; // from forks
        this._parent = null;

        if (scope) scope._busList.push(this);

        var f = new Frame(this, streams || []);
        this._frames.push(f);
        this._currentFrame = f;
    }

    createClass(Bus, [{
        key: 'addFrame',


        // NOTE: unlike most bus methods, this one returns a new current frame (not the bus!)

        value: function addFrame(streams) {

            var lastFrame = this._currentFrame;
            var nextFrame = this._currentFrame = new Frame(this, streams);
            this._frames.push(nextFrame);

            _wireFrames(lastFrame, nextFrame);

            return nextFrame;
        }
    }, {
        key: 'spawn',


        // create stream
        value: function spawn() {}

        // convert each stream into a bus, wiring prior streams, dump in array

    }, {
        key: 'split',
        value: function split() {

            Func.ASSERT_NOT_HOLDING(this);
        }
    }, {
        key: 'fork',
        value: function fork() {

            Func.ASSERT_NOT_HOLDING(this);
            var fork = new Bus(this.scope);
            fork.parent = this;
            _wireFrames(this._currentFrame, fork._currentFrame, true);

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
            _wireFrames(bus._currentFrame, frame); // wire from outside bus
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
            this.addFrame().hold();
            return this;
        }
    }, {
        key: 'pull',
        value: function pull() {

            var frame1 = this._frames[0];

            if (frame1._streams.length > 0) {
                frame1.pull();
                return this;
            }

            if (this._frames.length !== 1) {
                var frame2 = this._frames[1];
                frame2.pull();
            }

            return this;
        }
    }, {
        key: 'event',
        value: function event(name, target, eventName, useCapture) {

            eventName = eventName || name;
            Func.ASSERT_NOT_HOLDING(this);
            var stream = Stream.fromEvent(target, eventName, useCapture);
            stream.name = name;
            this.addFrame([stream]);
            return this;
        }
    }, {
        key: 'eventList',
        value: function eventList(list) {

            Func.ASSERT_NOT_HOLDING(this);

            var len = list.length;
            var streams = [];

            for (var i = 0; i < len; i++) {
                var e = list[i];
                var eventName = e.eventName || e.name;
                var name = e.name || e.eventName;
                var s = Stream.fromEvent(e.target, eventName, e.useCapture);
                s.name = name;
                streams.push(s);
            }

            this.addFrame(streams);
            return this;
        }
    }, {
        key: 'scan',
        value: function scan(func, seed) {
            return this.reduce(Func.getScan, func, seed);
        }
    }, {
        key: 'delay',
        value: function delay(num) {

            Func.ASSERT_NEED_ONE_ARGUMENT(arguments);
            Func.ASSERT_NOT_HOLDING(this);
            this.addFrame().delay(num);
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
            return this.when(Func.getWhenKeys, keys);
        }
    }, {
        key: 'group',
        value: function group(by) {

            Func.ASSERT_NOT_HOLDING(this);
            this.addFrame().hold().reduce(Func.getGroup, by);
            return this;
        }
    }, {
        key: 'groupByTopic',
        value: function groupByTopic() {

            Func.ASSERT_NOT_HOLDING(this);
            this.addFrame().hold().reduce(Func.getGroup, Func.TO_TOPIC);
            return this;
        }
    }, {
        key: 'all',
        value: function all() {
            return this.reduce(Func.getKeepAll);
        }
    }, {
        key: 'first',
        value: function first(n) {
            return this.reduce(Func.getKeepFirst, n);
        }
    }, {
        key: 'last',
        value: function last(n) {
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
            var _currentFrame2, _addFrame$hold;

            for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
            }

            this.holding ? (_currentFrame2 = this._currentFrame).reduce.apply(_currentFrame2, [factory].concat(args)) : (_addFrame$hold = this.addFrame().hold()).reduce.apply(_addFrame$hold, [factory].concat(args)).timer(Func.getSyncTimer);
            return this;
        }
    }, {
        key: 'timer',
        value: function timer(factory) {
            var _currentFrame3, _addFrame$hold$reduce;

            for (var _len3 = arguments.length, args = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
                args[_key3 - 1] = arguments[_key3];
            }

            this.holding ? (_currentFrame3 = this._currentFrame).timer.apply(_currentFrame3, [factory].concat(args)) : (_addFrame$hold$reduce = this.addFrame().hold().reduce(Func.getKeepLast)).timer.apply(_addFrame$hold$reduce, [factory].concat(args));
            return this;
        }
    }, {
        key: 'until',
        value: function until(factory) {
            var _currentFrame4, _addFrame$hold$reduce2;

            for (var _len4 = arguments.length, args = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
                args[_key4 - 1] = arguments[_key4];
            }

            this.holding ? (_currentFrame4 = this._currentFrame).until.apply(_currentFrame4, [factory].concat(args)) : (_addFrame$hold$reduce2 = this.addFrame().hold().reduce(Func.getKeepLast)).until.apply(_addFrame$hold$reduce2, [factory].concat(args)).timer(Func.getSyncTimer);
            return this;
        }
    }, {
        key: 'when',
        value: function when(factory) {
            var _currentFrame5, _addFrame$hold$reduce3;

            for (var _len5 = arguments.length, args = Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
                args[_key5 - 1] = arguments[_key5];
            }

            this.holding ? (_currentFrame5 = this._currentFrame).when.apply(_currentFrame5, [factory].concat(args)) : (_addFrame$hold$reduce3 = this.addFrame().hold().reduce(Func.getKeepLast)).when.apply(_addFrame$hold$reduce3, [factory].concat(args)).timer(Func.getSyncTimer);
            return this;
        }
    }, {
        key: 'run',
        value: function run(func) {

            Func.ASSERT_IS_FUNCTION(func);
            Func.ASSERT_NOT_HOLDING(this);
            this.addFrame().run(func);
            return this;
        }
    }, {
        key: 'merge',
        value: function merge() {

            Func.ASSERT_NOT_HOLDING(this);

            var mergedStream = new Stream();

            var lastFrame = this._currentFrame;
            var nextFrame = this._currentFrame = new Frame(this, [mergedStream]);
            this._frames.push(nextFrame);

            var streams = lastFrame._streams;
            var len = streams.length;
            for (var i = 0; i < len; i++) {
                var s = streams[i];
                s.addTarget(mergedStream);
            }

            return this;
        }
    }, {
        key: 'msg',
        value: function msg(fAny) {

            Func.ASSERT_NEED_ONE_ARGUMENT(arguments);
            Func.ASSERT_NOT_HOLDING(this);
            this.addFrame().msg(fAny);
            return this;
        }
    }, {
        key: 'transform',
        value: function transform(fAny) {

            Func.ASSERT_NEED_ONE_ARGUMENT(arguments);
            Func.ASSERT_NOT_HOLDING(this);
            this.addFrame().transform(fAny);
            return this;
        }
    }, {
        key: 'source',
        value: function source(fStr) {

            Func.ASSERT_NEED_ONE_ARGUMENT(arguments);
            Func.ASSERT_NOT_HOLDING(this);

            this.addFrame().source(fStr);
            return this;
        }
    }, {
        key: 'filter',
        value: function filter(func) {

            Func.ASSERT_NEED_ONE_ARGUMENT(arguments);
            Func.ASSERT_IS_FUNCTION(func);
            Func.ASSERT_NOT_HOLDING(this);

            this.addFrame().filter(func);
            return this;
        }
    }, {
        key: 'hasKeys',
        value: function hasKeys(keys) {

            Func.ASSERT_NOT_HOLDING(this);
            this.addFrame().hasKeys(keys);
            return this;
        }
    }, {
        key: 'skipDupes',
        value: function skipDupes() {

            Func.ASSERT_NOT_HOLDING(this);
            this.addFrame().skipDupes();
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

            var frames = this._frames;

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = frames[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var f = _step.value;

                    f.destroy();
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

// send messages from streams in one frame to new empty streams in another frame
// injects new streams to frame 2

function _wireFrames(frame1, frame2, isForking) {

    var streams1 = frame1._streams;
    var streams2 = frame2._streams;

    var len = streams1.length;

    for (var i = 0; i < len; i++) {

        var s1 = streams1[i];
        var s2 = new Stream(frame2);

        if (!isForking) s2.name = s1.name;

        streams2.push(s2);
        s1.addTarget(s2);
    }
}

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

            console.log('mult', nw.operation, firstOperation);
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
        console.log('word=', rawWord);
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

        console.log('to:', chunks);
        var nameAndOperation = chunks.shift();
        var firstChar = rawWord[0];
        var operation = namesBySymbol[firstChar];
        var start = operation ? 1 : 0;
        var _name = nameAndOperation.slice(start);
        var extracts = [];

        // todo hack (rename)

        var maybe = false;
        var monitor = false;
        var topic = null;
        var alias = null;
        var need = false;

        if (operation === 'ALIAS') {
            alias = chunks.shift();
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

function getPacketFromDataWord(scope, word) {

    var data = scope.find(word.name, !word.maybe);
    var peek = data && data.peek(word.topic);
    return peek;
}

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

    return function doWrite(msg, source, topic) {
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

    return function doReadSingle() {

        var packet = getPacketFromDataWord(scope, word);
        return packet && packet.msg;
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

                var packet = getPacketFromDataWord(scope, word);
                var prop = word.monitor ? word.alias || word.topic : word.alias || word.name;
                if (packet) result[prop] = packet.msg;
            }
        }

        return result;
    };
}

// get data stream -- store data in bus, emit into stream on pull()


function getDataStream(scope, word, canPull) {

    var data = scope.find(word.name, !word.maybe);
    if (word.monitor) {
        return Stream.fromMonitor(data, word.alias, canPull);
    } else {
        return Stream.fromSubscribe(data, word.topic, word.alias, canPull);
    }
}

function isObject(v) {
    if (v === null) return false;
    return typeof v === 'function' || (typeof v === 'undefined' ? 'undefined' : _typeof(v)) === 'object';
}

function getEventStream(scope, word, node) {

    return Stream.fromEvent(node, word.topic, word.useCapture, word.alias);
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
    var streams = [];
    var extracts = [];

    if (phrase.length === 1 && phrase[0].operation === 'ACTION') {
        bus.addFrame(getDataStream(scope, phrase[0], false));
        return;
    }

    for (var i = 0; i < phrase.length; i++) {

        var word = phrase[i];
        var operation = word.operation;

        if (operation === 'WATCH') {
            streams.push(getDataStream(scope, word, true));
            skipDupes.push(word.alias);
        } else if (operation === 'WIRE') {
            streams.push(getDataStream(scope, word, true));
        } else if (operation === 'EVENT') {
            streams.push(getEventStream(scope, word));
        }

        if (word.extracts) extracts.push(word);

        if (word.need) need.push(word.alias);
    }

    bus.addFrame(streams);

    if (streams.length > 1) {

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
            bus.filter(function (msg) {
                return !!msg;
            });
            break;

        case 'falsey':
            bus.filter(function (msg) {
                return !msg;
            });
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

function nyanToBus(scope, bus, str, context, target) {

    var nyan = Nyan.parse(str);
    var len = nyan.length;

    for (var i = 0; i < len; i++) {

        var cmd = nyan[i];
        var name = cmd.name;
        var phrase = cmd.phrase;

        console.log('----', name, phrase);

        if (name === 'JOIN') {
            bus = bus.join();
            bus.merge();
            bus.group();
            bus.sync();
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
        key: 'react',
        value: function react(str, context, node) {
            // string is Nyan

            if (!str) throw new Error('Need a Nyan phrase!');

            var b = new Bus(this);

            return nyanToBus(this, b, str, context, node);
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
                        var lastPacket = d.peek();
                        if (lastPacket) result[d.name] = lastPacket.msg;
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

Catbus$1.fromEvent = function (target, eventName, useCapture) {

    var stream = Stream.fromEvent(target, eventName, useCapture);
    return new Bus(null, [stream]);
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

Catbus$1.scope = function (name) {

    console.log('NYAN');
    var k = Nyan.parse('^bunny?:error(badbunny), cow:(huh), moo2?(meow) | %kitten' + '                       {*toMuffin | =order {=raw}} =meow {you} =woo');

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = k[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var cmd = _step.value;

            console.log('CMD: ', cmd.name);
            var phrase = cmd.phrase;
            if (!phrase) continue;
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = phrase[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var word = _step2.value;

                    console.log(word.name, word.operation, word.maybe);
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

    console.log(k);

    console.log('root is ', name);
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
