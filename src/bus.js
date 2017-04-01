

class Bus {

    constructor() {

        this._frames = [];
        this._dead = false;
    }

}


var Bus = function(sourceStreams) {

    this.frames = [];
    this.scope = null; // placeholder for instance variables or context usage
    var f = this._currentFrame = new Frame(this, sourceStreams);
    this.frames.push(f);
    this.dead = false;

};

Bus.prototype.holding = function(){
    return this._currentFrame._holding;
};

Bus.prototype.addFrame = function(){

    var lastFrame = this._currentFrame;
    var nextFrame = this._currentFrame = new Frame(this);
    this.frames.push(nextFrame);

    this._wireFrames(lastFrame, nextFrame);

    return nextFrame;
};

// create a new frame with one stream fed by all streams of the current frame

Bus.prototype.mergeFrame = function(){

    var mergedStream = new Stream();

    var lastFrame = this._currentFrame;
    var nextFrame = this._currentFrame = new Frame(this, [mergedStream]);
    this.frames.push(nextFrame);

    var streams = lastFrame.streams;
    var len = streams.length;

    for(var i = 0; i < len; i++){

        var s = streams[i];
        s.flowsTo(mergedStream);

    }

    return this;

};


Bus.prototype.fork = function(){

    var fork = new Bus();
    this._wireFrames(this._currentFrame, fork._currentFrame);

    return fork;
};



// send messages from streams in one frame to new empty streams in another frame
// injects new streams to frame 2
Bus.prototype._wireFrames = function(frame1, frame2){

    var streams1 = frame1.streams;
    var len = streams1.length;
    var streams2 = frame2.streams;

    for(var i = 0; i < len; i++){

        var s1 = streams1[i];
        var s2 = new Stream(frame2);
        streams2.push(s2);
        s1.flowsTo(s2);

    }

};

Bus.prototype.add = function(bus){

    var frame = this.addFrame(); // wire from current bus
    bus._wireFrames(bus._currentFrame, frame); // wire from outside bus
    return this;

};


Bus.prototype.defer = function(){

    this.holding() ? this._currentFrame.delay(0) : this.addFrame().delay(0);
    return this;
};

Bus.prototype.batch = function(){

    this.holding() ? this._currentFrame.batch() : this.addFrame().batch();
    return this;

};

Bus.prototype.group = function(){

    ASSERT_NOT_HOLDING(this);
    this.addFrame().group();
    return this;

};

Bus.prototype.hold = function(){

    ASSERT_NOT_HOLDING(this);
    this.addFrame().hold();
    return this;

};

Bus.prototype.delay = function(num){
    ASSERT_NOT_HOLDING(this);
    this.addFrame().delay(num);
    return this;
};


Bus.prototype.all = function(){
    this.holding() ?  this._currentFrame.all() : this.addFrame().all();
    return this;
};

Bus.prototype.first = function(n){

    this.holding() ? this._currentFrame.first(n) : this.addFrame().first(n);
    return this;
};

Bus.prototype.last = function(n){

    this.holding() ?  this._currentFrame.last(n) : this.addFrame().last(n);
    return this;
};

Bus.prototype.run = function(func){
    ASSERT_NOT_HOLDING(this);
    this.addFrame().run(func);
    return this;
};

Bus.prototype.merge = function(){
    ASSERT_NOT_HOLDING(this);
    this.mergeFrame();
    return this;
};

Bus.prototype.transform = function(func){
    ASSERT_NOT_HOLDING(this);
    this.addFrame().transform(func);
    return this;
};

Bus.prototype.name = function(func){
    ASSERT_NOT_HOLDING(this);
    this.addFrame().name(func);
    return this;
};

Bus.prototype.filter = function(func){
    ASSERT_NOT_HOLDING(this);
    this.addFrame().filter(func);
    return this;
};

Bus.prototype.skipDupes = function(){
    ASSERT_NOT_HOLDING(this);
    this.addFrame().filter(SKIP_DUPES_FILTER);
    return this;
};


//Bus.fromEvent();
//Bus.fromTimer();
// stagger, debounce, throttle,

Bus.prototype.destroy = function(){

    if(this.dead)
        return this;

    this.dead = true;

    var frames = this.frames;
    var len = frames.length;

    for(var i = 0; i < len; i++){
        var f = frames[i];
        f.destroy();
    }

    return this;

};