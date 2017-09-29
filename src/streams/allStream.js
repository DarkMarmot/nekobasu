
import NOOP_STREAM from './noopStream.js';


function AllStream(name) {

    this.name = name;
    this.next = NOOP_STREAM;
    this.msg = [];

}

AllStream.prototype.handle = function handle(msg, source) {

    const m = this.msg;
    const n = this.name || source;

    m.push(msg);

    this.next.handle(m, n);

};

AllStream.prototype.reset = function(msg, source){

    this.msg = [];

};

NOOP_STREAM.addStubs(AllStream);

export default AllStream;


