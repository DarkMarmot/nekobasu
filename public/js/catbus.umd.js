(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Catbus = factory());
}(this, (function () { 'use strict';

function isPrivate(name){
    return name[0] === '_'  || (isAction(name) && name[1] === '_');
}

function isAction(name){
    return name[0] === '$';
}

class Data {

    // should only be created via Scope methods

    constructor(scope, name) {

        this._scope       = scope;
        this._action      = isAction(name);
        this._name        = name;
        this._dead        = false;
        this._value       = undefined;
        this._present     = false;  // true if a value has been received
        this._private     = isPrivate(name);
        this._readable    = !this._action;
        this._writable    = true; // false when mirrored or calculated?
        this._subscribers = [];

    };

    get scope() { return this._scope; };
    get name() { return this._name; };
    get dead() { return this._dead; };
    get present() { return this._present; };
    get private() { return this._private; };

    destroy(){

        this._scope = null;
        this._subscribers = null;
        this._dead = true;

    };

    subscribe(listener, pull){

        this._subscribers.unshift(listener);

        if(pull && this._present)
            listener.call(null, this._value, this._name);

        return this;

    };

    unsubscribe(listener){


        let i = this._subscribers.indexOf(listener);

        if(i !== -1)
            this._subscribers.splice(i, 1);

        return this;

    };

    silentWrite(msg){

        this.write(msg, true);

    };

    read(){

        return this._value;

    };

    write(msg, silent){

        _ASSERT_WRITE_ACCESS(this);

        if(!this._action) { // states store the last value seen
            this._present = true;
            this._value = msg;
        }

        if(!silent) {
            let i = this._subscribers.length;
            while (i--) {
                this._subscribers[i].call(null, msg, this._name);
            }
        }

    };

    refresh(){

        if(this._present)
            this.write(this._value);

        return this;

    };

    toggle(){

        this.write(!this._value);

        return this;

    };

}


function _ASSERT_WRITE_ACCESS(d){
    if(!d._writable)
        throw new Error('States accessed from below are read-only. Named: ' + d._name);
}

function NoopSource() {
    this.name = '';
}

NoopSource.prototype.init = function init() {};
NoopSource.prototype.pull = function pull() {};
NoopSource.prototype.destroy = function destroy() {};


const stubs = {init:'init', pull:'pull', destroy:'destroy'};

NoopSource.prototype.addStubs = function addStubs(sourceClass) {

    for(const name in stubs){
        const ref = stubs[name];
        const f = NoopSource.prototype[ref];
        if(typeof sourceClass.prototype[name] !== 'function'){
            sourceClass.prototype[name] = f;
        }
    }

};

const NOOP_SOURCE = new NoopSource();

function NoopStream() {
    this.name = '';
}

NoopStream.prototype.handle = function handle(msg, source) {};
NoopStream.prototype.reset = function reset() {};
NoopStream.prototype.emit = function emit() {};

NoopStream.prototype.resetDefault = function reset() {
    this.next.reset();
};

const stubs$1 = {handle:'handle', reset:'resetDefault', emit:'emit'};

NoopStream.prototype.addStubs = function addStubs(streamClass) {

    for(const name in stubs$1){
        const ref = stubs$1[name];
        const f = NoopStream.prototype[ref];
        if(typeof streamClass.prototype[name] !== 'function'){
            streamClass.prototype[name] = f;
        }
    }

};

const NOOP_STREAM = new NoopStream();

function PassStream(name) {

    this.name = name || '';
    this.next = NOOP_STREAM;

}

PassStream.prototype.handle = function passHandle(msg, source) {

    const n = this.name || source;
    this.next.handle(msg, n);

};

NOOP_STREAM.addStubs(PassStream);

function SubscribeSource(name, data, canPull){

    this.name = name;
    this.data = data;
    this.canPull = canPull;
    const stream = this.stream = new PassStream(name);
    this.callback = function(msg, source){ stream.handle(msg, source); };
    data.subscribe(this.callback);

}


SubscribeSource.prototype.pull = function pull(){

    !this.dead && this.canPull && this.emit();

};


SubscribeSource.prototype.emit = function emit(){

    const data = this.data;

    if(data.present) {
        const stream = this.stream;
        const msg = data.read();
        const source = this.name;
        stream.handle(msg, source);
    }

};


SubscribeSource.prototype.destroy = function destroy(){

    const callback = this.callback;

    this.data.unsubscribe(callback);
    this.dead = true;

};


NOOP_SOURCE.addStubs(SubscribeSource);

function EventSource(name, target, eventName, useCapture){

    function toStream(msg){
        stream.handle(msg, eventName, null);
    }

    this.name = name;
    this.target = target;
    this.eventName = eventName;
    this.useCapture = !!useCapture;
    this.on = target.addEventListener || target.addListener || target.on;
    this.off = target.removeEventListener || target.removeListener || target.off;
    this.stream = new PassStream(name);
    this.callback = toStream;
    const stream = this.stream;

    this.on.call(target, eventName, toStream, useCapture);

}



EventSource.prototype.destroy = function destroy(){

    this.off.call(this.target, this.eventName, this.callback, this.useCapture);
    this.dead = true;

};


NOOP_SOURCE.addStubs(EventSource);

function ForkStream(name, fork) {

    this.name = name;
    this.next = NOOP_STREAM;
    this.fork = fork;

}

ForkStream.prototype.handle = function handle(msg, source) {

    const n = this.name;
    this.next.handle(msg, n);
    this.fork.handle(msg, n);

};

NOOP_STREAM.addStubs(ForkStream);

function BatchStream(name) {

    this.name = name;
    this.next = NOOP_STREAM;
    this.msg = undefined;
    this.latched = false;

}

BatchStream.prototype.handle = function handle(msg, source) {

    this.msg = msg;

    if(!this.latched){
        this.latched = true;
        Catbus.enqueue(this);
    }

};

BatchStream.prototype.emit = function emit() { // called from enqueue scheduler

    const msg = this.msg;
    const source = this.name;

    this.next.handle(msg, source);

};


BatchStream.prototype.reset = function reset() {

    this.latched = false;
    this.msg = undefined;

    // doesn't continue on as in default

};

NOOP_STREAM.addStubs(BatchStream);

function ResetStream(name, head) {

    this.head = head; // stream at the head of the reset process
    this.name = name;
    this.next = NOOP_STREAM;

}

ResetStream.prototype.handle = function handle(msg, source) {

    this.next.handle(msg, source);
    this.head.reset(msg, source);

};

ResetStream.prototype.reset = function(){
    // catch reset from head, does not continue
};

function IDENTITY$1(d) { return d; }


function TapStream(name, f) {
    this.name = name;
    this.f = f || IDENTITY$1;
    this.next = NOOP_STREAM;
}

TapStream.prototype.handle = function handle(msg, source) {

    const n = this.name || source;
    const f = this.f;
    f(msg, n);
    this.next.handle(msg, n);

};

NOOP_STREAM.addStubs(TapStream);

function IDENTITY$2(msg, source) { return msg; }


function MsgStream(name, f, context) {

    this.name = name;
    this.f = f || IDENTITY$2;
    this.context = context;
    this.next = NOOP_STREAM;

}


MsgStream.prototype.handle = function msgHandle(msg, source) {

    const f = this.f;
    this.next.handle(f.call(this.context, msg, source), source);

};

NOOP_STREAM.addStubs(MsgStream);

function IDENTITY$3(d) { return d; }


function FilterStream(name, f, context) {

    this.name = name;
    this.f = f || IDENTITY$3;
    this.context = context || null;
    this.next = NOOP_STREAM;

}

FilterStream.prototype.handle = function filterHandle(msg, source) {

    const f = this.f;
    f.call(this.context, msg, source) && this.next.handle(msg, source);

};

NOOP_STREAM.addStubs(FilterStream);

function IS_PRIMITIVE_EQUAL(a, b) {
    return a === b && typeof a !== 'object' && typeof a !== 'function';
}


function SkipStream(name) {

    this.name = name;
    this.msg = undefined;
    this.hasValue = true;
    this.next = NOOP_STREAM;

}

SkipStream.prototype.handle = function handle(msg, source) {

    if(!this.hasValue) {

        this.hasValue = true;
        this.msg = msg;
        this.next.handle(msg, source);

    } else if (!IS_PRIMITIVE_EQUAL(this.msg, msg)) {

        this.msg = msg;
        this.next.handle(msg, source);

    }
};

NOOP_STREAM.addStubs(SkipStream);

function LastNStream(name, count) {

    this.name = name;
    this.count = count || 1;
    this.next = NOOP_STREAM;
    this.msg = [];

}

LastNStream.prototype.handle = function handle(msg, source) {

    const c = this.count;
    const m = this.msg;
    const n = this.name || source;

    m.push(msg);
    if(m.length > c)
        m.shift();

    this.next.handle(m, n);

};

LastNStream.prototype.reset = function(msg, source){

    this.msg = [];
    this.next.reset();

};

NOOP_STREAM.addStubs(LastNStream);

function FirstNStream(name, count) {

    this.name = name;
    this.count = count || 1;
    this.next = NOOP_STREAM;
    this.msg = [];

}

FirstNStream.prototype.handle = function handle(msg, source) {

    const c = this.count;
    const m = this.msg;
    const n = this.name || source;

    if(m.length < c)
        m.push(msg);

    this.next.handle(m, n);

};

FirstNStream.prototype.reset = function(msg, source){

    this.msg = [];

};

NOOP_STREAM.addStubs(FirstNStream);

function AllStream(name) {

    this.name = name;
    this.next = NOOP_STREAM;
    this.msg = [];

}

AllStream.prototype.handle = function handle(msg, source) {

    const m = this.msg;
    const n = this.name || source;

    m.push(msg);

    this.next.handle(m, n);

};

AllStream.prototype.reset = function(msg, source){

    this.msg = [];

};

NOOP_STREAM.addStubs(AllStream);

const FUNCTOR$1 = function(d) {
    return typeof d === 'function' ? d : function() { return d;};
};

function IMMEDIATE(msg, source) { return 0; }

function callback(stream, msg, source){
    const n = stream.name || source;
    stream.next.handle(msg, n);
}

function DelayStream(name, f) {

    this.name = name;
    this.f = arguments.length ? FUNCTOR$1(f) : IMMEDIATE;
    this.next = NOOP_STREAM;

}

DelayStream.prototype.handle = function handle(msg, source) {

    const delay = this.f(msg, source);
    setTimeout(callback, delay, this, msg, source);

};

NOOP_STREAM.addStubs(DelayStream);

function BY_SOURCE(msg, source) { return source; }

const FUNCTOR$2 = function(d) {
    return typeof d === 'function' ? d : function() { return d;};
};

function GroupStream(name, f, seed) {

    this.name = name;
    this.f = f || BY_SOURCE;
    this.seed = arguments.length === 3 ? FUNCTOR$2(seed) : FUNCTOR$2({});
    this.next = NOOP_STREAM;
    this.msg = this.seed();

}

GroupStream.prototype.handle = function handle(msg, source) {

    const f = this.f;
    const v = f(msg, source);
    const n = this.name || source;
    const m = this.msg;

    if(v){
        m[v] = msg;
    } else {
        for(const k in msg){
            m[k] = msg[k];
        }
    }

    this.next.handle(m, n);

};

GroupStream.prototype.reset = function reset(msg) {

    const m = this.msg = this.seed(msg);
    this.next.reset(m);

};

NOOP_STREAM.addStubs(GroupStream);

function TRUE() { return true; }


function LatchStream(name, f) {

    this.name = name;
    this.f = f || TRUE;
    this.next = NOOP_STREAM;
    this.latched = false;

}

LatchStream.prototype.handle = function handle(msg, source) {

    const n = this.name;

    if(this.latched){
        this.next.handle(msg, n);
        return;
    }

    const f = this.f;
    const v = f(msg, source);

    if(v) {
        this.latched = true;
        this.next.handle(msg, n);
    }

};

LatchStream.prototype.reset = function(seed){
    this.latched = false;
    this.next.reset(seed);
};

NOOP_STREAM.addStubs(LatchStream);

function ScanStream(name, f) {

    this.name = name;
    this.f = f;
    this.hasValue = false;
    this.next = NOOP_STREAM;
    this.value = undefined;

}


ScanStream.prototype.handle = function handle(msg, source) {

    const f = this.f;
    this.value = this.hasValue ? f(this.value, msg, source) : msg;
    this.next.handle(this.value, source);

};

ScanStream.prototype.reset = function reset() {

    this.hasValue = false;
    this.value = undefined;
    this.next.reset();

};

NOOP_STREAM.addStubs(ScanStream);

const FUNCTOR$3 = function(d) {
    return typeof d === 'function' ? d : function() { return d;};
};

function ScanWithSeedStream(name, f, seed) {

    this.name = name;
    this.f = f;
    this.seed = FUNCTOR$3(seed);
    this.next = NOOP_STREAM;
    this.value = this.seed();

}



ScanWithSeedStream.prototype.handle = function scanWithSeedHandle(msg, source) {

    const f = this.f;
    this.value = f(this.value, msg, source);
    this.next.handle(this.value, source);

};

ScanWithSeedStream.prototype.reset = function reset(msg) {

    this.value = this.seed(msg);
    this.next.reset(this.value);

};

NOOP_STREAM.addStubs(ScanWithSeedStream);




// const scanStreamBuilder = function(f, seed) {
//     const hasSeed = arguments.length === 2;
//     return function(name) {
//         return hasSeed? new ScanWithSeedStream(name, f, seed) : new ScanStream(name, f);
//     }
// };

function SplitStream(name) {

    this.name = name;
    this.next = NOOP_STREAM;

}


SplitStream.prototype.handle = function splitHandle(msg, source) {

    if(Array.isArray(msg)){
        this.withArray(msg, source);
    } else {
        this.withIteration(msg, source);
    }

};


SplitStream.prototype.withArray = function(msg, source){

    const len = msg.length;

    for(let i = 0; i < len; ++i){
        this.next.handle(msg[i], source);
    }

};



SplitStream.prototype.withIteration = function(msg, source){

    const next = this.next;

    for(const m of msg){
        next.handle(m, source);
    }

};

NOOP_STREAM.addStubs(SplitStream);

function WriteStream(name, data) {
    this.name = name;
    this.data = data;
    this.next = NOOP_STREAM;
}

WriteStream.prototype.handle = function handle(msg, source) {

    this.data.write(msg);
    this.next.handle(msg, source);

};

NOOP_STREAM.addStubs(WriteStream);

function IDENTITY$4(d) { return d; }


function FilterMapStream(name, f, m, context) {

    this.name = name || '';
    this.f = f || IDENTITY$4;
    this.m = m || IDENTITY$4;
    this.context = context || null;
    this.next = NOOP_STREAM;

}

FilterMapStream.prototype.handle = function filterHandle(msg, source) {

    const f = this.f;
    const m = this.m;
    f.call(this.context, msg, source) && this.next.handle(
        m.call(this.context, msg, source));

};

NOOP_STREAM.addStubs(FilterMapStream);

function PriorStream(name) {

    this.name = name;
    this.values = [];
    this.next = NOOP_STREAM;

}

PriorStream.prototype.handle = function handle(msg, source) {

    const arr = this.values;

    arr.push(msg);

    if(arr.length === 1)
        return;

    if(arr.length > 2)
        arr.shift();

    this.next.handle(arr[0], source);

};

PriorStream.prototype.reset = function(msg, source){

    this.msg = [];
    this.next.reset();

};

NOOP_STREAM.addStubs(PriorStream);

function FUNCTOR$4(d) {
    return typeof d === 'function' ? d : function() { return d; };
}

function ReduceStream(name, f, seed) {

    this.name = name;
    this.seed = FUNCTOR$4(seed);
    this.v = this.seed() || 0;
    this.f = f;
    this.next = NOOP_STREAM;

}


ReduceStream.prototype.reset = function(){

    this.v = this.seed() || 0;
    this.next.reset();

};

ReduceStream.prototype.handle = function(msg, source){

    const f = this.f;
    this.next.handle(this.v = f(msg, this.v), source);

};

NOOP_STREAM.addStubs(ReduceStream);

function SkipNStream(name, count) {

    this.name = name;
    this.count = count || 0;
    this.next = NOOP_STREAM;
    this.seen = 0;

}

SkipNStream.prototype.handle = function handle(msg, source) {

    const c = this.count;
    const s = this.seen;

    if(this.seen < c){
        this.seen = s + 1;
    } else {
        this.next.handle(msg, source);
    }

};

SkipNStream.prototype.reset = function(){

    this.seen = 0;

};

NOOP_STREAM.addStubs(SkipNStream);

function TakeNStream(name, count) {

    this.name = name;
    this.count = count || 0;
    this.next = NOOP_STREAM;
    this.seen = 0;

}

TakeNStream.prototype.handle = function handle(msg, source) {

    const c = this.count;
    const s = this.seen;

    if(this.seen < c){
        this.seen = s + 1;
        this.next.handle(msg, source);
    }

};

TakeNStream.prototype.reset = function(){

    this.seen = 0;

};

NOOP_STREAM.addStubs(TakeNStream);

function Spork(bus) {

    this.bus = bus;
    this.streams = [];
    this.first = NOOP_STREAM;
    this.last = NOOP_STREAM;
    this.initialized = false;

}

Spork.prototype.handle = function(msg, source) {

    this.first.reset();
    this._split(msg, source);
    this.last.handle(this.last.v, source);

};


Spork.prototype.withArray = function withArray(msg, source){

    const len = msg.length;

    for(let i = 0; i < len; ++i){
        this.first.handle(msg[i], source);
    }

};

Spork.prototype.withIteration = function withIteration(msg, source){

    const first = this.first;
    for(const i of msg){
        first.handle(i, source);
    }

};

Spork.prototype._split = function(msg, source){

    if(Array.isArray(msg)){
        this.withArray(msg, source);
    } else {
        this.withIteration(msg, source);
    }

};

Spork.prototype._extend = function(stream) {

    if(!this.initialized){
        this.initialized = true;
        this.first = stream;
        this.last = stream;
    } else {
        this.streams.push(stream);
        this.last.next = stream;
        this.last = stream;
    }

};

Spork.prototype.msg = function msg(f) {
    this._extend(new MsgStream('', f));
    return this;
};

Spork.prototype.skipDupes = function skipDupes() {
    this._extend(new SkipStream(''));
    return this;
};

Spork.prototype.skip = function skip(n) {
    this._extend(new SkipNStream('', n));
    return this;
};

Spork.prototype.take = function take(n) {
    this._extend(new TakeNStream('', n));
    return this;
};


Spork.prototype.reduce = function reduce(f, seed) {
    this._extend(new ReduceStream('', f, seed));
    this.bus._spork = null;
    return this.bus;
};

Spork.prototype.filter = function filter(f) {
    this._extend(new FilterStream('', f));
    return this;
};

Spork.prototype.filterMap = function filterMap(f, m) {
    this._extend(new FilterMapStream('', f, m));
    return this;
};

class Frame {

    constructor(bus) {

        this.bus = bus;
        this.index = bus._frames.length;
        this.streams = [];

    };


}

const Nyan = {};

// then = applies to all words in a phrase
// watch: ^ = action, need, event, watch | read, must
// then:  run, read, attr, and, style, write, blast, filter

const operationDefs = [

    // config is a dash
    // . is a prop
    {name: 'ACTION', sym: '^',  react: true, subscribe: true, need: true, solo: true},
    {name: 'WIRE',   sym: '~',  react: true, follow: true}, // INTERCEPT
    {name: 'WATCH',  sym: null, react: true, follow: true},
    {name: 'EVENT',  sym: '@',  react: true, event: true},
    {name: 'ALIAS',  sym: '(',  then: true, solo: true},
    {name: 'METHOD', sym: '`',  then: true, solo: true},
    {name: 'READ',   sym: null, then: true, read: true},
    {name: 'ATTR',   sym: '#',  then: true, solo: true, output: true},
    {name: 'AND',    sym: '&',  then: true },
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

    constructor(name, operation, maybe, need, alias, monitor, extracts){

        this.name = name;
        this.operation = operation;
        this.maybe = maybe || false;
        this.need = need || false;
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

                case '(':

                    if(chunks.length){
                        alias = chunks.shift(); // todo assert not operation
                    }

                    break;



            }

        }

        alias = alias || name;
        const nw = new NyanWord(name, operation, maybe, need, alias, monitor, extracts);
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
                const msgPart = msg[alias];
                data.silentWrite(msgPart);
            }

        }

        for(const alias in msg){

            const data = dataByAlias[alias];
            if(data) {
                data.refresh();
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

    return function doReadSingle() {

        return data.read();

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
                    const prop = word.alias || word.name;
                    if (data.present)
                        result[prop] = data.read();

                }

            }

            return result;

        };

}


