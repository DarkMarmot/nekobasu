
import PassStream from './streams/passStream.js';

class Wire {

    constructor(name, source){

        this.name = name;
        this.source = source; // implements init, destroy, pull, pushes to wire.handle
        this.stream = new PassStream(name);
        this.dead = false;
        source.init();

    };

    handle(msg, source, topic) {

        const n = source || this.name;
        this.stream.handle(msg, n, topic);

    };

    pull(){
        this.source.pull();
    };

    destroy(){

        if(!this.dead){
            this.dead = true;
            this.source.destroy();
        }

    };

}



Wire.fromMonitor = function(data, name){

    const wire = new Wire(name);

    const toWire = function(msg, source, topic){
        wire.handle(msg, source, topic);
    };

    wire.cleanupMethod = function(){
        data.unsubscribe(toWire);
    };

    data.monitor(toWire);

    return wire;

};



Wire.fromSubscribe = function(data, topic, name, canPull){

    const wire = new Wire(name || topic || data.name);

    // const toWire = function(msg, source, topic){
    //     wire.handle(msg, source, topic);
    // };

    wire.cleanupMethod = function(){
        data.unsubscribe(wire, topic);
    };

    if(canPull){
        wire.pull = function(){
            const present = data.present(topic);
            if(present) {
                const msg = data.read(topic);
                const source = wire.name;
                wire.handle(msg, source, topic);
            }
        }
    }

   // data.subscribe(toWire, topic);
    data.subscribe(wire, topic);

    return wire;

};



Wire.fromEvent = function(target, eventName, useCapture){

    useCapture = !!useCapture;

    const wire = new Wire(eventName);

    const on = target.addEventListener || target.addListener || target.on;
    const off = target.removeEventListener || target.removeListener || target.off;

    const toWire = function(msg){
        wire.handle(msg, eventName);
    };

    wire.cleanupMethod = function(){
        off.call(target, eventName, toWire, useCapture);
    };

    on.call(target, eventName, toWire, useCapture);

    return wire;

};


export default Wire;