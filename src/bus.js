
import PassStream from './streams/passStream.js';
import ForkStream from './streams/forkStream.js';
import BatchStream from './streams/batchStream.js';
import ResetStream from './streams/resetStream.js';
import TapStream from './streams/tapStream.js';
import MsgStream from './streams/msgStream.js';
import FilterStream from './streams/filterStream.js';

import Frame from './frame.js';

import Nyan from './nyan.js';
import NyanRunner from './nyanRunner.js';

const FUNCTOR = function(d) {
    return typeof d === 'function' ? d : function(d) { return d;};
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

const msgStreamBuilder = function(f) {
    return function(name) {
        return new MsgStream(name, f);
    }
};

const filterStreamBuilder = function(f) {
    return function(name) {
        return new FilterStream(name, f);
    }
};

class Bus {

    constructor(scope) {

        this._frames = [];
        this._sources = [];
        this._dead = false;
        this._scope = scope;
        this._children = []; // from forks
        this._parent = null;

        // temporary api states (used for interactively building the bus)

        this._holding = false; // multiple commands until duration function
        this._head = null; // point to reset accumulators
        this._locked = false; // prevents additional sources from being added

        if(scope)
            scope._busList.push(this);

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

    join() {

        const parent = this.back();
        parent.add(this);
        return parent;

    }

    add(bus) {

        const nf = this._createNormalFrame(); // extend this bus
        bus._createForkingFrame(nf); // outside bus then forks into this bus
        return this;

    };

    // defer() {
    //     return this.timer(F.getDeferTimer);
    // };

    batch() {
        this._createNormalFrame(batchStreamBuilder());
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

        return this.reduce(F.getScan, func, seed);

    };



    scan2(func, seed){

        if(!this.holding) {
            this.addFrame(new WaveDef('scan', func, false, 0));
            return this;
        }

        return this.reduce(F.getScan, func, seed);

    };


    delay(fNum) {

        F.ASSERT_NEED_ONE_ARGUMENT(arguments);
        F.ASSERT_NOT_HOLDING(this);

        this.addFrame(new WaveDef('delay', F.FUNCTOR(fNum)));
        return this;

    };

    willReset(){

        F.ASSERT_IS_HOLDING(this);
        return this.clear(F.getAlwaysTrue);

    }

    whenKeys(keys) {

        return this.when(F.getWhenKeys, true, keys);

    };

    group(by) {

        if(!this.holding) {
             this.addFrame(new WaveDef('group', null, true));
             return this;
        }
        this.reduce(F.getGroup, by);
        return this;

    };

    groupByTopic() {

        F.ASSERT_NOT_HOLDING(this);
        this.hold().reduce(F.getGroup, F.TO_TOPIC);
        return this;
    };

    all() {
        if(!this.holding) {
            this.addFrame(new WaveDef('all', null, true));
            return this;
        }
        return this.reduce(F.getKeepAll);
    };

    first(n) {
        if(!this.holding) {
            this.addFrame(new WaveDef('firstN', null, true, n));
            return this;
        }
        return this.reduce(F.getKeepFirst, n);
    };

    last(n) {
        if(!this.holding) {
            this.addFrame(new WaveDef('lastN', null, true, n));
            return this;
        }
        return this.reduce(F.getKeepLast, n);
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
            this.addFrameHold().reduce(F.getKeepLast).until(factory, ...args).timer(F.getSyncTimer);
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

    run(f) {

        this._ASSERT_IS_FUNCTION(f);
        this._ASSERT_NOT_HOLDING();

        this._createNormalFrame(tapStreamBuilder(f));
        return this;

    };

    merge() {

        F.ASSERT_NOT_HOLDING(this);

        this.addFrameMerger();
        return this;
    };

    msg(fAny) {

        const f = FUNCTOR(fAny);

        this._ASSERT_NOT_HOLDING();

        this._createNormalFrame(msgStreamBuilder(f));
        return this;


    };


    source(fStr) {

        F.ASSERT_NEED_ONE_ARGUMENT(arguments);
        F.ASSERT_NOT_HOLDING(this);

        this.addFrame(new WaveDef('source', F.FUNCTOR(fStr)));
        return this;

    };


    filter(f) {

        this._ASSERT_IS_FUNCTION(f);
        this._ASSERT_NOT_HOLDING();

        this._createNormalFrame(filterStreamBuilder(f));
        return this;


    };

    split() {

        F.ASSERT_NOT_HOLDING(this);

        this.addFrame(new WaveDef('split'));
        return this;

    };

    hasKeys(keys) {

        F.ASSERT_NOT_HOLDING(this);
        this.addFrame(new WaveDef('filter', F.getHasKeys(keys)));
        return this;

    };

    skipDupes() {

        F.ASSERT_NOT_HOLDING(this);

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
