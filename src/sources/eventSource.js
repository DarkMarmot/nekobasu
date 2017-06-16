
import NOOP_SOURCE from './noopSource.js';
import PassStream from '../streams/passStream.js';


function EventSource(name, target, eventName, useCapture){

    this.name = name;
    this.target = target;
    this.eventName = eventName;
    this.useCapture = !!useCapture;
    this.on = target.addEventListener || target.addListener || target.on;
    this.off = target.removeEventListener || target.removeListener || target.off;
    this.stream = new PassStream(name);

    const stream = this.stream;

    function toStream(msg){
        stream.handle(msg, eventName, null);
    }

    this.on.call(target, eventName, toStream, useCapture);

}



EventSource.prototype.destroy = function destroy(){

    this.off.call(target, this.eventName, callback, this.useCapture);
    this.dead = true;

};


NOOP_SOURCE.addStubs(EventSource);

export default EventSource;
