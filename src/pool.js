
import F from './flib.js';

class Pool {

    constructor(frame, wire, def){

        this.frame = frame;
        this.wire = wire;

        function fromDef(name){

            if(!def[name])
                return null;

            const [factory, stateful, ...args] = def[name];

            return stateful ? factory.call(this, ...args) : factory;

        }

        this.keep = fromDef('keep') || F.getKeepLast();
        this.when = fromDef('when') || F.ALWAYS_TRUE;
        this.until = fromDef('until') || F.ALWAYS_TRUE;
        this.timer = fromDef('timer');  // throttle, debounce, defer, batch, sync
        this.clear = fromDef('clear') || F.ALWAYS_FALSE;

        this.isPrimed = false;


    };

    handle(frame, wire, msg, source, topic) {

        this.keep(msg, source, topic);
        if(!this.isPrimed){
            const content = this.keep.content();
            if(this.when(content)){
                this.isPrimed = true;
                this.timer(this);
            }
        }

    };

    build(prop, factory, ...args){
        this[prop] = factory.call(this, ...args);
    };

    release(pool) {

        pool = pool || this;
        const hasContent = !pool.keep.isEmpty;
        const msg = hasContent && pool.keep.next();

        if(pool.clear()){
            pool.keep.reset();
            pool.when.reset();
        }

        pool.isPrimed = false;

        if(hasContent)
            pool.frame.emit(pool.wire, msg);

    };

}


export default Pool;