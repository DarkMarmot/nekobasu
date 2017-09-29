
import NOOP_STREAM from './noopStream.js';


function LastNStream(name, count) {

    this.name = name;
    this.count = count || 1;
    this.next = NOOP_STREAM;
    this.msg = [];

}

LastNStream.prototype.handle = function handle(msg, source) {

    const c = this.count;
    const m = this.msg;
    const n = this.name || source;

    m.push(msg);
    if(m.length > c)
        m.shift();

    this.next.handle(m, n);

};

LastNStream.prototype.reset = function(msg, source){

    this.msg = [];
    this.next.reset();

};

NOOP_STREAM.addStubs(LastNStream);

export default LastNStream;


