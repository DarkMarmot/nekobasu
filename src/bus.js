
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
            s.flowsTo(mergedStream);
        }

        return this;

    };

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

        this.holding ? this._currentFrame.defer() : this.addFrame().defer();
        return this;

    };

    batch() {

        this.holding ? this._currentFrame.batch() : this.addFrame().hold().last().batch();
        return this;

    };

    group() {

        F.ASSERT_NOT_HOLDING(this);
        this.addFrame().group();
        return this;

    };

    hold() {

        F.ASSERT_NOT_HOLDING(this);
        this.addFrame().hold();
        return this;

    };

    delay(num) {

        F.ASSERT_NOT_HOLDING(this);
        this.addFrame().delay(num);
        return this;

    };

    untilKeys(keys){

        F.ASSERT_IS_HOLDING(this);
        this._currentFrame.untilKeys(keys);
        return this;

    };

    untilFull(){

        F.ASSERT_IS_HOLDING(this);
        this._currentFrame.untilFull();
        return this;

    }

    willReset(func){

        F.ASSERT_IS_HOLDING(this);
        this._currentFrame.willReset(func);
        return this;

    }

    all() {
        const f = F.getKeepAll;
        this.holding ? this._currentFrame.reduce(f) : this.addFrame().hold().reduce(f).sync();
        return this;
    };

    first(n) {

        const f = F.getKeepFirst;
        this.holding ? this._currentFrame.reduce(f, n) : this.addFrame().hold().reduce(f, n).sync();
        return this;

    };

    last(n) {

        const f = F.getKeepLast;
        this.holding ? this._currentFrame.reduce(f, n) : this.addFrame().hold().reduce(f, n).sync();
        return this;

    };

    reduce(factory, ...args) {

        this.holding ? this._currentFrame.reduce(f, n) : this.addFrame().hold().reduce(f, n).sync();
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
        streams2.push(s2);
        s1.flowsTo(s2);

    }

}


export default Bus;
