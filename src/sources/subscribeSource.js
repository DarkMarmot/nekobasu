
import NOOP_SOURCE from './noopSource.js';
import PassStream from '../streams/passStream.js';


function SubscribeSource(name, data, canPull){

    this.name = name;
    this.data = data;
    this.canPull = canPull;
    const stream = this.stream = new PassStream(name);
    this.callback = function(msg, source){ stream.handle(msg, source) };
    data.subscribe(this.callback);

}


SubscribeSource.prototype.pull = function pull(){

    !this.dead && this.canPull && this.emit();

};


SubscribeSource.prototype.emit = function emit(){

    const data = this.data;

    if(data.present) {
        const stream = this.stream;
        const msg = data.read();
        const source = this.name;
        stream.handle(msg, source);
    }

};


SubscribeSource.prototype.destroy = function destroy(){

    const callback = this.callback;

    this.data.unsubscribe(callback);
    this.dead = true;

};


NOOP_SOURCE.addStubs(SubscribeSource);

export default SubscribeSource;
