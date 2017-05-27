
import Pool from './pool.js';
import PoolDef from './poolDef.js';

class FrameHold {

    constructor(bus) {

        this._bus = bus;
        this._nextFrame = null;
        this._index = bus._frames.length;
        this._wireMap = new WeakMap(); // wires as keys, handlers/pools as values
        this._processDef = new PoolDef(); // pool definition
        this._holding = true;

    };

    handle(wire, msg, source, topic){

        //const wireId = wire._id;
        const hasWire = this._wireMap.has(wire); //this._wireMap.hasOwnProperty(wireId); //
        if(!hasWire)
            // this._wireMap[wireId] = this._createHandler(wire);
            this._wireMap.set(wire, this._createHandler(wire));

        const handler = this._wireMap.get(wire);
        handler.handle(this, wire, msg, source || wire.name , topic);

    };

    emit(wire, msg, source, topic){

        if(this._nextFrame)
            this._nextFrame.handle(wire, msg, source, topic);

    };

    _createHandler(wire){

        const def = this._processDef;
        return new Pool(this, wire, def);

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

    target(frame) {

        this._nextFrame = frame;

    };

    destroy() {

    };


}

export default FrameHold;


