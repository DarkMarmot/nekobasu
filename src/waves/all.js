

class All {

    constructor(){

        this.value = [];
        this.hasValue = false;
    }

    handle(frame, wire, msg, source, topic){

        const list = this.value;
        list.push(msg);
        frame.emit(wire, list, source, topic);

    }

    reset(){
        this.value = [];
    }

    next(){
        return this.value;
    }

    content(){
        return this.value;
    }

}

export default All;