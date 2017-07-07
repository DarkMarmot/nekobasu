
function callback(frame, wire, msg, source, topic){

    frame.emit(wire, msg, source, topic);

}



class Delay {

    constructor(def){

        this.action = def.action;
        this.value = null;

    }


    handle(frame, wire, msg, source, topic){

        setTimeout(callback, this.action(msg, source, topic) || 0, frame, wire, msg, source, topic);

    }


}


export default Delay;
