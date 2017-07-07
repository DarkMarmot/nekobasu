
import NOOP_STREAM from './noopStream.js';


function PriorStream(name) {

    this.name = name;
    this.values = [];
    this.next = NOOP_STREAM;

}

PriorStream.prototype.handle = function handle(msg, source, topic) {

    const arr = this.values;

    arr.push(msg);

    if(arr.length === 1)
        return;

    if(arr.length > 2)
        arr.shift();

    this.next.handle(arr[0], source, topic);

};

PriorStream.prototype.reset = function(msg, source, topic){

    this.msg = [];
    this.next.reset();

};

NOOP_STREAM.addStubs(PriorStream);

export default PriorStream;


