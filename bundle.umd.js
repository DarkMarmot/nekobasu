(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.moop = factory());
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

var ACTION = 'action';
var MIRROR = 'mirror';
var STATE = 'state';
var COMPUTED = 'computed';
var NONE = 'none';
var VALID_TYPES = [ACTION, MIRROR, STATE, COMPUTED, NONE];
var VALID_CHECK = new Map();

var _iteratorNormalCompletion = true;
var _didIteratorError = false;
var _iteratorError = undefined;

try {
    for (var _iterator = VALID_TYPES[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var type = _step.value;

        VALID_CHECK.set(type, true);
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

function isValid(type) {
    return VALID_CHECK.has(type);
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
        key: 'tell',
        value: function tell(msg, topic, silently) {

            if (this.dead) return;

            topic = topic || this.topic;
            var source = this.name;
            var currentPacket = new Packet(msg, topic, source);

            if (this.data.type !== ACTION) // actions do not store data (ephemeral and immediate)
                this._lastPacket = currentPacket;

            var subscribers = [].concat(this._subscribers); // call original sensors in case subscriptions change mid loop
            var len = subscribers.length;

            if (!silently) {
                for (var i = 0; i < len; i++) {
                    var s = subscribers[i];
                    typeof s === 'function' ? s.call(s, msg, currentPacket) : s.tell(msg, currentPacket);
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


        type = type || NONE;

        if (!isValid(type)) throw new Error('Invalid Data of type: ' + type);

        this._scope = scope;
        this._name = name;
        this._type = type || NONE;
        this._dead = false;

        this._noTopicSubscriberList = new SubscriberList(null, this);
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

            this.subscribe(watcher, topic);
            var packet = this.peek();

            if (packet) typeof watcher === 'function' ? watcher.call(watcher, packet.msg, packet) : watcher.tell(packet.msg, packet);

            return this;
        }
    }, {
        key: 'subscribe',
        value: function subscribe(watcher, topic) {

            if (this.dead) this._throwDead();

            var subscriberList = !topic ? this._noTopicSubscriberList : this._demandSubscriberList(topic);
            subscriberList.add(watcher);

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

            if (typeof topic !== 'string') {
                this._noTopicSubscriberList.remove(watcher);
            } else {
                var subscriberList = this._demandSubscriberList(topic);
                subscriberList.remove(watcher);
            }
            this._wildcardSubscriberList.remove(watcher);

            return this;
        }
    }, {
        key: 'peek',
        value: function peek(topic) {

            if (this.dead) this._throwDead();

            var subscriberList = topic ? this._subscriberListsByTopic.get(topic) : this._noTopicSubscriberList;
            if (!subscriberList) return null;
            return subscriberList.lastPacket;
        }
    }, {
        key: 'read',
        value: function read(topic) {

            if (this.dead) this._throwDead();

            var packet = this.peek(topic);
            return packet ? packet.msg : undefined;
        }
    }, {
        key: 'silentWrite',
        value: function silentWrite(msg, topic) {

            if (this.dead) this._throwDead();

            this.write(msg, topic, true);
        }
    }, {
        key: 'write',
        value: function write(msg, topic, silently) {

            if (this.dead) this._throwDead();

            if (this.type === MIRROR) throw new Error('Mirror Data: ' + this.name + ' is read-only');

            if (topic) {
                var list = this._demandSubscriberList(topic);
                list.tell(msg);
            } else {
                this._noTopicSubscriberList.tell(msg, null, silently);
            }

            this._wildcardSubscriberList.tell(msg, topic, silently);
        }
    }, {
        key: 'refresh',
        value: function refresh(topic) {

            if (this.dead) this._throwDead();

            this.write(this.read(topic), topic);

            return this;
        }
    }, {
        key: 'toggle',
        value: function toggle(topic) {

            if (this.dead) this._throwDead();

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

var idCounter = 0;

var Scope$1 = function () {
    function Scope(name) {
        classCallCheck(this, Scope);


        this._id = ++idCounter;
        this._name = name;
        this._parent = null;
        this._children = [];
        this._dataList = new Map();
        this._valves = new Map();
        this._mirrors = new Map();
        this._dead = false;
    }

    createClass(Scope, [{
        key: 'clear',
        value: function clear() {

            if (this._dead) return;

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = this._children[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var child = _step.value;

                    child.destroy();
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

            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = this._dataList.values()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var data = _step2.value;

                    data.destroy();
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

            this._children = [];
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
            mirror._type = MIRROR;
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

            return this.grab(name) || this._createData(name, NONE);
        }
    }, {
        key: 'action',
        value: function action(name) {

            var d = this.grab(name);

            if (d) return d.verify(ACTION);

            return this._createData(name, ACTION);
        }
    }, {
        key: 'state',
        value: function state(name) {

            var d = this.grab(name);

            if (d) return d.verify(STATE);

            var state = this._createData(name, STATE);
            this._createMirror(state);
            return state;
        }
    }, {
        key: 'findDataSet',
        value: function findDataSet(names, required) {

            var result = {};
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                for (var _iterator3 = names[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var name = _step3.value;

                    result[name] = this.find(name, required);
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

            return result;
        }
    }, {
        key: 'readDataSet',
        value: function readDataSet(names, required) {

            var dataSet = this.findDataSet(names, required);
            var result = {};

            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
                for (var _iterator4 = dataSet[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var d = _step4.value;

                    if (d) {
                        var lastPacket = d.peek();
                        if (lastPacket) result[d.name] = lastPacket.msg;
                    }
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

            return result;
        }
    }, {
        key: 'flatten',


        // created a flattened view of all data at and above this scope

        value: function flatten() {

            var scope = this;

            var result = new Map();
            var appliedValves = new Map();

            var _iteratorNormalCompletion5 = true;
            var _didIteratorError5 = false;
            var _iteratorError5 = undefined;

            try {
                for (var _iterator5 = scope._dataList[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                    var _step5$value = slicedToArray(_step5.value, 2),
                        _key3 = _step5$value[0],
                        value = _step5$value[1];

                    result.set(_key3, value);
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

            while (scope = scope._parent) {

                var dataList = scope._dataList;
                var valves = scope._valves;
                var mirrors = scope._mirrors;

                if (!dataList.size) continue;

                // further restrict valves with each new scope

                if (valves.size) {
                    if (appliedValves.size) {
                        var _iteratorNormalCompletion6 = true;
                        var _didIteratorError6 = false;
                        var _iteratorError6 = undefined;

                        try {
                            for (var _iterator6 = appliedValves.keys()[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                                var key = _step6.value;

                                if (!valves.has(key)) appliedValves.delete(key);
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
                    } else {
                        var _iteratorNormalCompletion7 = true;
                        var _didIteratorError7 = false;
                        var _iteratorError7 = undefined;

                        try {
                            for (var _iterator7 = valves.entries()[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                                var _step7$value = slicedToArray(_step7.value, 2),
                                    _key = _step7$value[0],
                                    value = _step7$value[1];

                                appliedValves.set(_key, value);
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
                    }
                }

                var possibles = appliedValves.size ? appliedValves : dataList;

                var _iteratorNormalCompletion8 = true;
                var _didIteratorError8 = false;
                var _iteratorError8 = undefined;

                try {
                    for (var _iterator8 = possibles.keys()[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                        var _key2 = _step8.value;

                        if (!result.has(_key2)) {

                            var data = mirrors.get(_key2) || dataList.get(_key2);
                            if (data) result.set(_key2, data);
                        }
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
        value: function _multiWriteArray(writeArray, dimension) {

            var list = [];

            var _iteratorNormalCompletion9 = true;
            var _didIteratorError9 = false;
            var _iteratorError9 = undefined;

            try {
                for (var _iterator9 = writeArray[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
                    var w = _step9.value;

                    var d = this.find(w.name);
                    d.silentWrite(w.value, w.topic || null);
                    list.push(d);
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

            var i = 0;
            var _iteratorNormalCompletion10 = true;
            var _didIteratorError10 = false;
            var _iteratorError10 = undefined;

            try {
                for (var _iterator10 = list[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
                    var _d = _step10.value;

                    var _w = writeArray[i];
                    _d.refresh(_w.topic || null);
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

            var _iteratorNormalCompletion11 = true;
            var _didIteratorError11 = false;
            var _iteratorError11 = undefined;

            try {
                for (var _iterator11 = list[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
                    var _d2 = _step11.value;

                    _d2.refresh();
                }
            } catch (err) {
                _didIteratorError11 = true;
                _iteratorError11 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion11 && _iterator11.return) {
                        _iterator11.return();
                    }
                } finally {
                    if (_didIteratorError11) {
                        throw _iteratorError11;
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
            var _iteratorNormalCompletion12 = true;
            var _didIteratorError12 = false;
            var _iteratorError12 = undefined;

            try {

                for (var _iterator12 = list[Symbol.iterator](), _step12; !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done); _iteratorNormalCompletion12 = true) {
                    var name = _step12.value;

                    this._valves.set(name, true);
                }
            } catch (err) {
                _didIteratorError12 = true;
                _iteratorError12 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion12 && _iterator12.return) {
                        _iterator12.return();
                    }
                } finally {
                    if (_didIteratorError12) {
                        throw _iteratorError12;
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

// export default () => {
//     let s = new Scope('cow');
//     return s;
// }

return Scope$1;

})));
//# sourceMappingURL=bundle.umd.js.map
