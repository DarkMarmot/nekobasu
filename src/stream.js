
import F from './flib.js';
import Packet from './packet.js';

class Stream {

    constructor(){

        this.debugFrame = null;
        this.dead = false;
        this.children = [];
        this.lastPacket = null;
        this.name = null;
        this.messages = []; // [] with hold
        this.messagesByKey = {}; // {} with group
        this.cleanupMethod = F.NOOP; // to cleanup subscriptions
        this.processName = 'doPass'; // default to pass things along last thing unchanged
        this.keepMethod = F.KEEP_LAST; // default if holding or grouping
        this.keepCount = 0; // non-zero creates an array
        this.timerMethod = null; // throttle, debounce, defer, batch
        this.groupMethod = null;
        this.actionMethod = null; // run, transform, filter, name, delay
        this.readyMethod = F.ALWAYS_TRUE;
        this.clearMethod = F.ALWAYS_TRUE;
        this.latched = false; // from this.clearMethod()
        this.primed = false;

    };

    tell(msg, source) {

        if(this.dead) // true if canceled or disposed midstream
            return this;

        const last = this.lastPacket;
        source = this.name || source; // named streams always pass their own name forward

        // tell method = doDelay, doGroup, doHold, , doFilter
        const processMethod = this[this.processName];
        processMethod.call(this, msg, source, last);

        return this;

    };

    fireContent() {

        const msg = this.groupMethod ? this.resolveKeepByGroup() : this.resolveKeep(this.messages);

        this.latched = this.clearMethod();
        this.primed = false;

        this.flowForward(msg);

    };

    resolveKeep(messages){

        return this.keepCount === 0 ? messages[0] : messages;

    };

    resolveKeepByGroup(){

        const messagesByKey = this.messagesByKey;
        for(const k in messagesByKey){
            messagesByKey[k] = this.resolveKeep(messagesByKey[k]);
        }
        return messagesByKey;

    };

    drop(stream){

        const children = this.children;
        const i = children.indexOf(stream);

        if(i !== -1)
            children.splice(i, 1);

    };

    flowsTo(stream){
        this.children.push(stream);
    };

    flowForward(msg, source, thisStream){

        thisStream = thisStream || this; // allow callbacks with context instead of bind (massively faster)
        thisStream.lastPacket = new Packet(msg, null, source);

        const children = thisStream.children;
        const len = children.length;

        for(let i = 0; i < len; i++){
            const c = children[i];
            c.tell(msg, source);
        }

    };

    doPass(msg, source) {

        this.flowForward(msg, source);

    };

    doFilter(msg, source) {

        if(!this.actionMethod(msg, source, this.lastPacket))
            return;
        this.flowForward(msg, source);

    };

    doKeep(msg, source) {

        this.keepMethod(this.messages, msg, this.keepCount);
        msg = this.resolveKeep(this.messages);
        this.flowForward(msg, source);

    };

    doTransform(msg, source, last) {

        msg = this.actionMethod(msg, source, last);
        this.flowForward(msg, source);

    };

    doDelay(msg, source) {

        // passes 'this' to avoid bind slowdown
        setTimeout(this.flowForward, this.actionMethod() || 0, msg, source, this);

    };

    doName(msg, source, last) {

        source = this.actionMethod(msg, source, last);
        this.flowForward(msg, source);

    };


    doRun(msg, source, last) {

        this.actionMethod(msg, source, last);
        this.flowForward(msg, source);

    };


    doGroup(msg, source, last) {

        const groupName = this.groupMethod(msg, source, last);
        const messages = this.messagesByKey[groupName] || [];
        this.messagesByKey[groupName]  = this.keepMethod(messages, msg, this.keepCount);

        if(!this.primed && (this.latched || this.readyMethod(this.messagesByKey, last))) {
            if(this.timerMethod) {
                this.primed = true;
                this.timerMethod(); // should call back this.fireContent
            } else {
                this.fireContent();
            }
        }

    };



    doHold(msg, source, last) {

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


    destroy(){

        if(this.dead)
            return;

        this.cleanupMethod(); // should remove an eventListener if present

    };




}


Stream.fromEvent = function(target, eventName, useCapture){

    useCapture = !!useCapture;

    const stream = new Stream();
    stream.name = eventName;

    const on = target.addEventListener || target.addListener || target.on;
    const off = target.removeEventListener || target.removeListener || target.off;

    const streamForward = function(msg){
        stream.tell(msg, eventName);
    };

    stream.cleanupMethod = function(){
        off.call(target, eventName, streamForward, useCapture);
    };

    on.call(target, eventName, streamForward, useCapture);

    return stream;

};


export default Stream;