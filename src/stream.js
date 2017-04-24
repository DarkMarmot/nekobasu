import Pool from './pool.js';
import F from './flib.js';

class Stream {

    constructor(){

        this.debugFrame = null;
        this.dead = false;
        this.children = [];
        this.name = null;
        this.pool = null;
        this.cleanupMethod = F.NOOP; // to cleanup subscriptions
        this.processMethod = this.emit;
        this.actionMethod = null; // for run, transform, filter, name, delay

    };

    tell(msg, source) {

        if(this.dead) // true if canceled or disposed midstream
            return this;

        this.processMethod(msg, source); // tell method = doDelay, doGroup, doHold, , doFilter

        return this;

    };

    drop(stream){

        const children = this.children;
        const i = children.indexOf(stream);

        if(i !== -1)
            children.splice(i, 1);

    };

    addTarget(stream){
        this.children.push(stream);
    };

    emit(msg, source, thisStream){

        thisStream = thisStream || this; // allow callbacks with context instead of bind (massively faster)

        const children = thisStream.children;
        const len = children.length;

        for(let i = 0; i < len; i++){
            const c = children[i];
            c.tell(msg, source);
        }

    };

    doFilter(msg, source) {

        if(!this.actionMethod(msg, source))
            return;
        this.emit(msg, source);

    };


    doTransform(msg, source) {

        msg = this.actionMethod(msg, source);
        this.emit(msg, source);

    };

    doDelay(msg, source) {

        // todo add destroy -> kills timeout
        // passes 'this' to avoid bind slowdown
        setTimeout(this.emit, this.actionMethod(msg, source) || 0, msg, source, this);

    };

    doName(msg, source) {

        source = this.actionMethod(msg, source);
        this.emit(msg, source);

    };


    doRun(msg, source) {

        this.actionMethod(msg, source);
        this.emit(msg, source);

    };

    createPool(){

        this.pool = new Pool(this);
    };

    doPool(msg, source) {

        this.pool.tell(msg, source);

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
    stream.name = streamName;

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
    stream.name = eventName;

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