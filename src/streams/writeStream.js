
import NOOP_STREAM from './noopStream.js';


function WriteStream(name, dataTopic) {
    this.name = name;
    this.dataTopic = dataTopic;
    this.next = NOOP_STREAM;
}

WriteStream.prototype.handle = function handle(msg, source, topic) {

    this.dataTopic.handle(msg);
    this.next.handle(msg, source, topic);

};

NOOP_STREAM.addStubs(WriteStream);


export default WriteStream;


