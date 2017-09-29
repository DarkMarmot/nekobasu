
import SubscribeSource from './sources/subscribeSource.js';
import EventSource from './sources/eventSource.js';

import PassStream from './streams/passStream.js';
import ForkStream from './streams/forkStream.js';
import BatchStream from './streams/batchStream.js';
import ResetStream from './streams/resetStream.js';
import TapStream from './streams/tapStream.js';
import MsgStream from './streams/msgStream.js';
import FilterStream from './streams/filterStream.js';
import SkipStream from './streams/skipStream.js';
import LastNStream from './streams/lastNStream.js';
import FirstNStream from './streams/firstNStream.js';
import AllStream from './streams/allStream.js';
import DelayStream from './streams/delayStream.js';
import GroupStream from './streams/groupStream.js';
import LatchStream from './streams/latchStream.js';
import ScanStream from './streams/scanStream.js';
import ScanWithSeedStream from './streams/scanWithSeedStream.js';
import SplitStream from './streams/splitStream.js';
import WriteStream from './streams/writeStream.js';
import FilterMapStream from './streams/filterMapStream.js';
import PriorStream from './streams/priorStream.js';

import Spork from './spork.js';
import Frame from './frame.js';

import Nyan from './nyan.js';
import NyanRunner from './nyanRunner.js';

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



export default Bus;
