
import F from './flib.js';

class Pool {

    constructor(stream){

        this.stream = stream;

        this.keep = null;
        this.until = null;
        this.timer = null; // throttle, debounce, defer, batch, sync
        this.ready = F.ALWAYS_TRUE;
        this.clear = F.ALWAYS_FALSE;
        this.isPrimed = false;

    };

    tell(msg, source) {

        this.keep(msg, source);
        if(!this.isPrimed){
            const content = this.keep.content();
            if(this.until(content)){
                this.isPrimed = true;
                this.timer(this);
            }
        }

    };

    fireContent() {

        const msg = this.groupMethod ? this.resolveKeepByGroup() : this.resolveKeep(this.messages);

        if(this.clearMethod()){
            this.latched = false;
            this.messagesByKey = {};
            this.messages = [];
        }

        this.primed = false;

        this.flowForward(msg, this.name);

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


    doKeep(msg, source) {

        this.keepMethod(this.messages, msg, this.keepCount);
        msg = this.resolveKeep(this.messages);
        this.flowForward(msg, source);

    };

    doTransform(msg, source) {

        msg = this.actionMethod(msg, source);
        this.flowForward(msg, source);

    };

    doDelay(msg, source) {

        // todo add destroy -> kills timeout
        // passes 'this' to avoid bind slowdown
        setTimeout(this.flowForward, this.actionMethod() || 0, msg, source, this);

    };

    doName(msg, source) {

        source = this.actionMethod(msg, source);
        this.flowForward(msg, source);

    };


    doRun(msg, source) {

        this.actionMethod(msg, source);
        this.flowForward(msg, source);

    };


    doGroup(msg, source) {

        const groupName = this.groupMethod(msg, source);
        const messages = this.messagesByKey[groupName] || [];
        this.messagesByKey[groupName]  = this.keepMethod(messages, msg, this.keepCount);

        if(!this.primed && (this.latched = this.latched || this.readyMethod(this.messagesByKey))) {
            if(this.timerMethod) {
                this.primed = true;
                this.timerMethod(); // should call back this.fireContent
            } else {
                this.fireContent();
            }
        }

    };



    doHold(msg, source) {

        this.keepMethod(this.messages, msg, this.keepCount);

        if(!this.primed && (this.latched = this.latched || this.readyMethod(this.messages))) {
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



Stream.fromData = function(data, topic, name){

    const stream = new Stream();
    const streamName = name || topic || data.name;

    const toStream = function(msg){
        stream.tell(msg, streamName);
    };

    stream.cleanupMethod = function(){
        data.unsubscribe(toStream, topic);
    };

    data.follow(toStream, topic);

    return stream;

};


Stream.fromEvent = function(target, eventName, useCapture){

    useCapture = !!useCapture;

    const stream = new Stream();

    const on = target.addEventListener || target.addListener || target.on;
    const off = target.removeEventListener || target.removeListener || target.off;

    const toStream = function(msg){
        stream.tell(msg, eventName);
    };

    stream.cleanupMethod = function(){
        off.call(target, eventName, toStream, useCapture);
    };

    on.call(target, eventName, toStream, useCapture);

    return stream;

};


export default Stream;