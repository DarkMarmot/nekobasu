(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Catbus = factory());
}(this, (function () { 'use strict';

const DATA_TYPES = {

    ACTION:   'action',
    MIRROR:   'mirror',
    STATE:    'state',
    COMPUTED: 'computed',
    NONE:     'none',
    ANY:      'any'

};

const reverseLookup = {};

for(const p in DATA_TYPES){
    const v = DATA_TYPES[p];
    reverseLookup[v] = p;
}

function isValid(type){
    return reverseLookup.hasOwnProperty(type);
}

function ALWAYS_TRUE(){
    return true;
}

function ALWAYS_FALSE(){
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

function NOOP(){

}


function FUNCTOR(val) {
    return (typeof val === 'function') ? val : function() { return val; };
}

const Func = {


    ASSERT_NEED_ONE_ARGUMENT: function(args){
        if(args.length < 1)
            throw new Error('Method requires at least one argument.');
    },

    ASSERT_IS_FUNCTION: function(func){
        if(typeof func !== 'function')
            throw new Error('Argument [func] is not of type function.');
    },

    getAlwaysTrue: function(){
       return function(){ return true;}
    },

    getBatchTimer: function(pool){

            Catbus$1.enqueue(pool);

    },

    getSyncTimer: function(){
        return function(pool) {
            pool.release(pool);
        }
    },

    getDeferTimer: function(){
        return function(pool) {
            setTimeout(pool.release, 0, pool);
        }
    },

    getThrottleTimer: function(fNum){

        const pool = this;
        fNum = FUNCTOR(fNum);
        let wasEmpty = false;
        let timeoutId = null;
        let msgDuringTimer = false;
        const auto = pool.keep.auto;

        function timedRelease(fromTimeout){

            if(pool.stream.dead)
                return;

            const nowEmpty = pool.keep.isEmpty;

            if(!fromTimeout){
                if(!timeoutId) {
                    pool.release(pool);
                    wasEmpty = false;
                    timeoutId = setTimeout(timedRelease, fNum.call(pool), true);
                } else {
                    msgDuringTimer = true;
                }
                return;
            }

            if(nowEmpty){
                if(wasEmpty){
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

    getQueue: function(n){

        n = n || Infinity;

        const buffer = [];

        const f = function(msg, source){
            if(buffer.length < n)
                buffer.push(msg);
            return buffer;
        };

        f.isBuffer = ALWAYS_TRUE;

        f.next = function(){
            return buffer.shift();
        };

        f.isEmpty = function(){
            return buffer.length === 0;
        };

        f.content = function(){
            return buffer;
        };

        return f;

    },

    getScan: function(func, seed){

        const hasSeed = arguments.length === 2;
        let acc;
        let initMsg = true;

        const f = function(msg, source){

            if(initMsg){
                initMsg = false;
                if(hasSeed){
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

        f.next = f.content = function(){
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

    getGroup: function(groupBy){

        groupBy = groupBy || TO_SOURCE;
        const hash = {};

        const f = function(msg, source){

            const g = groupBy(msg, source);
            if(g) {
                hash[g] = msg;
            } else { // no source, copy message props into hash to merge nameless streams of key data
                for(const k in msg){
                    hash[k] = msg[k];
                }
            }

            return hash;

        };

        f.reset = function(){
            for(const k in hash){
                delete hash[k];
            }
            f.isEmpty = true;
        };

        f.next = f.content = function(){
            return hash;
        };

        return f;

    },

    getHash: function(groupBy){

        groupBy = groupBy || TO_SOURCE;
        const hash = {};

        const f = function(msg, source){

            const g = groupBy(msg, source);
            hash[g] = msg;
            return hash;

        };

        f.reset = function(){
            for(const k in hash){
                delete hash[k];
            }
            f.isEmpty = true;
        };

        f.next = f.content = function(){
            return hash;
        };

        return f;

    },


    getKeepLast: function(n){

        if(!n || n < 0) {

            let last;

            const f = function(msg, source){
                return last = msg;
            };

            f.reset = function(){
                f.isEmpty = true;
            };

            f.next = f.content = function(){
                return last;
            };

            return f;

        }

        const buffer = [];

        const f = function(msg, source){
            buffer.push(msg);
            if(buffer.length > n)
                buffer.shift();
            return buffer;
        };

        f.reset = function(){
            while(buffer.length) {
                buffer.shift();
            }
            f.isEmpty = true;
        };

        f.next = f.content = function(){
            return buffer;
        };

        return f;

    },



    getKeepFirst: function(n){

        if(!n || n < 0) {

            let firstMsg;
            let hasFirst = false;
            const f = function (msg, source) {
                return hasFirst ? firstMsg : firstMsg = msg;
            };

            f.reset = function(){
                firstMsg = false;
                f.isEmpty = true;
            };

            f.next = f.content = function(){
                return firstMsg;
            };

            return f;
        }

        const buffer = [];

        const f = function(msg, source){

            if(buffer.length < n)
                buffer.push(msg);
            return buffer;

        };

        f.reset = function(){
            while(buffer.length) {
                buffer.shift();
            }
            f.isEmpty = true;
        };

        f.next = f.content = function(){
            return buffer;
        };

        return f;

    },

    getKeepAll: function(){

        const buffer = [];

        const f = function(msg, source){
            buffer.push(msg);
            return buffer;
        };

        f.reset = function(){
            while(buffer.length) {
                buffer.shift();
            }
            f.isEmpty = true;
        };

        f.next = f.content = function(){
            return buffer;
        };

        return f;

    },

    getWhenCount: function(n) {

        let latched = false;

        const f = function(messages){
            latched = latched || messages.length >= n;
            return latched;
        };

        f.reset = function(){
            latched = false;
        };

        return f;

    },

    getWhenKeys: function(keys) {

        const keyHash = {};
        const len = keys.length;

        for(let i = 0; i < len; i++){
            const k = keys[i];
            keyHash[k] = true;
        }

        let latched = false;

        const f = function (messagesByKey) {

            if(latched)
                return true;

            for (let i = 0; i < len; i++) {
                const k = keys[i];
                if (!messagesByKey.hasOwnProperty(k))
                    return false;
            }

            return latched = true;

        };

        f.reset = function(){
            latched = false;
            for(const k in keyHash){
                delete keyHash[k];
            }
        };

        return f;

    },

    getHasKeys: function(keys, noLatch) {

        let latched = false;
        const len = keys.length;

        return function (msg) {

            if(latched || !len)
                return true;

            for(let i = 0; i < len; i++) {

                const k = keys[i];
                if(!msg.hasOwnProperty(k))
                    return false;
            }

            if(!noLatch)
                latched = true;

            return true;

        }

    },


    getSkipDupes: function() {

        let hadMsg = false;
        let lastMsg;

        return function (msg) {

            const diff = !hadMsg || msg !== lastMsg;
            lastMsg = msg;
            hadMsg = true;
            return diff;

        }

    },


    ASSERT_NOT_HOLDING: function(bus){
        if(bus.holding)
            throw new Error('Method cannot be invoked while holding messages in the frame.');
    },

    ASSERT_IS_HOLDING: function(bus){
        if(!bus.holding)
            throw new Error('Method cannot be invoked unless holding messages in the frame.');
    }

};

Func.TO_SOURCE = TO_SOURCE;
Func.TO_TOPIC = TO_TOPIC;
Func.To_MSG = TO_MSG;
Func.FUNCTOR = FUNCTOR;
Func.ALWAYS_TRUE = ALWAYS_TRUE;
Func.ALWAYS_FALSE = ALWAYS_FALSE;
Func.NOOP = NOOP;

function callMany(list, msg, source, topic){

    const len = list.length;
    for (let i = 0; i < len; i++) {
        let s = list[i];
        s.call(s, msg, source, topic);
    }

}

function callNoOne(list, msg, source, topic){}

function callOne(list, msg, source, topic){
        const s = list[0];
        s.call(s, msg, source, topic);
}

class SubscriberList {

    constructor(topic, data) {

        this._topic = topic;
        this._subscribers = [];
        this._callback = callNoOne;
        this._used = false; // true after first msg
        this._lastMsg = null;
        this._lastTopic = null;
        this._data = data;
        this._name = data._name;
        this._dead = false;

        if(data.type === DATA_TYPES.ACTION) {
            this.handle = this.handleAction;
        }
    };

    get used() { return this._used; };
    get lastMsg() { return this._lastMsg; };
    get lastTopic() { return this._lastTopic; };
    get data() { return this._data; };
    get name() { return this._name; };
    get dead() { return this._dead; };
    get topic() { return this._topic; };

    handle(msg, topic, silently){

        // if(this.dead)
        //     return;

        this._used = true;
        topic = topic || this.topic;
        let source = this.name;

        this._lastMsg = msg;
        this._lastTopic = topic;

        //let subscribers = [].concat(this._subscribers); // call original sensors in case subscriptions change mid loop

        if(!silently) {
            this._callback(this._subscribers, msg, source, topic);
        }

    };

    handleAction(msg, topic){

        topic = topic || this.topic;
        let source = this.name;

        //let subscribers = [].concat(this._subscribers); // call original sensors in case subscriptions change mid loop
        this._callback(this._subscribers, msg, source, topic);

    };



    destroy(){

        // if(this.dead)
        //     return;

        this._subscribers = null;
        this._lastMsg = null;
        this._dead = true;

    };

    add(watcher){

        const s = typeof watcher === 'function' ? watcher : function(msg, source, topic){ watcher.handle(msg, source, topic);};
        this._subscribers.push(s);
        this.determineCaller();
        return this;

    };

    remove(watcher){

        let i = this._subscribers.indexOf(watcher);

        if(i !== -1)
            this._subscribers.splice(i, 1);

        this.determineCaller();

        return this;
    };

    determineCaller(){
        const len = this._subscribers.length;
        if(len === 0){
            this._callback = callNoOne;
        } else if (len == 1){
            this._callback = callOne;
        } else {
            this._callback = callMany;
        }

    }

}

class Data {

    constructor(scope, name, type) {

        type = type || DATA_TYPES.NONE;

        if(!isValid(type))
            throw new Error('Invalid Data of type: ' + type);

        this._scope      = scope;
        this._name       = name;
        this._type       = type;
        this._dead       = false;

        this._noTopicList = new SubscriberList(null, this);
        this._wildcardSubscriberList = new SubscriberList(null, this);
        this._subscriberListsByTopic = {};

    };

    get scope() { return this._scope; };
    get name() { return this._name; };
    get type() { return this._type; };
    get dead() { return this._dead; };

    destroy(){

        // if(this.dead)
        //     this._throwDead();
        
        for(const list of this._subscriberListsByTopic.values()){
            list.destroy();
        }

        this._dead = true;

    };
    
    _demandSubscriberList(topic){

        topic = topic || null;
        let list = topic ? this._subscriberListsByTopic[topic] : this._noTopicList;

        if(list)
            return list;

        list = new SubscriberList(topic, this);
        this._subscriberListsByTopic[topic] = list;

        return list;
        
    };

    verify(expectedType){

        if(this.type === expectedType)
            return this;

        throw new Error('Data ' + this.name + ' requested as type ' + expectedType + ' exists as ' + this.type);

    };

    follow(watcher, topic){

        // if(this.dead)
        //     this._throwDead();

        const list = this.subscribe(watcher, topic);

        if(list.used)
            typeof watcher === 'function' ? watcher.call(watcher, list.lastMsg, list.source, list.lastTopic) : watcher.handle(list.lastMsg, list.source, list.lastTopic);

        return this;

    };

    subscribe(watcher, topic){

        // if(this.dead)
        //     this._throwDead();

        return this._demandSubscriberList(topic).add(watcher);

    };

    monitor(watcher){

        // if(this.dead)
        //     this._throwDead();

        this._wildcardSubscriberList.add(watcher);

        return this;

    };

    unsubscribe(watcher, topic){

        // if(this.dead)
        //     this._throwDead();

        topic = topic || null;
        this._demandSubscriberList(topic).remove(watcher);
        this._wildcardSubscriberList.remove(watcher);

        return this;

    };

    // topics(){
    //
    //     return this._subscriberListsByTopic.keys();
    //
    // };

    survey(){
        // get entire key/value store by topic:lastPacket
        throw new Error('not imp');

        // const entries = this._subscriberListsByTopic.entries();
        // const m = new Map();
        // for (const [key, value] of entries) {
        //     m.set(key, value.lastPacket);
        // }
        //
        // return m;
    };


    present(topic){

        // if(this.dead)
        //     this._throwDead();

        const subscriberList = this._demandSubscriberList(topic);
        return subscriberList.used;

    };


    read(topic) {

        // if(this.dead)
        //     this._throwDead();

        const list = this._demandSubscriberList(topic);
        return (list.used) ? list.lastMsg : undefined;

    };


    silentWrite(msg, topic){

        // if(this.dead)
        //     this._throwDead();

        this.write(msg, topic, true);

    };


    write(msg, topic, silently){

        // todo change methods to imply if statements for perf?

        // if(this.dead)
        //     this._throwDead();

        if(this.type === DATA_TYPES.MIRROR)
            throw new Error('Mirror Data: ' + this.name + ' is read-only');

        const list = this._demandSubscriberList(topic);
        list.handle(msg, topic, silently);
        this._wildcardSubscriberList.handle(msg, topic, silently);

    };


    refresh(topic){

        // if(this.dead)
        //     this._throwDead();

        const list = this._demandSubscriberList(topic);

        if(list.used)
            this.write(list.lastMsg, list.lastTopic);

        return this;

    };


    toggle(topic){

        // if(this.dead)
        //     this._throwDead();

        this.write(!this.read(topic), topic);

        return this;

    };

    _throwDead(){

        throw new Error('Data: ' + this.name + ' is already dead.');

    };

}

class Pool {

    constructor(frame, wire, def){

        this.frame = frame;
        this.wire = wire;

        function fromDef(name){

            if(!def[name])
                return null;

            const [factory, stateful, ...args] = def[name];

            return stateful ? factory.call(this, ...args) : factory;

        }

        this.keep = fromDef('keep') || Func.getKeepLast();
        this.when = fromDef('when') || Func.ALWAYS_TRUE;
        this.until = fromDef('until') || Func.ALWAYS_TRUE;
        this.timer = fromDef('timer');  // throttle, debounce, defer, batch, sync
        this.clear = fromDef('clear') || Func.ALWAYS_FALSE;

        this.isPrimed = false;


    };

    handle(frame, wire, msg, source, topic) {

        this.keep(msg, source, topic);
        if(!this.isPrimed){
            const content = this.keep.content();
            if(this.when(content)){
                this.isPrimed = true;
                this.timer(this);
            }
        }

    };

    build(prop, factory, ...args){
        this[prop] = factory.call(this, ...args);
    };

    release(pool) {

        pool = pool || this;
        const hasContent = !pool.keep.isEmpty;
        const msg = hasContent && pool.keep.next();

        if(pool.clear()){
            pool.keep.reset();
            pool.when.reset();
        }

        pool.isPrimed = false;

        if(hasContent)
            pool.frame.emit(pool.wire, msg, pool.wire.name);

    };

}

class Tap {

    constructor(def, frame){

        this.action = def.action;
        this.value = null;
        this.stateful = false;
        this.frame = frame;

    }

    handle(frame, wire, msg, source, topic){

        this.action(msg, source, topic);
        frame.emit(wire, msg, source, topic);

    }

}

function Msg(def) {

        this.action = def.action;
        this.value = null;
        this.stateful = false;

}

Msg.prototype.handle = function handle(frame, wire, msg, source, topic){

        const nextMsg = this.action(msg, source, topic);
        frame.emit(wire, nextMsg, source, topic);

};

class Source {

    constructor(def){

        this.action = def.action;
        this.value = null;
        this.stateful = false;

    }

    handle(frame, wire, msg, source, topic){

        const nextSource = this.action(msg, source, topic);
        frame.emit(wire, msg, nextSource, topic);

    }

}

function Filter(def) {

    this.action = def.action;
    this.value = null;
    this.stateful = false;

}

Filter.prototype.handle = function handle(frame, wire, msg, source, topic){

        const f = this.action;
        f(msg, source, topic) && frame.emit(wire, msg, source, topic);

};

function callback(frame, wire, msg, source, topic){

    frame.emit(wire, msg, source, topic);

}



class Delay {

    constructor(def){

        this.action = def.action;
        this.value = null;

    }


    handle(frame, wire, msg, source, topic){

        setTimeout(callback, this.action(msg, source, topic) || 0, frame, wire, msg, source, topic);

    }


}

function Scan(def) {

    this.action = def.action;
    this.value = 0;
    this.stateful = true;

}

Scan.prototype.handle = function (frame, wire, msg, source, topic){

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

class SkipDupes {

    constructor(){

        this.value = null;
        this.hadValue = false;

    }

    handle(frame, wire, msg, source, topic){

        if(!this.hadValue || this.value !== msg) {
            frame.emit(wire, msg, source, topic);
            this.hadValue = true;
            this.value = msg;
        }

    }

}

class LastN {

    constructor(n){

        this.value = [];
        this.max = n;

    }

    handle(frame, wire, msg, source, topic){

        const list = this.value;
        list.push(msg);
        if(list.length > this.max)
            list.shift();

        frame.emit(wire, list, source, topic);

    }

    reset(){
        this.value = [];
    }

    next(){
        return this.value;
    }

    content(){
        return this.value;
    }

}

class FirstN {

    constructor(n){

        this.value = [];
        this.max = n;

    }

    handle(frame, wire, msg, source, topic){

        const list = this.value;
        if(list.length < this.max)
            list.push(msg);

        frame.emit(wire, list, source, topic);

    }

    reset(){
        this.value = [];
    }

    next(){
        return this.value;
    }

    content(){
        return this.value;
    }

}

class All {

    constructor(){

        this.value = [];
        this.hasValue = false;
    }

    handle(frame, wire, msg, source, topic){

        const list = this.value;
        list.push(msg);
        frame.emit(wire, list, source, topic);

    }

    reset(){
        this.value = [];
    }

    next(){
        return this.value;
    }

    content(){
        return this.value;
    }

}

function TO_SOURCE$1(msg, source, topic) {
    return source;
}

class Group {

    constructor(def){

        this.action = def.action || TO_SOURCE$1;
        this.value = {};

    }

    handle(frame, wire, msg, source, topic){

        const g = this.action(msg, source);
        const hash = this.value;

        if(g) {
            hash[g] = msg;
        } else { // no source, copy message props into hash to merge nameless streams of key data
            for(const k in msg){
                hash[k] = msg[k];
            }
        }

        frame.emit(wire, hash, source, topic);

    }

    reset(){
        this.value = {};
    }

    next(){
        return this.value;
    }

    content(){
        return this.value;
    }

}

function Pass() {}

Pass.prototype.handle = function(frame, wire, msg, source, topic){

    frame.emit(wire, msg, source, topic);

};

// const PASS = {
//
//     handle: function(frame, wire, msg, source, topic) {
//         frame.emit(wire, msg, source, topic);
//     }
//
// };

const PASS = new Pass();

const SPLIT = {

    handle: function(frame, wire, msg, source, topic) {

        const len = msg.length || 0;
        for(let i = 0; i < len; i++){
            const chunk = msg[i];
            frame.emit(wire, chunk, source, topic);
        }

    }

};


class Handler {

    constructor(def){

        this.process = (def && def.process) ? this[def.process](def) : PASS;

    };

    handle(frame, wire, msg, source, topic) {
        this.process.handle(frame, wire, msg, source, topic);
    };

    pass(def) {
        return new Pass(def);
    }

    tap(def) {
        return new Tap(def);
    };

    msg(def) {
        return new Msg(def);
    }

    source(def) {
        return new Source(def);
    }

    filter(def) {
        return new Filter(def);
    };

    skipDupes(def) {
        return new SkipDupes(def);
    };

    delay(def) {
        return new Delay(def);
    };

    scan(def) {
        return new Scan(def);
    };

    group(def) {
        return new Group(def);
    };

    lastN(def) {
        return new LastN(def.args[0]);
    };

    firstN(def) {
        return new FirstN(def.args[0]);
    };

    all() {
        return new All();
    };


    split() {
        return SPLIT;
    };



}

class Frame {

    constructor(bus, def) {

        this._bus = bus;
        this._nextFrame = null; // frames to join or fork into
        this._index = bus._frames.length;
        this._wireMap = {}; //new WeakMap(); // wires as keys, handlers/pools as values
        this._holding = false; // begins pools allowing multiple method calls -- must close with a time operation
        this._processDef = def; // wave or pool definition

    };


    handle(wire, msg, source, topic){

        const wireId = wire._id;
        const hasWire = this._wireMap.hasOwnProperty(wireId);//this._wireMap.has(wire); //this._wireMap.hasOwnProperty(wireId); //
        if(!hasWire)
            this._wireMap[wireId] = this._createHandler(wire);
            // this._wireMap.set(wire, this._createHandler(wire));

        const handler = this._wireMap[wireId]; // this._wireMap.get(wire);
        handler.handle(this, wire, msg, source , topic);
        // handler.handle(this, wire, msg, source || wire.name , topic); //todo safe to use just source?

    };

    emit(wire, msg, source, topic){

        if(this._nextFrame)
            this._nextFrame.handle(wire, msg, source, topic);

    };

    _createHandler(wire){

        const def = this._processDef;
        return (def && def.name === 'pool') ? new Pool(this, wire, def) : new Handler(def);

    };


    get bus() {
        return this._bus;
    };

    get index() {
        return this._index;
    };

    get holding() {
        return this._holding;
    };

    target(frame) {

        this._nextFrame = frame;

    };

    destroy() {

    };


}

let _id = 0;

// const FRAME_CAP = {
//     handle: function(wire, msg, source, topic){}
// };

class Wire {

    constructor(name){

        this._id = ++_id + '';
        this.target = null; // a frame in a bus
        this.dead = false;
        this.name = name;
        this.cleanupMethod = Func.NOOP; // to cleanup subscriptions
        this.pull = Func.NOOP; // to retrieve and emit stored values from a source

    };

    handle(msg, source, topic) {

        // if(this.target)
            this.target.handle(this, msg, this.name, topic);

    };

    destroy(){

        if(!this.dead && this.target){
            this.dead = true;
            this.cleanupMethod();
        }

    };

}


Wire.fromInterval = function(delay, name){

    const wire = new Wire(name);

    const toWire = function(msg){
        wire.handle(msg);
    };

    const id = setInterval(toWire, delay);

    wire.cleanupMethod = function(){
        clearInterval(id);
    };

    return wire;

};


Wire.fromMonitor = function(data, name){

    const wire = new Wire(name);

    const toWire = function(msg, source, topic){
        wire.handle(msg, source, topic);
    };

    wire.cleanupMethod = function(){
        data.unsubscribe(toWire);
    };

    data.monitor(toWire);

    return wire;

};



Wire.fromSubscribe = function(data, topic, name, canPull){

    const wire = new Wire(name || topic || data.name);

    // const toWire = function(msg, source, topic){
    //     wire.handle(msg, source, topic);
    // };

    wire.cleanupMethod = function(){
        data.unsubscribe(wire, topic);
    };

    if(canPull){
        wire.pull = function(){
            const present = data.present(topic);
            if(present) {
                const msg = data.read(topic);
                const source = wire.name;
                wire.handle(msg, source, topic);
            }
        };
    }

   // data.subscribe(toWire, topic);
    data.subscribe(wire, topic);

    return wire;

};



Wire.fromEvent = function(target, eventName, useCapture){

    useCapture = !!useCapture;

    const wire = new Wire(eventName);

    const on = target.addEventListener || target.addListener || target.on;
    const off = target.removeEventListener || target.removeListener || target.off;

    const toWire = function(msg){
        wire.handle(msg, eventName);
    };

    wire.cleanupMethod = function(){
        off.call(target, eventName, toWire, useCapture);
    };

    on.call(target, eventName, toWire, useCapture);

    return wire;

};

class FrameMerger {

    constructor(bus) {

        this._bus = bus;
        this._nextFrame = null;
        this._index = bus._frames.length;
        this._mergingWire = new Wire();

    };


    handle(wire, msg, source, topic){

        this.emit(this._mergingWire, msg, source, topic);

    };

    emit(wire, msg, source, topic){

        if(this._nextFrame)
            this._nextFrame.handle(wire, msg, source, topic);

    };

    get bus() {
        return this._bus;
    };

    get index() {
        return this._index;
    };

    get holding() {
        return false;
    };


    target(frame) {

        this._nextFrame = frame;

    };

    destroy() {

    };


}

class FrameStateless {

    constructor(bus, def) {

        this._bus = bus;
        this._nextFrame = null;
        this._index = bus._frames.length;
        this._process = new Handler(def);

    };


    handle(wire, msg, source, topic){

        this._process.handle(this, wire, msg, source , topic);

    };

    emit(wire, msg, source, topic){

        if(this._nextFrame)
            this._nextFrame.handle(wire, msg, source, topic);

    };

    get bus() {
        return this._bus;
    };

    get index() {
        return this._index;
    };

    get holding() {
        return false;
    };

    target(frame) {

        this._nextFrame = frame;

    };

    destroy() {

    };


}

class PoolDef {

    constructor(){

        this.name = 'pool';
        this.keep  = null;
        this.when  = null;
        this.until = null;
        this.timer = null;
        this.clear = null;

    };

}

class FrameHold {

    constructor(bus) {

        this._bus = bus;
        this._nextFrame = null;
        this._index = bus._frames.length;
        this._wireMap = new WeakMap(); // wires as keys, handlers/pools as values
        this._processDef = new PoolDef(); // pool definition
        this._holding = true;

    };

    handle(wire, msg, source, topic){

        //const wireId = wire._id;
        const hasWire = this._wireMap.has(wire); //this._wireMap.hasOwnProperty(wireId); //
        if(!hasWire)
            // this._wireMap[wireId] = this._createHandler(wire);
            this._wireMap.set(wire, this._createHandler(wire));

        const handler = this._wireMap.get(wire);
        handler.handle(this, wire, msg, source || wire.name , topic);

    };

    emit(wire, msg, source, topic){

        if(this._nextFrame)
            this._nextFrame.handle(wire, msg, source, topic);

    };

    _createHandler(wire){

        const def = this._processDef;
        return new Pool(this, wire, def);

    };


    get bus() {
        return this._bus;
    };

    get index() {
        return this._index;
    };

    get holding() {
        return this._holding;
    };

    target(frame) {

        this._nextFrame = frame;

    };

    destroy() {

    };


}

class FrameForker {

    constructor(bus) {

        this._bus = bus;
        this._targets = []; // frames to join or fork into
        this._index = bus._frames.length;

    };

    // handle is a multi-emit

    handle(wire, msg, source, topic){

        const len = this._targets.length;
        for(let i = 0; i < len; i++){
            const frame = this._targets[i];
            frame.handle(wire, msg, source, topic);
        }

    };

    get bus() {
        return this._bus;
    };

    get index() {
        return this._index;
    };

    get holding() {
        return false;
    };

    target(frame) {

        this._targets.push(frame);

    };

    destroy() {

    };


}

class WaveDef {

    constructor(process, action, stateful, ...args){

        this.name = 'wave';
        this.process = process;
        this.action = action;
        this.stateful = stateful;
        this.args = args;

    };

}

const Nyan = {};

// then = applies to all words in a phrase
// watch: ^ = action, need, event, watch | read, must
// then:  run, read, attr, and, style, write, blast, filter

const operationDefs = [

    {name: 'ACTION', sym: '^',  react: true, subscribe: true, need: true, solo: true},
    {name: 'WIRE',   sym: '~',  react: true, follow: true}, // INTERCEPT
    {name: 'WATCH',  sym: null, react: true, follow: true},
    {name: 'EVENT',  sym: '@',  react: true, event: true},
    {name: 'ALIAS',  sym: '(',  then: true, solo: true},
    {name: 'METHOD', sym: '`',  then: true, solo: true},
    {name: 'READ',   sym: null, then: true, read: true},
    {name: 'ATTR',   sym: '#',  then: true, solo: true, output: true},
    {name: 'AND',    sym: '&',  then: true },
    {name: 'STYLE',  sym: '$',  then: true,  solo: true, output: true },
    {name: 'WRITE',  sym: '=',  then: true,  solo: true },
    {name: 'SPRAY',  sym: '<',  then: true },
    {name: 'RUN',    sym: '*',  then: true, output: true },
    {name: 'FILTER', sym: '>',  then: true }

];

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

const operationsBySymbol = {};
const operationsByName = {};
const symbolsByName = {};
const namesBySymbol = {};
const reactionsByName = {};
const withReactionsByName = {};
const thenByName = {};

for(let i = 0; i < operationDefs.length; i++){

    const op = operationDefs[i];
    const name = op.name;
    const sym = op.sym;

    if(sym) {
        operationsBySymbol[sym] = op;
        namesBySymbol[sym] = name;
    }

    operationsByName[name] = op;
    symbolsByName[name] = sym;

    if(op.then){
        thenByName[name] = true;
    }

    if(op.react) {
        reactionsByName[name] = true;
        withReactionsByName[name] = true;
    }

}



class NyanWord {

    constructor(name, operation, maybe, need, topic, alias, monitor, extracts){

        this.name = name;
        this.operation = operation;
        this.maybe = maybe || false;
        this.need = need || false;
        this.topic = topic || null;
        this.alias = alias || null;
        this.monitor = monitor || false;
        this.extracts = extracts && extracts.length ? extracts : null; // possible list of message property pulls
        // this.useCapture =

    }

}

let tickStack = [];

function toTickStackString(str){


    tickStack = [];
    const chunks = str.split(/([`])/);
    const strStack = [];

    let ticking = false;
    while(chunks.length){
        const c = chunks.shift();
        if(c === '`'){
            ticking = !ticking;
            strStack.push(c);
        } else {
            if(ticking) {
                tickStack.push(c);
            } else {
                strStack.push(c);
            }
        }
    }

    const result = strStack.join('');
    //console.log('stack res', result, tickStack);
    return result;
}

function parse(str, isProcess) {


    str = toTickStackString(str);

    const sentences = [];

    // split on curlies and remove empty chunks (todo optimize for parsing speed, batch loop operations?)
    let chunks = str.split(/([{}]|-})/).map(d => d.trim()).filter(d => d);

    for(let i = 0; i < chunks.length; i++){

        const chunk = chunks[i];
        const sentence = (chunk === '}' || chunk === '{' || chunk === '-}') ? chunk : parseSentence(chunk);

        if(typeof sentence === 'string' || sentence.length > 0)
            sentences.push(sentence);

    }

    return validate(sentences, isProcess);


}

function validate(sentences, isProcess){

    const cmdList = [];
    let firstPhrase = true;
    
    for(let i = 0; i < sentences.length; i++){
        const s = sentences[i];
        if(typeof s !== 'string') {

            for (let j = 0; j < s.length; j++) {
                const phrase = s[j];
                if(firstPhrase && !isProcess) {
                    validateReactPhrase(phrase);
                    firstPhrase = false;
                    cmdList.push({name: 'REACT', phrase: phrase});
                }
                else {
                    validateProcessPhrase(phrase);
                    cmdList.push({name: 'PROCESS', phrase: phrase});
                }
            }

        } else if (s === '{') {
            cmdList.push({name: 'FORK'});
        } else if (s === '}') {
            cmdList.push({name: 'BACK'});
        } else if (s === '-}') {
            cmdList.push({name: 'JOIN'});
        }
    }

    return cmdList;
}


function validateReactPhrase(phrase){

    let hasReaction = false;
    for(let i = 0; i < phrase.length; i++){

        const nw = phrase[i];
        const operation = nw.operation = nw.operation || 'WATCH';
        hasReaction = hasReaction || reactionsByName[operation];
        if(!withReactionsByName[operation])
            throw new Error('This Nyan command cannot be in a reaction!');

    }

    if(!hasReaction)
        throw new Error('Nyan commands must begin with an observation!');

}



function validateProcessPhrase(phrase){

    const firstPhrase = phrase[0];
    const firstOperation = firstPhrase.operation || 'READ';

    if(!thenByName[firstOperation])
        throw new Error('Illegal operation in phrase!'); // unknown or reactive

    for(let i = 0; i < phrase.length; i++){

        const nw = phrase[i];
        nw.operation = nw.operation || firstOperation;
        if(nw.operation !== firstOperation){

           // console.log('mult', nw.operation, firstOperation);
            throw new Error('Multiple operation types in phrase (only one allowed)!');

        }

    }

}



function parseSentence(str) {

    const result = [];
    const chunks = str.split('|').map(d => d.trim()).filter(d => d);

    for(let i = 0; i < chunks.length; i++){

        const chunk = chunks[i];
        const phrase = parsePhrase(chunk);
        result.push(phrase);

    }

    return result;

}

function parsePhrase(str) {

    const words = [];
    const rawWords = str.split(',').map(d => d.trim()).filter(d => d);

    const len = rawWords.length;

    for (let i = 0; i < len; i++) {

        const rawWord = rawWords[i];
        //console.log('word=', rawWord);
        const rawChunks = rawWord.split(/([(?!:.`)])/);
        const chunks = [];
        let inMethod = false;

        // white space is only allowed between e.g. `throttle 200`, `string meow in the hat`

        while(rawChunks.length){
            const next = rawChunks.shift();
            if(next === '`'){
                inMethod = !inMethod;
                chunks.push(next);
            } else {
                if(!inMethod){
                    const trimmed = next.trim();
                    if(trimmed)
                        chunks.push(trimmed);
                } else {
                    chunks.push(next);
                }
            }
        }

        //console.log('to:', chunks);
        const nameAndOperation = chunks.shift();
        const firstChar = rawWord[0];
        const operation = namesBySymbol[firstChar];
        const start = operation ? 1 : 0;
        const name = nameAndOperation.slice(start).trim();
        const extracts = [];

        // todo hack (rename)

        let maybe = false;
        let monitor = false;
        let topic = null;
        let alias = null;
        let need = false;

        if(operation === 'ALIAS'){
            alias = chunks.shift();
            chunks.shift(); // todo verify ')'
        } else if (operation === 'METHOD'){
                chunks.shift();
                // const next = chunks.shift();
                const next = tickStack.shift();
                const i = next.indexOf(' ');
                if(i === -1) {
                    extracts.push(next);
                } else {
                    extracts.push(next.slice(0, i));
                    if(next.length > i){
                        extracts.push(next.slice(i + 1));
                    }
                }

            while(chunks.length){ chunks.shift(); }
        }

        while(chunks.length){

            const c = chunks.shift();

            switch(c){

                case '.':

                    const prop = chunks.length && chunks[0]; // todo assert not operation
                    const silentFail = chunks.length > 1 && (chunks[1] === '?');

                    if(prop) {
                        extracts.push({name: prop, silentFail: silentFail});
                        chunks.shift(); // remove word from queue
                        if(silentFail)
                            chunks.shift(); // remove ? from queue
                    }

                    break;

                case '?':

                    maybe = true;
                    break;

                case '!':

                    need = true;
                    break;

                case ':':

                    if(chunks.length){
                        const next = chunks[0];
                        if(next === '('){
                            monitor = true;
                        } else {
                            topic = next;
                            chunks.shift(); // remove topic from queue
                        }
                    } else {
                        monitor = true;
                    }

                    break;

                case '(':

                    if(chunks.length){
                        alias = chunks.shift(); // todo assert not operation
                    }

                    break;



            }

        }

        alias = alias || topic || name;
        const nw = new NyanWord(name, operation, maybe, need, topic, alias, monitor, extracts);
        words.push(nw);

    }

    return words;

}

Nyan.parse = parse;

function getSurveyFromDataWord(scope, word){

    const data = scope.find(word.name, !word.maybe);
    return data && data.survey();

}

function throwError(msg){
    console.log('throwing ', msg);
    const e = new Error(msg);
    console.log(this, e);
    throw e;
}

function getDoSkipNamedDupes(names){

    let lastMsg = {};
    const len = names.length;

    return function doSkipNamedDupes(msg) {

        let diff = false;
        for(let i = 0; i < len; i++){
            const name = names[i];
            if(!lastMsg.hasOwnProperty(name) || lastMsg[name] !== msg[name])
                diff = true;
            lastMsg[name] = msg[name];
        }

        return diff;

    };
}


function getDoWrite(scope, word){

    const data = scope.find(word.name, !word.maybe);

    return function doWrite(msg) {
        data.write(msg, word.topic);
    };

}


function getDoSpray(scope, phrase){

    const wordByAlias = {};
    const dataByAlias = {};

    const len = phrase.length;

    for(let i = 0; i < len; i++){ // todo, validate no dupe alias in word validator for spray

        const word = phrase[i];
        const data = scope.find(word.name, !word.maybe);
        if(data) { // might not exist if optional
            wordByAlias[word.alias] = word;
            dataByAlias[word.alias] = data;
        }

    }

    return function doWrite(msg) {

        for(const alias in msg){

            const data = dataByAlias[alias];
            if(data) {
                const word = wordByAlias[alias];
                const msgPart = msg[alias];
                data.silentWrite(msgPart, word.topic);
            }

        }

        for(const alias in msg){

            const data = dataByAlias[alias];
            if(data) {
                const word = wordByAlias[alias];
                data.refresh(word.topic);
            }

        }


    };


}


function getDoRead(scope, phrase){

    const len = phrase.length;
    const firstWord = phrase[0];

    if(len > 1 || firstWord.monitor) { // if only reading word is a wildcard subscription then hash as well
        return getDoReadMultiple(scope, phrase);
    } else {
        return getDoReadSingle(scope, firstWord);
    }

}


function getDoAnd(scope, phrase) {

    return getDoReadMultiple(scope, phrase, true);

}


function getDoReadSingle(scope, word) {

    const data = scope.find(word.name, !word.maybe);
    const topic = word.topic;

    return function doReadSingle() {

        return data.read(topic);

    };

}


function getDoReadMultiple(scope, phrase, isAndOperation){


        const len = phrase.length;


        return function doReadMultiple(msg, source) {

            const result = {};

            if(isAndOperation){

                if(source){
                    result[source] = msg;
                } else {
                    for (const p in msg) {
                        result[p] = msg[p];
                    }
                }
            }

            for (let i = 0; i < len; i++) {
                const word = phrase[i];

                if(word.monitor){

                    const survey = getSurveyFromDataWord(scope, word);
                    for(const [key, value] of survey){
                        result[key] = value;
                    }

                } else {

                    const data = scope.find(word.name, !word.maybe);
                    const prop = word.monitor ? (word.alias || word.topic) : (word.alias || word.name);
                    if (data.present(word.topic))
                        result[prop] = data.read(word.topic);

                }

            }

            return result;

        };

}


// get data stream -- store data in bus, emit into stream on pull()


function getDataWire(scope, word, canPull) {

    const data = scope.find(word.name, !word.maybe);
    if(word.monitor){
        return Wire.fromMonitor(data, word.alias, canPull);
    } else {
        return Wire.fromSubscribe(data, word.topic, word.alias, canPull);
    }

}

function isObject(v) {
    if (v === null)
        return false;
    return (typeof v === 'function') || (typeof v === 'object');
}


function getEventWire(word, target){

    return Wire.fromEvent(target, word.topic, word.useCapture, word.alias);

}

function doExtracts(value, extracts) {

    let result = value;
    const len = extracts.length;

    for (let i = 0; i < len; i++) {
        const extract = extracts[i];
        if(!isObject(result)) {
            if(extract.silentFail)
                return undefined;

            throwError('Cannot access property \'' + extract.name + '\' of ' + result);

        }
        result = result[extract.name];
    }


    return result;

}

function getNeedsArray(phrase){
    return phrase.filter(word => word.operation.need).map(word => word.alias);
}

function getDoMsgHashExtract(words) {

    const len = words.length;
    const extractsByAlias = {};

    for (let i = 0; i < len; i++) {

        const word = words[i];
        extractsByAlias[word.alias] = word.extracts;

    }

    return function(msg) {

        const result = {};
        for(const alias in extractsByAlias){
            const hasProp = msg.hasOwnProperty(alias);
            if(hasProp){
                result[alias] = doExtracts(msg[alias], extractsByAlias[alias]);
            }
        }

        return result;

    };

}

function getDoMsgExtract(word) {

    const extracts = word.extracts;

    return function(msg){
        return doExtracts(msg, extracts);
    }

}


function applyReaction(scope, bus, phrase, target) { // target is some event emitter

    const need = [];
    const skipDupes = [];
    const extracts = [];

    if(phrase.length === 1 && phrase[0].operation === 'ACTION'){
        const word = phrase[0];
        bus.wire(getDataWire(scope, word, false));
        return;
    }

    for(let i = 0; i < phrase.length; i++){

        const word = phrase[i];
        const operation = word.operation;

        if(operation === 'WATCH') {
            bus.wire(getDataWire(scope, word, true));
            skipDupes.push(word.alias);
        }
        else if(operation === 'WIRE'){
            bus.wire(getDataWire(scope, word, true));
        }
        else if(operation === 'EVENT') {
            bus.wire(getEventWire(word, target));
        }

        if(word.extracts)
            extracts.push(word);

        if(word.need)
            need.push(word.alias);

    }

    // transformations are applied via named hashes for performance

    if(bus._wires.length > 1) {

        bus.merge().group().batch();

        if(extracts.length)
            bus.msg(getDoMsgHashExtract(extracts));

        if(need.length)
            bus.hasKeys(need);

        if(skipDupes.length){
            bus.filter(getDoSkipNamedDupes(skipDupes));
        }

    } else {

        if(extracts.length)
            bus.msg(getDoMsgExtract(extracts[0]));

        if(skipDupes.length)
            bus.skipDupes();

    }

}

function isTruthy(msg){
    return !!msg;
}

function isFalsey(msg){
    return !msg;
}


function applyMethod(bus, word) {

    const method = word.extracts[0];

    switch(method){

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
            bus.msg(function(){ return word.extracts[1];});
            break;

            // throttle x, debounce x, delay x, last x, first x, all

    }

}

function applyProcess(scope, bus, phrase, context, node) {

    const operation = phrase[0].operation; // same for all words in a process phrase

    if(operation === 'READ') {
        bus.msg(getDoRead(scope, phrase));
        const needs = getNeedsArray(phrase);
        if(needs.length)
            bus.whenKeys(needs);
    } else if (operation === 'AND') {
        bus.msg(getDoAnd(scope, phrase));
        const needs = getNeedsArray(phrase);
        if (needs.length)
            bus.whenKeys(needs);
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



function applyMsgProcess(bus, phrase, context){

    const len = phrase.length;

    for(let i = 0; i < len; i++) {

        const word = phrase[i];
        const name = word.name;
        const method = context[name];

        const f = function (msg, source, topic) {
            return method.call(context, msg, source, topic);
        };

        bus.msg(f);

    }

}


function applySourceProcess(bus, word){

    bus.source(word.alias);

}


function applyFilterProcess(bus, phrase, context){

    const len = phrase.length;

    for(let i = 0; i < len; i++) {

        const word = phrase[i];
        const name = word.name;
        const method = context[name];

        const f = function (msg, source, topic) {
            return method.call(context, msg, source, topic);
        };

        bus.filter(f);

    }

}

function createBus(nyan, scope, context, target){

    let bus = new Bus(scope);
    return applyNyan(nyan, bus, context, target);

}

function applyNyan(nyan, bus, context, target){

    const len = nyan.length;
    const scope = bus.scope;
    for(let i = 0; i < len; i++){

        const cmd = nyan[i];
        const name = cmd.name;
        const phrase = cmd.phrase;

        if(name === 'JOIN') {

            bus = bus.join();
            bus.merge();
            bus.group();

        } else if(name === 'FORK'){
            bus = bus.fork();
        } else if (name === 'BACK'){
            bus = bus.back();
        } else {

            if(name === 'PROCESS')
                applyProcess(scope, bus, phrase, context, target);
            else // name === 'REACT'
                applyReaction(scope, bus, phrase, target);

        }
    }

    return bus;

}

const NyanRunner = {
    applyNyan: applyNyan,
    createBus: createBus
};

class Bus {

    constructor(scope) {

        this._frames = [];
        this._wires = [];
        this._dead = false;
        this._scope = scope;
        this._children = []; // from forks
        this._parent = null;

        if(scope)
            scope._busList.push(this);

        const f = new FrameStateless(this);
        this._frames.push(f);
        this._currentFrame = f;

    };

    get children(){

        return this._children.map((d) => d);

    };

    get parent() { return this._parent; };

    set parent(newParent){

        const oldParent = this.parent;

        if(oldParent === newParent)
            return;

        if(oldParent) {
            const i = oldParent._children.indexOf(this);
            oldParent._children.splice(i, 1);
        }

        this._parent = newParent;

        if(newParent) {
            newParent._children.push(this);
        }

        return this;

    };

    get dead() {
        return this._dead;
    };

    get holding() {
        return this._currentFrame._holding;
    };

    get scope() {
        return this._scope;
    }

    // NOTE: unlike most bus methods, this one returns a new current frame (not the bus!)

    addFrame(def) {

        const lastFrame = this._currentFrame;
        const nextFrame = this._currentFrame = (def && def.stateful) ? new Frame(this, def) : new FrameStateless(this, def);
        this._frames.push(nextFrame);
        lastFrame.target(nextFrame);
        return nextFrame;

    };

    addFrameHold() {

        const lastFrame = this._currentFrame;
        const nextFrame = this._currentFrame = new FrameHold(this);
        this._frames.push(nextFrame);
        lastFrame.target(nextFrame);
        return nextFrame;

    };


    addFrameMerger() {

        const lastFrame = this._currentFrame;
        const nextFrame = this._currentFrame = new FrameMerger(this);
        this._frames.push(nextFrame);
        lastFrame.target(nextFrame);
        return nextFrame;

    };

    addFrameForker() {

        const lastFrame = this._currentFrame;
        const nextFrame = this._currentFrame = new FrameForker(this);
        this._frames.push(nextFrame);
        lastFrame.target(nextFrame);
        return nextFrame;

    };


    process(nyan, context, target){

        if(typeof nyan === 'string')
            nyan = Nyan.parse(nyan, true);

        NyanRunner.applyNyan(nyan, this, context, target);
        return this;

    }

    // create stream
    spawn(){

    }


    fork() {

        Func.ASSERT_NOT_HOLDING(this);
        const fork = new Bus(this.scope);
        fork.parent = this;
        this.addFrameForker();
        this._currentFrame.target(fork._currentFrame);

        return fork;
    };

    back() {

        if(!this._parent)
            throw new Error('Cannot exit fork, parent does not exist!');

        return this.parent;

    };

    join() {

        const parent = this.back();
        parent.add(this);
        return parent;

    }

    add(bus) {

        const frame = this.addFrame(); // wire from current bus
        bus._currentFrame.target(frame); // wire from outside bus
        return this;

    };

    defer() {
        return this.timer(Func.getDeferTimer);
    };

    batch() {
        return this.timer(Func.getBatchTimer);
    };

    sync() {
        return this.timer(Func.getSyncTimer);
    };

    throttle(fNum) {
        return this.timer(Func.getThrottleTimer, fNum);
    };

    hold() {

        Func.ASSERT_NOT_HOLDING(this);
        this.addFrameHold();
        return this;

    };

    pull() {

        const len = this._wires.length;

        for(let i = 0; i < len; i++) {
            const wire = this._wires[i];
            wire.pull();
        }

        return this;

    };

    event(target, eventName, useCapture) {

        const wire = Wire.fromEvent(target, eventName, useCapture);
        return this.wire(wire);

    };

    subscribe(data, topic, name, canPull){

        const wire = Wire.fromSubscribe(data, topic, name, canPull);
        return this.wire(wire);

    };

    interval(delay, name){

        const wire = Wire.fromInterval(delay, name);
        return this.wire(wire);

    }

    wire(wire, targetFrame) {

        wire.target = targetFrame || this._frames[0];
        this._wires.push(wire);
        return this;

    }

    monitor(data, name){

        const wire = Wire.fromMonitor(data, name);
        wire.target = this._frames[0];
        this._wires.push(wire);

        return this;

    };


    scan(func, seed){

        if(!this.holding) {
            this.addFrame(new WaveDef('scan', func, true, 0));
            return this;
        }

        return this.reduce(Func.getScan, func, seed);

    };



    scan2(func, seed){

        if(!this.holding) {
            this.addFrame(new WaveDef('scan', func, false, 0));
            return this;
        }

        return this.reduce(Func.getScan, func, seed);

    };


    delay(fNum) {

        Func.ASSERT_NEED_ONE_ARGUMENT(arguments);
        Func.ASSERT_NOT_HOLDING(this);

        this.addFrame(new WaveDef('delay', Func.FUNCTOR(fNum)));
        return this;

    };

    willReset(){

        Func.ASSERT_IS_HOLDING(this);
        return this.clear(Func.getAlwaysTrue);

    }

    whenKeys(keys) {

        return this.when(Func.getWhenKeys, true, keys);

    };

    group(by) {

        if(!this.holding) {
             this.addFrame(new WaveDef('group', null, true));
             return this;
        }
        this.reduce(Func.getGroup, by);
        return this;

    };

    groupByTopic() {

        Func.ASSERT_NOT_HOLDING(this);
        this.hold().reduce(Func.getGroup, Func.TO_TOPIC);
        return this;
    };

    all() {
        if(!this.holding) {
            this.addFrame(new WaveDef('all', null, true));
            return this;
        }
        return this.reduce(Func.getKeepAll);
    };

    first(n) {
        if(!this.holding) {
            this.addFrame(new WaveDef('firstN', null, true, n));
            return this;
        }
        return this.reduce(Func.getKeepFirst, n);
    };

    last(n) {
        if(!this.holding) {
            this.addFrame(new WaveDef('lastN', null, true, n));
            return this;
        }
        return this.reduce(Func.getKeepLast, n);
    };

    clear(factory, ...args) {
        return this._currentFrame.clear(factory, ...args);
    };

    reduce(factory, ...args) {

        const holding = this.holding;

        if(!holding){

            this.addFrame(new WaveDef('msg', factory, true, ...args));

        } else {

            const frame = this._currentFrame;
            const def = frame._processDef;
            def.keep = [factory, true, ...args];

        }

        return this;

    };

    timer(factory, stateful, ...args) {

        const holding = this.holding;
        const frame = holding ? this._currentFrame : this.addFrameHold();
        const def = frame._processDef;
        def.timer = [factory, stateful, ...args];
        this._currentFrame._holding = false; // timer ends hold

        return this;

    };

    until(factory, ...args) {

        this.holding ?
            this._currentFrame.until(factory, ...args) :
            this.addFrameHold().reduce(Func.getKeepLast).until(factory, ...args).timer(Func.getSyncTimer);
        return this;

    };

    when(factory, stateful, ...args) {

        const holding = this.holding;

        if(!holding){

            this.addFrame(new WaveDef('filter', factory, stateful, ...args));

        } else {

            const frame = this._currentFrame;
            const def = frame._processDef;
            def.when = [factory, stateful, ...args];

        }

        return this;

    };

    run(func) {

        Func.ASSERT_IS_FUNCTION(func);
        Func.ASSERT_NOT_HOLDING(this);

        this.addFrame(new WaveDef('tap', func));
        return this;

    };

    merge() {

        Func.ASSERT_NOT_HOLDING(this);

        this.addFrameMerger();
        return this;
    };

    msg(fAny) {

        Func.ASSERT_NEED_ONE_ARGUMENT(arguments);
        Func.ASSERT_NOT_HOLDING(this);

        this.addFrame(new WaveDef('msg', Func.FUNCTOR(fAny)));
        return this;

    };


    source(fStr) {

        Func.ASSERT_NEED_ONE_ARGUMENT(arguments);
        Func.ASSERT_NOT_HOLDING(this);

        this.addFrame(new WaveDef('source', Func.FUNCTOR(fStr)));
        return this;

    };


    filter(func) {

        Func.ASSERT_NEED_ONE_ARGUMENT(arguments);
        Func.ASSERT_IS_FUNCTION(func);
        Func.ASSERT_NOT_HOLDING(this);

        this.addFrame(new WaveDef('filter', func));
        return this;


    };

    split() {

        Func.ASSERT_NOT_HOLDING(this);

        this.addFrame(new WaveDef('split'));
        return this;

    };

    hasKeys(keys) {

        Func.ASSERT_NOT_HOLDING(this);
        this.addFrame(new WaveDef('filter', Func.getHasKeys(keys)));
        return this;

    };

    skipDupes() {

        Func.ASSERT_NOT_HOLDING(this);

        this.addFrame(new WaveDef('skipDupes', null, true));
        return this;

    };

    toStream() {
        // merge, fork -> immutable stream?
    };

    destroy() {

        if (this.dead)
            return this;

        this._dead = true;

        const wires = this._wires;
        const len = wires.length;
        for (let i = 0; i < len; i++) {
            const wire = wires[i];
            wire.destroy();
        }

        this._wires = null;
        return this;

    };

}

let idCounter = 0;

function _destroyEach(arr){

    const len = arr.length;
    for(let i = 0; i < len; i++){
        const item = arr[i];
        item.destroy();
    }

}


class Scope{

    constructor(name) {

        this._id = ++idCounter;
        this._name = name;
        this._parent = null;
        this._children = [];
        this._busList = [];
        this._dataList = new Map();
        this._valves = new Map();
        this._mirrors = new Map();
        this._dead = false;

    };

    get name() { return this._name; };
    get dead() { return this._dead; };

    get children(){

        return this._children.map((d) => d);

    };

    bus(strOrNyan, context, node){

        if(!strOrNyan)
            return new Bus(this);

        const nyan = (typeof strOrNyan === 'string') ? Nyan.parse(strOrNyan) : strOrNyan;
        console.log(nyan);
        return NyanRunner.createBus(nyan, this, context, node);

    };


    clear(){

        if(this._dead)
            return;

        _destroyEach(this.children); // iterates over copy to avoid losing position as children leaves their parent
        _destroyEach(this._busList);
        _destroyEach(this._dataList.values());

        this._children = [];
        this._busList = [];
        this._dataList.clear();
        this._valves.clear();
        this._mirrors.clear();

    };

    destroy(){

        this.clear();
        this.parent = null;
        this._dead = true;

    };

    createChild(name){

        let child = new Scope(name);
        child.parent = this;
        return child;

    };

    insertParent(newParent){

        newParent.parent = this.parent;
        this.parent = newParent;
        return this;

    };

    get parent() { return this._parent; };

    set parent(newParent){

        const oldParent = this.parent;

        if(oldParent === newParent)
            return;

        if(oldParent) {
            const i = oldParent._children.indexOf(this);
            oldParent._children.splice(i, 1);
        }

        this._parent = newParent;

        if(newParent) {
            newParent._children.push(this);
        }

        return this;

    };

    set valves(list){

        for(const name of list){
            this._valves.set(name, true);
        }

    }

    get valves(){ return Array.from(this._valves.keys());};


    _createMirror(data){

        const mirror = Object.create(data);
        mirror._type = DATA_TYPES.MIRROR;
        this._mirrors.set(data.name, mirror);
        return mirror;

    };

    _createData(name, type){

        const d = new Data(this, name, type);
        this._dataList.set(name, d);
        return d;

    };


    data(name){

        return this.grab(name) || this._createData(name, DATA_TYPES.NONE);

    };


    action(name){

        const d = this.grab(name);

        if(d)
            return d.verify(DATA_TYPES.ACTION);

        return this._createData(name, DATA_TYPES.ACTION);

    };


    state(name){

        const d = this.grab(name);

        if(d)
            return d.verify(DATA_TYPES.STATE);

        const state = this._createData(name, DATA_TYPES.STATE);
        this._createMirror(state);
        return state;

    };


    findDataSet(names, required){


        const result = {};
        for(const name of names){
            result[name] = this.find(name, required);
        }

        return result;

    };

    readDataSet(names, required){

        const dataSet = this.findDataSet(names, required);
        const result = {};

        for(const d of dataSet) {
            if (d) {

                if (d.present())
                    result[d.name] = d.read();
            }
        }

        return result;
    };


    // created a flattened view of all data at and above this scope

    flatten(){

        let scope = this;

        const result = new Map();
        const appliedValves = new Map();

        for(const [key, value] of scope._dataList){
            result.set(key, value);
        }

        while(scope = scope._parent){

            const dataList = scope._dataList;
            const valves = scope._valves;
            const mirrors = scope._mirrors;

            if(!dataList.size)
                continue;

            // further restrict valves with each new scope

            if(valves.size){
                if(appliedValves.size) {
                    for (const key of appliedValves.keys()) {
                        if(!valves.has(key))
                            appliedValves.delete(key);
                    }
                } else {
                    for (const [key, value] of valves.entries()) {
                        appliedValves.set(key, value);
                    }
                }
            }

            const possibles = appliedValves.size ? appliedValves : dataList;

            for(const key of possibles.keys()) {
                if (!result.has(key)) {

                    const data = mirrors.get(key) || dataList.get(key);
                    if (data)
                        result.set(key, data);
                }
            }

        }

        return result;

    };


    find(name, required){

        const localData = this.grab(name);
        if(localData)
            return localData;

        let scope = this;

        while(scope = scope._parent){

            const valves = scope._valves;

            // if valves exist and the name is not present, stop looking
            if(valves.size && !valves.has(name)){
                break;
            }

            const mirror = scope._mirrors.get(name);

            if(mirror)
                return mirror;

            const d = scope.grab(name);

            if(d)
                return d;

        }

        if(required)
            throw new Error('Required data: ' + name + ' not found!');

        return null;

    };

    findOuter(name, required){

        let foundInner = false;
        const localData = this.grab(name);
        if(localData)
            foundInner = true;

        let scope = this;

        while(scope = scope._parent){

            const valves = scope._valves;

            // if valves exist and the name is not present, stop looking
            if(valves.size && !valves.has(name)){
                break;
            }

            const mirror = scope._mirrors.get(name);

            if(mirror) {

                if(foundInner)
                    return mirror;

                foundInner = true;
                continue;
            }

            const d = scope.grab(name);

            if(d) {

                if(foundInner)
                    return d;

                foundInner = true;
            }

        }

        if(required)
            throw new Error('Required data: ' + name + ' not found!');

        return null;

    };

    grab(name, required) {

        const data = this._dataList.get(name);

        if(!data && required)
            throw new Error('Required Data: ' + name + ' not found!');

        return data || null;

    };

    transaction(writes){

        if(Array.isArray(writes))
            return this._multiWriteArray(writes);
        else if(typeof writes === 'object')
            return this._multiWriteHash(writes);

        throw new Error('Write values must be in an array of object hash.');

    };

    // write {name, topic, value} objects as a transaction
    _multiWriteArray(writeArray){

        const list = [];

        for(const w of writeArray){
            const d = this.find(w.name);
            d.silentWrite(w.value, w.topic);
            list.push(d);
        }

        let i = 0;
        for(const d of list){
            const w = writeArray[i];
            d.refresh(w.topic);
        }

        return this;

    };


    // write key-values as a transaction
    _multiWriteHash(writeHash){

        const list = [];

        for(const k in writeHash){
            const v = writeHash[k];
            const d = this.find(k);
            d.silentWrite(v);
            list.push(d);
        }

        for(const d of list){
            d.refresh();
        }

        return this;

    };

}

const Catbus$1 = {};

let _batchQueue = [];
let _primed = false;

Catbus$1.bus = function(){
    return new Bus();
};


Catbus$1.fromEvent = function(target, eventName, useCapture){

    const bus = new Bus();
    bus.event(target, eventName, useCapture);
    return bus;

};

// todo stable output queue -- output pools go in a queue that runs after the batch q is cleared, thus run once only

Catbus$1.enqueue = function(pool){

    _batchQueue.push(pool);

    if(!_primed) { // register to flush the queue
        _primed = true;
        if (typeof window !== 'undefined' && window.requestAnimationFrame) requestAnimationFrame(Catbus$1.flush);
        else process.nextTick(Catbus$1.flush);
    }

};


Catbus$1.createChild = Catbus$1.scope = function(name){

    return new Scope(name);

};


Catbus$1.flush = function(){

    _primed = false;

    let cycles = 0;
    let q = _batchQueue;
    _batchQueue = [];

    while(q.length) {

        while (q.length) {
            const pool = q.shift();
            pool.release();
        }

        q = _batchQueue;
        _batchQueue = [];

        cycles++;
        if(cycles > 10)
            throw new Error('Flush batch cycling loop > 10.', q);

    }

};

// export default () => {
//     let s = new Scope('cow');
//     return s;
// }

return Catbus$1;

})));
//# sourceMappingURL=catbus.umd.js.map
