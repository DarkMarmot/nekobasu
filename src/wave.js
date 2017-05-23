
class Wave {

    constructor(){

        this.process = this.pass;
        this.action = null;

    };

    define(def) {
        this.process = this[def.process];
        this.action = def.stateful ? def.action(...def.args) : def.action;
    }

    handle(frame, wire, msg, source, topic) {
        this.process(frame, wire, msg, source, topic)
    };

    pass(frame, wire, msg, source, topic) {

        frame.emit(wire, msg, source, topic);

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