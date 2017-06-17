
import NOOP_STREAM from './noopStream.js';

function IS_EQUAL(a, b) { return a === b; }


function SkipStream(name) {

    this.name = name;
    this.msg = undefined;
    this.hasValue = true;
    this.next = NOOP_STREAM;

}

SkipStream.prototype.handle = function handle(msg, source, topic) {

    if(!this.hasValue) {

        this.hasValue = true;
        this.msg = msg;
        this.next.handle(msg, source, topic);

    } else if (!IS_EQUAL(this.msg, msg)) {

        this.msg = msg;
        this.next.handle(msg, source, topic);

    }
};

export default SkipStream;


