
import NOOP_STREAM from './noopStream.js';

function SplitStream(name) {

    this.name = name;
    this.next = NOOP_STREAM;

}



SplitStream.prototype.handle = function handle(msg, source, topic) {

    if(Array.isArray(msg)){
        this.thruArray(msg, source, topic);
    } else {
        this.thruIterable(msg, source, topic);
    }

};

SplitStream.prototype.thruArray = function(msg, source, topic){

    const len = msg.length;
    const next = this.next;

    for(let i = 0; i < len; i++){
        const m = msg[i];
        next.handle(m, source, topic);
    }

};

SplitStream.prototype.thruIterable = function(msg, source, topic){

    const next = this.next;

    for(const m of msg){
        next.handle(m, source, topic);
    }

};

NOOP_STREAM.addStubs(SplitStream);


export default SplitStream;


