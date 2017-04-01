'use strict';

var index = 42;

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

            if (!this.data._writeOnly) this._lastPacket = currentPacket;

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
    function Data(scope, name, dimension) {
        classCallCheck(this, Data);


        this._scope = scope;
        this._name = name;
        this._dimension = dimension;
        this._isAction = false;
        this._isMirror = false;
        this._isState = false;
        this._isComputed = false;
        this._dead = false;

        this._noTopicSubscriberList = new SubscriberList(null, this);
        this._wildcardSubscriberList = new SubscriberList(null, this);
        this._subscriberListsByTopic = {};
    }

    createClass(Data, [{
        key: 'destroy',
        value: function destroy() {

            if (this.dead) return;

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = this._subscriberListsByTopic[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
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

            this._scope = null;
            this._noTopicSubscriberList = null;
            this._wildcardSubscriberList = null;
            this._subscriberListsByTopic = null;
            this._dead = true;
        }
    }, {
        key: '_demandSubscriberList',
        value: function _demandSubscriberList(topic) {

            var list = this._subscriberListsByTopic[topic];

            if (list) return list;

            return this._subscriberListsByTopic[topic] = new SubscriberList(topic, this);
        }
    }, {
        key: 'follow',
        value: function follow(watcher, topic) {

            this.subscribe(watcher, topic);
            var packet = this.peek();

            if (packet) typeof watcher === 'function' ? watcher.call(watcher, packet.msg, packet) : watcher.tell(packet.msg, packet);

            return this;
        }
    }, {
        key: 'subscribe',
        value: function subscribe(watcher, topic) {

            var subscriberList = !topic ? this._noTopicSubscriberList : this._demandSubscriberList(topic);
            subscriberList.add(watcher);
        }
    }, {
        key: 'monitor',
        value: function monitor(watcher) {

            this._wildcardSubscriberList.add(watcher);
        }
    }, {
        key: 'drop',
        value: function drop(watcher, topic) {

            if (typeof topic !== 'string') {
                this._noTopicSubscriberList.remove(watcher);
            } else {
                var subscriberList = this._demandSubscriberList(topic);
                subscriberList.remove(watcher);
            }
            this._wildcardSubscriberList.remove(watcher);
        }
    }, {
        key: 'peek',
        value: function peek(topic) {

            var subscriberList = topic ? this._subscriberListsByTopic[topic] : this._noTopicSubscriberList;
            if (!subscriberList) return null;
            return subscriberList.lastPacket;
        }
    }, {
        key: 'read',
        value: function read(topic) {

            var packet = this.peek(topic);
            return packet ? packet.msg : undefined;
        }
    }, {
        key: 'silentWrite',
        value: function silentWrite(msg, topic) {
            this.write(msg, topic, true);
        }
    }, {
        key: 'write',
        value: function write(msg, topic, silently) {

            if (this.isMirror) throw new Error('Data from a mirror is read-only: ' + this.name);

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
            this.write(this.read(topic), topic);
        }
    }, {
        key: 'toggle',
        value: function toggle(topic) {
            this.write(!this.read(topic), topic);
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
        key: 'dimension',
        get: function get$$1() {
            return this._dimension;
        }
    }, {
        key: 'isState',
        get: function get$$1() {
            return this._isState;
        }
    }, {
        key: 'isMirror',
        get: function get$$1() {
            return this._isMirror;
        }
    }, {
        key: 'isAction',
        get: function get$$1() {
            return this._isAction;
        }
    }, {
        key: 'isComputed',
        get: function get$$1() {
            return this._isComputed;
        }
    }, {
        key: 'isBasic',
        get: function get$$1() {
            return !this._isAction && !this._isMirror && !this._isComputed && !this._isState;
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
var DEFAULT_DIMENSION = 'data';

var Scope = function () {
    function Scope(name) {
        classCallCheck(this, Scope);


        this._id = ++idCounter;
        this._name = name;
        this._parent = null;
        this._children = [];
        this._dimensions = {};
        this._dimensions[DEFAULT_DIMENSION] = {};
        this._valves = {};
        this._mirrors = {};
        this._dead = false;
    }

    createClass(Scope, [{
        key: '_wipe',
        value: function _wipe() {

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
                for (var _iterator2 = this._dimensions[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var dim = _step2.value;
                    var _iteratorNormalCompletion3 = true;
                    var _didIteratorError3 = false;
                    var _iteratorError3 = undefined;

                    try {
                        for (var _iterator3 = dim[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                            var data = _step3.value;

                            data.destroy();
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
    }, {
        key: 'destroy',
        value: function destroy() {

            this._wipe();
            this.parent = null;
            this._dimensions = null;
            this._children = null;
            this._valves = null;
            this._parent = null;
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
        key: 'setValves',


        // getValves(dimension){
        //
        //     dimension = dimension || DEFAULT_DIMENSION;
        //     const valves = this._valves[dimension];
        //     if(!valves)
        //         return null;
        //     return valves.map((d) => d);
        //
        // };

        value: function setValves(names, dimension) {

            dimension = dimension || DEFAULT_DIMENSION;
            var valves = this._valves[dimension] = this._valves[dimension] || {};
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
                for (var _iterator4 = names[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var _name = _step4.value;

                    valves[_name] = true;
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

            return this;
        }
    }, {
        key: '_createMirror',
        value: function _createMirror(data) {

            var dimension = data.dimension;
            var mirrors = this._mirrors[dimension] = this._mirrors[dimension] || {};
            var mirror = mirrors[data.name] = Object.create(data);
            mirror._isMirror = true;
            return mirror;
        }
    }, {
        key: '_createData',
        value: function _createData(name, dimension) {

            dimension = dimension || DEFAULT_DIMENSION;
            var byName = this._dimensions[dimension] = this._dimensions[dimension] || {};
            return byName[name] = new Data(this, name, dimension);
        }
    }, {
        key: 'data',
        value: function data(name, dimension) {

            return this.grab(name, dimension) || this._createData(name, dimension);
        }
    }, {
        key: 'action',
        value: function action(name, dimension) {

            var d = this.grab(name, dimension);

            if (d && d.isAction) return d;

            if (d) {

                if (d.isState) throw new Error('requested Action [' + name + ':' + dimension + '] is State!');else if (d.isComputed) throw new Error('requested Action [' + name + ':' + dimension + '] is Computed!');else throw new Error('requested Action [' + name + ':' + dimension + '] is Basic Data!');
            }

            var action = this._createData(name, dimension);
            action._isAction = true;
            return action;
        }
    }, {
        key: 'state',
        value: function state(name, dimension) {

            var d = this.grab(name, dimension);

            if (d && d.isState) return d;

            if (d) {

                if (d.isAction) throw new Error('requested Action [' + name + ':' + dimension + '] is Action!');else if (d.isComputed) throw new Error('requested Action [' + name + ':' + dimension + '] is Computed!');else throw new Error('requested Action [' + name + ':' + dimension + '] is Basic Data!');
            }

            var state = this.data(name, dimension);
            this._mirror(state);
            return state;
        }
    }, {
        key: 'findDataSet',
        value: function findDataSet(names, dimension, required) {

            dimension = dimension || DEFAULT_DIMENSION;

            var result = {};
            var _iteratorNormalCompletion5 = true;
            var _didIteratorError5 = false;
            var _iteratorError5 = undefined;

            try {
                for (var _iterator5 = names[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                    var _name2 = _step5.value;

                    result[_name2] = this.find(_name2, dimension, required);
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

            return result;
        }
    }, {
        key: 'readDataSet',
        value: function readDataSet(names, dimension, required) {

            var dataSet = this.findDataSet(names, dimension, required);
            var result = {};

            var _iteratorNormalCompletion6 = true;
            var _didIteratorError6 = false;
            var _iteratorError6 = undefined;

            try {
                for (var _iterator6 = dataSet[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                    var d = _step6.value;

                    if (d) {
                        var lastPacket = d.peek();
                        if (lastPacket) result[name] = lastPacket.msg;
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

            return result;
        }
    }, {
        key: 'flatten',


        // created a flattened view of all data at and above this scope

        value: function flatten(dimension) {

            dimension = dimension || DEFAULT_DIMENSION;

            var result = {};
            var whitelist = {};
            var appliedValves = false;

            var byName = this._dimensions[dimension] || {};

            for (var _name3 in byName) {
                result[_name3] = byName[_name3];
            }

            var scope = this;

            while (scope = scope._parent) {

                var _byName = scope._dimensions[dimension];
                var valves = scope._valves[dimension];
                var mirrors = scope._mirrors[dimension];

                if (!_byName) continue;

                // further restrict whitelist with each set of valves

                if (valves) {
                    if (appliedValves) {
                        for (var _name4 in whitelist) {
                            whitelist[_name4] = valves[_name4] && whitelist[_name4] && !result[_name4];
                        }
                    } else {
                        for (var _name5 in whitelist) {
                            whitelist[_name5] = valves[_name5] && !result[_name5];
                        }
                        appliedValves = true;
                    }
                }

                if (whitelist) {

                    for (var _name6 in whitelist) {

                        if (whitelist[_name6]) {
                            var data = mirrors[_name6] || _byName[_name6];
                            if (data) result[_name6] = data;
                        }
                    }
                } else {

                    for (var _name7 in _byName) {

                        if (!result[dataName]) {

                            var _data = mirrors[_name7] || _byName[_name7];
                            if (_data) result[_name7] = _data;
                        }
                    }
                }
            }

            return result;
        }
    }, {
        key: 'find',
        value: function find(name, dimension, required) {

            dimension = dimension || DEFAULT_DIMENSION;

            var localData = this.grab(name, dimension);
            if (localData) return localData;

            var scope = this;

            while (scope = scope._parent) {

                var valves = scope._valves;
                var whiteList = valves[dimension];

                // if a valve exists and the name is not white-listed, stop looking
                if (whiteList && !whiteList[name]) {
                    break;
                }

                var mirrors = scope._mirrors[dimension];
                var mirroredData = mirrors && mirrors[name];

                if (mirroredData) return mirroredData;

                var d = scope.grab(name, dimension);
                if (d) return d;
            }

            if (required) throw new Error('Required Data [' + name + ':' + dimension + '] not found!');

            return null;
        }
    }, {
        key: 'grab',


        //     findOuter(name, dimension){
        //
        //     var foundInner = false;
        //
        //     dimension = dimension || this._fixedDimension || DEFAULT_DIMENSION;
        //
        //     var localData = this.grab(name, dimension);
        //     if(localData)
        //         foundInner = true;
        //
        //     var scope = this;
        //
        //     while(scope = scope._parent){
        //
        //         var valves = scope._valves;
        //         var whiteList = valves[dimension];
        //
        //         // if a valve exists and the name is not white-listed, return null
        //         if(whiteList && !whiteList[name])
        //             return null;
        //
        //         var mirrors = scope._mirrors;
        //         var mirrorList = mirrors[dimension];
        //         var mirroredData = mirrorList && mirrorList[name];
        //
        //         if(mirroredData) {
        //             if(foundInner)
        //                 return mirroredData;
        //             else {
        //                 foundInner = true;
        //                 continue; // avoid returning the 'real' data in this scope
        //             }
        //         }
        //
        //         var d = scope.grab(name, dimension);
        //         if(d) {
        //             if(foundInner)
        //                 return d;
        //             else
        //                 foundInner = true;
        //         }
        //
        //     }
        //
        //     return null;
        //
        // };


        value: function grab(name, dimension, required) {

            dimension = dimension || DEFAULT_DIMENSION;
            var byName = this._dimensions[dimension] = this._dimensions[dimension] || {};
            var data = byName[name];

            if (!data && required) throw new Error('required Data [' + name + ':' + dimension + '] not found!');

            return data || null;
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
    }]);
    return Scope;
}();

var main = (function () {
    var s = new Scope('cow');
    console.log(s);
    console.log(s.name);
    //let s = new SubscriberList('cow', new Data())
    console.log('the answer is ' + index);
});

module.exports = main;
