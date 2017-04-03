
class Stream {

    constructor(){

        this._frame = null;
        this._dead = false;
        this._children = [];
        this._lastPacket = null;
        this._name = null;

        this._messages = []; // [] with hold
        this._messagesByKey = {}; // {} with group
        this._cleanupMethod = NOOP; // to cleanup subscriptions


    }

}

function Stream(frame){

    this.frame = frame || null;
    this.dead = false;
    this.children = []; // streams listening or subscribed to this one
    this.lastPacket = null;
    this.name = null;
    this.cleanupMethod = NOOP; // to cleanup subscriptions

    this.messages = []; // [] with hold
    this.messagesByKey = {}; // {} with group

    this.processName = 'doPass'; // default to pass things along last thing unchanged
    this.keepMethod = KEEP_LAST; // default if holding or grouping
    this.keepCount = 0; // non-zero creates an array

    this.timerMethod = null; // throttle, debounce, defer, batch
    this.groupMethod = null;
    this.runMethod = null;
    this.transformMethod = null;
    this.filterMethod = null;
    this.nameMethod = null;
    this.delayMethod = null;

    this.readyMethod = TRUE_FUNC;
    this.clearMethod = TRUE_FUNC; // return true/false for latched
    this.latched = false; // from this.clearMethod()

    this.primed = false;

}

Stream.prototype.destroy = function(){

    if(this.dead)
        return;

    this.cleanupMethod(); // should remove an eventListener if present

};

Stream.prototype.flowsTo = function(stream){
    this.children.push(stream);
};

Stream.prototype.drop = function(stream){

    var i = this.children.indexOf(stream);

    if(i !== -1)
        this.children.splice(i, 1);

};


Stream.prototype.tell = function(msg, source) {

    if(this.dead) // true if canceled or disposed midstream
        return this;

    //console.log('stream gets:', msg);

    var last = this.lastPacket;
    source = this.name || source; // named streams (usually initial feeds) always pass their name forward

    // tell method = doDelay, doGroup, doHold, tellTransform, doFilter
    var processMethod = this[this.processName];
    processMethod.call(this, msg, source, last);

    return this;


};


Stream.prototype.flowForward = function(msg, source, thisStream){

    thisStream = thisStream || this; // allow callbacks with context instead of bind (massively faster)
    thisStream.lastPacket = new Packet(msg, source);


    var children = thisStream.children;
    var len = children.length;

    for(var i = 0; i < len; i++){
        var c = children[i];
        c.tell(msg, source);
    }

};
Stream.prototype.doPass = function(msg, source) {

    this.flowForward(msg, source);

};

Stream.prototype.doFilter = function(msg, source) {

    if(!this.filterMethod(msg, source, this.lastPacket))
        return;

    this.flowForward(msg, source);

};

// synchronous keep

Stream.prototype.resolveKeep = function(messages){
    return this.keepCount === 0 ? messages[0] : messages;
};



Stream.prototype.doKeep = function(msg, source) {

    this.keepMethod(this.messages, msg, this.keepCount);
    msg = this.resolveKeep(this.messages);
    this.flowForward(msg, source);

};


Stream.prototype.doDelay = function(msg, source) {

    // passes nextStream as 'this' to avoid bind slowdown

    setTimeout(this.flowForward, this.delayMethod() || 0, msg, source, this);

};


Stream.prototype.tellThrottle = function(msg, source) {

    var nextStream = this.nextStream;
    setTimeout(nextStream.tell.bind(nextStream), this.delayMethod() || 0, msg, source);

};

Stream.prototype.tellDebounce = function(msg, source) {

    var nextStream = this.nextStream;
    setTimeout(nextStream.tell.bind(nextStream), this.delayMethod() || 0, msg, source);

};


Stream.prototype.doTransform = function(msg, source, last) {

    msg = this.transformMethod(msg, source, last);
    this.flowForward(msg, source);

};

Stream.prototype.doName = function(msg, source, last) {

    source = this.nameMethod(msg, source, last);
    this.flowForward(msg, source);

};

Stream.prototype.doRun = function(msg, source, last) {

    this.runMethod(msg, source, last);
    this.flowForward(msg, source);

};


Stream.prototype.doGroup = function(msg, source, last) {

    var groupName = this.groupMethod(msg, source, last);

    var messages = this.messagesByKey[groupName] || [];
    this.messagesByKey[groupName]  = this.keepMethod(messages, msg, this.keepCount);

    // console.log('stream: ' + this.frame.streams.indexOf(this) + ':', msg, source, this.messagesByKey)
    if(!this.primed && (this.latched || this.readyMethod(this.messagesByKey, last))) {
        if(this.timerMethod) {
            this.primed = true;
            this.timerMethod(); // should call back this.fireContent
        } else {
            this.fireContent();
        }
    }

};

Stream.prototype.doHold = function(msg, source, last) {

    this.keepMethod(this.messages, msg, this.keepCount);

    if(!this.primed && (this.latched || this.readyMethod(this.messages, last))) {
        if(this.timerMethod) {
            this.primed = true;
            this.timerMethod(); // should call back this.fireContent
        } else {
            this.fireContent();
        }
    }

};

Stream.prototype.releaseHold = function() {

    var msg = this.resolveKeep(this.messages);
    this.latched = this.clearMethod(); // might be noop, might hold latch
    this.primed = false;

    this.flowForward(msg);

};

Stream.prototype.fireContent = function() {

    var msg = this.groupMethod ? this.resolveKeepByGroup() : this.resolveKeep(this.messages);

    this.latched = this.clearMethod(); // might be noop, might hold latch
    this.primed = false;

    this.flowForward(msg);

};

Stream.prototype.resolveKeepByGroup = function(){

    var messagesByKey = this.messagesByKey;
    for(var k in messagesByKey){
        messagesByKey[k] = this.resolveKeep(messagesByKey[k]);
    }
    return messagesByKey;

};