
import NOOP_STREAM from './noopStream.js';

function TRUE() { return true; }


function LatchStream(name) {

    this.name = name;
    this.f = TRUE;
    this.next = NOOP_STREAM;
    this.latched = false;
}

LatchStream.prototype.handle = function handle(msg, source, topic) {

    const n = this.name;

    if(this.latched){
        this.next.handle(msg, n, topic);
        return;
    }

    const f = this.f;
    const v = f(msg, source, topic);

    if(v) {
        this.latched = true;
        this.next.handle(msg, n, topic);
    }
};

LatchStream.prototype.reset = function(seed){
    this.latched = false;
    this.next.reset(seed);
};

export default LatchStream;


