
import Wave from './wave.js';
import Pool from './pool.js';
import PoolDef from './poolDef.js';
import Wire from './wire.js';

class Frame {

    constructor(bus) {

        this._bus = bus;
        this._targets = []; // frames to join or fork into
        this._index = bus._frames.length;
        this._wireMap = new WeakMap(); // wires as keys, handlers/pools as values
        this._holding = false; // begins pools allowing multiple method calls -- must close with a time operation
        this._processDef = null; // wave or poll definition
        this._mergingWire = null;

    };

    define(def) {

        this._processDef = def;
        return this;

    };

    merge() {

        this._mergingWire = new Wire();
        return this;

    };


    handle(wire, msg, source, topic){

        if(this._mergingWire){
            this.emit(wire, msg, source, topic);
            return;
        }

        const hasWire = this._wireMap.has(wire);
        if(!hasWire)
            this._wireMap.set(wire, this._createHandler(wire));

        const handler = this._wireMap.get(wire);
        handler.handle(this, wire, msg, wire.name || source, topic);

    };

    emit(wire, msg, source, topic){

        const len = this._targets.length;
        for(let i = 0; i < len; i++){
            const frame = this._targets[i];
            frame.handle(wire, msg, source, topic);
        }

    };

    _createHandler(wire){

        const def = this._processDef;
        return (def && def.name === 'pool') ? new Pool(this, wire, def) : new Wave(def);

    };


    get bus() {
        return this._bus;
    };

    get index() {
        return this._index;
    };

    get holding() {
        return this._holding;
    };

    hold(){

        this._holding = true;
        this._processDef = new PoolDef();
        return this;

    };

    pull(){

        // todo pull from observers

    };

    target(frame) {

        this._targets.push(frame);

    };

    destroy() {

    };

    // source(name) {
    //
    //     const streams = this._streams;
    //     const len = streams.length;
    //
    //     for(let i = 0; i < len; i++){
    //         const s = streams[i];
    //         s.name = name;
    //     }
    //     return this;
    //
    // }
    //
    // run(func, stateful){
    //     return this.applySyncProcess('doRun', func, stateful);
    // };
    //
    // msg(fAny, stateful){
    //     return this.applySyncProcess('doMsg', F.FUNCTOR(fAny), stateful);
    // };
    //
    //
    // transform(fAny, stateful){
    //     return this.applySyncProcess('doTransform', F.FUNCTOR(fAny), stateful);
    // };
    //
    // delay(fNum, stateful){
    //     return this.applySyncProcess('doDelay', F.FUNCTOR(fNum), stateful);
    // };
    //
    // filter(func, stateful){
    //     return this.applySyncProcess('doFilter', func, stateful);
    // };
    //
    // skipDupes() {
    //     return this.applySyncProcess('doFilter', F.getSkipDupes, true);
    // };
    //
    // hasKeys(keys) {
    //     return this.applySyncProcess('doFilter', F.getHasKeys, true, keys);
    // };
    //
    // clear(factory, ...args){
    //     return this.buildPoolAspect('clear', factory, ...args);
    // };
    //
    // // factory should define content and reset methods have signature f(msg, source) return f.content()
    //
    // reduce(factory, ...args){
    //     return this.buildPoolAspect('keep', factory, ...args);
    // };
    //
    // timer(factory, ...args){
    //     return this.buildPoolAspect('timer', factory, ...args);
    // };
    //
    // when(factory, ...args){
    //     return this.buildPoolAspect('when', factory, ...args);
    // };
    //
    // until(factory, ...args){
    //     return this.buildPoolAspect('until', factory, ...args);
    // };
    //
    // buildPoolAspect(aspect, factory, ...args){
    //
    //     if(aspect === 'timer')
    //         this._holding = false;
    //
    //     this._poolAspects[aspect] = [factory, ...args];
    //
    //     const streams = this._streams;
    //     const len = streams.length;
    //
    //     for(let i = 0; i < len; i++){
    //
    //         const s = streams[i];
    //         const pool = s.pool;
    //         pool.build(aspect, factory, ...args);
    //
    //     }
    //
    //     return this;
    //
    // };


    
}

export default Frame;


