

class Last {

    constructor(){

        this.value = null;

    }

    handle(frame, wire, msg, source, topic){

        this.value = msg;
        frame.emit(wire, msg, source, topic);

    }

    reset(){

    }

    next(){
        return this.value;
    }

    content(){
        return this.value;
    }

}


export default Last;