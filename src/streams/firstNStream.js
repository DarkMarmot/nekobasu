
import NOOP_STREAM from './noopStream.js';


function FirstNStream(name, count) {

    this.name = name;
    this.count = count || 1;
    this.next = NOOP_STREAM;
    this.msg = [];

}

FirstNStream.prototype.handle = function handle(msg, source, topic) {

    const c = this.count;
    const m = this.msg;
    const n = this.name || source;

    if(m.length < c)
        m.push(msg);

    this.next.handle(m, n, topic);

};

FirstNStream.prototype.reset = function(msg, source, topic){

    this.msg = [];

};

NOOP_STREAM.addStubs(FirstNStream);


export default FirstNStream;


