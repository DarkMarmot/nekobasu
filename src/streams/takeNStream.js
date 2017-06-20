
import NOOP_STREAM from './noopStream.js';


function TakeNStream(name, count) {

    this.name = name;
    this.count = count || 0;
    this.next = NOOP_STREAM;
    this.seen = 0;

}

TakeNStream.prototype.handle = function handle(msg, source, topic) {

    const c = this.count;
    const s = this.seen;

    if(this.seen < c){
        this.seen = s + 1;
        this.next.handle(msg, source, topic);
    }

};

TakeNStream.prototype.reset = function(msg, source, topic){

    this.seen = 0;

};

NOOP_STREAM.addStubs(TakeNStream);


export default TakeNStream;


