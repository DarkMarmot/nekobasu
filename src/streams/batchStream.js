
import Catbus from '../catbus.js';
import NOOP_STREAM from './noopStream.js';


function BatchStream(name) {

    this.name = name;
    this.next = NOOP_STREAM;
    this.msg = undefined;
    this.topic = '';
    this.latched = false;

}

BatchStream.prototype.handle = function handle(msg, source, topic) {

    this.msg = msg;
    this.topic = topic;

    if(!this.latched){
        this.latched = true;
        Catbus.enqueue(this);
    }

};

BatchStream.prototype.emit = function emit() { // called from enqueue scheduler

    const msg = this.msg;
    const topic = this.topic;
    const source = this.name;

    this.next.handle(msg, source, topic);

};


BatchStream.prototype.reset = function reset() {

    this.latched = false;
    this.msg = undefined;
    this.topic = '';

    // doesn't continue on as in default

};

NOOP_STREAM.addStubs(BatchStream);

export default BatchStream;


