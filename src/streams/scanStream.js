
import NOOP_STREAM from './noopStream.js';


function ScanStream(name, f) {

    this.name = name;
    this.f = f;
    this.hasValue = false;
    this.next = NOOP_STREAM;
    this.value = undefined;

}


ScanStream.prototype.handle = function handle(msg, source) {

    const f = this.f;
    this.value = this.hasValue ? f(this.value, msg, source) : msg;
    this.next.handle(this.value, source);

};

ScanStream.prototype.reset = function reset() {

    this.hasValue = false;
    this.value = undefined;
    this.next.reset();

};

NOOP_STREAM.addStubs(ScanStream);


export default ScanStream;


