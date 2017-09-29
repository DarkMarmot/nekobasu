

function NoopStream() {
    this.name = '';
}

NoopStream.prototype.handle = function handle(msg, source) {};
NoopStream.prototype.reset = function reset() {};
NoopStream.prototype.emit = function emit() {};

NoopStream.prototype.resetDefault = function reset() {
    this.next.reset();
};

const stubs = {handle:'handle', reset:'resetDefault', emit:'emit'};

NoopStream.prototype.addStubs = function addStubs(streamClass) {

    for(const name in stubs){
        const ref = stubs[name];
        const f = NoopStream.prototype[ref];
        if(typeof streamClass.prototype[name] !== 'function'){
            streamClass.prototype[name] = f;
        }
    }

};

const NOOP_STREAM = new NoopStream();

export default NOOP_STREAM;


