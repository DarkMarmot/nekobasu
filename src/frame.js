
import Wave from './wave.js';
import Pool from './pool.js';
import Handler from './handler.js';


class Frame {

    constructor(bus, def) {

        this._bus = bus;
        this._nextFrame = null; // frames to join or fork into
        this._index = bus._frames.length;
        this._wireMap = {}; //new WeakMap(); // wires as keys, handlers/pools as values
        this._holding = false; // begins pools allowing multiple method calls -- must close with a time operation
        this._processDef = def; // wave or pool definition

    };


    handle(wire, msg, source, topic){

        const wireId = wire._id;
        const hasWire = this._wireMap.hasOwnProperty(wireId);//this._wireMap.has(wire); //this._wireMap.hasOwnProperty(wireId); //
        if(!hasWire)
            this._wireMap[wireId] = this._createHandler(wire);
            // this._wireMap.set(wire, this._createHandler(wire));

        const handler = this._wireMap[wireId]; // this._wireMap.get(wire);
        handler.handle(this, wire, msg, source || wire.name , topic);

    };

    emit(wire, msg, source, topic){

        this._nextFrame.handle(wire, msg, source, topic);

    };

    _createHandler(wire){

        const def = this._processDef;
        return (def && def.name === 'pool') ? new Pool(this, wire, def) : new Handler(def);

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

export default Frame;


