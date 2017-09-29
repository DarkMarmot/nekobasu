
import NOOP_STREAM from './noopStream.js';


function WriteStream(name, data) {
    this.name = name;
    this.data = data;
    this.next = NOOP_STREAM;
}

WriteStream.prototype.handle = function handle(msg, source) {

    this.data.write(msg);
    this.next.handle(msg, source);

};

NOOP_STREAM.addStubs(WriteStream);


export default WriteStream;


