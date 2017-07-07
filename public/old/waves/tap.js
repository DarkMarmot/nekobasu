

class Tap {

    constructor(def, frame){

        this.action = def.action;
        this.value = null;
        this.stateful = false;
        this.frame = frame;

    }

    handle(frame, wire, msg, source, topic){

        this.action(msg, source, topic);
        frame.emit(wire, msg, source, topic);

    }

}


export default Tap;