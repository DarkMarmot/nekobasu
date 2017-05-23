
import Frame from './frame.js';
import F from './flib.js';
import Wire from './wire.js';
import WaveDef from './waveDef.js';

class Bus {

    constructor(scope) {

        this._frames = [];
        this._wires = [];
        this._dead = false;
        this._scope = scope; // data scope
        this._children = []; // from forks
        this._parent = null;

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
        return this._currentFrame._holding;
    };

    get scope() {
        return this._scope;
    }



    // NOTE: unlike most bus methods, this one returns a new current frame (not the bus!)

    addFrame() {

        const lastFrame = this._currentFrame;
        const nextFrame = this._currentFrame = new Frame(this);
        this._frames.push(nextFrame);
        lastFrame.target(nextFrame);
        return nextFrame;

    };


    // create stream
    spawn(){

    }

    // convert each stream into a bus, wiring prior streams, dump in array

    split(){

        F.ASSERT_NOT_HOLDING(this);

    };

    fork() {

        F.ASSERT_NOT_HOLDING(this);
        const fork = new Bus(this.scope);
        fork.parent = this;
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
        return this.timer(F.getDeferTimer);
    };

    batch() {
        return this.timer(F.getBatchTimer);
    };

    sync() {
        return this.timer(F.getSyncTimer);
    };

    throttle(fNum) {
        return this.timer(F.getThrottleTimer, fNum);
    };

    hold() {

        F.ASSERT_NOT_HOLDING(this);
        this.addFrame().hold();
        return this;

    };

    pull() {

        const frame1 = this._frames[0];

        if(frame1._streams.length > 0){
            frame1.pull();
            return this;
        }

        if(this._frames.length !== 1){
            const frame2 = this._frames[1];
            frame2.pull();
        }

        return this;

    };

    event(target, eventName, useCapture) {

        F.ASSERT_NOT_HOLDING(this);
        const wire = Wire.fromEvent(target, eventName, useCapture);
        wire.name = eventName;
        wire.target = this.addFrame();
        this._wires.push(wire);

        return this;

    };

    // eventList(list) {
    //
    //     F.ASSERT_NOT_HOLDING(this);
    //
    //     const len = list.length;
    //     const streams = [];
    //
    //     for(let i = 0; i < len; i++){
    //         const e = list[i];
    //         const eventName = e.eventName || e.name;
    //         const name = e.name || e.eventName;
    //         const s = Stream.fromEvent(e.target, eventName, e.useCapture);
    //         s.name = name;
    //         streams.push(s);
    //     }
    //
    //     this.addFrame(streams);
    //     return this;
    //
    // };

    scan(func, seed){
        return this.reduce(F.getScan, func, seed);
    };

    delay(num) {

        F.ASSERT_NEED_ONE_ARGUMENT(arguments);
        F.ASSERT_NOT_HOLDING(this);
        this.addFrame().delay(num);
        return this;

    };

    willReset(){

        F.ASSERT_IS_HOLDING(this);
        return this.clear(F.getAlwaysTrue);

    }

    whenKeys(keys) {
        return this.when(F.getWhenKeys, keys);
    };

    group(by) {

        F.ASSERT_NOT_HOLDING(this);
        this.addFrame().hold().reduce(F.getGroup, by);
        return this;
    };

    groupByTopic() {

        F.ASSERT_NOT_HOLDING(this);
        this.addFrame().hold().reduce(F.getGroup, F.TO_TOPIC);
        return this;
    };

    all() {
        return this.reduce(F.getKeepAll);
    };

    first(n) {
        return this.reduce(F.getKeepFirst, n);
    };

    last(n) {
        return this.reduce(F.getKeepLast, n);
    };

    clear(factory, ...args) {
        return this._currentFrame.clear(factory, ...args);
    };

    reduce(factory, ...args) {

        this.holding ?
            this._currentFrame.reduce(factory, ...args) :
            this.addFrame().hold().reduce(factory, ...args).timer(F.getSyncTimer);
        return this;

    };

    timer(factory, ...args) {

        this.holding ?
            this._currentFrame.timer(factory, ...args) :
            this.addFrame().hold().reduce(F.getKeepLast).timer(factory, ...args);
        return this;

    };

    until(factory, ...args) {

        this.holding ?
            this._currentFrame.until(factory, ...args) :
            this.addFrame().hold().reduce(F.getKeepLast).until(factory, ...args).timer(F.getSyncTimer);
        return this;

    };

    when(factory, ...args) {

        this.holding ?
            this._currentFrame.when(factory, ...args) :
            this.addFrame().hold().reduce(F.getKeepLast).when(factory, ...args).timer(F.getSyncTimer);
        return this;

    };

    run(func) {

        F.ASSERT_IS_FUNCTION(func);
        F.ASSERT_NOT_HOLDING(this);

        this.addFrame().define(new WaveDef('run', func));
        return this;

    };

    merge() {

        F.ASSERT_NOT_HOLDING(this);

        const mergedStream = new Stream();

        const lastFrame = this._currentFrame;
        const nextFrame = this._currentFrame = new Frame(this, [mergedStream]);
        this._frames.push(nextFrame);

        const streams = lastFrame._streams;
        const len = streams.length;
        for (let i = 0; i < len; i++) {
            const s = streams[i];
            s.addTarget(mergedStream);
        }

        return this;
    };

    msg(fAny) {

        F.ASSERT_NEED_ONE_ARGUMENT(arguments);
        F.ASSERT_NOT_HOLDING(this);

        this.addFrame().define(new WaveDef('msg', fAny));
        return this;

    };

    transform(fAny) {

        F.ASSERT_NEED_ONE_ARGUMENT(arguments);
        F.ASSERT_NOT_HOLDING(this);
        this.addFrame().transform(fAny);
        return this;

    };

    source(fStr) {

        F.ASSERT_NEED_ONE_ARGUMENT(arguments);
        F.ASSERT_NOT_HOLDING(this);

        this.addFrame().source(fStr);
        return this;

    };

    filter(func) {

        F.ASSERT_NEED_ONE_ARGUMENT(arguments);
        F.ASSERT_IS_FUNCTION(func);
        F.ASSERT_NOT_HOLDING(this);

        this.addFrame().define(new WaveDef('filter', func));
        return this;


    };

    hasKeys(keys) {

        F.ASSERT_NOT_HOLDING(this);
        this.addFrame().hasKeys(keys);
        return this;

    };

    skipDupes() {

        F.ASSERT_NOT_HOLDING(this);

        this.addFrame().define(new WaveDef('filter', F.getSkipDupes, true));
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

        return this;

    };

}



export default Bus;
