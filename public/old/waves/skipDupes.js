

class SkipDupes {

    constructor(){

        this.value = null;
        this.hadValue = false;

    }

    handle(frame, wire, msg, source, topic){

        if(!this.hadValue || this.value !== msg) {
            frame.emit(wire, msg, source, topic);
            this.hadValue = true;
            this.value = msg;
        }

    }

}


export default SkipDupes;