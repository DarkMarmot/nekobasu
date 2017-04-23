
import Frame from './frame.js';
import F from './flib.js';
import Stream from './stream.js';


class Bus {

    constructor(streams) {

        this._frames = [];
        this._dead = false;
        this._scope = null;
        const f = new Frame(this, streams);
        this._frames.push(f);
        this._currentFrame = f;

    };

    get dead() {
        return this._dead;
    };

    get holding() {
        return this._currentFrame._holding;
    };

    addFrame() {

        const lastFrame = this._currentFrame;
        const nextFrame = this._currentFrame = new Frame(this);
        this._frames.push(nextFrame);

        _wireFrames(lastFrame, nextFrame);

        return nextFrame;
    };

    // create a new frame with one stream fed by all streams of the current frame

    mergeFrame() {

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

    // create stream
    spawn(){

    }

    // convert each stream into a bus, dump in array

    split(){

        F.ASSERT_NOT_HOLDING(this);

    };

    fork() {

        F.ASSERT_NOT_HOLDING(this);
        const fork = new Bus();
        _wireFrames(this._currentFrame, fork._currentFrame);

        return fork;
    };

    add(bus) {

        const frame = this.addFrame(); // wire from current bus
        _wireFrames(bus._currentFrame, frame); // wire from outside bus
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


    hold() {

        F.ASSERT_NOT_HOLDING(this);
        this.addFrame().hold();
        return this;

    };

    delay(num) {

        F.ASSERT_NEED_ONE_ARGUMENT(arguments);
        F.ASSERT_NOT_HOLDING(this);
        this.addFrame().delay(num);
        return this;

    };

    // untilKeys(keys){
    //
    //     F.ASSERT_IS_HOLDING(this);
    //     this._currentFrame.untilKeys(keys);
    //     return this;
    //
    // };

    untilFull(){

        F.ASSERT_IS_HOLDING(this);
        this._currentFrame.untilFull();
        return this;

    }

    willReset(){

        F.ASSERT_IS_HOLDING(this);
        this._currentFrame.willReset();
        return this;

    }

    untilKeys(keys) {
        F.ASSERT_IS_HOLDING(this);
        return this.until(F.getUntilKeys, keys);
    };

    group(by) {

        return this.reduce(F.getGroup, by);
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

    reduce(factory, ...args) {

        this.holding ?
            this._currentFrame.reduce(factory, ...args) :
            this.addFrame().hold().reduce(factory, ...args).timer(F.getSyncTimer);
        return this;

    };

    timer(factory, ...args) {

        this.holding ?
            this._currentFrame.timer(factory, ...args) :
            this.addFrame().hold().timer(factory, ...args);
        return this;

    };

    until(factory, ...args) {

        this.holding ?
            this._currentFrame.until(factory, ...args) :
            this.addFrame().hold().until(factory, ...args).timer(F.getSyncTimer);
        return this;

    };

    run(func) {

        F.ASSERT_IS_FUNCTION(func);
        F.ASSERT_NOT_HOLDING(this);
        this.addFrame().run(func);
        return this;

    };

    merge() {

        F.ASSERT_NOT_HOLDING(this);
        this.mergeFrame();
        return this;
    };

    transform(fAny) {

        F.ASSERT_NEED_ONE_ARGUMENT(arguments);
        F.ASSERT_NOT_HOLDING(this);
        this.addFrame().transform(fAny);
        return this;

    };

    name(fStr) {

        F.ASSERT_NEED_ONE_ARGUMENT(arguments);
        F.ASSERT_NOT_HOLDING(this);

        this.addFrame().name(fStr);
        return this;

    };

    filter(func) {

        F.ASSERT_NEED_ONE_ARGUMENT(arguments);
        F.ASSERT_IS_FUNCTION(func);
        F.ASSERT_NOT_HOLDING(this);

        this.addFrame().filter(func);
        return this;

    };

    skipDupes() {

        F.ASSERT_NOT_HOLDING(this);
        this.addFrame().skipDupes();
        return this;

    };

    toStream() {
        // merge, fork -> immutable stream?
    };

    destroy() {

        if (this.dead)
            return this;

        this._dead = true;

        const frames = this._frames;

        for (const f of frames) {
            f.destroy();
        }

        return this;

    };

}

// send messages from streams in one frame to new empty streams in another frame
// injects new streams to frame 2

function _wireFrames(frame1, frame2) {

    const streams1 = frame1._streams;
    const streams2 = frame2._streams;

    const len = streams1.length;

    for (let i = 0; i < len; i++) {

        const s1 = streams1[i];
        const s2 = new Stream(frame2);
        s2.name = s1.name;
        streams2.push(s2);
        s1.addTarget(s2);

    }

}


export default Bus;
