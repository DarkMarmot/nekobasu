

class Frame {

    constructor(bus) {


        this._bus = bus;
        this._index = bus._frames.length;
        this._streams = [];

    };

    get bus() {
        return this._bus;
    };

    get index() {
        return this._index;
    };


}

export default Frame;


