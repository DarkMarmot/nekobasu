import F from './flib.js';
import PoolAspects from './poolAspects.js';


class Frame {

    constructor(bus, streams) {

        streams = streams || [];
        this._bus = bus;
        this._index = bus._frames.length;
        this._holding = false; //begins group, keep, schedule frames
        this._streams = streams;

        this._process = null; // name of sync process method in streams
        this._action = null; // function defining sync stream action
        this._isFactory = false; // whether sync action is a stateful factory function

        this._poolAspects = null;

        const len = streams.length;
        for(let i = 0; i < len; i++){
            streams[i].debugFrame = this;
        }

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

    get streams() {
        return [].concat(this._streams);
    }

    applySyncProcess(name, action, isFactory){ // generate means action function must be called to generate stateful action

        this._process = name;
        this._action = action;
        this._isFactory = isFactory;

        const streams = this._streams;
        const len = streams.length;

        if(isFactory) {
            for (let i = 0; i < len; i++) {
                const s = streams[i];
                s.actionMethod = action();
                s.processMethod = s[name];
            }
        } else {
            for (let i = 0; i < len; i++) {
                const s = streams[i];
                s.actionMethod = action;
                s.processMethod = s[name];
            }
        }

        return this;

    };

    hold(){

        this._holding = true;
        this._poolAspects = new PoolAspects();

        const streams = this._streams;
        const len = streams.length;

        for(let i = 0; i < len; i++){
            const s = streams[i];
            s.createPool();
            s.processMethod = s.doPool;
        }

        return this;

    };

    run(func, stateful){
        return this.applySyncProcess('doRun', func, stateful);
    };

    transform(fAny, stateful){
        return this.applySyncProcess('doTransform', F.FUNCTOR(fAny), stateful);
    };

    name(fStr, stateful){
        return this.applySyncProcess('doName', F.FUNCTOR(fStr), stateful);
    };

    delay(fNum, stateful){
        return this.applySyncProcess('doDelay', F.FUNCTOR(fNum), stateful);
    };

    filter(func, stateful){
        return this.applySyncProcess('doFilter', func, stateful);
    };

    skipDupes() {
        return this.applySyncProcess('doFilter', F.getSkipDupes, true);
    };

    clear(factory, ...args){
        return this.buildPoolAspect('clear', factory, ...args);
    };

    // factory should define content and reset methods have signature f(msg, source) return f.content()

    reduce(factory, ...args){
        return this.buildPoolAspect('keep', factory, ...args);
    };

    timer(factory, ...args){
        return this.buildPoolAspect('timer', factory, ...args);
    };

    when(factory, ...args){
        return this.buildPoolAspect('when', factory, ...args);
    };

    until(factory, ...args){
        return this.buildPoolAspect('until', factory, ...args);
    };

    buildPoolAspect(aspect, factory, ...args){

        if(aspect === 'timer')
            this._holding = false;

        this._poolAspects[aspect] = [factory, ...args];

        const streams = this._streams;
        const len = streams.length;

        for(let i = 0; i < len; i++){

            const s = streams[i];
            const pool = s.pool;
            pool.build(aspect, factory, ...args);

        }

        return this;

    };

    destroy(){

        const streams = this._streams;
        const len = streams.length;
        for(let i = 0; i < len; i++){
            streams[i].cleanupMethod();
        }
        this._streams = null;

    };
    
}

export default Frame;


