
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

    wire(wire) {

        wire.target = this._frames[0];
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

        return this.reduce(F.getScan, func, seed);

    };

    delay(fNum) {

        F.ASSERT_NEED_ONE_ARGUMENT(arguments);
        F.ASSERT_NOT_HOLDING(this);

        this.addFrame().define(new WaveDef('delay', F.FUNCTOR(fNum)));
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

        this.reduce(F.getGroup, by);
        return this;

    };

    groupByTopic() {

        F.ASSERT_NOT_HOLDING(this);
        this.hold().reduce(F.getGroup, F.TO_TOPIC);
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

        const holding = this.holding;

        if(!holding){

            const frame = this.addFrame();
            const def = new WaveDef('msg', factory, true, ...args);
            frame.define(def);

        } else {

            const frame = this._currentFrame;
            const def = frame._processDef;
            def.keep = [factory, true, ...args];

        }

        return this;

    };

    timer(factory, stateful, ...args) {

        const holding = this.holding;
        const frame = holding ? this._currentFrame : this.addFrame().hold();
        const def = frame._processDef;
        def.timer = [factory, stateful, ...args];
        this._currentFrame._holding = false; // timer ends hold

        return this;

    };

    until(factory, ...args) {

        this.holding ?
            this._currentFrame.until(factory, ...args) :
            this.addFrame().hold().reduce(F.getKeepLast).until(factory, ...args).timer(F.getSyncTimer);
        return this;

    };

    when(factory, stateful, ...args) {

        const holding = this.holding;

        if(!holding){

            const frame = this.addFrame();
            const def = new WaveDef('filter', factory, stateful, ...args);
            frame.define(def);

        } else {

            const frame = this._currentFrame;
            const def = frame._processDef;
            def.when = [factory, stateful, ...args];

        }

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

        this.addFrame().merge();
        return this;
    };

    msg(fAny) {

        F.ASSERT_NEED_ONE_ARGUMENT(arguments);
        F.ASSERT_NOT_HOLDING(this);

        this.addFrame().define(new WaveDef('msg', F.FUNCTOR(fAny)));
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

        this.addFrame().define(new WaveDef('source', F.FUNCTOR(fStr)));
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
        this.addFrame().define(new WaveDef('filter', F.getHasKeys(keys)));
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

        this._wires = null;
        return this;

    };

}



export default Bus;
