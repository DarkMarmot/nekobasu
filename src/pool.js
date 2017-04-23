
import F from './flib.js';

class Pool {

    constructor(stream){

        this.stream = stream;

        this.keep = null;
        this.until = F.ALWAYS_TRUE;
        this.timer = null; // throttle, debounce, defer, batch, sync
        this.clear = false;
        this.isPrimed = false;
        this.source = stream.name;

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
        this.until = factory(...args);
    };

    release(pool) {

        pool = pool || this;
        const msg = pool.keep.content();

        if(pool.clear){
            pool.keep.reset();
            pool.until.reset();
        }

        pool.isPrimed = false;
        pool.stream.emit(msg, pool.stream.name);

    };

}



export default Pool;