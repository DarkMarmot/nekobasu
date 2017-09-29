
import NOOP_STREAM from './noopStream.js';

function TRUE() { return true; }


function LatchStream(name, f) {

    this.name = name;
    this.f = f || TRUE;
    this.next = NOOP_STREAM;
    this.latched = false;

}

LatchStream.prototype.handle = function handle(msg, source) {

    const n = this.name;

    if(this.latched){
        this.next.handle(msg, n);
        return;
    }

    const f = this.f;
    const v = f(msg, source);

    if(v) {
        this.latched = true;
        this.next.handle(msg, n);
    }

};

LatchStream.prototype.reset = function(seed){
    this.latched = false;
    this.next.reset(seed);
};

NOOP_STREAM.addStubs(LatchStream);

export default LatchStream;


