import F from './flib.js';

let _id = 0;

// const FRAME_CAP = {
//     handle: function(wire, msg, source, topic){}
// };

class Wire {

    constructor(name){

        this._id = ++_id + '';
        this.target = null; // a frame in a bus
        this.dead = false;
        this.name = name;
        this.cleanupMethod = F.NOOP; // to cleanup subscriptions
        this.pull = F.NOOP; // to retrieve and emit stored values from a source

    };

    handle(msg, source, topic) {

        // if(this.target)
            this.target.handle(this, msg, this.name, topic);

    };

    destroy(){

        if(!this.dead && this.target){
            this.dead = true;
            this.cleanupMethod();
        }

    };

}


Wire.fromInterval = function(delay, name){

    const wire = new Wire(name);

    const toWire = function(msg){
        wire.handle(msg);
    };

    const id = setInterval(toWire, delay);

    wire.cleanupMethod = function(){
        clearInterval(id);
    };

    return wire;

};


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