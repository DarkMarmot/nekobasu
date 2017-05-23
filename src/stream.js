import Pool from './pool.js';
import F from './flib.js';

class Stream {

    constructor(){

        this.dead = false;
        this.children = [];
        this.name = null;
        this.pool = null;
        this.cleanupMethod = F.NOOP; // to cleanup subscriptions
        this.pull = F.NOOP; // to retrieve and emit stored values from a source
        this.processMethod = this.emit;
        this.actionMethod = null; // for run, transform, filter, name, delay

    };

    handle(msg, source) {

        if(this.dead) // true if canceled or disposed midstream
            return this;

        this.processMethod(msg, this.name || source); // handle method = doDelay, doGroup, doHold, , doFilter

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

    emit(msg, source, topic, thisStream){

        thisStream = thisStream || this; // allow callbacks with context instead of bind (massively faster)
        source = thisStream.name || source;

        const children = thisStream.children;
        const len = children.length;

        for(let i = 0; i < len; i++){
            const c = children[i];
            c.handle(msg, source, topic);
        }

    };

    doFilter(msg, source, topic) {

        if(!this.actionMethod(msg, source, topic))
            return;
        this.emit(msg, source, topic);

    };


    doMsg(msg, source, topic) {

        msg = this.actionMethod(msg, source, topic);
        this.emit(msg, source, topic);

    };

    doTransform(msg, source, topic) {


        msg = this.actionMethod.msg ? this.actionMethod.msg(msg, source, topic) : msg;
        source = this.actionMethod.source ? this.actionMethod.source(msg, source, topic) : source;
        topic = this.actionMethod.topic ? this.actionMethod.topic(msg, source, topic) : topic;
        this.emit(msg, source, topic);

    };

    doDelay(msg, source, topic) {

        // todo add destroy -> kills timeout
        // passes 'this' to avoid bind slowdown
        setTimeout(this.emit, this.actionMethod(msg, source, topic) || 0, msg, source, topic, this);

    };

    doSource(msg, source, topic) {

        this.name = this.actionMethod(); // todo shoehorned -- this needs it's own setup
        //source = this.actionMethod(msg, source, topic);
        // this.name = function(){ return }
        this.emit(msg, this.name || source, topic);

    };


    doRun(msg, source, topic) {

        this.actionMethod(msg, source, topic);
        this.emit(msg, source, topic);

    };

    createPool(){

        this.pool = new Pool(this);
    };

    doPool(msg, source, topic) {

        this.pool.handle(msg, this.name || source, topic);

    };

    destroy(){

        if(this.dead)
            return;

        this.cleanupMethod(); // should remove an eventListener if present

    };

}


Stream.fromMonitor = function(data, name, canPull){

    const stream = new Stream();
    const streamName = name || data.name;

    stream.name = streamName;

    const toStream = function(msg, source, topic){
        stream.emit(msg, streamName, topic);
    };

    stream.cleanupMethod = function(){
        data.unsubscribe(toStream);
    };

    if(canPull){
        stream.pull = function(){
            const packet = data.survey();
            if(packet) {
                const msg = packet._msg;
                const source = streamName || packet._source;
                const topic = packet._topic;
                stream.emit(msg, source, topic, stream);
            }
        }
    }

    data.monitor(toStream);

    return stream;

};



Stream.fromSubscribe = function(data, topic, name, canPull){

    const stream = new Stream();
    const streamName = name || topic || data.name;
    stream.name = streamName;

    const toStream = function(msg, source, topic){
        stream.emit(msg, streamName, topic);
    };

    stream.cleanupMethod = function(){
        data.unsubscribe(toStream, topic);
    };

    if(canPull){
        stream.pull = function(){
            const packet = data.peek();
            if(packet) {
                const msg = packet._msg;
                const source = streamName || packet._source;
                const topic = packet._topic;
                stream.emit(msg, source, topic, stream);
            }
        }
    }

    data.subscribe(toStream, topic);

    return stream;

};



Stream.fromEvent = function(target, eventName, useCapture){

    useCapture = !!useCapture;

    const stream = new Stream();
    stream.name = eventName;

    const on = target.addEventListener || target.addListener || target.on;
    const off = target.removeEventListener || target.removeListener || target.off;

    const toStream = function(msg){
        stream.handle(msg, eventName);
    };

    stream.cleanupMethod = function(){
        off.call(target, eventName, toStream, useCapture);
    };

    on.call(target, eventName, toStream, useCapture);

    return stream;

};


export default Stream;