

function NoopPool(stream) {

    this.hasValue = false;
    this.msg = undefined;
    this.topic = null;
    this.primed = false;
    this.stream = stream;

}

NoopPool.prototype.release = function release() {};
NoopPool.prototype.handle = function handle(msg, source, topic) {};
NoopPool.prototype.reset = function reset() {};
NoopPool.prototype.error = function error(msg, source, topic) {};
NoopPool.prototype.clear = function clear() {};
NoopPool.prototype.retry = function retry(msg, source, topic) {};
NoopPool.prototype.timer = function timer() {};
NoopPool.prototype.when = function when() {};

const stubs = ['release','handle','reset','clear','error','retry','timer','when'];

NoopPool.prototype.addStubs = function addStubs(poolClass) {

    for(let i = 0; i < stubs.length; i++){
        const stub = stubs[i];
        if(typeof poolClass.prototype[stub] !== 'function'){
            poolClass.prototype[stub] = NoopPool.prototype[stub];
        }
    }

};

const NOOP_POOL = new NoopPool();

export default NOOP_POOL;


