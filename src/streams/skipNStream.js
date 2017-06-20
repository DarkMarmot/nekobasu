
import NOOP_STREAM from './noopStream.js';


function SkipNStream(name, count) {

    this.name = name;
    this.count = count || 0;
    this.next = NOOP_STREAM;
    this.seen = 0;

}

SkipNStream.prototype.handle = function handle(msg, source, topic) {

    const c = this.count;
    const s = this.seen;

    if(this.seen < c){
        this.seen = s + 1;
    } else {
        this.next.handle(msg, source, topic);
    }

};

SkipNStream.prototype.reset = function(msg, source, topic){

    this.seen = 0;

};

NOOP_STREAM.addStubs(SkipNStream);


export default SkipNStream;


