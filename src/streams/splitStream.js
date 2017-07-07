
import NOOP_STREAM from './noopStream.js';

function SplitStream(name) {

    this.name = name;
    this.next = NOOP_STREAM;

}


SplitStream.prototype.handle = function splitHandle(msg, source, topic) {

    if(Array.isArray(msg)){
        this.withArray(msg, source, topic);
    } else {
        this.withIteration(msg, source, topic);
    }

};


SplitStream.prototype.withArray = function(msg, source, topic){

    const len = msg.length;

    for(let i = 0; i < len; ++i){
        this.next.handle(msg[i], source, topic);
    }

};



SplitStream.prototype.withIteration = function(msg, source, topic){

    const next = this.next;

    for(const m of msg){
        next.handle(m, source, topic);
    }

};

NOOP_STREAM.addStubs(SplitStream);


export default SplitStream;


