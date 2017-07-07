

function Filter(def) {

    this.action = def.action;
    this.value = null;
    this.stateful = false;

}

Filter.prototype.handle = function handle(frame, wire, msg, source, topic){

        const f = this.action;
        f(msg, source, topic) && frame.emit(wire, msg, source, topic);

};


export default Filter;