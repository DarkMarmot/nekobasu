
class Packet {

    constructor(msg, topic, source) {
        this._msg       = msg;
        this._topic     = topic;
        this._source    = source;
        this._timestamp = Date.now();
    };

    get msg() { return this._msg; };
    get topic() { return this._topic; };
    get source() { return this._source; };
    get timestamp() { return this._timestamp; };

}

export default Packet;