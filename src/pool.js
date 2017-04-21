
import F from './flib.js';

class Pool {

    constructor(stream){

        this.stream = stream;

        this.keep = null;
        this.until = F.ALWAYS_TRUE; // todo rename as filter
        this.timer = null; // throttle, debounce, defer, batch, sync
        this.clear = F.ALWAYS_FALSE;
        this.isPrimed = false;

    };

    tell(msg, source) {

        this.keep(msg, source);
        if(!this.isPrimed){
            const content = this.keep.content();
            if(this.until(content)){
                this.isPrimed = true;
                this.timer(this);
            }
        }

    };

    buildKeeper(factory, ...args){
        this.keep = factory(...args);
    };

    buildTimer(factory, ...args){
        this.timer = factory(this, ...args);
    };

    buildUntil(factory, ...args){
        this.until = factory(this, ...args);
    };

    release(pool) {

        pool = pool || this;
        const msg = pool.keep.content();

        if(pool.clear()){
            pool.keep.reset();
            pool.until.reset();
        }

        pool.isPrimed = false;
        pool.stream.flowForward(msg, pool.stream.name);

    };


}



export default Pool;