
import NOOP_STREAM from './noopStream.js';

function SplitStream(name) {

    this.name = name;
    this.next = NOOP_STREAM;

}


SplitStream.prototype.handle = function splitHandle(msg, source) {

    if(Array.isArray(msg)){
        this.withArray(msg, source);
    } else {
        this.withIteration(msg, source);
    }

};


SplitStream.prototype.withArray = function(msg, source){

    const len = msg.length;

    for(let i = 0; i < len; ++i){
        this.next.handle(msg[i], source);
    }

};



SplitStream.prototype.withIteration = function(msg, source){

    const next = this.next;

    for(const m of msg){
        next.handle(m, source);
    }

};

NOOP_STREAM.addStubs(SplitStream);


export default SplitStream;


