

class Bus {

    constructor() {

        const f = new Frame(this);
        this._currentFrame = f;
        this._frames = [f];
        this._dead = false;
        this._scope = null;

    }

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

        this._wireFrames(lastFrame, nextFrame);

        return nextFrame;
    };


    // create a new frame with one stream fed by all streams of the current frame

    mergeFrame() {

        const mergedStream = new Stream();

        const lastFrame = this._currentFrame;
        const nextFrame = this._currentFrame = new Frame(this, [mergedStream]);
        this._frames.push(nextFrame);

        const streams = lastFrame.streams;

        for (const s of streams) {
            s.flowsTo(mergedStream);
        }

        return this;

    };


    fork() {

        const fork = new Bus();
        this._wireFrames(this._currentFrame, fork._currentFrame);

        return fork;
    };


    // send messages from streams in one frame to new empty streams in another frame
    // injects new streams to frame 2

    _wireFrames(frame1, frame2) {

        const streams1 = frame1.streams;
        const streams2 = frame2.streams;

        for (const s1 of streams1) {

            const s2 = new Stream(frame2);
            streams2.push(s2);
            s1.flowsTo(s2);

        }

    };

    add(bus) {

        const frame = this.addFrame(); // wire from current bus
        bus._wireFrames(bus._currentFrame, frame); // wire from outside bus
        return this;

    };


    defer() {

        this.holding ? this._currentFrame.delay(0) : this.addFrame().delay(0);
        return this;
    };

    batch() {

        this.holding ? this._currentFrame.batch() : this.addFrame().batch();
        return this;

    };

    group() {

        ASSERT_NOT_HOLDING(this);
        this.addFrame().group();
        return this;

    };

    hold() {

        ASSERT_NOT_HOLDING(this);
        this.addFrame().hold();
        return this;

    };

    delay(num) {
        ASSERT_NOT_HOLDING(this);
        this.addFrame().delay(num);
        return this;
    };


    all() {
        this.holding ? this._currentFrame.all() : this.addFrame().all();
        return this;
    };

    first(n) {

        this.holding ? this._currentFrame.first(n) : this.addFrame().first(n);
        return this;
    };

    last(n) {

        this.holding ? this._currentFrame.last(n) : this.addFrame().last(n);
        return this;
    };

    run(func) {
        ASSERT_NOT_HOLDING(this);
        this.addFrame().run(func);
        return this;
    };

    merge() {
        ASSERT_NOT_HOLDING(this);
        this.mergeFrame();
        return this;
    };

    transform(func) {
        ASSERT_NOT_HOLDING(this);
        this.addFrame().transform(func);
        return this;
    };

    name(func) {
        ASSERT_NOT_HOLDING(this);
        this.addFrame().name(func);
        return this;
    };

    filter(func) {
        ASSERT_NOT_HOLDING(this);
        this.addFrame().filter(func);
        return this;
    };

    skipDupes() {
        ASSERT_NOT_HOLDING(this);
        this.addFrame().filter(SKIP_DUPES_FILTER);
        return this;
    };


//Bus.fromEvent();
//Bus.fromTimer();
// stagger, debounce, throttle,

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