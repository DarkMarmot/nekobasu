
import NOOP_STREAM from './noopStream.js';

function FirstStream(name) {

    this.name = name;
    this.msg = undefined;
    this.topic = null;
    this.next = NOOP_STREAM;
    this.hasValue = false;

}

FirstStream.prototype.handle = function handle(msg, source, topic) {

    if(!this.hasValue){

        this.hasValue = true;
        this.msg = msg;
        this.topic = topic;

    }

    const v = this.msg;
    const n = this.name;
    const t = this.topic;

    this.next.handle(v, n, t);

};

FirstStream.prototype.reset = function(){

    this.hasValue = false;
    this.msg = undefined;
    this.topic = null;

    this.next.reset();

};

NOOP_STREAM.addStubs(FirstStream);

export default FirstStream;