// get data stream -- store data in bus, emit into stream on pull()


function addDataSource(bus, scope, word) {

    const data = scope.find(word.name, !word.maybe);
    bus.addSubscribe(word.alias, data);

}

function addEventSource(bus, word, target) {

    bus.addEvent(word.alias, target, word.useCapture);

}


function isObject(v) {
    if (v === null)
        return false;
    return (typeof v === 'function') || (typeof v === 'object');
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


function applyReaction(scope, bus, phrase, target, lookup) { // target is some event emitter

    const need = [];
    const skipDupes = [];
    const extracts = [];

    if(phrase.length === 1 && phrase[0].operation === 'ACTION'){
        const word = phrase[0];
        addDataSource(bus, scope, word);
        return;
    }

    for(let i = 0; i < phrase.length; i++){

        const word = phrase[i];
        const operation = word.operation;

        if(operation === 'WATCH') {
            addDataSource(bus, scope, word);
            skipDupes.push(word.alias);
        }
        else if(operation === 'WIRE'){
            addDataSource(bus, scope, word);
        }
        else if(operation === 'EVENT') {
            addEventSource(bus, word, target);
        }

        if(word.extracts)
            extracts.push(word);

        if(word.need)
            need.push(word.alias);

    }

    // transformations are applied via named hashes for performance

    if(bus._sources.length > 1) {

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

function applyProcess(scope, bus, phrase, context, node, lookup) {

    const operation = phrase[0].operation; // same for all words in a process phrase

    if(operation === 'READ') {
        bus.msg(getDoRead(scope, phrase));
        const needs = getNeedsArray(phrase);
        if(needs.length)
            bus.hasKeys(needs);
    } else if (operation === 'AND') {
        bus.msg(getDoAnd(scope, phrase));
        const needs = getNeedsArray(phrase);
        if (needs.length)
            bus.hasKeys(needs);
    } else if (operation === 'METHOD') {
        applyMethod(bus, phrase[0]);
    } else if (operation === 'FILTER') {
        applyFilterProcess(bus, phrase, context, lookup);
    } else if (operation === 'RUN') {
        applyMsgProcess(bus, phrase, context, lookup);
    } else if (operation === 'ALIAS') {
        applySourceProcess(bus, phrase[0]);
    } else if (operation === 'WRITE') {
        applyWriteProcess(bus, scope, phrase[0]);
    } else if (operation === 'SPRAY') {

        bus.run(getDoSpray(scope, phrase)); // todo validate that writes do not contain words in reacts

    } else if (operation === 'ATTR') {
        // #attr:thing, #style:moo, #prop:innerText, #class
    }

}


function applyWriteProcess(bus, scope, word){

    const data = scope.find(word.name, !word.maybe);
    bus.write(data);

}

function applyMsgProcess(bus, phrase, context, lookup){

    const len = phrase.length;
    lookup = lookup || context;

    for(let i = 0; i < len; i++) {

        const word = phrase[i];
        const name = word.name;
        const method = lookup[name];

        bus.msg(method, context);

    }

}





function applySourceProcess(bus, word){

    bus.source(word.alias);

}


function applyFilterProcess(bus, phrase, context, lookup){

    const len = phrase.length;
    lookup = lookup || context;

    for(let i = 0; i < len; i++) {

        const word = phrase[i];
        const name = word.name;
        const method = lookup[name];

        bus.filter(method, context);

    }

}

function createBus(nyan, scope, context, target, lookup){

    let bus = new Bus(scope);
    return applyNyan(nyan, bus, context, target, lookup);

}

function applyNyan(nyan, bus, context, target, lookup){

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
                applyProcess(scope, bus, phrase, context, target, lookup);
            else // name === 'REACT'
                applyReaction(scope, bus, phrase, target, lookup);

        }
    }

    return bus;

}

const NyanRunner = {
    applyNyan: applyNyan,
    createBus: createBus
};

const FUNCTOR = function(d) {
    return typeof d === 'function' ? d : function() { return d;};
};

const batchStreamBuilder = function() {
    return function(name) {
        return new BatchStream(name);
    }
};

const resetStreamBuilder = function(head) {
    return function(name) {
        return new ResetStream(name, head);
    }
};

const tapStreamBuilder = function(f) {
    return function(name) {
        return new TapStream(name, f);
    }
};

const msgStreamBuilder = function(f, context) {
    return function(name) {
        return new MsgStream(name, f, context);
    }
};

const filterStreamBuilder = function(f, context) {
    return function(name) {
        return new FilterStream(name, f, context);
    }
};

const skipStreamBuilder = function(f) {
    return function(name) {
        return new SkipStream(name, f);
    }
};

const lastNStreamBuilder = function(count) {
    return function(name) {
        return new LastNStream(name, count);
    }
};

const priorStreamBuilder = function() {
    return function(name) {
        return new PriorStream(name);
    }
};

const firstNStreamBuilder = function(count) {
    return function(name) {
        return new FirstNStream(name, count);
    }
};

const allStreamBuilder = function() {
    return function(name) {
        return new AllStream(name);
    }
};

const delayStreamBuilder = function(delay) {
    return function(name) {
        return new DelayStream(name, delay);
    }
};

const groupStreamBuilder = function(by) {
    return function(name) {
        return new GroupStream(name, by);
    }
};

const nameStreamBuilder = function(name) {
    return function() {
        return new PassStream(name);
    }
};

const latchStreamBuilder = function(f) {
    return function(name) {
        return new LatchStream(name, f);
    }
};

const scanStreamBuilder = function(f, seed) {
    const hasSeed = arguments.length === 2;
    return function(name) {
        return hasSeed ?
            new ScanWithSeedStream(name, f, seed) : new ScanStream(name, f);
    }
};

const splitStreamBuilder = function() {
    return function(name) {
        return new SplitStream(name);
    }
};

const writeStreamBuilder = function(data) {
    return function(name) {
        return new WriteStream(name, data);
    }
};

const filterMapStreamBuilder = function(f, m, context) {
    return function(name) {
        return new FilterMapStream(name, f, m, context);
    }
};

function getHasKeys(keys){

    const len = keys.length;
    return function _hasKeys(msg, source){

        if(typeof msg !== 'object')
            return false;

        for(let i = 0; i < len; i++){
            const k = keys[i];
            if(!msg.hasOwnProperty(k))
                return false;
        }

        return true;
    }

}

class Bus {

    constructor(scope) {

        this._frames = [];
        this._sources = [];
        this._dead = false;
        this._scope = scope;
        this._children = []; // from forks
        this._parent = null;

        // temporary api states (used for interactively building the bus)

        this._spork = null; // beginning frame of split sub process
        this._holding = false; // multiple commands until duration function
        this._head = null; // point to reset accumulators
        this._locked = false; // prevents additional sources from being added

        if(scope)
            scope._buses.push(this);

        const f = new Frame(this);
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
        return this._holding;
    };

    get scope() {
        return this._scope;
    }

    _createMergingFrame() {

        const f1 = this._currentFrame;
        const f2 = this._currentFrame = new Frame(this);
        this._frames.push(f2);

        const source_streams = f1.streams;
        const target_streams = f2.streams;
        const merged_stream = new PassStream();
        target_streams.push(merged_stream);

        const len = source_streams.length;
        for(let i = 0; i < len; i++){
            const s1 = source_streams[i];
            s1.next = merged_stream;
        }

        return f2;

    };

    _createNormalFrame(streamBuilder) {

        const f1 = this._currentFrame;
        const f2 = this._currentFrame = new Frame(this);
        this._frames.push(f2);

        const source_streams = f1.streams;
        const target_streams = f2.streams;

        const len = source_streams.length;
        for(let i = 0; i < len; i++){
            const s1 = source_streams[i];
            const s2 = streamBuilder ? streamBuilder(s1.name) : new PassStream(s1.name);
            s1.next = s2;
            target_streams.push(s2);
        }

        return f2;

    };


    _createForkingFrame(forkedTargetFrame) {

        const f1 = this._currentFrame;
        const f2 = this._currentFrame = new Frame(this);
        this._frames.push(f2);

        const source_streams = f1.streams;
        const target_streams = f2.streams;
        const forked_streams = forkedTargetFrame.streams;

        const len = source_streams.length;
        for(let i = 0; i < len; i++){

            const s1 = source_streams[i];
            const s3 = new PassStream(s1.name);
            const s2 = new ForkStream(s1.name, s3);

            s1.next = s2;

            target_streams.push(s2);
            forked_streams.push(s3);
        }

        return f2;

    };

    _ASSERT_IS_FUNCTION(f) {
        if(typeof f !== 'function')
            throw new Error('Argument must be a function.');
    };

    _ASSERT_NOT_HOLDING() {
        if (this.holding)
            throw new Error('Method cannot be invoked while holding messages in the frame.');
    };

    _ASSERT_IS_HOLDING(){
        if(!this.holding)
            throw new Error('Method cannot be invoked unless holding messages in the frame.');
    };

    _ASSERT_HAS_HEAD(){
        if(!this._head)
            throw new Error('Cannot reset without an upstream accumulator.');
    };

    _ASSERT_NOT_LOCKED(){
        if(this._locked)
            throw new Error('Cannot add sources after other operations.');
    };

    _ASSERT_NOT_SPORKING(){
        if(this._spork)
            throw new Error('Cannot do this while sporking.');
    };


    addSource(source){

        this._ASSERT_NOT_LOCKED();

        this._sources.push(source);
        this._currentFrame.streams.push(source.stream);
        return this;

    }

    process(nyan, context, target){

        if(typeof nyan === 'string')
            nyan = Nyan.parse(nyan, true);

        NyanRunner.applyNyan(nyan, this, context, target);
        return this;

    }


    fork() {

        this._ASSERT_NOT_HOLDING();
        const fork = new Bus(this.scope);
        fork.parent = this;
        this._createForkingFrame(fork._currentFrame);

        return fork;
    };

    back() {

        if(!this._parent)
            throw new Error('Cannot exit fork, parent does not exist!');

        return this.parent;

    };

    fuse(bus) {

        this.add(bus);
        this.merge();
        this.group();

        return this;
    };

    join() {

        const parent = this.back();
        parent.add(this);
        return parent;

    };

    add(bus) {

        const nf = this._createNormalFrame(); // extend this bus
        bus._createForkingFrame(nf); // outside bus then forks into this bus
        return this;

    };

    fromMany(buses) {

        const nf = this._createNormalFrame(); // extend this bus

        const len = buses.length;
        for(let i = 0; i < len; i++) {
            const bus = buses[i];
            bus._createForkingFrame(nf); // outside bus then forks into this bus
            // add sources from buses
            // bus._createTerminalFrame
        }

        return this;

    };

    addMany(buses) {

        const nf = this._createNormalFrame(); // extend this bus

        const len = buses.length;
        for(let i = 0; i < len; i++) {
            const bus = buses[i];
            bus._createForkingFrame(nf); // outside bus then forks into this bus
        }
        return this;

    };

    spork() {

        this._ASSERT_NOT_HOLDING();
        this._ASSERT_NOT_SPORKING();

        const spork = new Spork(this);

        function sporkBuilder(){
            return spork;
        }

        this._createNormalFrame(sporkBuilder);
        return this._spork = spork;

    };

    // defer() {
    //     return this.timer(F.getDeferTimer);
    // };



    batch() {
        this._createNormalFrame(batchStreamBuilder());
        this._holding = false;
        return this;
    };


    // throttle(fNum) {
    //     return this.timer(F.getThrottleTimer, fNum);
    // };

    hold() {

        this._ASSERT_NOT_HOLDING();
        this._holding = true;
        this._head = this._createNormalFrame();
        return this;

    };

    reset() {

        this._ASSERT_HAS_HEAD();
        this._createNormalFrame(resetStreamBuilder(this._head));
        return this;

    }

    pull() {

        const len = this._sources.length;

        for(let i = 0; i < len; i++) {
            const s = this._sources[i];
            s.pull();
        }

        return this;

    };




    scan(f, seed){

        this._createNormalFrame(scanStreamBuilder(f, seed));
        return this;

    };



    delay(fNum) {

        this._createNormalFrame(delayStreamBuilder(fNum));
        return this;

    };



    hasKeys(keys) {

        const f = getHasKeys(keys);
        this._createNormalFrame(latchStreamBuilder(f));
        return this;

    };

    group(by) {

        this._createNormalFrame(groupStreamBuilder(by));
        return this;

    };

    all() {
        this._createNormalFrame(allStreamBuilder());
        return this;
    };

    first(count) {
        this._createNormalFrame(firstNStreamBuilder(count));
        return this;
    };

    last(count) {
        this._createNormalFrame(lastNStreamBuilder(count));
        return this;
    };


    prior() {

        this._createNormalFrame(priorStreamBuilder());
        return this;

    };

    run(f) {

        this._ASSERT_IS_FUNCTION(f);

        this._createNormalFrame(tapStreamBuilder(f));
        return this;

    };

    merge() {

        this._createMergingFrame();
        return this;

    };

    msg(fAny, context) {

        const f = FUNCTOR(fAny);

        this._createNormalFrame(msgStreamBuilder(f, context));
        return this;


    };

    name(str) {

        this._createNormalFrame(nameStreamBuilder(str));
        return this;

    };

    source(str) {

        this._createNormalFrame(nameStreamBuilder(str));
        return this;

    };

    write(data) {

        this._createNormalFrame(writeStreamBuilder(data));
        return this;

    };

    filter(f, context) {

        this._ASSERT_IS_FUNCTION(f);
        this._ASSERT_NOT_HOLDING();

        this._createNormalFrame(filterStreamBuilder(f, context));
        return this;


    };

    filterMap(f, m) {

        this._ASSERT_IS_FUNCTION(f);
        this._ASSERT_NOT_HOLDING();

        this._createNormalFrame(filterMapStreamBuilder(f, m));
        return this;


    };

    split() {

        this._createNormalFrame(splitStreamBuilder());
        return this;

    };

    skipDupes() {

        this._createNormalFrame(skipStreamBuilder());
        return this;

    };

    addSubscribe(name, data){

        const source = new SubscribeSource(name, data, true);
        this.addSource(source);

        return this;

    };

    addEvent(name, target, eventName, useCapture){

        const source = new EventSource(name, target, eventName || name, useCapture);
        this.addSource(source);

        return this;

    };

    toStream() {
        // merge, fork -> immutable stream?
    };

    destroy() {

        if (this.dead)
            return this;

        this._dead = true;

        const sources = this._sources;
        const len = sources.length;

        for (let i = 0; i < len; i++) {
            const s = sources[i];
            s.destroy();
        }

        return this;

    };

}

let idCounter = 0;

function _destroyEach(arr){

    let i = arr.length;
    while(i--){
        arr[i].destroy();
    }

}

class Scope{

    constructor(name) {

        this._id = ++idCounter;
        this._name = name;
        this._parent = null;
        this._children = [];
        this._wires = {};
        this._buses = [];
        this._dataMap = new Map();
        this._valveMap = new Map();
        this._mirrorMap = new Map();
        this._dead = false;

    };

    get name() { return this._name; };
    get dead() { return this._dead; };

    get children(){

        return this._children.map((d) => d);

    };

    bus(strOrNyan, context, node, lookup){

        if(!strOrNyan)
            return new Bus(this);

        const nyan = (typeof strOrNyan === 'string') ? Nyan.parse(strOrNyan) : strOrNyan;
        return NyanRunner.createBus(nyan, this, context, node, lookup);

    };


    clear(){

        if(this._dead)
            return;

        _destroyEach(this.children);
        _destroyEach(this._buses);
        _destroyEach(this._dataMap.values());

        this._children = [];
        this._buses = [];
        this._dataMap.clear();
        this._valveMap.clear();
        this._mirrorMap.clear();

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
            this._valveMap.set(name, true);
        }

    }

    get valves(){ return Array.from(this._valveMap.keys());};


    _createMirror(data){

        const mirror = Object.create(data);
        mirror._writable = false;
        this._mirrorMap.set(data.name, mirror);
        return mirror;

    };

    _createData(name){

        const d = new Data(this, name);
        this._dataMap.set(name, d);
        if(!d._action && !d._private) // if a public state, create a read-only mirror
            this._createMirror(d);
        return d;

    };

    demand(name){

        return this.grab(name) || this._createData(name);

    };


    wire(stateName){

        const actionName = '$' + stateName;
        const state = this.demand(stateName);
        const action = this.demand(actionName);

        if(!this._wires[stateName]) {
            this._wires[stateName] = this.bus(actionName + '|=' + stateName);
        }

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

        for(const [key, value] of scope._dataMap){
            result.set(key, value);
        }

        while(scope = scope._parent){

            const dataList = scope._dataMap;
            const valves = scope._valveMap;
            const mirrors = scope._mirrorMap;

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

            const valves = scope._valveMap;

            // if valves exist and the name is not present, stop looking
            if(valves.size && !valves.has(name)){
                break;
            }

            const mirror = scope._mirrorMap.get(name);

            if(mirror)
                return mirror;

            const d = scope.grab(name);

            if(d) {
                if (d._private)
                    continue;
                return d;
            }

        }

        _ASSERT_NOT_REQUIRED(required);

        return null;

    };


    findOuter(name, required){

        _ASSERT_NO_OUTER_PRIVATE(name);

        let foundInner = false;
        const localData = this.grab(name);

        if(localData)
            foundInner = true;

        let scope = this;

        while(scope = scope._parent){

            const valves = scope._valveMap;

            // if valves exist and the name is not present, stop looking
            if(valves.size && !valves.has(name)){
                break;
            }

            const mirror = scope._mirrorMap.get(name);

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

        const data = this._dataMap.get(name);

        if(!data && required)
            throw new Error('Required Data: ' + name + ' not found!');

        return data || null;

    };


    // write key-values as a transaction
    write(writeHash){

        const list = [];

        for(const k in writeHash){
            const v = writeHash[k];
            const d = this.grab(k);
            // todo ASSERT_DATA_FOUND
            d.silentWrite(v);
            list.push(d);
        }

        for(const d of list){
            d.refresh();
        }

        return this;

    };

}

function _ASSERT_NOT_REQUIRED(required){
    if(required)
        throw new Error('Required data: ' + name + ' not found!');
}

function _ASSERT_NO_OUTER_PRIVATE(name){
    if(isPrivate(name))
        throw new Error('Private data: ' + name + ' cannot be accessed via an outer scope!');
}

const FUNCTOR$5 = function(d) {
    return typeof d === 'function' ? d : function() { return d;};
};

function callback$1(source){

    const n = source.name;
    const msg = source.msg();
    source.stream.handle(msg, n, null);

}

function IntervalSource(name, delay, msg) {

    this.name = name;
    this.delay = delay;
    this.dead = false;
    this.stream = new PassStream(name);
    this.intervalId = setInterval(callback$1, delay, this);
    this.msg = FUNCTOR$5(msg);

}

IntervalSource.prototype.destroy = function destroy(){
    clearInterval(this.intervalId);
    this.dead = true;
};


NOOP_SOURCE.addStubs(IntervalSource);

function ValueSource(name, value){

    this.name = name;
    this.value = value;
    this.stream = new PassStream(name);

}

function tryEmit(source){
    try{
        source.emit();
    } catch(e){
    }
}

ValueSource.prototype.pull = function pull(){

    tryEmit(this);

};

ValueSource.prototype.emit = function pull(){

    this.stream.handle(this.value, this.name, '');

};

NOOP_SOURCE.addStubs(ValueSource);

function ArraySource(name, value){

    this.name = name;
    this.value = value;
    this.stream = new PassStream(name);

}

ArraySource.prototype.pull = function pull(){

    push(this.stream, this.value, this.value.length, this.name);

};

function push(stream, arr, len, name){
    for(let i = 0; i < len; ++i) {
        stream.handle(arr[i], name, '');
    }
}


NOOP_SOURCE.addStubs(ArraySource);

const Catbus = {};

let _batchQueue = [];
let _primed = false;

Catbus.bus = function(){
    return new Bus();
};


Catbus.fromInterval = function(name, delay, msg){

    const bus = new Bus();
    const source = new IntervalSource(name, delay, msg);
    bus.addSource(source);

    return bus;

};

Catbus.fromEvent = function(target, eventName, useCapture){

    const bus = new Bus();
    const source = new EventSource(eventName, target, eventName, useCapture);
    bus.addSource(source);

    return bus;

};

Catbus.fromValues = function(values){

    const bus = new Bus();
    const len = values.length;
    for(let i = 0; i < len; ++i) {
        const source = new ValueSource('', value);
        bus.addSource(source);
    }
    return bus;

};

Catbus.fromArray = function(arr, name){

    return Catbus.fromValue(arr, name).split();

};

Catbus.fromValue = function(value, name){

    const bus = new Bus();
    const source = new ValueSource(name || '', value);
    bus.addSource(source);

    return bus;

};


Catbus.fromSubscribe = function(name, data){

    const bus = new Bus();
    const source = new SubscribeSource(name, data, true);
    bus.addSource(source);

    return bus;

};


// todo stable output queue -- output pools go in a queue that runs after the batch q is cleared, thus run once only

Catbus.enqueue = function(pool){

    _batchQueue.push(pool);

    if(!_primed) { // register to flush the queue
        _primed = true;
        if (typeof window !== 'undefined' && window.requestAnimationFrame) requestAnimationFrame(Catbus.flush);
        else process.nextTick(Catbus.flush);
    }

};


Catbus.createChild = Catbus.scope = function(name){

    return new Scope(name);

};


Catbus.flush = function(){

    _primed = false;

    let cycles = 0;
    let q = _batchQueue;
    _batchQueue = [];

    while(q.length) {

        while (q.length) {
            const pool = q.shift();
            pool.emit();
        }

        q = _batchQueue;
        _batchQueue = [];

        cycles++;
        if(cycles > 10)
            throw new Error('Flush batch cycling loop > 10.', q);

    }

};

return Catbus;

})));
//# sourceMappingURL=catbus.umd.js.map
