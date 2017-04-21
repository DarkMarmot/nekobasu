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
        key: 'tell',
        value: function tell(msg, topic, silently) {

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


        type = type || DATA_TYPES.NONE;

        if (!isValid(type)) throw new Error('Invalid Data of type: ' + type);

        this._scope = scope;
        this._name = name;
        this._type = type;
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

            if (this.type === DATA_TYPES.MIRROR) throw new Error('Mirror Data: ' + this.name + ' is read-only');

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

var Scope = function () {
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

var Func = {

    FUNCTOR: function FUNCTOR(val) {
        return typeof val === 'function' ? val : function () {
            return val;
        };
    },

    NOOP: function NOOP() {},

    ALWAYS_TRUE: function ALWAYS_TRUE() {
        return true;
    },

    ALWAYS_FALSE: function ALWAYS_FALSE() {
        return false;
    },

    ASSERT_NEED_ONE_ARGUMENT: function ASSERT_NEED_ONE_ARGUMENT(args) {
        if (args.length < 1) throw new Error('Method requires at least one argument.');
    },

    ASSERT_IS_FUNCTION: function ASSERT_IS_FUNCTION(func) {
        if (typeof func !== 'function') throw new Error('Argument [func] is not of type function.');
    },

    getFilter: function getFilter(stream, condition) {

        var f = function f(msg, source) {
            if (!condition(msg, source)) return;
            stream.flowForward(msg, source);
        };

        return f;
    },

    TO_SOURCE_FUNC: function TO_SOURCE_FUNC(msg, source) {
        return source;
    },

    BATCH_TIMER: function BATCH_TIMER() {
        Catbus$1.enqueue(this);
    },

    DEFER_TIMER: function DEFER_TIMER() {
        setTimeout(this.fireContent, 0);
    },

    KEEP_LAST: function KEEP_LAST(buffer, msg, n) {

        if (n === 0) {
            if (buffer.length === 0) buffer.push(msg);else buffer[0] = msg;
            return buffer;
        }

        buffer.push(msg);

        if (buffer.length > n) buffer.shift();

        return buffer;
    },

    KEEP_FIRST: function KEEP_FIRST(buffer, msg, n) {

        if (buffer.length < n || buffer.length === 0) buffer.push(msg);

        return buffer;
    },

    KEEP_ALL: function KEEP_ALL(buffer, msg) {

        buffer.push(msg);
        return buffer;
    },

    getKeepLast: function getKeepLast(n) {

        if (arguments.length === 0) {
            return function (msg, source) {
                return msg;
            };
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
        };

        return f;
    },

    getKeepFirst: function getKeepFirst(n) {

        if (arguments.length === 0) {

            var firstMsg = void 0;
            var hasFirst = false;
            var _f = function _f(msg, source) {
                return hasFirst ? firstMsg : firstMsg = msg;
            };

            _f.reset = function () {
                firstMsg = false;
            };

            return _f;
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
        };

        return f;
    },

    getUntilCount: function getUntilCount(n) {

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

    getUntilKeys: function getUntilKeys(keys) {

        var len = keys.length;
        var latched = false;

        var f = function f(messagesByKey) {

            if (latched) return true;

            for (var i = 0; i < len; i++) {
                var k = keys[i];
                if (!messagesByKey.hasOwnProperty(k)) return false;
            }

            return latched = true;
        };

        f.reset = function () {
            latched = false;
        };

        return f;
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

var Stream = function () {
    function Stream() {
        classCallCheck(this, Stream);


        this.debugFrame = null;
        this.dead = false;
        this.children = [];
        this.name = null;
        this.messages = []; // [] with hold
        this.messagesByKey = {}; // {} with group
        this.cleanupMethod = Func.NOOP; // to cleanup subscriptions
        this.processMethod = this.doPass;
        this.keepMethod = Func.KEEP_LAST; // default if holding or grouping
        this.keepCount = 0; // non-zero creates an array
        this.timerMethod = null; // throttle, debounce, defer, batch
        this.groupMethod = null;
        this.actionMethod = null; // run, transform, filter, name, delay
        this.readyMethod = Func.ALWAYS_TRUE;
        this.clearMethod = Func.ALWAYS_FALSE;
        this.latched = false; // from this.clearMethod()
        this.primed = false;
    }

    createClass(Stream, [{
        key: 'process',
        value: function process(name) {
            this.processMethod = this[name];
        }
    }, {
        key: 'tell',
        value: function tell(msg, source) {

            if (this.dead) // true if canceled or disposed midstream
                return this;

            // tell method = doDelay, doGroup, doHold, , doFilter
            this.processMethod.call(this, msg, source);

            return this;
        }
    }, {
        key: 'fireContent',
        value: function fireContent() {

            var msg = this.groupMethod ? this.resolveKeepByGroup() : this.resolveKeep(this.messages);

            if (this.clearMethod()) {
                this.latched = false;
                this.messagesByKey = {};
                this.messages = [];
            }

            this.primed = false;

            this.flowForward(msg, this.name);
        }
    }, {
        key: 'resolveKeep',
        value: function resolveKeep(messages) {

            return this.keepCount === 0 ? messages[0] : messages;
        }
    }, {
        key: 'resolveKeepByGroup',
        value: function resolveKeepByGroup() {

            var messagesByKey = this.messagesByKey;
            for (var k in messagesByKey) {
                messagesByKey[k] = this.resolveKeep(messagesByKey[k]);
            }
            return messagesByKey;
        }
    }, {
        key: 'drop',
        value: function drop(stream) {

            var children = this.children;
            var i = children.indexOf(stream);

            if (i !== -1) children.splice(i, 1);
        }
    }, {
        key: 'flowsTo',
        value: function flowsTo(stream) {
            this.children.push(stream);
        }
    }, {
        key: 'flowForward',
        value: function flowForward(msg, source, thisStream) {

            thisStream = thisStream || this; // allow callbacks with context instead of bind (massively faster)

            var children = thisStream.children;
            var len = children.length;

            for (var i = 0; i < len; i++) {
                var c = children[i];
                c.tell(msg, source);
            }
        }
    }, {
        key: 'doPass',
        value: function doPass(msg, source) {

            this.flowForward(msg, source);
        }
    }, {
        key: 'doFilter',
        value: function doFilter(msg, source) {

            if (!this.actionMethod(msg, source)) return;
            this.flowForward(msg, source);
        }
    }, {
        key: 'doKeep',
        value: function doKeep(msg, source) {

            this.keepMethod(this.messages, msg, this.keepCount);
            msg = this.resolveKeep(this.messages);
            this.flowForward(msg, source);
        }
    }, {
        key: 'doTransform',
        value: function doTransform(msg, source) {

            msg = this.actionMethod(msg, source);
            this.flowForward(msg, source);
        }
    }, {
        key: 'doDelay',
        value: function doDelay(msg, source) {

            // todo add destroy -> kills timeout
            // passes 'this' to avoid bind slowdown
            setTimeout(this.flowForward, this.actionMethod() || 0, msg, source, this);
        }
    }, {
        key: 'doName',
        value: function doName(msg, source) {

            source = this.actionMethod(msg, source);
            this.flowForward(msg, source);
        }
    }, {
        key: 'doRun',
        value: function doRun(msg, source) {

            this.actionMethod(msg, source);
            this.flowForward(msg, source);
        }
    }, {
        key: 'doGroup',
        value: function doGroup(msg, source) {

            var groupName = this.groupMethod(msg, source);
            var messages = this.messagesByKey[groupName] || [];
            this.messagesByKey[groupName] = this.keepMethod(messages, msg, this.keepCount);

            if (!this.primed && (this.latched = this.latched || this.readyMethod(this.messagesByKey))) {
                if (this.timerMethod) {
                    this.primed = true;
                    this.timerMethod(); // should call back this.fireContent
                } else {
                    this.fireContent();
                }
            }
        }
    }, {
        key: 'doHold',
        value: function doHold(msg, source) {

            this.keepMethod(this.messages, msg, this.keepCount);

            if (!this.primed && (this.latched = this.latched || this.readyMethod(this.messages))) {
                if (this.timerMethod) {
                    this.primed = true;
                    this.timerMethod(); // should call back this.fireContent
                } else {
                    this.fireContent();
                }
            }
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

Stream.fromData = function (data, topic, name) {

    var stream = new Stream();
    var streamName = name || topic || data.name;

    var toStream = function toStream(msg) {
        stream.tell(msg, streamName);
    };

    stream.cleanupMethod = function () {
        data.unsubscribe(toStream, topic);
    };

    data.follow(toStream, topic);

    return stream;
};

Stream.fromEvent = function (target, eventName, useCapture) {

    useCapture = !!useCapture;

    var stream = new Stream();

    var on = target.addEventListener || target.addListener || target.on;
    var off = target.removeEventListener || target.removeListener || target.off;

    var toStream = function toStream(msg) {
        stream.tell(msg, eventName);
    };

    stream.cleanupMethod = function () {
        off.call(target, eventName, toStream, useCapture);
    };

    on.call(target, eventName, toStream, useCapture);

    return stream;
};

var Frame = function () {
    function Frame(bus, streams) {
        classCallCheck(this, Frame);


        this._bus = bus;
        this._index = bus._frames.length;
        this._holding = false; //begins group, keep, schedule frames
        this._streams = streams || [];
        this._eachStream('debugFrame', this);
    }

    createClass(Frame, [{
        key: '_eachStream',
        value: function _eachStream(prop, val) {

            var streams = this._streams;
            var len = streams.length;

            for (var i = 0; i < len; i++) {

                var stream = streams[i];
                stream[prop] = val;
            }

            return this;
        }
    }, {
        key: '_eachStreamGen',


        // properties are generated by calling f to build closure states
        value: function _eachStreamGen(prop, f) {

            var streams = this._streams;
            var len = streams.length;

            for (var i = 0; i < len; i++) {

                var stream = streams[i];
                stream[prop] = f();
            }

            return this;
        }
    }, {
        key: '_eachStreamCall',
        value: function _eachStreamCall(method, val) {

            var streams = this._streams;
            var len = streams.length;

            for (var i = 0; i < len; i++) {

                var stream = streams[i];
                stream[method].call(stream, val);
            }

            return this;
        }
    }, {
        key: 'run',
        value: function run(func) {

            this._eachStream('actionMethod', func);
            this._eachStreamCall('process', 'doRun');

            return this;
        }
    }, {
        key: 'hold',
        value: function hold() {

            this._holding = true;
            this._eachStreamCall('process', 'doHold');

            return this;
        }
    }, {
        key: 'transform',
        value: function transform(fAny) {

            fAny = Func.FUNCTOR(fAny);

            this._eachStreamCall('process', 'doTransform');
            this._eachStream('actionMethod', fAny);

            return this;
        }
    }, {
        key: 'name',
        value: function name(fStr) {

            fStr = Func.FUNCTOR(fStr);

            this._eachStreamCall('process', 'doName');
            this._eachStream('actionMethod', fStr);

            return this;
        }
    }, {
        key: 'delay',
        value: function delay(fNum) {

            Func.ASSERT_NEED_ONE_ARGUMENT(arguments);

            fNum = Func.FUNCTOR(fNum);

            this._eachStream('actionMethod', fNum);
            this._eachStreamCall('process', 'doDelay');

            return this;
        }
    }, {
        key: 'filter',
        value: function filter(func) {

            this._eachStream('actionMethod', func);
            this._eachStreamCall('process', 'doFilter');

            return this;
        }
    }, {
        key: 'skipDupes',
        value: function skipDupes() {

            // const f = function() {
            //
            //     let hadMsg = false;
            //     let lastMsg;
            //
            //     return function (msg) {
            //
            //         const diff = !hadMsg || msg !== lastMsg;
            //         lastMsg = msg;
            //         hadMsg = true;
            //         return diff;
            //     }
            //
            // };

            this._eachStreamGen('actionMethod', Func.getSkipDupes);
            this._eachStreamCall('process', 'doFilter');
        }
    }, {
        key: 'group',
        value: function group(func) {

            this._holding = true;

            func = arguments.length === 1 ? Func.FUNCTOR(func) : Func.TO_SOURCE_FUNC;

            this._eachStreamCall('process', 'doGroup');
            this._eachStream('groupMethod', func);

            return this;
        }
    }, {
        key: 'last',
        value: function last(n) {

            n = Number(n) || 0;

            this._eachStream('keepMethod', Func.KEEP_LAST);
            this._eachStream('keepCount', n);

            if (!this._holding) this._eachStreamCall('process', 'doKeep');

            return this;
        }
    }, {
        key: 'first',
        value: function first(n) {

            n = Number(n) || 0;
            this._eachStream('keepMethod', Func.KEEP_FIRST);
            this._eachStream('keepCount', n);

            if (!this._holding) this._eachStreamCall('process', 'doKeep');

            return this;
        }
    }, {
        key: 'all',
        value: function all() {

            this._eachStream('keepMethod', Func.KEEP_ALL);
            this._eachStream('keepCount', -1);

            if (!this._holding) this._eachStreamCall('process', 'doKeep');

            return this;
        }
    }, {
        key: 'batch',
        value: function batch() {

            this._holding = false; // holds end with timer
            this._eachStream('timerMethod', Func.BATCH_TIMER);

            return this;
        }
    }, {
        key: 'ready',
        value: function ready(func) {

            Func.ASSERT_NEED_ONE_ARGUMENT(arguments);
            Func.ASSERT_IS_FUNCTION(func);

            this._eachStream('readyMethod', func);
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

var Bus = function () {
    function Bus(streams) {
        classCallCheck(this, Bus);


        this._frames = [];
        this._dead = false;
        this._scope = null;
        var f = new Frame(this, streams);
        this._frames.push(f);
        this._currentFrame = f;
    }

    createClass(Bus, [{
        key: 'addFrame',
        value: function addFrame() {

            var lastFrame = this._currentFrame;
            var nextFrame = this._currentFrame = new Frame(this);
            this._frames.push(nextFrame);

            _wireFrames(lastFrame, nextFrame);

            return nextFrame;
        }
    }, {
        key: 'mergeFrame',


        // create a new frame with one stream fed by all streams of the current frame

        value: function mergeFrame() {

            var mergedStream = new Stream();

            var lastFrame = this._currentFrame;
            var nextFrame = this._currentFrame = new Frame(this, [mergedStream]);
            this._frames.push(nextFrame);

            var streams = lastFrame._streams;
            var len = streams.length;
            for (var i = 0; i < len; i++) {
                var s = streams[i];
                s.flowsTo(mergedStream);
            }

            return this;
        }
    }, {
        key: 'split',


        // convert each stream into a bus, dump in array

        value: function split() {

            Func.ASSERT_NOT_HOLDING(this);
        }
    }, {
        key: 'fork',
        value: function fork() {

            Func.ASSERT_NOT_HOLDING(this);
            var fork = new Bus();
            _wireFrames(this._currentFrame, fork._currentFrame);

            return fork;
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

            this.holding ? this._currentFrame.defer() : this.addFrame().defer();
            return this;
        }
    }, {
        key: 'batch',
        value: function batch() {

            this.holding ? this._currentFrame.batch() : this.addFrame().batch();
            return this;
        }
    }, {
        key: 'group',
        value: function group() {

            Func.ASSERT_NOT_HOLDING(this);
            this.addFrame().group();
            return this;
        }
    }, {
        key: 'hold',
        value: function hold() {

            Func.ASSERT_NOT_HOLDING(this);
            this.addFrame().hold();
            return this;
        }
    }, {
        key: 'delay',
        value: function delay(num) {

            Func.ASSERT_NOT_HOLDING(this);
            this.addFrame().delay(num);
            return this;
        }
    }, {
        key: 'untilKeys',
        value: function untilKeys(keys) {

            Func.ASSERT_IS_HOLDING(this);
            this._currentFrame.untilKeys(keys);
            return this;
        }
    }, {
        key: 'untilFull',
        value: function untilFull() {

            Func.ASSERT_IS_HOLDING(this);
            this._currentFrame.untilFull();
            return this;
        }
    }, {
        key: 'willReset',
        value: function willReset() {

            Func.ASSERT_IS_HOLDING(this);
            this._currentFrame.willReset();
            return this;
        }
    }, {
        key: 'all',
        value: function all() {
            this.holding ? this._currentFrame.all() : this.addFrame().all();
            return this;
        }
    }, {
        key: 'first',
        value: function first(n) {

            this.holding ? this._currentFrame.first(n) : this.addFrame().first(n);
            return this;
        }
    }, {
        key: 'last',
        value: function last(n) {

            this.holding ? this._currentFrame.last(n) : this.addFrame().last(n);
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
            this.mergeFrame();
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
        key: 'name',
        value: function name(fStr) {

            Func.ASSERT_NEED_ONE_ARGUMENT(arguments);
            Func.ASSERT_NOT_HOLDING(this);

            this.addFrame().name(fStr);
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
        key: 'dead',
        get: function get$$1() {
            return this._dead;
        }
    }, {
        key: 'holding',
        get: function get$$1() {
            return this._currentFrame._holding;
        }
    }]);
    return Bus;
}();

// send messages from streams in one frame to new empty streams in another frame
// injects new streams to frame 2

function _wireFrames(frame1, frame2) {

    var streams1 = frame1._streams;
    var streams2 = frame2._streams;

    var len = streams1.length;

    for (var i = 0; i < len; i++) {

        var s1 = streams1[i];
        var s2 = new Stream(frame2);
        streams2.push(s2);
        s1.flowsTo(s2);
    }
}

var Catbus$1 = {};
var _batchQueue = [];

Catbus$1.fromEvent = function (target, eventName, useCapture) {

    var stream = Stream.fromEvent(target, eventName, useCapture);
    return new Bus([stream]);
};

Catbus$1.enqueue = function (stream) {
    _batchQueue.push(stream);
};

Catbus$1.scope = function (name) {
    console.log('root is ', name);
    return new Scope(name);
};

Catbus$1.flush = function () {

    var cycles = 0;
    var q = _batchQueue;
    _batchQueue = [];

    while (q.length) {

        while (q.length) {
            var stream = q.shift();
            stream.fireContent();
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
//# sourceMappingURL=bundle.umd.js.map
