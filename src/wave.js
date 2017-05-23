
function pass(frame, wire, msg, source, topic) {

    frame.emit(wire, msg, source, topic);

}


class Wave {

    constructor(def){

        this.process = (def && def.process) ? this[def.process] : pass;
        this.action = def ? (def.stateful ? def.action(...def.args) : def.action) : null;

    };

    handle(frame, wire, msg, source, topic) {
        this.process(frame, wire, msg, source, topic)
    };

    run(frame, wire, msg, source, topic) {

        this.action(msg, source, topic);
        frame.emit(wire, msg, source, topic);

    };

    msg(frame, wire, msg, source, topic) {

        msg = this.action(msg, source, topic);
        frame.emit(wire, msg, source, topic);

    }

    filter(frame, wire, msg, source, topic) {

        if(!this.action(msg, source, topic))
            return;
        frame.emit(wire, msg, source, topic);

    };

    delay(frame, wire, msg, source, topic) {

        function callback(){
            frame.emit(wire, msg, source, topic);
        }

        setTimeout(callback, this.action(msg, source, topic) || 0, msg, source, topic);

    };

}


export default Wave;