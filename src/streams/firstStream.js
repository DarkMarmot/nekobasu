
import NOOP_STREAM from './noopStream.js';

function FirstStream(name) {

    this.name = name;
    this.msg = undefined;
    this.next = NOOP_STREAM;
    this.hasValue = false;

}

FirstStream.prototype.handle = function handle(msg, source) {

    if(!this.hasValue){

        this.hasValue = true;
        this.msg = msg;

    }

    const v = this.msg;
    const n = this.name;

    this.next.handle(v, n);

};

FirstStream.prototype.reset = function(){

    this.hasValue = false;
    this.msg = undefined;
    this.topic = '';

    this.next.reset();

};

NOOP_STREAM.addStubs(FirstStream);

export default FirstStream;


