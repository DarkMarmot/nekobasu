
import NOOP_STREAM from './noopStream.js';

function IS_PRIMITIVE_EQUAL(a, b) {
    return a === b && typeof a !== 'object' && typeof a !== 'function';
}


function SkipStream(name) {

    this.name = name;
    this.msg = undefined;
    this.hasValue = true;
    this.next = NOOP_STREAM;

}

SkipStream.prototype.handle = function handle(msg, source) {

    if(!this.hasValue) {

        this.hasValue = true;
        this.msg = msg;
        this.next.handle(msg, source);

    } else if (!IS_PRIMITIVE_EQUAL(this.msg, msg)) {

        this.msg = msg;
        this.next.handle(msg, source);

    }
};

NOOP_STREAM.addStubs(SkipStream);

export default SkipStream;


