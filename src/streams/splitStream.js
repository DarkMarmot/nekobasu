
import NOOP_STREAM from './noopStream.js';

function SplitStream(name) {

    this.name = name;
    this.next = NOOP_STREAM;

}

SplitStream.prototype.handle = function handle(msg, source, topic) {

    const next = this.next;

    if(Array.isArray(msg)){

        const len = msg.length;
        for(let i = 0; i < len; i++){
            const m = msg[i];
            next.handle(m, source, topic);
        }

    } else {

        for(const m of msg){
            next.handle(m, source, topic);
        }
    }


};


export default SplitStream;


